// Cities available in the viewer. Adding a city here + a boundary file in
// client/public/sample-data/ + re-running `npm run sync:catalog` is all it
// takes to onboard a new site once its layers land in the OEF data catalog.

export interface CityDef {
  id: string;
  name: string;
  /** Subtitle shown next to the name (state / country). */
  region: string;
  /** Substrings that identify this city inside catalog asset URLs / dataset ids. */
  slugMatchers: string[];
  /** [lat, lng] used as fallback map center and for tile-availability probing. */
  center: [number, number];
  defaultZoom: number;
  /** Zoom level the sync script probes tiles at (a tile containing `center`). */
  probeZoom: number;
  /** Boundary file served from client/public/sample-data/. */
  boundaryFile: string;
}

export const CITIES: CityDef[] = [
  {
    id: "porto_alegre",
    name: "Porto Alegre",
    region: "Brazil",
    slugMatchers: ["porto_alegre", "poa_", "poa-", "/poa/"],
    center: [-30.0324999, -51.2303767],
    defaultZoom: 11,
    probeZoom: 12,
    boundaryFile: "porto-alegre-boundary.json",
  },
  {
    id: "plymouth",
    name: "Plymouth",
    region: "Minnesota, USA",
    slugMatchers: ["plymouth"],
    center: [45.0105, -93.4555],
    defaultZoom: 12,
    probeZoom: 12,
    boundaryFile: "plymouth-boundary.json",
  },
];

export const DEFAULT_CITY_ID = "porto_alegre";

export function getCity(id: string): CityDef {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}
