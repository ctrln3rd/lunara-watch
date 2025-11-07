"use client";

import { useEffect, useState } from "react";
import { Location, Weather } from "./types";
import { fetchWeather, getCachedWeather } from "./weatherManager";
import { formatWindDirection } from "./formaters";
import { formatDistanceToNow } from "date-fns";
import { LayoutList, SendHorizonal, Loader2 } from "lucide-react";
import DetailedWeather from "./detailedWeather";

import { IntentProcessor } from "./model/model";
import { interpretWeather } from "./model/interpreter";

interface WeatherProps {
  activeLocation: Location | null;
  setMoonPhase: (vl: number) => void;
}

const MODEL_URL = "/models/intent_model.onnx";
const VOCAB_URL = "/models/vocabulary.json";
const METADATA_URL = "/models/frontend_metadata.json";
const MODEL_VERSION = "1.0.0";

export default function WeatherComponent({ activeLocation }: WeatherProps) {
  const [weatherData, setWeatherData] = useState<Weather | null>(null);
  const [resStatus, setResStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"insights" | "detailed">("insights");

  // 🔮 Query & AI states
  const [userQuery, setUserQuery] = useState("");
  const [responses, setResponses] = useState<
    { query: string; response: string; confidence: number }[]
  >([]);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [typedResponse, setTypedResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 🌩️ Initialize model processor
  const [intentProcessor] = useState(() => new IntentProcessor());

  // Load model once when location changes
  useEffect(() => {
    if (!activeLocation) return;
    let mounted = true;

    (async () => {
      try {
        await intentProcessor.initialize(MODEL_URL, VOCAB_URL, METADATA_URL, MODEL_VERSION);
        if (mounted) console.log("✅ Intent model ready");
      } catch (err) {
        console.error("❌ Model init failed:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeLocation, intentProcessor]);

  // Load weather data
  useEffect(() => {
    if (!activeLocation) return;
    setResponses([]);
    const loadWeather = async () => {
      setResStatus("loading weather...");
      try {
        const cached = getCachedWeather(activeLocation.lat, activeLocation.lon);
        const data = cached ?? (await fetchWeather(activeLocation));
        if (data) {
          setWeatherData(data);
          setResStatus(null);
        }
      } catch (err) {
        console.error("Error loading weather:", err);
        setResStatus("error loading data");
      }
    };
    loadWeather();
  }, [activeLocation]);

  // Manual refresh
  async function handleRefresh(location: Location) {
    setResStatus("updating data...");
    try {
      const updated = await fetchWeather(location);
      if (updated) {
        setWeatherData(updated);
        setResStatus(null);
      }
    } catch (err) {
      console.error("Error refreshing weather:", err);
      setResStatus("error updating");
      setTimeout(() => setResStatus(null), 2000);
    }
  }

  // ✨ Typing animation
  function simulateTyping(fullText: string, confidence: number) {
    setIsTyping(true);
    setTypedResponse("");
    const branded = `Lunara Weather AI says: ${fullText}`;
    let i = 0;
    const interval = setInterval(() => {
      setTypedResponse(branded.slice(0, i));
      i++;
      if (i > branded.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 25);

    setTimeout(() => {
      setResponses((prev) => [
        { query: userQuery, response: branded, confidence },
        ...prev,
      ]);
    }, branded.length * 25 + 300);
  }

  // 🧠 Handle user queries
  async function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = userQuery.trim();
    if (!trimmed || !weatherData) return;

    setLoadingQuery(true);
    setTypedResponse("");
    setIsTyping(false);

    try {
      if (!intentProcessor.isLoaded()) {
        throw new Error("Model not initialized");
      }

      // Step 1 — Predict with new ONNX model
      const intentResult = await intentProcessor.predict(trimmed);
       console.log("intent result:", intentResult)
      // Step 2 — Use interpreter to generate final text
      const finalText = await interpretWeather(weatherData, intentResult);

      // Step 3 — Simulate typing output
      simulateTyping(
        finalText || "Sorry, I couldn’t interpret that query.",
        intentResult.confidence ?? 0
      );
    } catch (err) {
      console.error("❌ Query interpretation failed:", err);
      simulateTyping("Sorry, something went wrong understanding your question.", 0);
    } finally {
      setLoadingQuery(false);
      setUserQuery("");
    }
  }

  // No location yet
  if (!activeLocation)
    return <p className="text-gray-500 italic">Select a location to view weather.</p>;

  const current = weatherData?.data.current;

  return (
    <div className="flex flex-col items-center gap-5 px-2 md:px-[5vw] lg:px-[10vw]">
      {weatherData?.timestamp && (
        <div className="flex gap-3 items-center text-sm font-light self-end">
          <span className="italic">
            last fetched{" "}
            <span className="text-fuchsia-500">
              --{formatDistanceToNow(new Date(weatherData.timestamp), { addSuffix: true })}--
            </span>
          </span>
          <button
            className="flex gap-1 items-center border border-gray-100/20 py-1 px-3 rounded"
            onClick={() => handleRefresh(activeLocation)}
          >
            refresh
          </button>
        </div>
      )}

      {resStatus && (
        <div className="italic text-sm opacity-80 border-y border-y-gray-300/50 py-3 w-full flex justify-center items-center px-10 text-amber-500">
          {resStatus}
        </div>
      )}

      {!resStatus && current && (
        <div className="p-6 border border-gray-300/5 bg-gray-900/40 rounded-lg space-y-4 min-w-[60vw] flex flex-col gap-10 items-center">
          {/* Current weather */}
          <div className="self-start flex items-stretch gap-5 justify-center">
            <div className="flex flex-col items-start gap-3 py-2">
              <span className="text-3xl">{Math.round(Number(current.temperature))}°</span>
              <span className="text-sm italic opacity-90">
                Feels like: {Math.round(Number(current.feelsLike))}°
              </span>
              <span className="italic">{current.condition || "clear"}</span>
            </div>
            <div className="w-1 bg-fuchsia-400/40" />
            <div className="flex flex-col items-start gap-3 py-2">
              <span>
                {formatWindDirection(current.windDirection)} wind — {current.windSpeed} m/s
              </span>
              <span>Humidity: {current.humidity}%</span>
              <span>UV: {current.uvIndex}</span>
            </div>
          </div>

          {/* 🗣️ Query Input */}
          <div className="w-full flex flex-col gap-3 border-t border-gray-300/10 pt-4">
            <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ask something like 'Will it rain tomorrow afternoon?'"
                className="flex-1 bg-gray-800/40 border border-gray-700 rounded-xl py-2 px-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
              />
              <button
                type="submit"
                disabled={loadingQuery}
                className="p-2 rounded-xl bg-fuchsia-600/70 hover:bg-fuchsia-600 disabled:opacity-50"
              >
                {loadingQuery ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4" />
                )}
              </button>
            </form>

            {isTyping && (
              <div className="text-sm bg-gray-800/30 border border-gray-700/40 p-3 rounded-lg animate-pulse text-gray-200 italic">
                {typedResponse || "Lunara Weather AI is thinking..."}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-2 max-h-[220px] overflow-y-auto pr-2">
              {responses.length === 0 && !isTyping && (
                <p className="text-sm italic opacity-50">
                  Ask Lunara a weather question above 🌙
                </p>
              )}
              {responses.map((r, idx) => (
                <div
                  key={idx}
                  className="border border-gray-700/30 rounded-lg p-3 text-sm bg-gray-800/40"
                >
                  <p className="text-fuchsia-400/90 font-medium">You: {r.query}</p>
                  <p className="text-gray-200 mt-1">{r.response}</p>
                  <p className="text-xs opacity-50 mt-1">
                    Confidence: {(r.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 self-end">
            <button
              onClick={() => setViewMode(viewMode === "insights" ? "detailed" : "insights")}
              className="flex gap-1 items-center border border-gray-100/20 py-1 px-3 rounded"
            >
              <LayoutList className="w-4 h-4" />
              {viewMode === "insights" ? "Detailed" : "Insights"}
            </button>
          </div>

          {viewMode === "detailed" && <DetailedWeather weather={weatherData.data} />}
        </div>
      )}

      {weatherData && (
        <p className="italic text-xs">
          Data by: <span className="opacity-50">{weatherData.source}</span>
        </p>
      )}
    </div>
  );
}
