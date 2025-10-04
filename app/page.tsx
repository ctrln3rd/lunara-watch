"use client";

import { act, useState } from "react";
import { Location } from "./types";
import LocationManagerUI from "./locations";
import Weather from "./weather";
import Animations from "./animations";
import { getWeatherGradientClass } from "./weatherCodes";


export default function Home(){
  const [activeLocation, setActiveLocation] = useState<Location | null>(null)
  const [weatherCodeHome, seWeathercodeHome] = useState<number>(0)
  return(
     <div className={`flex flex-col items-center gap-10 pt-[10dvh] min-h-dvh pb-10 bg-fixed ${getWeatherGradientClass(weatherCodeHome)}`}>
      <h1 className="font-semibold text-lg md:text-xl lg:text-2xl"> -- Lunara Watch --</h1>
      <Animations weatherCode={weatherCodeHome}/>
       <LocationManagerUI activeLocation={activeLocation} setActiveLocation={setActiveLocation}/>
       <Weather activeLocation={activeLocation} setWeatherCodeHome={seWeathercodeHome}/>
     </div>
  )
}