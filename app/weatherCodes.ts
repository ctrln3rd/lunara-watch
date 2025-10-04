import {
  Sun,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  CloudHail,
  Moon,
  Zap,

  Wind,
} from "lucide-react";

export interface WeatherCodeEntry {
  code: number;
  description: string;
  icon: React.ElementType;
  gradient: string;
  animation: string;
}

export const weatherCodes: WeatherCodeEntry[] = [
  {
    code: 0,
    description: "Unknown",
    icon: Sun,
    gradient: "clear",
    animation: "uknown",
  },
  {
    code: 1000,
    description: "Clear, Sunny",
    icon: Sun,
    gradient: "clear",
    animation: "sunny",
  },
  {
    code: 1100,
    description: "Mostly Clear",
    icon: CloudSun,
    gradient: "clear",
    animation: "few-clouds",
  },
  {
    code: 1101,
    description: "Partly Cloudy",
    icon: CloudSun,
    gradient: "cloud",
    animation: "clouds",
  },
  {
    code: 1102,
    description: "Mostly Cloudy",
    icon: Cloud,
    gradient: "overcast",
    animation: "overcast",
  },
  {
    code: 1001,
    description: "Cloudy",
    icon: Cloud,
    gradient: "overcast",
    animation: "overcast",
  },
  {
    code: 2000,
    description: "Fog",
    icon: CloudFog,
    gradient: "fog",
    animation: "fog",
  },
  {
    code: 2100,
    description: "Light Fog",
    icon: CloudFog,
    gradient: "fog",
    animation: "fog",
  },
  {
    code: 4000,
    description: "Drizzle",
    icon: CloudDrizzle,
    gradient: "drizzle",
    animation: "rain",
  },
  {
    code: 4001,
    description: "Rain",
    icon: CloudRain,
    gradient: "drizzle",
    animation: "rain",
  },
  {
    code: 4200,
    description: "Light Rain",
    icon: CloudRain,
    gradient: "drizzle",
    animation: "rain",
  },
  {
    code: 4201,
    description: "Heavy Rain",
    icon: CloudRain,
    gradient: "rain",
    animation: "rain",
  },
  {
    code: 5000,
    description: "Snow",
    icon: CloudSnow,
    gradient: "snow",
    animation: "snow",
  },
  {
    code: 5001,
    description: "Flurries",
    icon: CloudSnow,
    gradient: "snow",
    animation: "snow",
  },
  {
    code: 5100,
    description: "Light Snow",
    icon: CloudSnow,
    gradient: "snow",
    animation: "snow",
  },
  {
    code: 5101,
    description: "Heavy Snow",
    icon: CloudSnow,
    animation: "snow",
    gradient: "snow",
  },
  {
    code: 6000,
    description: "Freezing Drizzle",
    icon: CloudDrizzle,
    gradient: "drizzle",
    animation: "rain",
  },
  {
    code: 6001,
    description: "Freezing Rain",
    icon: CloudRain,
    gradient: "rain",
    animation: "rain",
  },
  {
    code: 6200,
    description: "Light Freezing Rain",
    icon: CloudRain,
    gradient: "rain",
    animation: "rain",
  },
  {
    code: 6201,
    description: "Heavy Freezing Rain",
    icon: CloudRain,
    gradient: "rain",
    animation: "rain",
  },
  {
    code: 7000,
    description: "Ice Pellets",
    icon: CloudHail,
    gradient: "ice",
    animation: "ice",
  },
  {
    code: 7101,
    description: "Heavy Ice Pellets",
    icon: CloudHail,
    gradient: "ice",
    animation: "ice",
  },
  {
    code: 7102,
    description: "Light Ice Pellets",
    icon: CloudHail,
    gradient: "ice",
    animation: "ice",
  },
  {
    code: 8000,
    description: "Thunderstorm",
    icon: CloudLightning,
    gradient: "thunderstorm",
    animation: "thunderstorm",
  },
];


export function getWeatherEntry(code: number): WeatherCodeEntry | undefined {
  return weatherCodes.find((w) => w.code === code);
}

export function getWeatherDescription(code: number): string {
  const entry = getWeatherEntry(code);
  return entry ? entry.description : "Unknown";
}

export function getWeatherIcon(
  code: number,
  isDay: boolean
): React.ElementType {
  const entry = getWeatherEntry(code);
  if (!entry) return Sun; // fallback
  return entry.icon;
}

export function getWeatherGradientClass(code: number): string {
  const entry = getWeatherEntry(code);
  if (!entry) return "bg-unknown";
  return `bg-${entry.gradient}`;
}

export function getWeatherAnimationClass(code: number): string {
  const entry = getWeatherEntry(code);
  if (!entry) return "animate-unknown";
  return `animate-${entry.animation}`;
}

