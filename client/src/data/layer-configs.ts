import {
  CloudRain,
  Flame,
  Mountain,
  Droplets,
  Trees,
  Map as MapIcon,
  Users,
  AlertTriangle,
  Bus,
  MapPin,
  Sun,
  BarChart3,
  Home,
  Heart,
  GraduationCap,
  Dumbbell,
  Waves,
  HandHeart,
} from "lucide-react";
import catalog from "@shared/generated/catalog.json";
import { CITIES } from "@shared/cities";

export type LayerSource = "geojson" | "tiles";
export type LayerSection = "oef_catalog" | "derived" | "postprocessing";
export type LayerGroup =
  | "hazard_risk"
  | "urban_land"
  | "environment"
  | "population"
  | "hydrology"
  | "climate_extreme"
  | "climate_projections"
  | "base_layers"
  | "sites"
  | "municipal_reports"
  | "spatial_queries";

// Value-tile encoding, translated from the OEF catalog (datasets.yaml) by
// script/sync-catalog.ts.
// Numeric:      value = (R + 256*G + 65536*B + offset) / scale
// Categorical:  class = (R + 256*G + 65536*B) + offset; raw === nodata → null
export interface ValueTileEncoding {
  type: "numeric" | "categorical";
  scale?: number;
  offset?: number;
  nodata?: number;
  unit?: string;
  urlTemplate?: string;
  classes?: Record<number, string>;
  classColors?: Record<number, string>;
}

export interface LayerConfig {
  id: string;
  name: string;
  icon: any;
  color: string;
  source: LayerSource;
  group: LayerGroup;
  available: boolean;
  /** City ids this layer can be shown for. */
  cities: string[];
  tileLayerId?: string;
  // Whether real numerical/categorical values can be decoded at any pixel.
  // true  → value_tile confirmed accessible (tile layers) OR inline GeoJSON values.
  // false → visual PNG tiles only; pixel = display colour, not a data value.
  hasValueTiles?: boolean;
  valueEncoding?: ValueTileEncoding;
}

export interface LayerState extends LayerConfig {
  enabled: boolean;
  loaded: boolean;
  loading: boolean;
  data: any;
}

export interface LayerGroupDef {
  id: LayerGroup;
  label: string;
  section: LayerSection;
}

export interface LayerSectionDef {
  id: LayerSection;
  label: string;
}

export const LAYER_SECTIONS: LayerSectionDef[] = [
  { id: "oef_catalog",     label: "OEF Geospatial Data" },
  { id: "derived",         label: "Reference Layers" },
  { id: "postprocessing",  label: "Spatial Queries" },
];

export const LAYER_GROUPS: LayerGroupDef[] = [
  { id: "hazard_risk",        label: "Hazard & Risk Analysis",   section: "oef_catalog"    },
  { id: "urban_land",         label: "Land Use & Urban Form",    section: "oef_catalog"    },
  { id: "environment",        label: "Environment & Ecology",    section: "oef_catalog"    },
  { id: "population",         label: "Population & Society",     section: "oef_catalog"    },
  { id: "hydrology",          label: "Hydrology & Terrain",      section: "oef_catalog"    },
  { id: "climate_extreme",    label: "Extreme Climate Indices",  section: "oef_catalog"    },
  { id: "climate_projections",label: "Climate Projections",      section: "oef_catalog"    },
  { id: "base_layers",        label: "Base Layers",              section: "derived"        },
  { id: "sites",              label: "Climate Sites",            section: "derived"        },
  { id: "municipal_reports",  label: "Municipal Reports (reconstructed)", section: "derived" },
  { id: "spatial_queries",    label: "Spatial Queries",          section: "postprocessing" },
];

const ALL_CITY_IDS = CITIES.map((c) => c.id);

// ── Catalog-driven tile layers ───────────────────────────────────────────────
// Generated from shared/generated/catalog.json (npm run sync:catalog); display
// cosmetics come from catalog-overrides.ts. A layer appears for a city only if
// the sync script confirmed its visual tiles are actually reachable there.
import { getCatalogOverride, TYPE_DEFAULTS, FALLBACK_DEFAULT } from "./catalog-overrides";
import { RICHFIELD_FLOOD_LAYERS, richfieldFloodColor } from "@shared/richfield-flood";

const CATALOG_LAYER_CONFIGS: LayerConfig[] = (catalog.datasets as any[])
  .filter((d) => Object.values(d.availability ?? {}).some((a: any) => a.visual))
  .map((d) => {
    const override = getCatalogOverride(d.id) ?? {};
    const defaults = TYPE_DEFAULTS[d.datasetType ?? ""] ?? FALLBACK_DEFAULT;
    const cities = Object.entries(d.availability as Record<string, { visual: boolean }>)
      .filter(([, a]) => a.visual)
      .map(([cityId]) => cityId);
    const hasValues = Object.values(
      d.availability as Record<string, { values: boolean }>
    ).some((a) => a.values);

    return {
      id: d.id,
      name: override.name ?? d.name,
      icon: override.icon ?? defaults.icon,
      color: override.color ?? defaults.color,
      source: "tiles" as const,
      group: override.group ?? defaults.group,
      available: true,
      cities,
      tileLayerId: d.id,
      hasValueTiles: hasValues && !!d.encoding && !!d.valueTiles,
      valueEncoding:
        d.encoding && d.valueTiles
          ? { ...d.encoding, urlTemplate: d.valueTiles }
          : undefined,
    };
  });

// ── GeoJSON / reference / postprocessing layers ──────────────────────────────
// These aren't tile datasets in the OEF catalog: city-specific vectors (IBGE,
// GTFS, Planet flood extent), OSM/Overpass queries (work for any city), and
// client-side spatial queries.
const STATIC_LAYER_CONFIGS: LayerConfig[] = [
  // Porto Alegre-only vector datasets
  { id: "solar_potential",  name: "Solar Potential",       icon: Sun,      color: "#f59e0b", source: "geojson", group: "environment", available: true, cities: ["porto_alegre"], hasValueTiles: true, valueEncoding: { type: "numeric", unit: "kWh/kWp/d" } },
  { id: "ibge_census",      name: "Census Indicators",     icon: BarChart3,color: "#a855f7", source: "geojson", group: "population",  available: true, cities: ["porto_alegre"], hasValueTiles: true, valueEncoding: { type: "numeric", unit: "% poverty" } },
  { id: "ibge_settlements", name: "Informal Settlements",  icon: Home,     color: "#f43f5e", source: "geojson", group: "population",  available: true, cities: ["porto_alegre"], hasValueTiles: true },
  { id: "transit_routes",   name: "Bus Routes",            icon: Bus,      color: "#06b6d4", source: "geojson", group: "population",  available: true, cities: ["porto_alegre"], hasValueTiles: true },
  { id: "transit_stops",    name: "Bus Stops",             icon: MapPin,   color: "#14b8a6", source: "geojson", group: "population",  available: true, cities: ["porto_alegre"], hasValueTiles: true },

  // ── Derived → Base Layers (OSM, any city) ──────────────────────────────────
  { id: "rivers", name: "Rivers", icon: Droplets, color: "#06b6d4", source: "geojson", group: "base_layers", available: true, cities: ALL_CITY_IDS, hasValueTiles: false },

  // ── Derived → Climate Sites (OSM/Overpass, any city) ───────────────────────
  { id: "sites_parks",       name: "Parks & Green Space",      icon: Trees,         color: "#22c55e", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_schools",     name: "Schools & Education",      icon: GraduationCap, color: "#f59e0b", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_hospitals",   name: "Hospitals & Health",       icon: Heart,         color: "#ef4444", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_wetlands",    name: "Wetlands",                 icon: Waves,         color: "#3b82f6", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_sports",      name: "Sports Grounds & Plazas",  icon: Dumbbell,      color: "#8b5cf6", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_social",      name: "Community Facilities",     icon: HandHeart,     color: "#ec4899", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_vacant",      name: "Vacant & Brownfield Land", icon: MapIcon,       color: "#a16207", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  { id: "sites_flood_zones", name: "Flood Risk Zones (OSM)",   icon: Waves,         color: "#1d4ed8", source: "geojson", group: "sites", available: true, cities: ALL_CITY_IDS, hasValueTiles: true },
  // Porto Alegre-only reference layers
  { id: "sites_flood2024",   name: "2024 Flood Extent (Planet/SkySat)", icon: CloudRain, color: "#60a5fa", source: "geojson", group: "sites", available: true, cities: ["porto_alegre"], hasValueTiles: true },
  // NASA GIBS global mosaic (works for any city)
  { id: "ref_viirs_lst",     name: "Heat Intensity (VIIRS 375m)",       icon: Flame,     color: "#f97316", source: "tiles",   group: "sites", available: true, cities: ALL_CITY_IDS, tileLayerId: "viirs_i5_day", hasValueTiles: false },

  // ── Spatial Queries (postprocessing, Porto Alegre datasets) ────────────────
  // Vector × raster intersections: features filtered by raster threshold at centroid.
  {
    id: "post_settlements_flood",
    name: "Settlements @ FRI > 0.4",
    icon: AlertTriangle,
    color: "#ef4444",
    source: "geojson",
    group: "spatial_queries",
    available: true,
    cities: ["porto_alegre"],
    hasValueTiles: true,
    valueEncoding: { type: "numeric", unit: "FRI index" },
  },
  {
    id: "post_bus_heatwave",
    name: "Bus Lines in HWM ≥ 10 °C·d",
    icon: Flame,
    color: "#fb923c",
    source: "geojson",
    group: "spatial_queries",
    available: true,
    cities: ["porto_alegre"],
    hasValueTiles: true,
    valueEncoding: { type: "numeric", unit: "°C·days" },
  },
];

// ── Richfield MN flood-risk layers ──────────────────────────────────────────
// Recovered from the city's published stormwater report. They sit in their own
// group, labelled "reconstructed", because they are traced from PDF figures
// rather than fetched from a source dataset — see shared/richfield-flood.ts for
// the method and the limits.
const RICHFIELD_FLOOD_LAYER_CONFIGS: LayerConfig[] = RICHFIELD_FLOOD_LAYERS.map((l) => ({
  id: l.id,
  name: l.name,
  icon: l.classes ? AlertTriangle : Waves,
  color: richfieldFloodColor(l.id, l.classes ? l.classes[l.classes.length - 1] : null),
  source: "geojson" as const,
  group: "municipal_reports" as const,
  available: true,
  cities: ["richfield"],
  hasValueTiles: false,
}));

export const LAYER_CONFIGS: LayerConfig[] = [
  ...CATALOG_LAYER_CONFIGS,
  ...STATIC_LAYER_CONFIGS,
  ...RICHFIELD_FLOOD_LAYER_CONFIGS,
];

export function getLayersForCity(cityId: string): LayerConfig[] {
  return LAYER_CONFIGS.filter((l) => l.cities.includes(cityId));
}
