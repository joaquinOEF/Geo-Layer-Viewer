"""
Recover the Richfield flood-risk layers from the Barr Engineering report PDF.

Unlike the ARVC figures, these carry NO coordinate graticule — only a scale bar
and a north arrow. So the affine is fitted by feature matching instead:

  * Richfield's municipal boundary is drawn (dashed) on every city-wide figure,
    and its official polygon already ships with the Geo-Layer-Viewer.
  * The city is a near-rectangle, so the drawn west / north / south edges are
    long straight dashed runs that a projection-free scan finds reliably.
  * Two edges give the scale, the third gives the offset; the notched eastern
    side (around the airport) is then a free, independent check — nothing in
    the fit used it.

All ten city-wide layouts share one map extent (verified: agreement to half a
pixel), so one affine covers them all. Ground resolution ~1.85 m/px at 300 dpi.

The fills are opaque flat colours from ColorBrewer palettes, sampled from each
figure's own legend rather than assumed.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from skimage import measure, morphology
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

S = os.path.dirname(os.path.abspath(__file__))
PDF = f'{S}/Richfield_FloodRiskPrioritization.pdf'
BOUNDARY = ('/Users/jvp/Claude/work/oef/geo-layer-viewer/client/public/'
            'sample-data/richfield-boundary.json')
DPI = 300
R = 6378137.0


def merc(lon, lat):
    return (math.radians(lon) * R,
            math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R)


def unmerc(x, y):
    return (math.degrees(x / R),
            math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2))


def boundary_coords():
    d = json.load(open(BOUNDARY))
    g = d['boundaryGeoJson']
    f = g['features'][0] if g.get('features') else g
    c = f['geometry']['coordinates'] if 'geometry' in f else f['coordinates']
    while isinstance(c[0][0], list):
        c = c[0]
    return c


# ── Figures ─────────────────────────────────────────────────────────────────
# swatch colours measured off each figure's own legend panel
FIGURES = [
    dict(page=15, id='inundation_2yr',   name='Inundation Extent — 2-year 24-hour',
         classes=[('extent', (0xc9, 0xec, 0xff))]),
    dict(page=16, id='inundation_10yr',  name='Inundation Extent — 10-year 24-hour',
         classes=[('extent', (0x59, 0xc7, 0xee))]),
    dict(page=17, id='inundation_100yr', name='Inundation Extent — 100-year 24-hour',
         classes=[('extent', (0x59, 0x94, 0xee))]),
    dict(page=18, id='inundation_mce100', name='Inundation Extent — MCE 100-year 24-hour',
         classes=[('extent', (0x59, 0x8a, 0xa3))]),
    dict(page=27, id='svi_areas', name='Social Vulnerability Index (census tract)',
         classes=[('SVI 0-25th percentile (low)',            (0x92, 0xb9, 0x80)),
                  ('SVI 25-50th percentile (low-moderate)',  (0xff, 0xff, 0x80)),
                  ('SVI 50-75th percentile (moderate-high)', (0xff, 0xd4, 0x80)),
                  ('SVI 75-100th percentile (high)',         (0xff, 0x80, 0x80))]),
    dict(page=31, id='prioritization_score', name='Flood-Risk Areas — Combined Prioritization Score',
         opaque=True,
         classes=[('0.0 - 2.4',  (0xff, 0xff, 0xcc)),
                  ('2.5 - 4.4',  (0xa1, 0xda, 0xb4)),
                  ('4.5 - 6.4',  (0x2c, 0x7f, 0xb8)),
                  ('6.5 - 10',   (0x25, 0x34, 0x94))]),
]

BASEMAP_PAGE = 8   # Figure 1-1 "Study Area": the same extent with no data overlay
TOL = 30           # max RGB distance to a class colour before a pixel is "not it"
MIN_AREA_M2 = 150  # drop specks smaller than this (≈ 44 px at 1.85 m/px)


def furniture_mask(base):
    """Labels and road casings in the shared basemap, dilated to catch halos."""
    H, W, _ = base.shape
    raw = (base.min(2) > 225) | (base.max(2) < 70)
    pad = np.pad(raw, 2)
    out = np.zeros_like(raw)
    for dy in range(5):
        for dx in range(5):
            out |= pad[dy:dy + H, dx:dx + W]
    return out


def class_masks_diff(img, base, body, class_rgbs, furniture):
    """Classify by DIFFERENCE against the clean basemap, not by absolute colour.

    Why: only the prioritization figure (p31) paints opaque fills. The
    inundation and SVI layers are drawn semi-transparent over the Nearmap
    aerial, so an observed pixel is  O = a*C + (1-a)*B  for unknown per-pixel
    alpha. Matching O against the legend colour C therefore finds only the
    handful of pixels where the underlying basemap happened to be light enough
    for the blend to land on C — it recovered 8.7 ha of 100-year inundation
    where the true figure shows ~450 ha.

    Figure 1-1 (page 8) is the same extent with no data overlay and is
    pixel-identical outside the city, so it serves as B. Then:
      * a pixel is "overlaid" if it differs from B at all;
      * its class is the C whose direction (C - B) best matches the observed
        direction (O - B). Cosine similarity is alpha-invariant, so it works
        regardless of how transparent the fill is at that pixel.
    """
    O = img[body].astype(np.float32)
    B = base[body].astype(np.float32)
    d = O - B
    mag = np.linalg.norm(d, axis=1)
    changed = mag > 18

    # Drop map furniture. Labels (near-white with halos) and road casings /
    # outlines (near-black) are drawn OVER the fills, so they differ from the
    # basemap just enough to survive the difference test and then get classified
    # into whichever class their colour shift happens to point at. The visible
    # symptom is street and lake names appearing inside a polygon as a wrong
    # class, and text-shaped holes punched through fills.
    #
    # Every city-wide layout shares one map template, so furniture sits in the
    # same place on every figure — identify it once from the basemap and mask it
    # everywhere.
    changed &= ~furniture[body]

    out = []
    if len(class_rgbs) == 1:
        # Single-class layer: any change that is not a white label halo or a
        # black outline is the overlay.
        C = np.array(class_rgbs[0], np.float32)
        toward = ((d * (C - B)).sum(1) / (np.linalg.norm(C - B, axis=1) * mag + 1e-6))
        sel = changed & (toward > 0.55)
        m = np.zeros(img.shape[:2], bool)
        idx = np.nonzero(body)
        m[idx[0][sel], idx[1][sel]] = True
        return [m]

    cls = np.array(class_rgbs, np.float32)
    best_sim = np.full(len(O), -2.0, np.float32)
    best_i = np.zeros(len(O), np.int32)
    for i, C in enumerate(cls):
        v = C[None, :] - B
        sim = (d * v).sum(1) / (np.linalg.norm(v, axis=1) * mag + 1e-6)
        upd = sim > best_sim
        best_sim[upd] = sim[upd]
        best_i[upd] = i
    sel_all = changed & (best_sim > 0.80)
    idx = np.nonzero(body)
    for i in range(len(class_rgbs)):
        m = np.zeros(img.shape[:2], bool)
        sel = sel_all & (best_i == i)
        m[idx[0][sel], idx[1][sel]] = True
        out.append(m)
    return out


def class_masks(img, body, class_rgbs):
    """Assign each body pixel to the nearest class colour, but only if it also
    beats every background anchor.

    Thresholding one class colour on its own does not work here: the pale
    2-year blue (#c9ecff) sits close to the desaturated aerial basemap, and a
    tolerance loose enough to catch antialiased fill edges also swallowed most
    of the city — the 2-year extent came out LARGER than the 100-year, which is
    physically impossible and is what exposed the bug. Competing anchors,
    harvested from the figure's own background, fix it.
    """
    px = img[body].astype(np.float32)
    cls = np.array(class_rgbs, np.float32)

    # Chunked: the body is ~13 M pixels and a full (N, 60) distance matrix is
    # ~6 GB, which thrashed rather than finishing.
    def min_dist(anchors, chunk=400_000):
        out = np.empty(len(px), np.float32)
        arg = np.empty(len(px), np.int32)
        for i in range(0, len(px), chunk):
            blk = px[i:i + chunk]
            d = np.linalg.norm(blk[:, None, :] - anchors[None, :, :], axis=2)
            out[i:i + chunk] = d.min(1)
            arg[i:i + chunk] = d.argmin(1)
        return out, arg

    d_cls, best = min_dist(cls)
    from collections import Counter
    far = d_cls > 12
    bg = [c for c, _ in Counter(map(tuple, px[far][::37].astype(int))).most_common(60)]
    bga = np.array(bg, np.float32)
    d_bg, _ = min_dist(bga)
    ok = (d_cls <= TOL) & (d_cls < d_bg)
    out = []
    for i in range(len(class_rgbs)):
        m = np.zeros(img.shape[:2], bool)
        sel = ok & (best == i)
        idx = np.nonzero(body)
        m[idx[0][sel], idx[1][sel]] = True
        out.append(m)
    return out


def render(page):
    """pdftoppm zero-pads the page suffix to the width of the last page number,
    so page 8 lands as `-08.png`, not `-8.png`. Glob rather than guess."""
    import glob
    out = f'{S}/rf{DPI}_{page}'
    hits = glob.glob(f'{out}-*.png')
    if not hits:
        subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-r', str(DPI),
                        '-png', PDF, out], check=True, capture_output=True)
        hits = glob.glob(f'{out}-*.png')
    return hits[0]


def fit_affine(img):
    """(s, tx, ty) mapping pixel -> Web Mercator, from the drawn city boundary."""
    H, W, _ = img.shape
    body = img[20:H - 20, 20:int(W * 0.845)]
    dark = body.max(2) < 95

    def runs(v, off, frac=0.35):
        th = v.max() * frac
        out, cur = [], []
        for i, x in enumerate(v):
            if x > th:
                cur.append(i)
            elif cur:
                out.append((cur[0] + cur[-1]) / 2 + off)
                cur = []
        if cur:
            out.append((cur[0] + cur[-1]) / 2 + off)
        return out

    # Find the FIGURE FRAME first, then look for the city boundary strictly
    # inside it. A fixed pixel margin does not work: the frame sits ~150 px from
    # the image edge, so a 120 px margin let it through, `min(vs)` took the frame
    # as the city's west edge, and every layer shipped 736 m too far east. The
    # vertical axis escaped only because its frame rows happened to fall outside
    # the same window — i.e. the margin approach was never right, just lucky on
    # one axis.
    vs_all = runs(dark.sum(0), 20)
    hs_all = runs(dark.sum(1), 20)
    if len(vs_all) < 2 or len(hs_all) < 2:
        raise ValueError(f'figure frame not found (V={vs_all}, H={hs_all})')
    fx0, fx1 = min(vs_all), max(vs_all)      # frame verticals
    fy0, fy1 = min(hs_all), max(hs_all)      # frame horizontals
    INSET = 30
    vs = [x for x in vs_all if fx0 + INSET < x < fx1 - INSET]
    hs = [y for y in hs_all if fy0 + INSET < y < fy1 - INSET]
    if len(vs) < 1 or len(hs) < 2:
        raise ValueError(f'city boundary edges not found inside the frame '
                         f'(frame x {fx0:.0f}..{fx1:.0f}, y {fy0:.0f}..{fy1:.0f}; '
                         f'V={vs}, H={hs})')
    x_w = min(vs)
    y_n, y_s = min(hs), max(hs)

    # Guard: the west edge must sit well inside the frame. If this trips, the
    # detector has locked onto furniture again.
    if not (fx0 + 200 < x_w < fx1 - 200):
        raise ValueError(f'west city edge {x_w:.0f} implausible inside frame '
                         f'{fx0:.0f}..{fx1:.0f}')

    coords = boundary_coords()
    la_max = max(c[1] for c in coords)
    la_min = min(c[1] for c in coords)
    lo_min = min(c[0] for c in coords)
    _, mY_N = merc(0, la_max)
    _, mY_S = merc(0, la_min)
    mX_W, _ = merc(lo_min, 0)

    s = (mY_N - mY_S) / (y_s - y_n)
    ty = mY_N + s * y_n
    tx = mX_W - s * x_w
    return s, tx, ty


def verify(img, s, tx, ty):
    """Independent check: the notched EAST side was not used in the fit."""
    H, W, _ = img.shape
    dark = img.max(2) < 95
    pad = np.pad(dark, 3)
    near = np.zeros_like(dark)
    for dy in range(7):
        for dx in range(7):
            near |= pad[dy:dy + H, dx:dx + W]
    coords = boundary_coords()
    lo_mid = (min(c[0] for c in coords) + max(c[0] for c in coords)) / 2
    east = [c for c in coords if c[0] > lo_mid]
    hit = 0
    for lon, lat in east:
        mx, my = merc(lon, lat)
        px, py = int((mx - tx) / s), int((ty - my) / s)
        if 0 <= px < W and 0 <= py < H and near[py, px]:
            hit += 1
    return hit / max(len(east), 1)


def trace(mask, s, tx, ty, min_area_px):
    """Binary mask -> list of lon/lat rings via marching squares."""
    polys = []
    padded = np.pad(mask.astype(float), 1)
    for c in measure.find_contours(padded, 0.5):
        if len(c) < 8:
            continue
        ring = [(x - 1, y - 1) for y, x in c]          # (row,col) -> (x,y)
        p = Polygon(ring)
        if not p.is_valid:
            p = p.buffer(0)
        if p.is_empty or p.area < min_area_px:
            continue
        p = p.simplify(0.8, preserve_topology=True)
        if p.is_empty:
            continue
        geoms = [p] if p.geom_type == 'Polygon' else list(p.geoms)
        for gp in geoms:
            lonlat = [list(unmerc(tx + s * x, ty - s * y))
                      for x, y in gp.exterior.coords]
            lonlat = [[round(a, 6), round(b, 6)] for a, b in lonlat]
            if len(lonlat) >= 4:
                polys.append(lonlat)
    return polys


_CLIP = None
def clip_poly():
    """Municipal boundary, for clipping. Census tracts and inundation both spill
    past the city edge in the figures; the layers are about Richfield."""
    global _CLIP
    if _CLIP is None:
        _CLIP = Polygon(boundary_coords()).buffer(0)
    return _CLIP


def run(fig):
    png = render(fig['page'])
    img = np.asarray(Image.open(png).convert('RGB')).astype(int)
    H, W, _ = img.shape
    s, tx, ty = fit_affine(img)
    east_hit = verify(img, s, tx, ty)
    ground_m = s * math.cos(math.radians(44.876))
    min_area_px = MIN_AREA_M2 / (ground_m ** 2)

    body = np.zeros((H, W), bool)
    body[60:H - 60, 100:int(W * 0.845)] = True

    feats = []
    base = np.asarray(Image.open(render(BASEMAP_PAGE)).convert('RGB')).astype(int)
    if base.shape != img.shape:
        raise ValueError('basemap page has a different render size')
    # Which recovery mode: p31 paints opaque fills, everything else blends over
    # the aerial. Using difference imaging on the opaque figure over-captures —
    # it also flags the basemap's own desaturation treatment — so the two modes
    # are declared per figure rather than guessed.
    rgbs = [rgb for _, rgb in fig['classes']]
    if fig.get('opaque'):
        masks = class_masks(img, body, rgbs)
    else:
        masks = class_masks_diff(img, base, body, rgbs, furniture_mask(base))
    # Close first (bridges the gaps furniture left behind), then drop specks,
    # then fill the holes text punched through the middle of a fill.
    masks = [morphology.remove_small_holes(
                 morphology.remove_small_objects(
                     morphology.binary_closing(m, morphology.disk(3)), 60),
                 area_threshold=400)
             for m in masks]
    areas = {}
    for (cls_name, rgb), mask in zip(fig['classes'], masks):
        rings = trace(mask, s, tx, ty, min_area_px)
        area_m2 = mask.sum() * ground_m ** 2
        areas[cls_name] = area_m2
        clip = clip_poly()
        for ring in rings:
            g = Polygon(ring).buffer(0)
            if g.is_empty:
                continue
            g = g.intersection(clip)
            if g.is_empty:
                continue
            for gp in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
                if gp.geom_type != 'Polygon' or gp.is_empty:
                    continue
                coords = [[round(x, 6), round(y, 6)] for x, y in gp.exterior.coords]
                if len(coords) >= 4:
                    feats.append({'type': 'Feature',
                                  'properties': {'class': cls_name, 'layer': fig['id']},
                                  'geometry': {'type': 'Polygon', 'coordinates': [coords]}})
        print(f"    {cls_name:<42} {mask.sum():>8,} px  {area_m2/10000:7.1f} ha  "
              f"{len(rings):>4} polygons")

    out = {
        'type': 'FeatureCollection',
        'name': f"richfield_{fig['id']}",
        'provenance': {
            'derived': True,
            'headline': 'RECONSTRUCTION — traced from a published PDF figure, not the source GIS.',
            'source_document': ('Stormwater Model Update and Flood-Risk Area Identification '
                                'and Prioritization, City of Richfield, MN'),
            'source_authors': 'Barr Engineering Co., August 2025 (part-funded by MPCA)',
            'source_url': ('https://cms9files.revize.com/richfieldmn/'
                           'Richfield_FloodRiskPrioritization.pdf'),
            'figure_page': fig['page'],
            'figure_title': fig['name'],
            'georeferencing': (
                'No graticule on these figures. Affine fitted by matching the drawn municipal '
                'boundary to the official Richfield polygon (west/north/south edges); the '
                'notched eastern side was held out as an independent check.'),
            'east_edge_check_pct': round(east_hit * 100, 1),
            'ground_m_per_px': round(ground_m, 3),
            'method': ('Difference imaging against Figure 1-1 (same extent, no data overlay), '
                       'then per-pixel class assignment by the direction of the colour shift. '
                       'This is alpha-invariant, which matters because most of these fills are '
                       'semi-transparent over the aerial basemap.'),
            'note': ('Polygons are traced from rendered pixels: edges are accurate to a few '
                     'metres, interior holes are not preserved, and specks under '
                     f'{MIN_AREA_M2} m² are dropped. Do not use for engineering or regulatory '
                     'purposes — request the source GIS from the City of Richfield.'),
        },
        'features': feats,
    }
    p = f"{S}/richfield_{fig['id']}.geojson"
    json.dump(out, open(p, 'w'), ensure_ascii=False)
    print(f"    -> {len(feats)} polygons, {os.path.getsize(p)/1024:.0f} KB, "
          f"east-edge check {east_hit*100:.0f}%\n")
    return fig['id'], len(feats), east_hit, areas


if __name__ == '__main__':
    print(f"{'layer':<24} classes")
    print('-' * 92)
    results = []
    for fig in FIGURES:
        print(f"{fig['id']:<24} (page {fig['page']}) {fig['name']}")
        results.append(run(fig))
    print('recovered:', [r[0] for r in results])
