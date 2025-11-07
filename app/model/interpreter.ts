import { Intent, Weather, IntentType } from "../types";
import { filterWeatherByIntent } from "./weatherFilter"; // ✅ your previous util
import temperatureInterpreter from "./interpreters/temperature";
import precipitationInterpreter from "./interpreters/precipitation";
import windInterpreter from "./interpreters/wind";
import humidityInterpreter from "./interpreters/humidity";
import pressureInterpreter from "./interpreters/pressure";
import uvInterpreter from "./interpreters/uv";
import cloudCoverInterpreter from "./interpreters/cloud";
import visibilityInterpreter from "./interpreters/visibility";
import { sunInterpreter, moonInterpreter } from "./interpreters/astro";
import alertsInterpreter from "./interpreters/alerts";
import generalInterpreter from "./interpreters/general";
import greetingInterpreter from "./interpreters/greeting";

/**
 * Maps intent types to corresponding interpreter modules.
 */
const interpreterMap: Record<string, (weather: any, intent: Intent) => Promise<string> | string> = {
  [IntentType.Temperature]: temperatureInterpreter,
  [IntentType.Precipitation]: precipitationInterpreter,
  [IntentType.Wind]: windInterpreter,
  [IntentType.Humidity]: humidityInterpreter,
  [IntentType.Pressure]: pressureInterpreter,
  [IntentType.Uv]: uvInterpreter,
  [IntentType.Cloud]: cloudCoverInterpreter,
  [IntentType.Visibility]: visibilityInterpreter,
  [IntentType.Sun]: sunInterpreter,
  [IntentType.Moon]: moonInterpreter,
  [IntentType.Alerts]: alertsInterpreter,
  [IntentType.General]: generalInterpreter,
  [IntentType.Greeting]: greetingInterpreter,
};

/**
 * Main dispatcher:
 *  - Filters weather data using the detected intent timeframe and forecast type
 *  - Routes to the best interpreter module
 */
export async function interpretWeather(weather: Weather, intent: Intent): Promise<string> {
  if (!weather?.data) return "No weather data available to interpret.";
  if (!intent?.intent) return "Sorry, I couldn’t determine the type of weather info you’re asking for.";

  try {
    // ✅ Step 1: Filter weather data based on timeframe + forecast type
    const filteredResult = filterWeatherByIntent(weather, intent);

    if (!filteredResult || filteredResult.count === 0) {
      return "No matching weather data found for the specified timeframe.";
    }

    // ✅ Step 2: Get the appropriate interpreter
    const interpreter = interpreterMap[intent.intent as IntentType] ?? generalInterpreter;

    // ✅ Step 3: Run interpreter with filtered subset
    const result = await interpreter(filteredResult, intent);

    // ✅ Step 4: Return meaningful fallback
    return result ?? "No detailed insight available for that request.";
  } catch (err: any) {
    console.error(`❌ Interpreter error for intent "${intent.intent}":`, err);
    return "There was an issue interpreting the weather data. Please try again.";
  }
}
