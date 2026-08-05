// ============================================================================
// RICHFIELD, MN — flood-risk layers recovered from the city's stormwater report
// ============================================================================
// Source: "Stormwater Model Update and Flood-Risk Area Identification and
// Prioritization", Barr Engineering Co. for the City of Richfield, August 2025,
// part-funded by the MPCA. Published as a PDF on the city's own website.
//
// ⚠️ THESE ARE RECONSTRUCTIONS, NOT THE SOURCE GIS.
//
// The report's figures were exported from ArcGIS Pro layouts that live on Barr's
// internal drive; the PCSWMM model output was never published as data. These
// polygons were traced back out of the rendered figures. That makes them good
// for screening and for showing an organisation the shape of flood risk in
// Richfield — and unfit for engineering, regulatory or design use. For the real
// thing, ask the City of Richfield for the GIS deliverable.
//
// How they were made — and why it is more trustworthy than "traced from a PDF"
// usually implies:
//
//   * NO coordinate graticule on these figures, unlike the Porto Alegre ARVC
//     maps. The affine was fitted by matching the DRAWN municipal boundary to
//     the official Richfield polygon that already ships with this viewer
//     (richfield-boundary.json). The city is a near-rectangle, so its west,
//     north and south edges are long straight dashed runs a scan finds
//     reliably; two give the scale, the third the offset.
//
//     ⚠️ The first release of these layers was 736 m too far EAST. The edge
//     detector used a fixed pixel margin to ignore the page frame, but the
//     frame sits ~150 px in and the margin was 120 px, so `min()` took the
//     FRAME as the city's west edge. The vertical axis escaped only because
//     its frame rows happened to fall outside the same window — the margin
//     approach was never right, just lucky on one axis. It now finds the frame
//     first and searches strictly inside it, with a guard that rejects a west
//     edge implausibly close to the frame.
//   * The notched EASTERN side, around the airport, was held out of the fit
//     entirely and used as an independent check.
//   * Ground resolution ~1.85 m/px at 300 dpi.
//   * Most fills are semi-transparent over the aerial basemap, so recovery is
//     by DIFFERENCE against Figure 1-1 (same extent, no data overlay,
//     pixel-identical outside the city) rather than by matching legend colours.
//
// The check that caught the one serious error: the 2-year extent initially came
// out LARGER than the 100-year, which is physically impossible. The corrected
// areas are monotonic — 185 / 259 / 440 / 485 ha for 2 / 10 / 100 / MCE100-year.
//
// Deliberately NOT included: the report's Social Vulnerability Index figure.
// Its source (CDC/ATSDR SVI) is a free public download cited in the report's own
// references, so tracing it out of a picture would be indefensible. Same applies
// to USGS 3DEP LiDAR, NOAA Atlas 14, Hennepin County GIS Open Data and the Met
// Council flood screening layer — fetch those, don't recover them.
// ============================================================================

export interface RichfieldFloodLayerDef {
  id: string;
  name: string;
  /** Static file under client/public/sample-data/. */
  file: string;
  /** Figure number in the source report. */
  figure: string;
  /** Recovered extent, hectares — sanity anchor for reviewers. */
  areaHa: number;
  /** Ordinal classes, ascending, or null for a single-class extent layer. */
  classes: string[] | null;
}

export const RICHFIELD_FLOOD_LAYERS: RichfieldFloodLayerDef[] = [
  {
    id: 'rf_inundation_2yr', name: 'Inundation — 2-year Storm',
    file: 'richfield-flood-inundation-2yr.json', figure: '3-1', areaHa: 185, classes: null,
  },
  {
    id: 'rf_inundation_10yr', name: 'Inundation — 10-year Storm',
    file: 'richfield-flood-inundation-10yr.json', figure: '3-2', areaHa: 248, classes: null,
  },
  {
    id: 'rf_inundation_100yr', name: 'Inundation — 100-year Storm',
    file: 'richfield-flood-inundation-100yr.json', figure: '3-3', areaHa: 431, classes: null,
  },
  {
    id: 'rf_inundation_mce100', name: 'Inundation — MCE 100-year Storm',
    file: 'richfield-flood-inundation-mce100.json', figure: '3-4', areaHa: 500, classes: null,
  },
  {
    id: 'rf_prioritization_score', name: 'Flood-Risk Prioritization Score',
    file: 'richfield-flood-prioritization-score.json', figure: '4-7', areaHa: 308,
    classes: ['0.0 - 2.4', '2.5 - 4.4', '4.5 - 6.4', '6.5 - 10'],
  },
];

/** Fill colours, taken from the report's own legends so the viewer matches the PDF. */
export const RICHFIELD_FLOOD_COLORS: Record<string, string> = {
  // storm-event extents (single class each, progressively darker)
  rf_inundation_2yr: '#c9ecff',
  rf_inundation_10yr: '#59c7ee',
  rf_inundation_100yr: '#5994ee',
  rf_inundation_mce100: '#598aa3',
  // prioritization score — ColorBrewer YlGnBu, as printed
  '0.0 - 2.4': '#ffffcc',
  '2.5 - 4.4': '#a1dab4',
  '4.5 - 6.4': '#2c7fb8',
  '6.5 - 10': '#253494',
};

export function richfieldFloodColor(layerId: string, cls?: string | null): string {
  if (cls && RICHFIELD_FLOOD_COLORS[cls]) return RICHFIELD_FLOOD_COLORS[cls];
  return RICHFIELD_FLOOD_COLORS[layerId] ?? '#5994ee';
}

export function isRichfieldFloodLayer(layerId: string): boolean {
  return RICHFIELD_FLOOD_LAYERS.some(l => l.id === layerId);
}

export const RICHFIELD_FLOOD_SOURCE =
  'Barr Engineering Co. for the City of Richfield, Aug 2025 (MPCA-funded)';

export const RICHFIELD_FLOOD_SOURCE_URL =
  'https://cms9files.revize.com/richfieldmn/Richfield_FloodRiskPrioritization.pdf';

/** Shown on every hover. Blunt on purpose. */
export const RICHFIELD_FLOOD_DERIVED_NOTE =
  'Reconstructed from the published PDF figure — not the source GIS. Screening use only.';
