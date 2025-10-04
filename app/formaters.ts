export function formatWindDirection(deg: number): string {
  const directions = [
    "North",
    "North-Northeast",
    "Northeast",
    "East-Northeast",
    "East",
    "East-Southeast",
    "Southeast",
    "South-Southeast",
    "South",
    "South-Southwest",
    "Southwest",
    "West-Southwest",
    "West",
    "West-Northwest",
    "Northwest",
    "North-Northwest",
  ];

  // Each direction covers 360 / 16 = 22.5 degrees
  const index = Math.floor((deg + 11.25) / 22.5) % 16;
  return directions[index];
}

