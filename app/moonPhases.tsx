// moonPhases.tsx
import React from "react";

export const MoonPhases: Record<number, { label: string; icon: React.ReactElement }> = {
  0: {
    label: "New Moon",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  1: {
    label: "Waxing Crescent",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <path d="M12 2a10 10 0 0 0 0 20z" />
      </svg>
    ),
  },
  2: {
    label: "First Quarter",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <rect x="12" y="2" width="10" height="20" />
      </svg>
    ),
  },
  3: {
    label: "Waxing Gibbous",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <path d="M12 2a10 10 0 0 1 0 20z" />
      </svg>
    ),
  },
  4: {
    label: "Full Moon",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  5: {
    label: "Waning Gibbous",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <path d="M12 2a10 10 0 0 0 0 20z" />
      </svg>
    ),
  },
  6: {
    label: "Third Quarter",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <rect x="2" y="2" width="10" height="20" />
      </svg>
    ),
  },
  7: {
    label: "Waning Crescent",
    icon: (
      <svg viewBox="0 0 24 24" className="aspect-square w-8 md:w-10 lg:w-14 fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-30" />
        <path d="M12 2a10 10 0 0 1 0 20z" />
      </svg>
    ),
  },
};
