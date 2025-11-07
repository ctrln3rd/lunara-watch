import { InferenceSession, Tensor } from 'onnxruntime-web';
import { DateTime } from 'luxon';
import { get, set, del } from 'idb-keyval';
import { Intent, IntentType, TimeframeType, ForecastType } from '../types';

export interface EnhancedIntentResult {
  intent: IntentType;
  subIntent: string;
  timeframeType: TimeframeType;
  forecastType: ForecastType;
  confidence: number;
  dayOffset: number;
  hourOfDay: number;
  dayDuration: number;
  hourDuration: number;
}

export interface ModelMetadata {
  version: string;
  vocab_size: number;
  max_length: number;
  inputs: any;
  outputs: any;
  temporal_normalization: any;
}

export class IntentProcessor {
  private session: InferenceSession | null = null;
  private vocabulary: Record<string, number> = {};
  private metadata: ModelMetadata | null = null;
  private modelVersion: string = '';

  private readonly MODEL_KEY = 'intent_model_cache';
  private readonly VOCAB_KEY = 'intent_vocabulary';
  private readonly METADATA_KEY = 'intent_metadata';
  private readonly VERSION_KEY = 'intent_model_version';

  constructor() {}

  /**
   * Initialize model, loading from cache or downloading fresh
   */
  async initialize(modelUrl: string, vocabUrl: string, metadataUrl: string, version: string): Promise<void> {
    try {
      this.modelVersion = version;
      const cachedVersion = localStorage.getItem(this.VERSION_KEY);

      if (cachedVersion === version) {
        const loaded = await this.loadFromCache();
        if (loaded) {
          console.log('✓ Loaded model from IndexedDB cache');
          return;
        }
      }

      console.log('⬇️ Downloading model files...');
      await this.downloadAndCache(modelUrl, vocabUrl, metadataUrl, version);
      console.log('✓ Model downloaded and cached successfully');
    } catch (err) {
      console.error('Failed to initialize model:', err);
      throw err;
    }
  }

  /**
   * Load model and data from IndexedDB + localStorage
   */
  private async loadFromCache(): Promise<boolean> {
    try {
      const [modelBuffer, vocabData, metadataData] = await Promise.all([
        get(this.MODEL_KEY),
        localStorage.getItem(this.VOCAB_KEY),
        localStorage.getItem(this.METADATA_KEY),
      ]);

      if (!modelBuffer || !vocabData || !metadataData) return false;

      this.vocabulary = JSON.parse(vocabData);
      this.metadata = JSON.parse(metadataData);
      this.session = await InferenceSession.create(modelBuffer);

      return true;
    } catch (err) {
      console.error('Error loading from cache:', err);
      return false;
    }
  }

  /**
   * Download model, vocab, and metadata; then cache them
   */
  private async downloadAndCache(modelUrl: string, vocabUrl: string, metadataUrl: string, version: string) {
    // Download model
    const modelResponse = await fetch(modelUrl);
    if (!modelResponse.ok) throw new Error(`Failed to fetch model: ${modelResponse.statusText}`);
    const modelBuffer = await modelResponse.arrayBuffer();

    // Cache model binary in IndexedDB
    await set(this.MODEL_KEY, modelBuffer);

    // Download and store vocabulary
    const vocabResponse = await fetch(vocabUrl);
    this.vocabulary = await vocabResponse.json();
    localStorage.setItem(this.VOCAB_KEY, JSON.stringify(this.vocabulary));

    // Download and store metadata
    const metadataResponse = await fetch(metadataUrl);
    this.metadata = await metadataResponse.json();
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(this.metadata));

    // Save version info
    localStorage.setItem(this.VERSION_KEY, version);

    // Create ONNX session
    this.session = await InferenceSession.create(modelBuffer);
  }

  /**
   * Clear all cached model data
   */
  async clearCache() {
    await del(this.MODEL_KEY);
    localStorage.removeItem(this.VOCAB_KEY);
    localStorage.removeItem(this.METADATA_KEY);
    localStorage.removeItem(this.VERSION_KEY);
    console.log('🧹 Cleared model cache');
  }

  private tokenize(query: string): number[] {
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const maxLength = this.metadata?.max_length || 50;
    const padTokenId = 0;
    const unkTokenId = 1;

    const indices = tokens.map(t => this.vocabulary[t] ?? unkTokenId);
    return indices.length < maxLength
      ? [...indices, ...Array(maxLength - indices.length).fill(padTokenId)]
      : indices.slice(0, maxLength);
  }

  private denormalizeDayOffset(n: number) { return Math.round(n * 6); }
  private denormalizeHourOfDay(n: number) { return Math.round(n * 23); }
  private denormalizeDayDuration(n: number) { return Math.round(n * 7); }
  private denormalizeHourDuration(n: number) { return Math.round(n * 168); }

  private calculateTimeframe(
    timeframeType: TimeframeType,
    dayOffset: number,
    hourOfDay: number,
    dayDuration: number,
    hourDuration: number
  ) {
    const now = DateTime.now();
    let start = now.plus({ days: dayOffset }).set({ hour: hourOfDay }).startOf('hour');
    let end = dayDuration > 0 ? start.plus({ days: dayDuration }) : start.plus({ hours: hourDuration });
    return { start: start.toISO()!, end: end.toISO()! };
  }

  async predict(query: string): Promise<Intent> {
    if (!this.session || !this.metadata) throw new Error('Model not initialized');

    const inputIds = this.tokenize(query);
    const inputTensor = new Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const results = await this.session.run({ input_ids: inputTensor });

    const intentIdx = this.argmax(Array.from(results.intent_logits.data as Float32Array));
    const subIntentIdx = this.argmax(Array.from(results.sub_intent_logits.data as Float32Array));
    const timeframeIdx = this.argmax(Array.from(results.timeframe_logits.data as Float32Array));
    const forecastIdx = this.argmax(Array.from(results.forecast_logits.data as Float32Array));

    const intent = this.metadata.outputs.intent_logits.classes[intentIdx] as IntentType;
    const subIntent = this.metadata.outputs.sub_intent_logits.classes[subIntentIdx];
    const timeframeType = this.metadata.outputs.timeframe_logits.classes[timeframeIdx] as TimeframeType;
    const forecastType = this.metadata.outputs.forecast_logits.classes[forecastIdx] as ForecastType;

    const dayOffset = this.denormalizeDayOffset((results.day_offset.data as Float32Array)[0]);
    const hourOfDay = this.denormalizeHourOfDay((results.hour_of_day.data as Float32Array)[0]);
    const dayDuration = this.denormalizeDayDuration((results.day_duration.data as Float32Array)[0]);
    const hourDuration = this.denormalizeHourDuration((results.hour_duration.data as Float32Array)[0]);
    const confidence = (results.confidence.data as Float32Array)[0];

    const { start, end } = this.calculateTimeframe(timeframeType, dayOffset, hourOfDay, dayDuration, hourDuration);

    return {
      intent, sub_intent: subIntent, timeframe: timeframeType,
      start, end, forecast_type: forecastType, confidence
    };
  }

  private argmax(arr: number[]) {
    return arr.indexOf(Math.max(...arr));
  }

  isLoaded(): boolean {
    return this.session !== null;
  }

  getModelInfo() {
    return { version: this.modelVersion, metadata: this.metadata };
  }

  formatTimeframe(result: Intent): string {
    const start = DateTime.fromISO(result.start);
    const end = DateTime.fromISO(result.end);
    const durationDays = end.diff(start, 'days').days;

    if (durationDays < 1) {
      const hours = end.diff(start, 'hours').hours;
      return hours === 1
        ? `at ${start.toFormat('h:mm a')} on ${start.toFormat('MMMM d')}`
        : `from ${start.toFormat('h:mm a')} to ${end.toFormat('h:mm a')} on ${start.toFormat('MMMM d')}`;
    } else if (durationDays === 1) {
      return start.toFormat('EEEE, MMMM d');
    } else {
      return `from ${start.toFormat('EEEE, MMMM d')} to ${end.toFormat('EEEE, MMMM d')}`;
    }
  }
}
