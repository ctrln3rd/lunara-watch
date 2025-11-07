import { Weather, Intent } from '../../types';
export default function cloudCoverInterpreter(weather: Weather, intent: Intent): string {
// TODO: Summarize sky cover (clear, partly cloudy, overcast)
return `The cloud cover intent was detected.`;
}