/*=== ENUMS  ===*/
export enum LocationType{
  Home="home",
  Work="work",
  Travel="travel",
  Other="other"
}
export enum WeatherCondition{
   Clear = "clear",  
   PartlyCloudy = "partly cloudy",
   Cloudy = "cloudy",
   Rain = "rain",
   LightRain = "light rain",
   Thunderstorm = "thunderstorm",
   Snow = "snow",
   Fog = "fog"
}

export enum WeatherIcon{
  Clear = "clear",
  PartlyCloudy= "partly_cloudy",
  Cloudy= "cloudy",
  Rain= "rain",
  Thunderstorm = "thunderstorm" ,
  Snow= "snow",
  Fog="fog"
}
export enum PrecipitationType{
  Rain= "rain",
  Snow= "snow",
  None="none"
}

export enum MoonPhase{
  NewMoon="new moon",
  WaxingCresent="waxing cresent",
  FirstQuarter="first quarter",
  WaxingGibbous="waxing gibbous",
  FullMoon="full moon",
  WaningGibbous="waning gibbous",
  LastQuarter="last quarter",
  WaningCresent="waning cresent"
}

export enum TimeframeType{
  AbsoluteDay='absolute_day',     // e.g., "tomorrow, today, thursday, monday next week,"
  RelativeDay='relative_day',    // e.g., "from Friday to Sunday, this weekend, this week, next week"
  AbsoluteTime='absolute_time',    // e.g., "at 3 PM on Monday, 3am, 12:00"
  RelativeTime='relative_time',   // e.g., "in the next 3 hours", "later today", "morning" ,"early morning"
  Uknown="uknown",
}
export enum IntentType{
  Temperature= "temperature", //sub intents e.g "feels_like", "max", "min", "avg",
  Precipitation="precipitation", //sub intents e.g "rain", "snow",
  Wind="wind", //sub intents e.g "speed", "direction"
  Cloud="cloud",
  Uv= "uv",
  Humidity= "humidity",
  Pressure="pressure",
  Visibility="visibility",
  Sun="sun", //sub intents e.g "rise", "set"
  Moon="moon", // sub intents e.g "rise", "set", "phase"
  Alerts="alerts", // sub intents e.g ""
  Activity="activity", // sub intents
  Greeting="greeting",
  FeedBack="feedback", //sub intents e.g "positive", "negative"
  Farewell="farewell",
  General="general",
  Unknown="unknown"
}
export enum ForecastType{
  Hourly="hourly",
  Daily="daily",
  All="all"
}

/*=== LOCATION TYPES=== */

export type Location = {
  name: string;
  lat: number;
  lon: number;
  type: LocationType;
  country?: string;      // ✅ helps for better location context
  timezone?: string;
};

/*=== WEATHER TYPES === */

export type CurrentEntity = {
  timestamp: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  windSpeed: number;     // ✅ remove hardcoded value
  windGust?: number;     // ✅ optional — not always present
  windDirection: number; // ✅ should be numeric degrees (0–360)
  precipitation: number;
  precipitationProbability: number;
  precipitationType?: PrecipitationType;
  condition: WeatherCondition;
  icon: WeatherIcon;
};

export type HourlyEntity = {
  timestamp: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  uvIndex: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  cloudCover: number;
  precipitationType?: PrecipitationType;
  condition: WeatherCondition;
  icon: WeatherIcon;
};

export type DailyEntity = {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  humidity: number;
  pressure: number;
  uvIndex: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  cloudCover: number;
  precipitationType?: PrecipitationType;
  sunRise?: string;
  sunSet?:string;
  moonRise?: string;
  moonSet?: string;
  moonPhase?: MoonPhase;
  condition: WeatherCondition;
  icon: WeatherIcon;
};

export type Weather = {
  id: string; // "lat{location.lat}lon{location.lon}"
  data: {
    current: CurrentEntity;
    hourly: HourlyEntity[];
    daily: DailyEntity[];
  };
  timestamp: number;
  source: "open-meteo" | "tomorrow.io";
};


export type Intent = {
  intent: string;              // main category: "precipitation", "temperature", etc.
  sub_intent?: string;         // finer meaning: "rain", "snow", "hot", "cold", etc.
  timeframe?: TimeframeType;
  start: string, // ISO 8601 timestamp or date
  end: string, // ISO 8601 timestamp or date
  forecast_type?: ForecastType;  // determines granularity
  confidence?: number;        // 0–1 model confidence
};
