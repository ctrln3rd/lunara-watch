import { Weather, Intent } from '../../types';
export  function sunInterpreter(weather: Weather, intent: Intent): string {
// TODO: Include sunrise/sunset times, daylight duration
return `The sun intent was detected.`;
}

export  function moonInterpreter(weather: Weather, intent: Intent): string {
// TODO: Include moon phase, illumination, rise/set
return `The moon intent was detected.`;
}