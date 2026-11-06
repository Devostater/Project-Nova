# Nova model optimizer. Run: blender -b -P optimize_nova.py -- <in_dir> <out_dir>
# Decimates meshes, downsizes textures, scales each model to real metres, exports GLB + manifest.json
import bpy, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
IN_DIR = argv[0] if argv else '.'
OUT_DIR = argv[1] if len(argv) > 1 else os.path.join(IN_DIR, 'models')
os.makedirs(OUT_DIR, exist_ok=True)

# (match text in file name) -> (slug, longest side in metres, target triangles, max texture px)
# Order matters: first match wins.
RULES = [
 ('starfighter 3d model player', 'player_ship',    5.0,  20000, 1024),
 ('space fighter',               'fighter_alt',    5.0,  15000, 1024),
 ('patrol',                      'patrol',        11.0,  12000, 1024),
 ('pirate raider',               'pirate_raider', 20.0,  12000, 1024),
 ('gunship 3d model gunship',    'gunship',       20.0,  12000, 1024),
 ('cargo hauler',                'hauler',        30.0,  12000, 1024),
 ('sci-fi ship',                 'frigate',       70.0,  15000, 1024),
 ('carrier',                     'carrier',      160.0,  18000, 1024),
 ('maridian',                    'meridian',     520.0,  25000, 1024),
 ('ring space station',          'station_nova1',300.0,  25000, 1024),
 ('smugler',                     'lantern_den',  120.0,  15000, 1024),
 ('mining outpost',              'colony',       150.0,  15000, 1024),
 ('hull wreck',                  'wreck',        190.0,  12000, 1024),
 ('ice asteroid',                'asteroid_ice',  40.0,   5000,  512),
 ('rough asteroid',              'asteroid_rock', 40.0,   5000,  512),
 ('cargo container',             'container',     10.0,   5000,  512),
 ('combat drone',                'drone',          3.0,   6000,  512),
 ('missile button base',         'missile_base',  0.15,  12000, 1024),
 ('missle button base',          'missile_base',  0.15,  12000, 1024),
 ('missle button 3d',            'missile_button',0.12,   8000, 1024),
 ('space missile',               'missile',        4.0,   5000,  512),
 ('cockpit shell',               'cockpit_shell',  2.0,  25000, 1024),
 ('cockpit console',             'side_console',   0.5,  15000, 1024),
 ('ejection seat',               'seat',           0.9,  15000, 1024),
 ('flight stick',                'flight_stick',  0.25,  12000, 1024),
 ('throttle',                    'throttle',       0.3,  15000, 1024),
 ('overhead dash',               'overhead_dash',  0.9,  12000, 1024),
 ('holographic panel',           'holo_panel',    0.78,   4000,  512),
 ('thruster',                    'thruster',       0.2,   8000,  512),
 ('control_lever',               'missile_lever',  0.2,  12000, 1024),
 ('cat',                         'obi_cat',       0.30,  15000, 1024),
]

def pick(name):
    n = name.lower()
    for key, slug, size, tris, tex in RULES:
        if key in n:
            return slug, size, tris, tex
    return None

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def meshes():
    return [o for o in bpy.context.scene.objects if o.type == 'MESH']

def tri_count(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    t = 0
    for o in objs:
        eo = o.evaluated_get(dg)
        me = eo.to_mesh()
        me.calc_loop_triangles()
        t += len(me.loop_triangles)
        eo.to_mesh_clear()
    return t

def bounds(objs):
    mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector((min(mn[i], w[i]) for i in range(3)))
            mx = Vector((max(mx[i], w[i]) for i in range(3)))
    return mn, mx

manifest = {}
files = sorted(f for f in os.listdir(IN_DIR) if f.lower().endswith('.glb'))
for f in files:
    rule = pick(f)
    if not rule:
        print('SKIP (no rule):', f); continue
    slug, size, target, texmax = rule
    clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(IN_DIR, f))
    bpy.context.view_layer.update()
    ms = meshes()
    before = tri_count(ms)

    # decimate
    ratio = min(1.0, target / max(before, 1))
    skinned = any(o.find_armature() for o in ms)
    if skinned: ratio = max(ratio, 0.4)       # be gentle with the rigged cat
    dec_note = 'kept'
    if ratio < 0.98:
        for o in ms:
            bpy.context.view_layer.objects.active = o
            if o.data.shape_keys:
                continue
            m = o.modifiers.new('nova_dec', 'DECIMATE')
            m.decimate_type = 'COLLAPSE'
            m.ratio = ratio
            m.use_collapse_triangulate = True
        dec_note = 'ratio %.2f' % ratio
    bpy.context.view_layer.update()
    after = tri_count(ms)

    # scale to metres (about world origin, top-level objects only)
    mn, mx = bounds(ms)
    dims = mx - mn
    longest = max(dims) or 1.0
    k = size / longest
    for o in bpy.context.scene.objects:
        if o.parent is None:
            o.scale = o.scale * k
            o.location = o.location * k
    bpy.context.view_layer.update()
    mn, mx = bounds(ms)
    # centre horizontally, keep it at bounds centre (origin = middle of model)
    ctr = (mn + mx) / 2
    for o in bpy.context.scene.objects:
        if o.parent is None:
            o.location = o.location - ctr
    bpy.context.view_layer.update()

    # textures
    for img in bpy.data.images:
        if img.size[0] > texmax or img.size[1] > texmax:
            s = texmax / max(img.size[0], img.size[1])
            img.scale(max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s)))

    out = os.path.join(OUT_DIR, slug + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=85,
                              export_yup=True)
    dm = [round(d, 3) for d in (mx - mn)]
    manifest[slug] = {'source': f, 'tris_before': before, 'tris_after': after,
                      'decimate': dec_note, 'size_m': dm,
                      'mb': round(os.path.getsize(out) / 1e6, 2)}
    print('OK', slug, before, '->', after, 'tris', dm, manifest[slug]['mb'], 'MB')

with open(os.path.join(OUT_DIR, 'manifest.json'), 'w') as fh:
    json.dump(manifest, fh, indent=2)
print('DONE', len(manifest), 'models ->', OUT_DIR)
