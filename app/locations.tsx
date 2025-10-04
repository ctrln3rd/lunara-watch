"use client";

import { useEffect, useState } from "react";
import { Location } from "./types";
import {
  getSavedLocations,
  addLocation,
  deleteLocation,
  getCurrentLocation,
  searchLocations,
} from "./locationManager";
import { Plus, ChevronLeft, ChevronRight, X, Minus, Play } from "lucide-react";

interface LocProps {
  activeLocation: Location | null;
  setActiveLocation: (loc: Location | null) => void;
}

export default function LocationManagerUI({
  activeLocation,
  setActiveLocation,
}: LocProps) {
  const [isLocations, setIsLocations] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);

  // Load saved or current location on mount
  useEffect(() => {
    const saved = getSavedLocations();
    if (saved.length > 0) {
      setLocations(saved);
      setActiveLocation(saved[0]);
      setActiveIndex(0);
    } else {
      getCurrentLocation()
        .then((loc) => {
          const updated = addLocation(loc);
          setLocations(updated);
          setActiveLocation(updated[0]);
          setActiveIndex(0);
        })
        .catch(() => {
          const fallback: Location = {
            name: "Nairobi",
            lat: -1.2921,
            lon: 36.8219,
            isCurrent: false,
          };
          const updated = addLocation(fallback);
          setLocations(updated);
          setActiveLocation(updated[0]);
          setActiveIndex(0);
        });
    }
  }, [setActiveLocation]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) return;
    const results = await searchLocations(searchQuery);
    setSearchResults(results);
  };

  // Handle picking from search results
  const handlePickResult = (loc: Location) => {
    try {
      const updated = addLocation(loc);
      setLocations(updated);
      setActiveLocation(loc);
      setActiveIndex(updated.findIndex((l) => l.name === loc.name));
    } catch (err: any) {
      alert(err.message);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleDelete = (name: string) => {
    const updated = deleteLocation(name);
    setLocations(updated);

    if (activeLocation?.name === name) {
      if (updated.length > 0) {
        setActiveIndex(0);
        setActiveLocation(updated[0]);
      } else {
        setActiveLocation(null);
        setActiveIndex(0);
      }
    }
  };

  const handlePrev = () => {
    if (locations.length === 0) return;
    const newIndex =
      (activeIndex - 1 + locations.length) % locations.length;
    setActiveIndex(newIndex);
    setActiveLocation(locations[newIndex]);
  };

  const handleNext = () => {
    if (locations.length === 0) return;
    const newIndex = (activeIndex + 1) % locations.length;
    setActiveIndex(newIndex);
    setActiveLocation(locations[newIndex]);
  };

  return (
    <div className="flex flex-col items-center gap-5 px-5">
      <div className="flex gap-16 items-center">
        <div className="flex gap-5 items-center">
          <button onClick={handlePrev}>
            <ChevronLeft className="aspect-square w-10" />
          </button>
          <h2 onClick={() => setIsLocations(true)}>
            {activeLocation ? activeLocation.name : "no location"}
          </h2>
          <button onClick={handleNext}>
            <ChevronRight className="aspect-square w-10" />
          </button>
        </div>
        <button
          onClick={() => setIsLocations(true)}
          className="flex items-center gap-1 p-1 border border-white/20 rounded-lg"
        >
          <Plus className="aspect-square w-6" /> edit
        </button>
      </div>

      {isLocations && (
        <div className="flex flex-col gap-5 items-center p-6 border border-gray-100/20 bg-gray-200/15 rounded-lg min-w-[60vw]">
          <button className="self-end" onClick={() => setIsLocations(false)}>
            <X className="aspect-square w-6" />
          </button>

          {/* Search input */}
          <div className="flex gap-2 w-full">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city..."
              className="border-b-2 border-b-gray-200/50 px-3 py-2 w-full"
            />
            <button
              onClick={handleSearch}
              className="border border-gray-500/50 px-4 py-2 rounded-lg"
            >
              Search
            </button>
          </div>

          {/* Show search results */}
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-3 w-full border-y-2 border-y-gray-300/50 py-3 px-2">
              <h3 className="opacity-70 italic font-semibold underline">Results</h3>
              {searchResults.map((res) => (
                <button
                  key={res.name + res.lat}
                  onClick={() => handlePickResult(res)}
                  className="flex justify-between items-center "
                >
                  <Play className="aspect-square w-5"/>
                  <span>{res.name}</span>
                  <span className="opacity-70 text-xs">
                    {res.lat.toFixed(2)}, {res.lon.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Saved locations list */}
          <div className="flex flex-col gap-2 w-full">
            {locations.map((loc) => (
              <div
                key={loc.name}
                className="flex justify-between items-center border-b border-b-gray-500/20 px-3 py-2 rounded-lg"
              >
                <span>{loc.name}</span>
                <span className="opacity-70 text-xs">
                  {loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}
                </span>
                <button onClick={() => handleDelete(loc.name)}>
                  <Minus className="aspect-square w-6" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
