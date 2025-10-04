"use client";

import { useState, useEffect } from "react";

type NotificationType = "loading" | "default";

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 🔹 global notify
  useEffect(() => {
    (window as any).notify = (message: string, type: NotificationType = "default") => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, message, type }]);

      if (type !== "loading") {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 2000);
      }
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-50">
      {notifications.map((note) => (
        <div
          key={note.id}
          className="relative bg-gray-900/95 text-white px-4 py-2 rounded-lg shadow-lg min-w-[220px] animate-fadeIn"
        >
          <span className="text-sm">{note.message}</span>

          {note.type !== "loading" && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-white/30 animate-progress" />
          )}

          
        </div>
      ))}
    </div>
  );
}
