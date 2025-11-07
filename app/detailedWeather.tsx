import { useState, useEffect } from "react";
import { Weather } from "./types";
import { parseISO, format } from "date-fns";
import { formatWindDirection } from "./formaters";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DetailedWeather({weather} : {weather: Weather["data"]}){
    const [activeDayIndex, setActiveDayIndex] = useState<number>(0); // track current daily day
    const [activeHourIndex, setActiveHourIndex] = useState<number>(0);

    useEffect(()=>{
      const initialHourIndex = weather.hourly.findIndex((h) =>
        h.timestamp.startsWith(weather.daily[activeDayIndex].date.split("T")[0])
        );
        setActiveHourIndex(initialHourIndex !== -1 ? initialHourIndex : 0)

    },[activeDayIndex])

    return(
    <div className="w-full flex flex-col items-start gap-15">
        {/* Daily */}
        <div className="w-full flex flex-col items-start gap-5">
        <h3 className="mb-2 font-semibold">Daily</h3>
        <div className="flex items-center gap-2 flex-wrap">
            {weather.daily.map((d, idx) => {
             //const Icon = getWeatherIcon(0); 
            return(
            <div
                key={d.date}
                onClick={() => setActiveDayIndex(idx)}
                className={`px-3 py-2 border rounded cursor-pointer flex flex-col items-center gap-1 ${
                idx === activeDayIndex ? "bg-gray-300/20 border-gray-500" : "border-gray-300/20"
                }`}
            >
                <span>{format(new Date(d.date), "EEE")}</span>
                <span className="italic opacity-70">{d.condition}</span>
            </div>
            )})}
        </div>
        <div className="w-full py-3 border-y border-y-gray-400/50 flex flex-col items-start gap-3">
        <h4 className="text-sm italic opacity-70">Selected day- {format(parseISO(weather.daily[activeDayIndex].date), "EEEE")}</h4>
        <span>Average Temp: {(weather.daily[activeDayIndex].temperatureMax + weather.daily[activeDayIndex].temperatureMax)/2}°</span>
            <span>Moon phase: {weather.daily[activeDayIndex].moonPhase}</span>
            <span>precipitation Probability: {weather.daily[activeDayIndex].precipitationProbability} %</span>
            <span>Precipitation Intensity: {weather.daily[activeDayIndex].precipitation} mm/hr</span>
            <span>Wind Speed & Direction: {weather.daily[activeDayIndex].windSpeed}m/s - {formatWindDirection(weather.daily[activeDayIndex].windDirection)}</span>
            <span></span>
        </div>
        </div>

        

        {/* Hourly */}
        <div className="w-full">
        <h3 className="mb-2 font-semibold">Hourly</h3>
        <h3 className="text-lg italic opacity-70">
        {weather.daily && format(new Date(weather.daily[activeDayIndex].date), "EEEE, MMM d")}
        </h3>
        <div className="flex items-center gap-2">
            <button onClick={() => setActiveDayIndex((i) => Math.max(0, i - 1))}>
            <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center flex-1 flex-wrap gap-1">
            {weather.hourly
                .filter((h) => h.timestamp.startsWith(weather.daily[activeDayIndex].date.split("T")[0]))
                .map((h) => {
                    //const Icon = getWeatherIcon(0); 
                    const globalIndex = weather.hourly.findIndex(
                        (x) => x.timestamp === h.timestamp
                    );
                return(
                <div
                    key={h.timestamp}
                    onClick={()=>setActiveHourIndex(globalIndex)}
                    className={`px-3 border border-gray-300/20 rounded flex flex-col items-center gap-2 cursor-pointer 
                        ${activeHourIndex === globalIndex && "bg-gray-300/20 border-gray-500"}`}
                >
                    <h4>{format(parseISO(h.timestamp), "ha").toLowerCase()}</h4>
                    <span>{h.temperature.toFixed(0)}°</span>
                    {/*<Icon className="aspect-square w-8 md:w-10 lg:w-12"/>*/}
                </div>
                )})}
            </div>
            <button onClick={() => setActiveDayIndex((i) => Math.min(weather.daily.length - 1, i + 1))}>
            <ChevronRight className="w-5 h-5" />
            </button>
        </div>
        <div className="w-full py-3 border-y border-y-gray-400/50 flex flex-col items-start gap-3">
            <h4 className="text-sm italic opacity-70">selected hour- {format(parseISO(weather.hourly[activeHourIndex].timestamp), "ha").toLowerCase()}</h4>
            <span>Average Temp: {weather.hourly[activeHourIndex].temperature}°</span>
            <span>precipitation Probability: {weather.hourly[activeHourIndex].precipitationProbability} %</span>
            <span>Precipitation Intensity: {weather.hourly[activeHourIndex].precipitation} mm/hr</span>
            <span>Wind Speed & Direction: {weather.hourly[activeHourIndex].windSpeed}m/s - {formatWindDirection(weather.daily[activeDayIndex].windDirection)}</span>
            <span></span>
        </div>
        </div>
    </div>
    )
}