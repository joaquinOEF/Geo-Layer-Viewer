import { getCity } from "@shared/cities";
import { RICHFIELD_FLOOD_LAYERS } from "@shared/richfield-flood";

const sampleDataCache = new Map<string, any>();

async function loadFromApi(apiPath: string, cacheKey: string): Promise<any> {
  if (sampleDataCache.has(cacheKey)) return sampleDataCache.get(cacheKey);

  const response = await fetch(apiPath);
  if (!response.ok) throw new Error(`Failed to load ${apiPath}: ${response.status}`);
  const data = await response.json();
  sampleDataCache.set(cacheKey, data);
  return data;
}

async function loadSampleData(path: string): Promise<any> {
  if (sampleDataCache.has(path)) return sampleDataCache.get(path);

  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    const data = await response.json();
    sampleDataCache.set(path, data);
    return data;
  } catch {
    return null;
  }
}

export async function loadBoundaryData(cityId: string): Promise<any> {
  const city = getCity(cityId);
  let data = await loadSampleData(`/sample-data/${city.boundaryFile}`);
  if (!data) {
    data = await loadFromApi(`/api/geospatial/boundary?city=${city.id}`, `boundary:${city.id}`);
  }
  return data;
}

// Layers whose data comes from OSM/Overpass work for any city — the API is
// asked with ?city=. City-specific vector datasets (IBGE, GTFS, Planet) only
// exist for Porto Alegre and keep their pre-baked sample files.
const CITY_AWARE_API_LAYERS = new Set([
  "rivers",
  "sites_parks",
  "sites_schools",
  "sites_hospitals",
  "sites_wetlands",
  "sites_sports",
  "sites_social",
  "sites_vacant",
  "sites_flood_zones",
]);

export async function loadLayerData(layerId: string, cityId: string): Promise<any> {
  const city = getCity(cityId);
  const prefix = city.id.replace(/_/g, "-");

  // Richfield flood layers ship as static files — they are traced from a PDF,
  // not fetched from any live source, so there is no API path to fall back to.
  const richfield = RICHFIELD_FLOOD_LAYERS.find((l) => l.id === layerId);
  if (richfield) {
    return await loadSampleData(`/sample-data/${richfield.file}`);
  }

  const poaSamplePaths: Record<string, string> = {
    grid_flood: "/sample-data/porto-alegre-grid.json",
    grid_heat: "/sample-data/porto-alegre-grid.json",
    grid_landslide: "/sample-data/porto-alegre-grid.json",
    transit_stops: "/sample-data/porto-alegre-transit-stops.json",
    transit_routes: "/sample-data/porto-alegre-transit-routes.json",
    solar_potential: "/sample-data/porto-alegre-solar-neighbourhoods.json",
    ibge_census: "/sample-data/porto-alegre-ibge-indicators.json",
    ibge_settlements: "/sample-data/porto-alegre-ibge-settlements.json",
    sites_flood2024: "/sample-data/porto-alegre-flood-2024.json",
  };

  const poaApiPaths: Record<string, string> = {
    grid_flood: "/api/geospatial/grid",
    grid_heat: "/api/geospatial/grid",
    grid_landslide: "/api/geospatial/grid",
    transit_stops: "/api/geospatial/transit-stops",
    transit_routes: "/api/geospatial/transit-routes",
    solar_potential: "/api/geospatial/solar-neighbourhoods",
    ibge_census: "/api/geospatial/ibge-indicators",
    ibge_settlements: "/api/geospatial/ibge-settlements",
  };

  if (CITY_AWARE_API_LAYERS.has(layerId)) {
    // Server caches Overpass results per city as sample-data files; try the
    // static file first (fast path), then hit the API.
    const staticFile =
      layerId === "rivers"
        ? `/sample-data/${prefix}-rivers.json`
        : `/sample-data/${prefix}-sites-${layerId.replace("sites_", "")}.json`;
    const cached = await loadSampleData(staticFile);
    if (cached) return cached;

    const apiPath =
      layerId === "rivers"
        ? `/api/geospatial/rivers?city=${city.id}`
        : `/api/geospatial/sites/${layerId}?city=${city.id}`;
    try {
      return await loadFromApi(apiPath, `${layerId}:${city.id}`);
    } catch {
      return null;
    }
  }

  const samplePath = poaSamplePaths[layerId];
  if (samplePath) {
    const data = await loadSampleData(samplePath);
    if (data) return data;
  }

  const apiPath = poaApiPaths[layerId];
  if (apiPath) {
    try {
      return await loadFromApi(apiPath, layerId);
    } catch {
      return null;
    }
  }

  return null;
}

export function clearCache(): void {
  sampleDataCache.clear();
}
