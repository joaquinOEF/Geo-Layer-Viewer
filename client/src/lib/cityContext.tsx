import { createContext, useContext, useState, type ReactNode } from "react";
import { CITIES, DEFAULT_CITY_ID, getCity, type CityDef } from "@shared/cities";

interface CityContextValue {
  city: CityDef;
  setCityId: (id: string) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

const STORAGE_KEY = "geo-layer-viewer:city";

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityIdState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && CITIES.some((c) => c.id === stored) ? stored : DEFAULT_CITY_ID;
  });

  const setCityId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setCityIdState(id);
  };

  return (
    <CityContext.Provider value={{ city: getCity(cityId), setCityId }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside <CityProvider>");
  return ctx;
}
