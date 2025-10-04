import React from "react";
import { getWeatherAnimationClass } from "./weatherCodes";

const Animations = ({ weatherCode }: { weatherCode: number }) => {
  const animationClass = getWeatherAnimationClass(weatherCode);

  // Helper to generate random delay
  const randomDelay = (max: number) => `${Math.random() * max}s`;

  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${animationClass}`}
    >
      {/* Rain */}
      {animationClass === "animate-rain" &&
        [...Array(30)].map((_, i) => (
          <div
            key={i}
            className="raindrop"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: randomDelay(2), // random delay up to 2s
            }}
          />
        ))}

      {/* Snow */}
      {animationClass === "animate-snow" &&
        [...Array(15)].map((_, i) => (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: randomDelay(5), // snow falls slower
            }}
          >
            ❄
          </div>
        ))}

      {/* Thunderstorm */}
      {animationClass === "animate-thunderstorm" && <div className="flash" />}

      {/* Fog */}
      {animationClass === "animate-fog" &&
        [...Array(3)].map((_, i) => (
          <div
            key={i}
            className="fog-move"
            style={{
              top: `${i * 20}%`,
              animationDelay: randomDelay(4),
            }}
          />
        ))}
    </div>
  );
};

export default Animations;
