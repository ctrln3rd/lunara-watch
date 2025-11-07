"use client";

import { useMemo } from "react";

export default function AnimationsBack() {
  const stars = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 150; i++) {
      const sizeClass =
        Math.random() < 0.6 ? "star-small" : Math.random() < 0.8 ? "star-medium" : "star-large";

      temp.push({
        id: i,
        top: Math.random() * 100, // vh
        left: Math.random() * 100, // vw
        delay: Math.random() * 2, // seconds
        sizeClass,
      });
    }
    return temp;
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star ${star.sizeClass}`}
          style={{
            top: `${star.top}vh`,
            left: `${star.left}vw`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
