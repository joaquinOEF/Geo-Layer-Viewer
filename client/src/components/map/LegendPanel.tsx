import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { LayerState } from "@/data/layer-configs";

// ── Legend type system ────────────────────────────────────────────────────────

interface GradientDef {
  kind: "gradient";
  colors: string[];
  labels: [string, string];
}
interface CategoricalDef {
  kind: "categorical";
  items: { color: string; label: string }[];
}
interface LineDef  { kind: "line"  }
interface PointDef { kind: "point" }
interface SolidDef { kind: "solid" }

type LegendDef = GradientDef | CategoricalDef | LineDef | PointDef | SolidDef;

// ── OEF CUSTOM HAZARD COLORMAP (pixel-sampled) ────────────────────────────────
//
// ALL OEF hazard tile layers share this single custom scale.
// Confirmed by sampling CHIRPS, ERA5, HWM, and FRI tiles.
// nodata sentinel = #b40000 (confirmed in every tile — excluded from scale).
//
//  t=0.0  orange-red  #c82500  (200,37,0)    LOW value / least hazardous
//  t=0.15 orange      #f67b00  (246,123,0)
//  t=0.35 yellow      #ffdc54  (255,220,84)
//  t=0.45 lt yel-grn  #d1f090  (209,240,144)
//  t=0.55 mint green  #8fdab3  (143,218,179)
//  t=0.65 cyan        #46c1da  (70,193,218)
//  t=0.80 sky blue    #028bda  (2,139,218)
//  t=1.0  dark navy   #08306b  (8,48,107)    HIGH value / most hazardous
//
// Source: pixel extraction from 9 CHIRPS tiles, ERA5 TXx/TNx/TX90p tiles,
//         HWM tile, and FRI tile — all produced avg colour-distance < 6.0
//         against the above scale vs 47–60 for any standard matplotlib colourmap.

const OEF_HAZARD = ['#c82500','#f67b00','#ffdc54','#d1f090','#8fdab3','#46c1da','#028bda','#08306b'];

// Helper to make a gradient def with the OEF custom scale
function oef(lo: string, hi: string): GradientDef {
  return { kind: "gradient", colors: OEF_HAZARD, labels: [lo, hi] };
}

// ── Legend definitions ────────────────────────────────────────────────────────

const LEGEND_DEF: Record<string, LegendDef> = {

  // ── IBGE & social (real measured values) ────────────────────────────────────
  ibge_census:    { kind: "gradient", colors: ["#ede9fe","#c084fc","#a855f7","#7e22ce","#3b0764"], labels: ["2%", "35% poverty rate"] },
  ibge_settlements: { kind: "solid" },

  // ── Solar (real PVOUT values from 99 neighbourhoods) ───────────────────────
  solar_potential:  { kind: "gradient", colors: ["#fef3c7","#fde68a","#fbbf24","#f59e0b","#b45309"], labels: ["4.0", "4.1 kWh/kWp/d"] },

  // ── Geometry layers ─────────────────────────────────────────────────────────
  rivers:         { kind: "line"  },
  transit_routes: { kind: "line"  },
  transit_stops:  { kind: "point" },

  sites_parks:       { kind: "point" },
  sites_schools:     { kind: "point" },
  sites_hospitals:   { kind: "point" },
  sites_wetlands:    { kind: "point" },
  sites_sports:      { kind: "point" },
  sites_social:      { kind: "point" },
  sites_vacant:      { kind: "solid" },
  sites_flood_zones: { kind: "solid" },
  sites_flood2024:   { kind: "solid" },

  // ── OEF tile layers (curated; ids = catalog dataset_ids) ─────────────────────
  // Any tile layer NOT listed here gets an automatic legend: categorical class
  // colours straight from the catalog encoding, or the OEF hazard gradient for
  // numeric rasters (see autoLegend below).
  // Dynamic World: categorical colours confirmed by sampling zoom-10 tiles.
  dynamic_world: {
    kind: "categorical",
    items: [
      { color: "#62b0cc", label: "Water"        },   // #62b0cc sampled
      { color: "#488c5f", label: "Trees"        },   // #488c5f sampled
      { color: "#98b982", label: "Grass"        },   // #98b982 sampled
      { color: "#cdb982", label: "Crops"        },   // #cdb982 sampled
      { color: "#b45f55", label: "Built area"   },   // #b45f55 sampled
      { color: "#afa89e", label: "Bare ground"  },   // #afa89e sampled
    ],
  },
  // GHSL built-up: OEF custom gradient (orange=sparse, navy=dense)
  ghsl_built_up:      { kind: "gradient", colors: OEF_HAZARD, labels: ["0%", "100% built-up"] },
  // GHSL urbanisation: 3-class categorical per Degree of Urbanisation spec
  ghsl_degree_urbanization: {
    kind: "categorical",
    items: [
      { color: "#ffdc54", label: "Peri-urban"   },
      { color: "#46c1da", label: "Semi-dense"   },
      { color: "#08306b", label: "Urban centre" },
    ],
  },
  noaa_viirs_nightlights: { kind: "gradient", colors: OEF_HAZARD, labels: ["Dark", "Bright (radiance)"] },
  global_solar_atlas:     { kind: "gradient", colors: ["#fef3c7","#fde68a","#fbbf24","#f59e0b","#b45309"], labels: ["4.0", "4.1 kWh/kWp/d"] },
  modis_ndvi:             { kind: "gradient", colors: ["#7f3b08","#e0ad68","#f7f7f7","#a8ddb5","#084081"], labels: ["-0.2", "1.0 NDVI"] },
  hansen_forest_change:   { kind: "gradient", colors: ["#ffffcc","#c7e9b4","#7fcdbb","#2c7fb8","#253494"], labels: ["2001", "2023 loss year"] },
  ghsl_population:        { kind: "gradient", colors: ["#f7f0fa","#d4b9da","#c994c7","#df65b0","#67001f"], labels: ["0", "17 975 /km²"] },
  copernicus_dem:         { kind: "gradient", colors: ["#023858","#045a8d","#74add1","#fed976","#a63603"], labels: ["0", "284 m elevation"] },
  merit_hydro_elv:        { kind: "gradient", colors: ["#023858","#045a8d","#74add1","#fed976","#a63603"], labels: ["0", "284 m elevation"] },
  merit_hydro_upa:        { kind: "gradient", colors: ["#f0f9e8","#a8ddb5","#43a2ca","#0868ac","#022a6b"], labels: ["Small", "Large (km²)"] },
  merit_hydro_hnd:        { kind: "gradient", colors: ["#0c2340","#1e6091","#48cae4","#caf0f8","#ffffff"], labels: ["0", "30+ m above drain"] },
  jrc_global_surface_water_occurrence:  { kind: "gradient", colors: ["#f0f9e8","#bae4bc","#7bccc4","#2b8cbe","#023858"], labels: ["0%", "100% occurrence"] },
  jrc_global_surface_water_seasonality: { kind: "gradient", colors: ["#f0f9e8","#a8ddb5","#43a2ca","#0868ac","#023858"], labels: ["0", "12 months/yr"] },
  jrc_global_surface_water: {
    kind: "categorical",
    items: [
      { color: "#023858", label: "Permanent water" },
      { color: "#43a2ca", label: "Seasonal water"  },
      { color: "#a8ddb5", label: "New water"       },
      { color: "#fc8d59", label: "Lost water"      },
    ],
  },
  hansen_treecover2000:   { kind: "gradient", colors: ["#f7fcf5","#c7e9c0","#74c476","#238b45","#00441b"], labels: ["0%", "100% canopy"] },
  copernicus_emsn194:     { kind: "gradient", colors: ["#eff8ff","#9ecae1","#3182bd","#08519c","#08306b"], labels: ["0", ">2.0 m depth"] },

  // ── VIIRS I5 brightness temperature ──────────────────────────────────────────
  ref_viirs_lst: { kind: "gradient", colors: ["#313695","#74add1","#ffffbf","#f46d43","#a50026"], labels: ["25°C", "45°C surface"] },

  // ── Spatial Query layers ─────────────────────────────────────────────────────
  post_settlements_flood: { kind: "solid" },
  post_bus_heatwave: { kind: "line" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function GradientBar({ colors, labels, unit }: { colors: string[]; labels: [string, string]; unit?: string }) {
  return (
    <div className="mt-1.5 ml-5">
      <div className="flex items-center gap-1.5">
        <div
          className="h-1.5 rounded-sm flex-1"
          style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }}
        />
        {unit && (
          <span className="text-[8px] text-emerald-400 font-medium shrink-0 leading-none">
            {unit}
          </span>
        )}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-zinc-500">{labels[0]}</span>
        <span className="text-[9px] text-zinc-500">{labels[1]}</span>
      </div>
    </div>
  );
}

function CategoricalItems({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-1 ml-5 flex flex-col gap-0.5">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm shrink-0 border border-black/20"
            style={{ backgroundColor: color }}
          />
          <span className="text-[9px] text-zinc-500 leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Automatic legend for catalog tile layers with no curated LEGEND_DEF entry:
// categorical rasters get their class colours straight from the catalog
// encoding; numeric rasters default to the OEF hazard gradient (all OEF-
// pipeline tiles share that colormap).
function autoLegend(layer: LayerState): LegendDef {
  const enc = layer.valueEncoding;
  if (enc?.type === "categorical" && enc.classes) {
    return {
      kind: "categorical",
      items: Object.entries(enc.classes).map(([code, label]) => ({
        color: enc.classColors?.[Number(code)] ?? layer.color,
        label: String(label),
      })),
    };
  }
  if (layer.source === "tiles") {
    return { kind: "gradient", colors: OEF_HAZARD, labels: ["Low", "High"] };
  }
  return { kind: "solid" };
}

function LayerRow({ layer }: { layer: LayerState }) {
  const def: LegendDef = LEGEND_DEF[layer.id] ?? autoLegend(layer);
  const { color } = layer;
  const hasValues = layer.hasValueTiles === true;
  const unit = layer.valueEncoding?.unit;

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {def.kind === "line" ? (
          <div className="w-4 h-0.5 rounded shrink-0" style={{ backgroundColor: color }} />
        ) : def.kind === "point" ? (
          <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30" style={{ backgroundColor: color }} />
        ) : (
          <div className="w-3 h-3 rounded-sm shrink-0 border border-black/30" style={{ backgroundColor: color }} />
        )}
        <span className="text-[11px] text-zinc-200 leading-tight truncate flex-1">
          {layer.name}
        </span>
        <div
          title={hasValues ? (unit ? `Values: ${unit}` : "Values available") : "Visual only"}
          className={[
            "shrink-0 w-1.5 h-1.5 rounded-full",
            hasValues
              ? "bg-emerald-400"
              : (layer.source === "tiles" ? "border border-zinc-600 bg-transparent" : "hidden"),
          ].join(" ")}
        />
      </div>

      {def.kind === "gradient"    && <GradientBar colors={def.colors} labels={def.labels} unit={hasValues ? unit : undefined} />}
      {def.kind === "categorical" && <CategoricalItems items={def.items} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  layers: LayerState[];
}

export default function LegendPanel({ layers }: Props) {
  const [expanded, setExpanded] = useState(true);

  const activeLayers = layers.filter((l) => l.enabled && l.available);
  if (activeLayers.length === 0) return null;

  return (
    <div
      className="site-explorer-panel absolute bottom-0 right-4 z-[1001] w-52 rounded-t-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: "rgba(12, 12, 16, 0.93)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "none",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {expanded && (
        <div
          className="px-3 pt-2 pb-0.5 overflow-y-auto"
          style={{ maxHeight: "min(60vh, 440px)" }}
        >
          <div className="divide-y divide-zinc-800/50">
            {activeLayers.map((layer) => (
              <LayerRow key={layer.id} layer={layer} />
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-2 flex items-center gap-3 border-t border-zinc-800/60 pt-1.5">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[8px] text-zinc-500">Values accessible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full border border-zinc-600" />
            <span className="text-[8px] text-zinc-500">Visual only</span>
          </div>
        </div>
      )}

      <button
        data-testid="button-legend-toggle"
        onClick={() => setExpanded((v) => !v)}
        className="w-full h-10 flex items-center justify-between px-3 shrink-0 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-300 tracking-wide">Legend</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-zinc-400"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            {activeLayers.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
    </div>
  );
}
