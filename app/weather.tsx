"use client";

import { useEffect, useState } from "react";
import { Location, WeatherData, Insight } from "./types";
import { fetchWeather, getWeatherForLocation } from "./weatherManager";
import { getWeatherDescription } from "./weatherCodes";
import { Thermometer, Umbrella, Wind, Droplet, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { formatWindDirection } from "./formaters";
import { generatePrecipitationInsights } from "./precipitationInsights";
import { generateTemperatureInsights } from "./temperatureInsights";
import { formatDistanceToNow, format } from "date-fns";
import { MoonPhases } from "./moonPhases";

interface WeatherProps {
  activeLocation: Location | null;
  setWeatherCodeHome: (vl: number) => void;
}

export default function Weather({ activeLocation, setWeatherCodeHome }: WeatherProps) {
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherData["data"] | null>(null);
  const [resStatus, setResStatus] = useState<string | null>(null);

  const [precipitationInsights, setPrecipitationInsights] = useState<Insight[] | null>(null);
  const [temperatureInsights, setTemperatureInsights] = useState<Insight[] | null>(null);

  const [viewMode, setViewMode] = useState<"insights" | "detailed">("insights"); // toggle view
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0); // track current daily day

  // Fetch weather
  useEffect(() => {
    if (!activeLocation) return;

    const loadWeather = async () => {
      setResStatus("loading weather....");

      try {
        const saveddata = getWeatherForLocation(activeLocation.lat, activeLocation.lon);
        const data = saveddata ?? (await fetchWeather(activeLocation.name, activeLocation.lat, activeLocation.lon));

        if (data) {
          feedData(data);
          setTimeout(() => setResStatus(null), 1000);
        }
      } catch (err: any) {
        setResStatus("error loading data");
      }
    };

    loadWeather();
  }, [activeLocation]);

  function feedData(data: WeatherData) {
    if (data.data) {
      setWeather(data.data);
      setWeatherCodeHome(data.data.current?.weatherCode || 0);
    }
    setLastFetched(data.timestamp);
    setPrecipitationInsights(generatePrecipitationInsights(data.data.hourly, data.data.daily) || null);
    setTemperatureInsights(generateTemperatureInsights(data.data.hourly, data.data.daily) || null);
  }

  async function handleRefresh(activeLocation: Location) {
    setResStatus("updating data....");
    try {
      const response = await fetchWeather(activeLocation.name, activeLocation.lat, activeLocation.lon);
      if (response) {
        feedData(response);
        setTimeout(() => setResStatus(null), 1000);
      }
    } catch (err) {
      console.error("error updating data:", err);
      setResStatus("error updating");
      setTimeout(() => setResStatus(null), 2000);
    }
  }

  // Early returns
  if (!activeLocation) return <p className="text-gray-500 italic">Select a location to view weather.</p>;

  return (
    <div className="flex flex-col items-center gap-5 px-2 md:px-[5vw] lg:px-[10vw]">
      {lastFetched && (
        <div className="flex gap-3 items-center text-sm font-light self-end">
          <span>last fetched --{timeAgo(lastFetched)}--</span>
          <button
            className="flex gap-1 items-center border border-gray-100/20 py-1 px-3 rounded"
            onClick={() => handleRefresh(activeLocation)}
          >
            refresh
          </button>
        </div>
      )}

      {resStatus && (
        <div className="italic text-sm opacity-80 border-y border-y-gray-300/50 py-3 w-full items-center px-10">
          {resStatus}
        </div>
      )}

      {(!resStatus && weather) && (
        <div className="p-6 border border-gray-100/20 bg-gray-200/15 rounded-lg space-y-4 min-w-[60vw] flex flex-col gap-10 items-center">
          {/* Current overview */}
          <div className="flex flex-col items-center gap-5">
            <div className="font-semibold">
              <span className="text-7xl">{weather.current?.temperature}°</span>
            </div>
            <div>{getWeatherDescription(weather.current?.weatherCode || 0)}</div>
            <div>
              <span>{formatWindDirection(weather.current?.windDirection || 0)} wind</span> -
              <span>{weather.current?.windSpeed} m/s</span>
            </div>
            {typeof weather.current?.moonPhase === "number" && (
              <div className="flex  items-center gap-2">
                {MoonPhases[weather.current.moonPhase].icon}
                <p className="text-xs opacity-70">
                  {MoonPhases[weather.current.moonPhase].label}
                </p>
              </div>
            )}
          </div>

          {/* Toggle View Button */}
          <div className="flex gap-2 self-end">
            <button
              onClick={() => setViewMode(viewMode === "insights" ? "detailed" : "insights")}
              className="flex gap-1 items-center border border-gray-100/20 py-1 px-3 rounded"
            >
              <LayoutList className="w-4 h-4" />
              {viewMode === "insights" ? "Detailed" : "Insights"}
            </button>
          </div>

          {/* Insights View */}
          {viewMode === "insights" && (
            <>
              <div className=" flex flex-col items-start gap-5">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Thermometer className="aspect-square w-10" />
                  Temperature
                </h2>
                {temperatureInsights && (
                  <div className="space-y-2 mt-2 flex flex-col items-start gap-3">
                    {temperatureInsights.map((i, index) => {
                      const Icon = require("lucide-react")[i.icon];
                      return (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          {Icon && <Icon className="w-5 h-5 text-gray-300/50" />}
                          <span>{i.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-full h-1 bg-gray-500/20" />

              <div className=" flex flex-col items-start gap-5">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Umbrella className="aspect-square w-10" />
                  Precipitation
                </h2>
                {precipitationInsights && (
                  <div className="space-y-2 mt-2 flex flex-col items-start gap-3">
                    {precipitationInsights.map((i, index) => {
                      const Icon = require("lucide-react")[i.icon];
                      return (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          {Icon && <Icon className="w-5 h-5 text-gray-300/50" />}
                          <span>{i.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Detailed View */}
          {viewMode === "detailed" && (
            <div className="w-full flex flex-col items-start gap-7">
              {/* Daily */}
              <div className="w-full">
                <h3 className="mb-2 font-semibold">Daily</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {weather.daily.map((d, idx) => (
                    <div
                      key={d.startTime}
                      onClick={() => setActiveDayIndex(idx)}
                      className={`px-3 py-2 border rounded cursor-pointer flex flex-col items-center gap-1 ${
                        idx === activeDayIndex ? "bg-gray-300/20 border-gray-500" : "border-gray-300/20"
                      }`}
                    >
                      <span>{format(new Date(d.startTime), "EEE")}</span>
                      <span>{d.temperature.toFixed(0)}° / {d.temperature.toFixed(0)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly */}
              <div className="w-full">
                <h3 className="mb-2 font-semibold">Hourly</h3>
                <h3 className="text-lg italic opacity-70">
                {weather.daily && format(new Date(weather.daily[activeDayIndex].startTime), "EEEE, MMM d")}
              </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveDayIndex((i) => Math.max(0, i - 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center flex-1 flex-wrap gap-1">
                    {weather.hourly
                      .filter((h) => h.startTime.startsWith(weather.daily[activeDayIndex].startTime.split("T")[0]))
                      .map((h) => (
                        <div
                          key={h.startTime}
                          className="px-3 border border-gray-300/20 rounded flex flex-col items-center gap-2"
                        >
                          <h4>{formatHour(h.startTime)}</h4>
                          <span>{h.temperature.toFixed(0)}°C</span>
                          <span>{h.precipitationProbability}%</span>
                        </div>
                      ))}
                  </div>
                  <button onClick={() => setActiveDayIndex((i) => Math.min(weather.daily.length - 1, i + 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {weather && (
        <p className="italic text-xs">
          Data by: <span className="opacity-50">tommorrow.io</span>
        </p>
      )}
    </div>
  );
}

function timeAgo(timestamp: number | Date): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

function formatHour(timestamp: number | Date | string): string {
  return format(new Date(timestamp), "ha").toLowerCase();
}

