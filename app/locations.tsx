"use client";

import React, { useEffect, useState } from "react";
import { Location, LocationType } from "./types"; // ✅ import from shared types
import {
  getSavedLocations,
  addLocation,
  deleteLocation,
  getCurrentLocation,
  searchLocations,
} from "./locationManager";
import {
  Home,
  Briefcase,
  Plane,
  MapPin,
  Edit3,
  Minus,
  Play,
  Check,
} from "lucide-react";

interface LocProps {
  activeLocation: Location | null;
  setActiveLocation: (loc: Location | null) => void;
}

// ✅ use imported LocationType instead of redefining
const locationsTypes: { name: LocationType; Icon: any }[] = [
  { name: LocationType.Home, Icon: Home },
  { name: LocationType.Work, Icon: Briefcase },
  { name: LocationType.Travel, Icon: Plane },
  { name: LocationType.Other, Icon: MapPin },
];

export default function LocationManagerUI({
  activeLocation,
  setActiveLocation,
}: LocProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingType, setEditingType] = useState<LocationType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [loadingType, setLoadingType] = useState<LocationType | null>(null);

  // Load saved or initialize with current as home
  useEffect(() => {
    const saved = getSavedLocations();
    if (saved.length > 0) {
      setLocations(saved);
      setActiveLocation(saved[0]);
    } else {
      getCurrentLocation()
        .then((loc) => {
          const homeLoc: Location = { ...loc, type: LocationType.Home};
          const updated = addLocation(homeLoc);
          setLocations(updated);
          setActiveLocation(homeLoc);
        })
        .catch(() => {
          const fallback: Location = {
            name: "Nairobi",
            lat: -1.2921,
            lon: 36.8219,
            type: LocationType.Home,
            timezone: "Africa/Nairobi",
          };
          const updated = addLocation(fallback);
          setLocations(updated);
          setActiveLocation(fallback);
        });
    }
  }, [setActiveLocation]);

  const handleDelete = (type: LocationType) => {
    const updated = deleteLocation(type);
    setLocations(updated);
    if (activeLocation?.type === type) setActiveLocation(updated[0] || null);
  };

  const handleStartEdit = (type: LocationType) => {
    setEditingType(type);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUpdateWithSearch = (res: Location) => {
    if (!editingType) return;
    const newLoc: Location = { ...res, type: editingType };
    const updated = addLocation(newLoc);
    setLocations(updated);
    setEditingType(null);
    setSearchResults([]);
  };

  const handleUpdateWithCurrent = async () => {
    if (!editingType) return;
    try {
      setLoadingType(editingType);
      const loc = await getCurrentLocation();
      const newLoc: Location = { ...loc, type: editingType };
      const updated = addLocation(newLoc);
      setLocations(updated);
      setEditingType(null);
    } catch {
      alert("Failed to get current location");
    } finally {
      setLoadingType(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    const results = await searchLocations(searchQuery);
    setSearchResults(results);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-3 w-full max-w-xl">
      {/* Top row of types */}
      <div className="flex py-2 w-full justify-between items-center">
        {locationsTypes.map((t) => {
          const loc = locations.find((l) => l.type === t.name);
          const isLoading = loadingType === t.name;
          return (
            <div
              key={t.name}
              className={`relative flex flex-col items-center justify-center p-2 rounded-full cursor-pointer transition-all ${
                activeLocation?.type === t.name
                  ? "bg-fuchsia-600/20"
                  : "hover:bg-gray-200/20"
              }`}
              onClick={() => setActiveLocation(loc || null)}
            >
              <t.Icon className="w-6 h-6" />
              <span
                className={`text-xs mt-1 ${
                  isLoading ? "italic text-fuchsia-800" : ""
                }`}
              >
                {isLoading
                  ? "loading"
                  : (loc?.name || t.name).slice(0, 6).toLowerCase()}
              </span>
            </div>
          );
        })}
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-1 justify-center p-2 rounded-full border hover:bg-gray-200/20"
        >
          <Edit3 className="w-5 h-5" />
          <span className="text-xs">
            {locations.length > 0 ? "edit" : "add"}
          </span>
        </button>
      </div>

      {/* Edit mode panel */}
      {editMode && (
        <div className="flex flex-col gap-2 w-full border rounded-lg p-3 bg-gray-50/10">
          {editingType ? (
            <>
              <h4 className="font-semibold">Editing: {editingType}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search new location..."
                  className="flex-1 border-b px-2 py-1 bg-transparent outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="border px-3 py-1 rounded"
                >
                  Search
                </button>
                <button
                  onClick={handleUpdateWithCurrent}
                  className="border px-3 py-1 rounded flex items-center gap-1"
                >
                  <Play className="w-4 h-4" /> Use Current
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="flex flex-col gap-1 mt-2">
                  {searchResults.map((res) => (
                    <button
                      key={res.name + res.lat}
                      onClick={() => handleUpdateWithSearch(res)}
                      className="flex justify-between items-center p-1 rounded hover:bg-gray-200/30"
                    >
                      <span>{res.name}</span>
                      <Check className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {locationsTypes.map((t) => {
                const loc = locations.find((l) => l.type === t.name);
                return (
                  <div
                    key={t.name}
                    className="flex justify-between items-center p-2 border rounded hover:bg-gray-200/30"
                  >
                    <div className="flex items-center gap-2">
                      <t.Icon className="w-5 h-5" />
                      <span className="text-sm">
                        {loc?.name || `No ${t.name}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleStartEdit(t.name)}>
                        <Edit3 className="w-5 h-5" />
                      </button>
                      {loc && (
                        <button onClick={() => handleDelete(t.name)}>
                          <Minus className="w-5 h-5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
