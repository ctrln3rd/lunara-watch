import { Weather, Intent } from '../../types';
export default function windInterpreter(weather: Weather, intent: Intent): string {
// TODO: Summarize wind speed, direction, gusts
return `The wind intent was detected (${intent.sub_intent || 'general'}).`;
}