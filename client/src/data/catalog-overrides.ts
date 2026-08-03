// Viewer-side display cosmetics for catalog datasets: curated names, colors,
// icons and grouping. The data itself (URLs, encodings, availability) comes
// from shared/generated/catalog.json — regenerate with `npm run sync:catalog`.
// A dataset with no entry here still renders, using defaults by dataset_type.

import {
  AlertTriangle,
  Building2,
  CloudRain,
  Droplets,
  Flame,
  Grid3X3,
  Layers,
  Leaf,
  Map as MapIcon,
  MapPinned,
  Moon,
  Mountain,
  Sun,
  Thermometer,
  Trees,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import type { LayerGroup } from "./layer-configs";

export interface CatalogOverride {
  name?: string;
  icon?: any;
  color?: string;
  group?: LayerGroup;
}

export const CATALOG_OVERRIDES: Record<string, CatalogOverride> = {
  // ── Hazard & Risk Analysis ─────────────────────────────────────────────────
  // The per-city hazard/risk/mechanism/exposure/vulnerability products follow
  // the `<city>_<hazard>_<kind>` naming convention and are styled by
  // hazardRiskOverride() below — no per-city entries needed here.

  // ── Land Use & Urban Form ──────────────────────────────────────────────────
  dynamic_world:            { name: "Land Use (Dynamic World)",        icon: Grid3X3,  color: "#06d6a0", group: "urban_land" },
  dynamic_world_mode_250m:  { name: "Land Use Mode 250 m",             icon: Grid3X3,  color: "#0d9488", group: "urban_land" },
  ghsl_built_up:            { name: "Built-Up Surface (GHSL)",         icon: Building2,color: "#ef4444", group: "urban_land" },
  ghsl_degree_urbanization: { name: "Degree of Urbanisation (GHSL)",   icon: MapPinned,color: "#f97316", group: "urban_land" },
  noaa_viirs_nightlights:   { name: "Night Lights (VIIRS DNB)",        icon: Moon,     color: "#fbbf24", group: "urban_land" },

  // ── Environment & Ecology ──────────────────────────────────────────────────
  global_solar_atlas: { name: "Solar PV Potential",                icon: Sun,   color: "#eab308", group: "environment" },
  modis_ndvi:         { name: "Vegetation Index NDVI (MODIS)",     icon: Leaf,  color: "#4ade80", group: "environment" },
  modis_ndvi_p10_djf: { name: "Summer NDVI P10 (MODIS)",           icon: Leaf,  color: "#84cc16", group: "environment" },
  hansen_forest_change: { name: "Forest Loss 2000–2024 (Hansen)",  icon: Trees, color: "#dc2626", group: "environment" },

  // ── Population & Society ───────────────────────────────────────────────────
  ghsl_population: { name: "Population Grid (GHSL)", icon: Users, color: "#8b5cf6", group: "population" },

  // ── Hydrology & Terrain ────────────────────────────────────────────────────
  copernicus_dem:         { name: "DEM Elevation (Copernicus)",       icon: Mountain, color: "#a16207", group: "hydrology" },
  merit_hydro_elv:        { name: "Terrain Elevation (MERIT)",        icon: Mountain, color: "#bc6c25", group: "hydrology" },
  merit_hydro_upa:        { name: "Upstream Area (MERIT)",            icon: Droplets, color: "#0369a1", group: "hydrology" },
  merit_hydro_hnd:        { name: "Height Above Drainage (MERIT)",    icon: Droplets, color: "#0ea5e9", group: "hydrology" },
  poa_slope:              { name: "Slope",                            icon: Mountain, color: "#b45309", group: "hydrology" },
  poa_relative_elevation: { name: "Relative Elevation",               icon: Mountain, color: "#d97706", group: "hydrology" },
  poa_depression_mask:    { name: "Depression Mask",                  icon: Droplets, color: "#0e7490", group: "hydrology" },
  poa_depression_depth:   { name: "Depression Depth",                 icon: Droplets, color: "#155e75", group: "hydrology" },
  soilgrids_clay:         { name: "Clay Content (SoilGrids)",         icon: Mountain, color: "#92400e", group: "hydrology" },
  jrc_global_surface_water_occurrence:  { name: "Surface Water Occurrence (JRC)",  icon: Waves, color: "#1d4ed8", group: "hydrology" },
  jrc_global_surface_water_seasonality: { name: "Surface Water Seasonality (JRC)", icon: Waves, color: "#0891b2", group: "hydrology" },
  jrc_global_surface_water:             { name: "Surface Water Change (JRC)",      icon: Waves, color: "#0077b6", group: "hydrology" },
  hansen_treecover2000:   { name: "Tree Cover 2000 (Hansen)",         icon: Trees,    color: "#166534", group: "hydrology" },
  copernicus_emsn194:     { name: "2024 Flood Depth (Copernicus)",    icon: CloudRain,color: "#1d4ed8", group: "hydrology" },
  // Flood hazard model inputs (Level 0/1)
  jrc_gloflor_v2:        { name: "Fluvial Flood Hazard (JRC GLOFLOR)",   icon: CloudRain, color: "#1e40af", group: "hydrology" },
  wri_aqueduct_flood:    { name: "Riverine Flood Depth (WRI Aqueduct)",  icon: CloudRain, color: "#1e3a8a", group: "hydrology" },
  global_flood_database: { name: "Observed Flood Frequency (GFD)",       icon: CloudRain, color: "#3730a3", group: "hydrology" },
  gfplain250m:           { name: "Floodplain Extent (GFPLAIN250m)",      icon: Waves,     color: "#4338ca", group: "hydrology" },

  // ── Extreme Climate Indices ────────────────────────────────────────────────
  chirps_r90p_2024:          { name: "Prec. R90p 2024 (CHIRPS)",     icon: CloudRain, color: "#1e40af", group: "climate_extreme" },
  chirps_r90p_climatology:   { name: "Prec. R90p Baseline (CHIRPS)", icon: CloudRain, color: "#3b82f6", group: "climate_extreme" },
  chirps_r95p_2024:          { name: "Prec. R95p 2024 (CHIRPS)",     icon: CloudRain, color: "#1e3a8a", group: "climate_extreme" },
  chirps_r95p_climatology:   { name: "Prec. R95p Baseline (CHIRPS)", icon: CloudRain, color: "#2563eb", group: "climate_extreme" },
  chirps_r99p_2024:          { name: "Prec. R99p 2024 (CHIRPS)",     icon: CloudRain, color: "#172554", group: "climate_extreme" },
  chirps_r99p_climatology:   { name: "Prec. R99p Baseline (CHIRPS)", icon: CloudRain, color: "#1d4ed8", group: "climate_extreme" },
  chirps_rx1day_2024:        { name: "Max 1-day Prec. 2024 (CHIRPS)",icon: CloudRain, color: "#075985", group: "climate_extreme" },
  chirps_rx1day_climatology: { name: "Max 1-day Prec. Baseline",     icon: CloudRain, color: "#0ea5e9", group: "climate_extreme" },
  chirps_rx5day_2024:        { name: "Max 5-day Prec. 2024 (CHIRPS)",icon: CloudRain, color: "#164e63", group: "climate_extreme" },
  chirps_rx5day_climatology: { name: "Max 5-day Prec. Baseline",     icon: CloudRain, color: "#06b6d4", group: "climate_extreme" },
  era5land_tnx_2024:          { name: "Min Temp Max TNx 2024 (ERA5)",   icon: Thermometer, color: "#b45309", group: "climate_extreme" },
  era5land_tnx_climatology:   { name: "Min Temp Max TNx Baseline",      icon: Thermometer, color: "#d97706", group: "climate_extreme" },
  era5land_tx90p_2024:        { name: "Hot Days TX90p 2024 (ERA5)",     icon: Thermometer, color: "#c2410c", group: "climate_extreme" },
  era5land_tx90p_climatology: { name: "Hot Days TX90p Baseline",        icon: Thermometer, color: "#ea580c", group: "climate_extreme" },
  era5land_tx99p_2024:        { name: "Extreme Heat TX99p 2024 (ERA5)", icon: Thermometer, color: "#991b1b", group: "climate_extreme" },
  era5land_tx99p_climatology: { name: "Extreme Heat TX99p Baseline",    icon: Thermometer, color: "#b91c1c", group: "climate_extreme" },
  era5land_txx_2024:          { name: "Max Temp TXx 2024 (ERA5)",       icon: Thermometer, color: "#7f1d1d", group: "climate_extreme" },
  era5land_txx_climatology:   { name: "Max Temp TXx Baseline",          icon: Thermometer, color: "#dc2626", group: "climate_extreme" },
  era5land_hwm_2024:          { name: "Heatwave Magnitude 2024 (ERA5)", icon: Flame,       color: "#d97706", group: "climate_extreme" },
  era5land_hwm_climatology:   { name: "Heatwave Magnitude Baseline",    icon: Flame,       color: "#f59e0b", group: "climate_extreme" },
  landsat8_lst_djf:           { name: "Summer LST P90 (Landsat 8)",     icon: Thermometer, color: "#c2410c", group: "climate_extreme" },
  modis_mod11a2_lst_djf:      { name: "Summer LST P90 (MODIS)",         icon: Thermometer, color: "#ea580c", group: "climate_extreme" },
  era5_land_heatwave_freq_djf:{ name: "Summer Heatwave Freq. (ERA5)",   icon: Flame,       color: "#b91c1c", group: "climate_extreme" },

  // ── Climate Projections ────────────────────────────────────────────────────
  chirps_copdem_fri_2024:         { name: "Flood Risk Index 2024",     icon: CloudRain,  color: "#1e3a8a", group: "climate_projections" },
  chirps_copdem_fri_2030s_ssp245: { name: "Flood Risk 2030s SSP2-4.5", icon: TrendingUp, color: "#1e40af", group: "climate_projections" },
  chirps_copdem_fri_2030s_ssp585: { name: "Flood Risk 2030s SSP5-8.5", icon: TrendingUp, color: "#1d4ed8", group: "climate_projections" },
  chirps_copdem_fri_2050s_ssp245: { name: "Flood Risk 2050s SSP2-4.5", icon: TrendingUp, color: "#2563eb", group: "climate_projections" },
  chirps_copdem_fri_2050s_ssp585: { name: "Flood Risk 2050s SSP5-8.5", icon: TrendingUp, color: "#3b82f6", group: "climate_projections" },
  chirps_copdem_fri_2100s_ssp245: { name: "Flood Risk 2100s SSP2-4.5", icon: TrendingUp, color: "#60a5fa", group: "climate_projections" },
  chirps_copdem_fri_2100s_ssp585: { name: "Flood Risk 2100s SSP5-8.5", icon: TrendingUp, color: "#93c5fd", group: "climate_projections" },
  era5land_hwm_2030s_45: { name: "Heatwave Mag. 2030s SSP2-4.5", icon: TrendingUp, color: "#b45309", group: "climate_projections" },
  era5land_hwm_2030s_85: { name: "Heatwave Mag. 2030s SSP5-8.5", icon: TrendingUp, color: "#d97706", group: "climate_projections" },
  era5land_hwm_2050s_85: { name: "Heatwave Mag. 2050s SSP5-8.5", icon: TrendingUp, color: "#f59e0b", group: "climate_projections" },
  era5land_hwm_2100s_85: { name: "Heatwave Mag. 2100s SSP5-8.5", icon: TrendingUp, color: "#fbbf24", group: "climate_projections" },
};

// ── Pattern-based overrides for per-city hazard products ─────────────────────
// The OEF pipeline publishes `<city>_(flood|heat|landslide)_(hazard|risk)`,
// `<city>_(flood|heat|landslide)_mechanism_type`, `<city>_exposure` and
// `<city>_vulnerability` per onboarded city. Style them uniformly so a new
// city needs zero override entries.
type HazardKey = "flood" | "heat" | "landslide";
const HAZARD_STYLE: Record<HazardKey, { label: string; icon: any; hazardColor: string; riskColor: string; mechColor: string }> = {
  flood:     { label: "Flood",     icon: CloudRain, hazardColor: "#2563eb", riskColor: "#1d4ed8", mechColor: "#7b3294" },
  heat:      { label: "Heat",      icon: Flame,     hazardColor: "#ea580c", riskColor: "#dc2626", mechColor: "#d73027" },
  landslide: { label: "Landslide", icon: Mountain,  hazardColor: "#a16207", riskColor: "#a16207", mechColor: "#8c510a" },
};

function hazardRiskOverride(id: string): CatalogOverride | undefined {
  let m = id.match(/^[a-z_]+_(flood|heat|landslide)_(hazard|risk)$/);
  if (m) {
    const s = HAZARD_STYLE[m[1] as HazardKey];
    return m[2] === "hazard"
      ? { name: `${s.label} Hazard`, icon: s.icon, color: s.hazardColor, group: "hazard_risk" }
      : { name: `${s.label} Risk (H×E×V)`, icon: TrendingUp, color: s.riskColor, group: "hazard_risk" };
  }
  m = id.match(/^[a-z_]+_(flood|heat|landslide)_mechanism_type$/);
  if (m) {
    const s = HAZARD_STYLE[m[1] as HazardKey];
    return { name: `${s.label} Mechanism`, icon: Layers, color: s.mechColor, group: "hazard_risk" };
  }
  if (/^[a-z_]+_exposure$/.test(id)) {
    return { name: "Exposure Score", icon: Users, color: "#7b2cbf", group: "hazard_risk" };
  }
  if (/^[a-z_]+_vulnerability$/.test(id)) {
    return { name: "Vulnerability Score", icon: AlertTriangle, color: "#9d4edd", group: "hazard_risk" };
  }
  return undefined;
}

export function getCatalogOverride(id: string): CatalogOverride | undefined {
  return CATALOG_OVERRIDES[id] ?? hazardRiskOverride(id);
}

// Defaults by catalog dataset_type for datasets with no override entry —
// new catalog additions render sensibly before anyone curates them.
export const TYPE_DEFAULTS: Record<string, Required<Omit<CatalogOverride, "name">>> = {
  flood:                 { icon: CloudRain,   color: "#2563eb", group: "hazard_risk" },
  heat:                  { icon: Flame,       color: "#ea580c", group: "hazard_risk" },
  landslide:             { icon: Mountain,    color: "#a16207", group: "hazard_risk" },
  extreme_precipitation: { icon: CloudRain,   color: "#1e40af", group: "climate_extreme" },
  extreme_temperature:   { icon: Thermometer, color: "#c2410c", group: "climate_extreme" },
  heatwave:              { icon: Flame,       color: "#d97706", group: "climate_extreme" },
};

export const FALLBACK_DEFAULT: Required<Omit<CatalogOverride, "name">> = {
  icon: MapIcon,
  color: "#94a3b8",
  group: "environment",
};
