/**
 * Frontend Intent Classifier using ONNX Runtime
 * Loads model from public folder and caches in IndexedDB with version control
 */

import * as ort from 'onnxruntime-web';
import { DateTime } from 'luxon';

// Types matching your TypeScript definitions
export type IntentType =
  | 'temperature'
  | 'precipitation'
  | 'wind'
  | 'cloud_cover'
  | 'uv'
  | 'humidity'
  | 'pressure'
  | 'visibility'
  | 'sun'
  | 'moon'
  | 'alerts'
  | 'activity'
  | 'greetings'
  | 'feedback'
  | 'farewell'
  | 'general'
  | 'unknown';

export type SubIntentType = string | null;

export type TimeframeType =
  | 'absolute_day'
  | 'relative_day'
  | 'absolute_time'
  | 'relative_time'
  | 'none';

export type ForecastType = 'hourly' | 'daily' | 'all';

export interface Timeframe {
  type: TimeframeType;
  value: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
}

export interface Intent {
  intent: IntentType;
  sub_intent: SubIntentType;
  timeframe: Timeframe | null;
  forecast_type: ForecastType;
  confidence: number;
}

export interface IntentResponse {
  query: string;
  intents: Intent[];
}

interface Vocabulary {
  word2idx: Record<string, number>;
  idx2word: Record<string, string>;
  intent_classes: string[];
  sub_intent_classes: string[];
  timeframe_classes: string[];
  forecast_classes: string[];
  max_seq_length: number;
}

interface ModelMetadata {
  model_version: string;
  export_format: string;
  config: {
    vocab_size: number;
    num_intents: number;
    num_sub_intents: number;
    num_timeframe_types: number;
    num_forecast_types: number;
    max_seq_length: number;
  };
}

const DB_NAME = 'IntentModelCache';
const DB_VERSION = 1;
const MODEL_STORE = 'models';
const VOCAB_STORE = 'vocabularies';
const METADATA_STORE = 'metadata';

/**
 * IndexedDB wrapper for model caching
 */
class ModelCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(MODEL_STORE)) {
          db.createObjectStore(MODEL_STORE);
        }
        if (!db.objectStoreNames.contains(VOCAB_STORE)) {
          db.createObjectStore(VOCAB_STORE);
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE);
        }
      };
    });
  }

  async get<T>(store: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(store: string, key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    const stores = [MODEL_STORE, VOCAB_STORE, METADATA_STORE];
    for (const store of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

/**
 * TimeframeResolver - matches Python implementation
 */
class TimeframeResolver {
  private reference: DateTime;

  constructor(referenceTime?: Date) {
    this.reference = referenceTime
      ? DateTime.fromJSDate(referenceTime)
      : DateTime.now();
  }

  resolve(
    type: TimeframeType,
    value: string
  ): { start: string; end: string } {
    if (type === "none" || !value)
      return this.defaultRange();

    const val = value.toLowerCase();
    switch (type) {
      case "absolute_day":
        return this.resolveAbsoluteDay(val);
      case "relative_day":
        return this.resolveRelativeDay(val);
      case "absolute_time":
        return this.resolveAbsoluteTime(val);
      case "relative_time":
        return this.resolveRelativeTime(val);
      default:
        return this.defaultRange();
    }
  }

  private defaultRange(): { start: string; end: string } {
    return {
      start: this.reference.startOf("day").toISO() ?? this.reference.startOf("day").toString(),
      end: this.reference.endOf("day").toISO() ?? this.reference.endOf("day").toString(),
    };
  }

  private resolveAbsoluteDay(value: string): { start: string; end: string } {
    let target = this.reference;

    if (value.includes("today")) return this.defaultRange();
    if (value.includes("tomorrow")) target = target.plus({ days: 1 });
    else if (value.includes("yesterday")) target = target.minus({ days: 1 });
    else if (value.includes("day after tomorrow"))
      target = target.plus({ days: 2 });
    else {
      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      for (const d of days) {
        if (value.includes(d)) {
          const targetIdx = days.indexOf(d);
          const currIdx = (this.reference.weekday - 1) % 7;
          let offset = (targetIdx - currIdx + 7) % 7;
          if (offset === 0) offset = 7; // Default to next week if same day
          if (value.includes("next") && offset === 0) offset = 7;
          if (value.includes("last")) offset -= 7;
          target = target.plus({ days: offset });
          break;
        }
      }
    }

    return {
      start: target.startOf("day").toISO() ?? target.startOf("day").toString(),
      end: target.endOf("day").toISO() ?? target.endOf("day").toString(),
    };
  }

  private resolveRelativeDay(value: string): { start: string; end: string } {
    if (value.includes("weekend")) {
      const daysUntilSaturday = ((6 - this.reference.weekday + 7) % 7) || 7;
      const saturday = this.reference.plus({ days: daysUntilSaturday });
      return {
        start: saturday.startOf("day").toISO() ?? saturday.startOf("day").toString(),
        end: saturday.plus({ days: 1 }).endOf("day").toISO() ?? saturday.plus({ days: 1 }).endOf("day").toString(),
      };
    }

    if (value.includes("week")) {
      if (value.includes("next")) {
        const next = this.reference.plus({ weeks: 1 }).startOf("week");
        return { start: next.toISO() ?? next.toString(), end: next.endOf("week").toISO() ?? next.endOf("week").toString() };
      }
      if (value.includes("last")) {
        const last = this.reference.minus({ weeks: 1 }).startOf("week");
        return { start: last.toISO() ?? last.toString(), end: last.endOf("week").toISO() ?? last.endOf("week").toString() };
      }
      return {
        start: this.reference.startOf("week").toISO() ?? this.reference.startOf("week").toString(),
        end: this.reference.endOf("week").toISO() ?? this.reference.endOf("week").toString(),
      };
    }

    return {
      start: this.reference.startOf("day").toISO() ?? this.reference.startOf("day").toString(),
      end: this.reference.plus({ days: 3 }).endOf("day").toISO() ?? this.reference.plus({ days: 3 }).endOf("day").toString(),
    };
  }

  private resolveAbsoluteTime(value: string): { start: string; end: string } {
    let dt = this.reference.startOf("day").set({ hour: 12 });

    const match = value.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2] || "0");
      const meridiem = match[3];
      if (meridiem === "pm" && hour < 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      dt = dt.set({ hour, minute });
    } else if (value.includes("midnight")) dt = dt.set({ hour: 0 });
    else if (value.includes("noon")) dt = dt.set({ hour: 12 });

    return {
      start: dt.toISO() ?? dt.toString(),
      end: dt.plus({ hours: 1 }).toISO() ?? dt.plus({ hours: 1 }).toString(),
    };
  }

  private resolveRelativeTime(value: string): { start: string; end: string } {
    let start = this.reference;
    if (value.includes("morning")) start = start.set({ hour: 6 });
    else if (value.includes("afternoon")) start = start.set({ hour: 12 });
    else if (value.includes("evening")) start = start.set({ hour: 18 });
    else if (value.includes("night") || value.includes("tonight"))
      start = start.set({ hour: 20 });
    else return { start: this.reference.toISO() ?? this.reference.toString(), end: this.reference.plus({ hours: 3 }).toISO() ?? this.reference.plus({ hours: 3 }).toString() };

    return {
      start: start.toISO() ?? start.toString(),
      end: start.plus({ hours: 3 }).toISO() ?? start.plus({ hours: 3 }).toString(),
    };
  }
}


/**
 * Main Intent Classifier
 */
export class IntentClassifier {
  private session: ort.InferenceSession | null = null;
  private vocabulary: Vocabulary | null = null;
  private metadata: ModelMetadata | null = null;
  private cache: ModelCache;
  private modelVersion: string = '1.0.0';
  private timeframeResolver: TimeframeResolver;

  constructor() {
    this.cache = new ModelCache();
    this.timeframeResolver = new TimeframeResolver();
  }

  /**
   * Initialize classifier - loads model from cache or public folder
   */
  async initialize(modelBasePath: string = '/models'): Promise<void> {
    try {
      await this.cache.init();

      // Check cache first
      const cachedMetadata = await this.cache.get<ModelMetadata>(METADATA_STORE, 'metadata');

      if (cachedMetadata && cachedMetadata.model_version === this.modelVersion) {
        console.log('Loading model from cache...');
        await this.loadFromCache();
      } else {
        console.log('Loading model from server...');
        await this.loadFromServer(modelBasePath);
      }

      console.log('✓ Intent classifier initialized');
    } catch (error) {
      console.error('Failed to initialize intent classifier:', error);
      throw error;
    }
  }

  private async loadFromCache(): Promise<void> {
    const [modelBuffer, vocab, meta] = await Promise.all([
      this.cache.get<ArrayBuffer>(MODEL_STORE, 'model'),
      this.cache.get<Vocabulary>(VOCAB_STORE, 'vocabulary'),
      this.cache.get<ModelMetadata>(METADATA_STORE, 'metadata'),
    ]);

    if (!modelBuffer || !vocab || !meta) {
      throw new Error('Incomplete cache data');
    }

    this.session = await ort.InferenceSession.create(modelBuffer);
    this.vocabulary = vocab;
    this.metadata = meta;
  }

  private async loadFromServer(basePath: string): Promise<void> {
    const [modelResponse, vocabResponse, metadataResponse] = await Promise.all([
      fetch(`${basePath}/intent_model.onnx`),
      fetch(`${basePath}/vocabulary.json`),
      fetch(`${basePath}/metadata.json`),
    ]);

    if (!modelResponse.ok || !vocabResponse.ok || !metadataResponse.ok) {
      throw new Error('Failed to fetch model files');
    }

    const [modelBuffer, vocab, meta] = await Promise.all([
      modelResponse.arrayBuffer(),
      vocabResponse.json() as Promise<Vocabulary>,
      metadataResponse.json() as Promise<ModelMetadata>,
    ]);

    // Load model
    this.session = await ort.InferenceSession.create(modelBuffer);
    this.vocabulary = vocab;
    this.metadata = meta;

    // Cache for future use
    await Promise.all([
      this.cache.set(MODEL_STORE, 'model', modelBuffer),
      this.cache.set(VOCAB_STORE, 'vocabulary', vocab),
      this.cache.set(METADATA_STORE, 'metadata', meta),
    ]);
  }

  /**
   * Classify a user query
   */
  async classify(query: string, referenceTime?: Date): Promise<IntentResponse> {
    if (!this.session || !this.vocabulary || !this.metadata) {
      throw new Error('Classifier not initialized. Call initialize() first.');
    }

    // Preprocess query
    const { inputIds, attentionMask } = this.preprocessText(query);

    // Run inference
    const feeds = {
      input_ids: new ort.Tensor('int64', inputIds, [1, this.vocabulary.max_seq_length]),
      attention_mask: new ort.Tensor('int64', attentionMask, [1, this.vocabulary.max_seq_length]),
    };

    const output = await this.session.run(feeds);

    // Get output keys and log for debugging
    const outputKeys = Object.keys(output);
    console.log('Model output keys:', outputKeys);

    // Extract tensors - handle batch dimension [1, num_classes]
    const getTensor = (names: string[]): Float32Array | undefined => {
      for (const name of names) {
        if (output[name]) {
          const tensor = output[name];
          console.log(`Found ${name}:`, { shape: tensor.dims, type: tensor.type });
          return tensor.data as Float32Array;
        }
      }
      return undefined;
    };

    // Try multiple naming conventions for each output
    const intentLogits = getTensor(['intent', 'logits_intent', 'output_0', outputKeys[0]]);
    const subIntentLogits = getTensor(['sub_intent', 'logits_sub_intent', 'output_1', outputKeys[1]]);
    const timeframeTypeLogits = getTensor(['timeframe_type', 'logits_timeframe', 'output_2', outputKeys[2]]);
    const forecastLogits = getTensor(['forecast', 'logits_forecast', 'output_3', 'output_5', outputKeys[Math.min(3, outputKeys.length - 1)]]);

    if (!intentLogits || !subIntentLogits || !timeframeTypeLogits || !forecastLogits) {
      throw new Error(
        `Model output mismatch. Available outputs: ${outputKeys.join(', ')}. ` +
        `Expected: intent, sub_intent, timeframe_type, forecast`
      );
    }

    // Get predictions - handle batch dimension
    const numIntents = this.vocabulary.intent_classes.length;
    const numSubIntents = this.vocabulary.sub_intent_classes.length;
    const numTimeframeTypes = this.vocabulary.timeframe_classes.length;
    const numForecastTypes = this.vocabulary.forecast_classes.length;

    // Extract single batch predictions (first element if batched)
    const intentBatch = intentLogits.length > numIntents ? 
      intentLogits.slice(0, numIntents) : intentLogits;
    const subIntentBatch = subIntentLogits.length > numSubIntents ? 
      subIntentLogits.slice(0, numSubIntents) : subIntentLogits;
    const timeframeBatch = timeframeTypeLogits.length > numTimeframeTypes ? 
      timeframeTypeLogits.slice(0, numTimeframeTypes) : timeframeTypeLogits;
    const forecastBatch = forecastLogits.length > numForecastTypes ? 
      forecastLogits.slice(0, numForecastTypes) : forecastLogits;

    const intentIdx = this.argmax(intentBatch);
    const subIntentIdx = this.argmax(subIntentBatch);
    const timeframeTypeIdx = this.argmax(timeframeBatch);
    const forecastIdx = this.argmax(forecastBatch);

    console.log('Predictions:', {
      intentIdx,
      subIntentIdx,
      timeframeTypeIdx,
      forecastIdx,
      intentLogits: Array.from(intentBatch),
      timeframeLogits: Array.from(timeframeBatch)
    });

    const intent = this.vocabulary.intent_classes[intentIdx] as IntentType;
    const subIntent = this.vocabulary.sub_intent_classes[subIntentIdx];
    const timeframeType = this.vocabulary.timeframe_classes[timeframeTypeIdx] as TimeframeType;
    const forecastType = this.vocabulary.forecast_classes[forecastIdx] as ForecastType;

    // Calculate confidence
    const intentProbs = this.softmax(intentBatch);
    const confidence = intentProbs[intentIdx];

    // Extract and resolve timeframe
    let timeframe: Timeframe | null = null;

    if (timeframeType !== 'none') {
      const timeframeValue = this.extractTimeframeValue(query, timeframeType);
      console.log('Extracted timeframe value:', timeframeValue, 'for type:', timeframeType);
      
      if (timeframeValue) {
        const resolver = new TimeframeResolver(referenceTime);
        const { start, end } = resolver.resolve(timeframeType, timeframeValue);
        timeframe = {
          type: timeframeType,
          value: timeframeValue,
          start,
          end,
        };
      }
    }

    return {
      query,
      intents: [
        {
          intent,
          sub_intent: subIntent === 'none' ? null : subIntent,
          timeframe,
          forecast_type: forecastType,
          confidence,
        },
      ],
    };
  }

  private preprocessText(text: string): { inputIds: BigInt64Array; attentionMask: BigInt64Array } {
    if (!this.vocabulary) throw new Error('Vocabulary not loaded');

    // Clean and tokenize - match Python preprocessing exactly
    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s?']/g, ' ')
      .replace(/won't/g, 'will not')
      .replace(/can't/g, 'cannot')
      .replace(/n't/g, ' not')
      .replace(/'re/g, ' are')
      .replace(/'ve/g, ' have')
      .replace(/'ll/g, ' will')
      .replace(/'d/g, ' would')
      .replace(/'m/g, ' am')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/);

    console.log('Tokenized:', cleaned);

    // Convert to indices
    const maxLen = this.vocabulary.max_seq_length;
    const inputIds = new BigInt64Array(maxLen);
    const attentionMask = new BigInt64Array(maxLen);

    // Add tokens (no SOS/EOS for BERT-style models)
    for (let i = 0; i < Math.min(cleaned.length, maxLen); i++) {
      const word = cleaned[i];
      const idx = this.vocabulary.word2idx[word] || this.vocabulary.word2idx['<UNK>'] || 1;
      inputIds[i] = BigInt(idx);
      attentionMask[i] = BigInt(1);
    }

    console.log('Input IDs:', Array.from(inputIds.slice(0, 10)));

    return { inputIds, attentionMask };
  }

  private extractTimeframeValue(query: string, timeframeType: TimeframeType): string {
    if (timeframeType === 'none') return '';

    const queryLower = query.toLowerCase();

    // Order matters - check longer phrases first!
    const keywords: Record<string, string[]> = {
      absolute_day: [
        'the day after tomorrow',
        'day after tomorrow', 
        'tomorrow',
        'yesterday', 
        'today',
        'next monday', 'next tuesday', 'next wednesday', 'next thursday',
        'next friday', 'next saturday', 'next sunday',
        'this monday', 'this tuesday', 'this wednesday', 'this thursday',
        'this friday', 'this saturday', 'this sunday',
        'last monday', 'last tuesday', 'last wednesday', 'last thursday',
        'last friday', 'last saturday', 'last sunday',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
      ],
      relative_day: [
        'over the weekend',
        'next weekend',
        'this weekend',
        'weekend',
        'next week',
        'this week',
        'last week',
        'next few days',
        'coming days',
        'few days',
        'several days',
        'couple of days'
      ],
      absolute_time: [
        'at midnight',
        'at noon',
        'midnight',
        'noon',
        'midday'
      ],
      relative_time: [
        'tonight',
        'this morning',
        'this afternoon',
        'this evening',
        'early morning',
        'late morning',
        'late afternoon',
        'late evening',
        'morning',
        'afternoon',
        'evening',
        'overnight',
        'night'
      ]
    };

    const typeKeywords = keywords[timeframeType] || [];

    // Check for keyword matches (longest first)
    for (const keyword of typeKeywords) {
      if (queryLower.includes(keyword)) {
        console.log(`Matched keyword: "${keyword}" for type: ${timeframeType}`);
        return keyword;
      }
    }

    // Check for time patterns (absolute_time)
    if (timeframeType === 'absolute_time') {
      const match = queryLower.match(/(\d+)(?::(\d+))?\s*(am|pm)/);
      if (match) {
        console.log(`Matched time pattern: "${match[0]}"`);
        return match[0];
      }
    }

    console.log(`No timeframe value found for type: ${timeframeType} in query: "${query}"`);
    return '';
  }

  private softmax(arr: Float32Array | number[]): Float32Array {
    const array = arr instanceof Float32Array ? arr : new Float32Array(arr);
    const max = Math.max(...array);
    const exps = Array.from(array).map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return new Float32Array(exps.map(x => x / sum));
  }

  private argmax(arr: Float32Array | number[]): number {
    const array = arr instanceof Float32Array ? arr : new Float32Array(arr);
    let maxIdx = 0;
    let maxVal = array[0];
    for (let i = 1; i < array.length; i++) {
      if (array[i] > maxVal) {
        maxVal = array[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  /**
   * Clear cache and force reload
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.session = null;
    this.vocabulary = null;
    this.metadata = null;
  }

  /**
   * Get model version
   */
  getVersion(): string {
    return this.metadata?.model_version || 'unknown';
  }

  /**
   * Get detailed classification info for debugging
   */
  getClassificationDetails(query: string, result: IntentResponse): string {
    const intent = result.intents[0];
    const lines: string[] = [
      `Query: "${query}"`,
      `Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(1)}%)`,
      `Sub-intent: ${intent.sub_intent || 'none'}`,
      `Forecast Type: ${intent.forecast_type}`,
    ];

    if (intent.timeframe) {
      lines.push(
        `Timeframe Type: ${intent.timeframe.type}`,
        `Timeframe Value: ${intent.timeframe.value}`,
        `Start: ${intent.timeframe.start}`,
        `End: ${intent.timeframe.end}`
      );
    } else {
      lines.push('Timeframe: none');
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifier();