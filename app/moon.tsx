"use client";

interface MoonProps {
  phase: number; // 0-7
  size?: number; // diameter in px
  color?: string; // moon color
}

export default function Moon({ phase, size = 50, color = "#FFD700" }: MoonProps) {
  /*
    Phase mapping (0-7):
    0: New (0.0625-0.9375)
    1: Waxing Crescent (0.0625-0.1875)
    2: First Quarter (0.1875-0.3125)
    3: Waxing Gibbous (0.3125-0.4375)
    4: Full (0.4375-0.5625)
    5: Waning Gibbous (0.5625-0.6875)
    6: Third Quarter (0.6875-0.8125)
    7: Waning Crescent (0.8125-0.9375)
  */

  const renderMoon = () => {
    switch (phase) {
      case 0: // New Moon
        return (
          <circle cx={size/2} cy={size/2} r={size/2} fill="transparent" />
        );
      case 1: // Waxing Crescent
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={size/2} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      case 2: // First Quarter
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={size/2} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      case 3: // Waxing Gibbous
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={size*0.25} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      case 4: // Full Moon
        return (
          <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
        );
      case 5: // Waning Gibbous
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={size*0.25} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      case 6: // Third Quarter
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={0} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      case 7: // Waning Crescent
        return (
          <>
            <circle cx={size/2} cy={size/2} r={size/2} fill={color} />
            <rect x={0} y={0} width={size/2} height={size} fill="black" />
          </>
        );
      default:
        return <circle cx={size/2} cy={size/2} r={size/2} fill={color} />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderMoon()}
    </svg>
  );
}
