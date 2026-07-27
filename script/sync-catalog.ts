// Sync the viewer's layer catalog from the OEF geospatial-data repo.
//
//   npm run sync:catalog                 # fetch datasets.yaml from GitHub main
//   npm run sync:catalog -- --local ../geospatial-data/catalog/datasets.yaml
//
// For every dataset in catalog/datasets.yaml this script:
//   1. extracts the tile assets + value encoding,
//   2. infers which city the dataset belongs to (from asset URLs / dataset id),
//      or treats it as a global mosaic candidate for every city,
//   3. PROBES the actual S3 tile pyramids at each candidate city's center
//      (visual + value tiles) so availability reflects what is really published,
//   4. writes shared/generated/catalog.json — the single source of truth that
//      both the Express tile proxy and the React layer list are built from.
//
// Display cosmetics (colors, icons, grouping, curated names) live in
// client/src/data/catalog-overrides.ts, NOT here.

import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { CITIES, type CityDef } from "../shared/cities";

const CATALOG_URL =
  "https://raw.githubusercontent.com/Open-Earth-Foundation/geospatial-data/main/catalog/datasets.yaml";
const OUT_PATH = path.resolve(process.cwd(), "shared", "generated", "catalog.json");

interface RawDataset {
  dataset_id: string;
  dataset_name?: string;
  publisher?: string;
  license?: string;
  resolution?: string;
  source_url?: string;
  dataset_type?: string;
  type?: string;
  access_type?: string;
  data_quality?: { temporal_coverage?: string; accuracy?: string; limitations?: string };
  value_encoding?: any;
  assets?: any;
  description?: string;
}

export interface CatalogEncoding {
  type: "numeric" | "categorical";
  scale?: number;
  offset?: number;
  nodata?: number;
  unit?: string;
  classes?: Record<number, string>;
  classColors?: Record<number, string>;
}

export interface CatalogDataset {
  id: string;
  name: string;
  publisher?: string;
  license?: string;
  resolution?: string;
  sourceUrl?: string;
  datasetType?: string;
  rasterType?: string;
  accessType?: string;
  quality?: { temporalCoverage?: string; accuracy?: string; limitations?: string };
  description?: string;
  visualTiles: string | null;
  valueTiles: string | null;
  cogUrl: string | null;
  encoding: CatalogEncoding | null;
  /** city id when asset URLs are city-specific, null for global mosaics */
  cityScope: string | null;
  /** probed availability per city id */
  availability: Record<string, { visual: boolean; values: boolean }>;
}

function firstUrl(v: unknown): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : null;
  return typeof v === "string" ? v : null;
}

// ── Encoding translation: catalog schema → viewer decode schema ──────────────
function translateEncoding(enc: any): CatalogEncoding | null {
  if (!enc || typeof enc !== "object") return null;
  const formula: string = enc.decode_formula ?? "";

  if (enc.type === "class_lookup") {
    const classes: Record<number, string> = {};
    const classColors: Record<number, string> = {};
    for (const [k, v] of Object.entries(enc.classes ?? {})) {
      const code = Number(k);
      if (v && typeof v === "object") {
        classes[code] = (v as any).name ?? String(k);
        if ((v as any).color) classColors[code] = (v as any).color;
      } else {
        classes[code] = String(v);
      }
    }
    // Mechanism-type rasters store class+1 so raw 0 can mean nodata
    // ("mechanism_code = encoded - 1" in the catalog decode_formula).
    const plusOne = /encoded\s*-\s*1/.test(formula);
    return {
      type: "categorical",
      ...(plusOne ? { offset: -1, nodata: 0 } : {}),
      classes,
      ...(Object.keys(classColors).length ? { classColors } : {}),
    };
  }

  // rgb_24bit_scaled and single_channel both decode as
  // value = (R + 256*G + 65536*B + offset) / scale (G=B=0 for single_channel).
  return {
    type: "numeric",
    scale: enc.scale ?? 1,
    offset: enc.offset ?? 0,
    ...(enc.unit ? { unit: enc.unit } : {}),
  };
}

// ── City scope inference ─────────────────────────────────────────────────────
// Only the tile URLs (and the dataset id itself) determine scope — source_url
// and download assets often mention a city even when the tile pyramid is a
// global mosaic. Datasets with no city marker are probed for every city.
function inferCityScope(d: RawDataset, urls: (string | null)[]): string | null {
  const haystack = [d.dataset_id, ...urls.filter(Boolean)].join(" ").toLowerCase();
  for (const city of CITIES) {
    if (city.slugMatchers.some((s) => haystack.includes(s))) return city.id;
  }
  return null;
}

// ── Tile probing ─────────────────────────────────────────────────────────────
function latLngToTile(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const latR = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  return { x, y };
}

async function probeTemplate(template: string, city: CityDef): Promise<boolean> {
  // Try the probe zoom first, then two coarser levels (some pyramids start at z10).
  for (const z of [city.probeZoom, city.probeZoom - 1, city.probeZoom - 2]) {
    const { x, y } = latLngToTile(city.center[0], city.center[1], z);
    const url = template
      .replace("{z}", String(z))
      .replace("{x}", String(x))
      .replace("{y}", String(y));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return true;
    } catch {
      // network error → treat as unavailable at this zoom, keep trying
    }
  }
  return false;
}

async function main() {
  const localIdx = process.argv.indexOf("--local");
  let yamlText: string;
  let source: string;
  if (localIdx !== -1 && process.argv[localIdx + 1]) {
    source = path.resolve(process.argv[localIdx + 1]);
    yamlText = fs.readFileSync(source, "utf-8");
  } else {
    source = CATALOG_URL;
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`Failed to fetch ${CATALOG_URL}: ${res.status}`);
    yamlText = await res.text();
  }

  const raw = parseYaml(yamlText);
  const rawDatasets: RawDataset[] = raw?.datasets ?? [];
  console.log(`Parsed ${rawDatasets.length} datasets from ${source}`);

  const datasets: CatalogDataset[] = [];
  for (const d of rawDatasets) {
    const assets = d.assets ?? {};
    const visualTiles = firstUrl(assets.visual_tiles?.url_template);
    const valueTiles = firstUrl(assets.value_tiles?.url_template);
    const cogUrl = firstUrl(assets.download?.cog_url);
    const cityScope = inferCityScope(d, [visualTiles, valueTiles]);

    const availability: Record<string, { visual: boolean; values: boolean }> = {};
    if (visualTiles || valueTiles) {
      const candidates = cityScope ? CITIES.filter((c) => c.id === cityScope) : CITIES;
      for (const city of candidates) {
        const visual = visualTiles ? await probeTemplate(visualTiles, city) : false;
        const values = valueTiles ? await probeTemplate(valueTiles, city) : false;
        availability[city.id] = { visual, values };
      }
    }

    const anyAvailable = Object.values(availability).some((a) => a.visual || a.values);
    const summary = Object.entries(availability)
      .map(([c, a]) => `${c}:${a.visual ? "V" : "-"}${a.values ? "v" : "-"}`)
      .join(" ");
    console.log(
      `  ${d.dataset_id.padEnd(36)} scope=${(cityScope ?? "global").padEnd(12)} ${
        visualTiles || valueTiles ? summary || "(no tiles)" : "(no tile assets)"
      }${visualTiles && !anyAvailable ? "  ⚠ tiles listed but none reachable" : ""}`
    );

    datasets.push({
      id: d.dataset_id,
      name: d.dataset_name ?? d.dataset_id,
      publisher: d.publisher,
      license: d.license,
      resolution: d.resolution,
      sourceUrl: d.source_url,
      datasetType: d.dataset_type,
      rasterType: d.type,
      accessType: d.access_type,
      quality: d.data_quality
        ? {
            temporalCoverage: d.data_quality.temporal_coverage,
            accuracy: d.data_quality.accuracy,
            limitations: d.data_quality.limitations,
          }
        : undefined,
      description: d.description?.trim(),
      visualTiles,
      valueTiles,
      cogUrl,
      encoding: translateEncoding(d.value_encoding),
      cityScope,
      availability,
    });
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({ source, generatedAt: new Date().toISOString(), datasets }, null, 2)
  );

  const tiled = datasets.filter((d) => Object.values(d.availability).some((a) => a.visual));
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`${datasets.length} datasets, ${tiled.length} with reachable visual tiles.`);
  for (const city of CITIES) {
    const n = datasets.filter((d) => d.availability[city.id]?.visual).length;
    console.log(`  ${city.name}: ${n} visual tile layers`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
