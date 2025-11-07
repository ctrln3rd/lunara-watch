"use client";

import { useState } from "react";
import { Location } from "./types";
import LocationManagerUI from "./locations";
import WeatherComponent from "./weather";
import AnimationsBack from "./backgrounAnimations";
import Moon from "./moon";

export default function Home() {
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [moonPhase, setMoonPhase] = useState<number>(0); // later update based on response

  return (
    <div className="flex flex-col items-center gap-10 pt-[10dvh] min-h-dvh pb-10 relative bg-gradient-to-b from-slate-900 to-gray-700 bg-fixed">
      <h1 className="font-semibold text-lg md:text-xl lg:text-2xl z-10">-- Lunara Watch --</h1>
      
      {/* Starry night animation */}
      <AnimationsBack />

      {/* Optional: Moon placeholder */}
      <div className="absolute top-20 right-10 z-20 opacity-50">
         <Moon phase={5}/>
      </div>

      <LocationManagerUI activeLocation={activeLocation} setActiveLocation={setActiveLocation} />
      <WeatherComponent activeLocation={activeLocation} setMoonPhase={setMoonPhase}/>
    </div>
  );
}
