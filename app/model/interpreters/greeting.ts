import { Intent } from "../../types";

export default function greetingInterpreter(
  filtered: any,
  intent: Intent
): string {
  const subtype = intent.sub_intent || "general";

  const templates: Record<string, string[]> = {
    morning: [
      "Good morning! How can I help you today?",
      "Morning! Hope your day is off to a great start.",
      "Good morning! Ready to explore the weather?"
    ],

    afternoon: [
      "Good afternoon! What would you like to know?",
      "Hello! Hope your afternoon is going well.",
      "Good afternoon! How can I assist?"
    ],

    evening: [
      "Good evening! How may I assist you?",
      "Evening! Hope you’re having a relaxing time.",
      "Good evening! Need help with anything?"
    ],

    night: [
      "Good night! Need anything before you rest?",
      "Hope you had a great day! How can I help?",
      "Good night! I'm still here if you need something."
    ],

    casual: [
      "Hey! What can I do for you?",
      "Hi! How can I help?",
      "Yo! What’s up?"
    ],

    formal: [
      "Hello. How may I assist you today?",
      "Greetings. How can I help?",
      "Hello. Please tell me how I can assist."
    ],

    friendly: [
      "Hi there! How’s everything going?",
      "Hello! Great to see you.",
      "Hey! What brings you here today?"
    ],

    general: [
      "Hello! How can I help you?",
      "Hi! What would you like to explore?",
      "Hello! How may I assist today?"
    ],
  };

  // pick the right template group
  const group = templates[subtype] || templates.general;

  // pick a random option for natural variety
  const response = group[Math.floor(Math.random() * group.length)];

  return response;
}
