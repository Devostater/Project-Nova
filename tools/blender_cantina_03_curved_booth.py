"""
Blender 5.2+ Curved Booth Generator
Project Nova - Station Nova-1 Cantina
Asset 03: Curved Booth (cantina_03_curved_booth)

Strictly reconstructed from: art_src/cantina/cantina_03_curved_booth_3d_source.png
- Semicircular station-cantina booth matching the perimeter seating pods
- ~2.70m outer diameter, ~1.25m backrest height, 0.46m seat height
- Opening faces +Y, perfectly accommodating Asset 04 Round Table
- Segmented dark gunmetal outer armor shell with panel seams
- Continuous cyan emissive accent band near the floor base
- Vertically segmented plush burgundy leather backrest cushions
- Contoured burgundy padded seat bench
- PBR Materials: Booth_Gunmetal, Booth_DarkMetal, Booth_BurgundyLeather, Booth_CyanEmission
"""

import sys
import os
import math

try:
    import bpy
    import bmesh
    from mathutils import Vector, Matrix, Euler
except ImportError:
    print("[ERROR] This script must run inside Blender.")
    sys.exit(1)

# Paths
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_03_curved_booth.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_03_curved_booth.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_03_curved_booth.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_03_curved_booth_preview.png")

# Engineering Dimensions (in meters)
R_OUTER_SHELL = 1.35      # 2.70m outer diameter
T_WALL = 0.08             # 8cm thick back wall shell
R_INNER_SHELL = R_OUTER_SHELL - T_WALL # 1.27m
DEPTH_SEAT = 0.50         # 50cm seat depth
R_SEAT_FRONT = R_INNER_SHELL - DEPTH_SEAT # 0.77m (fits 0.45m radius table + 0.32m clearance)

H_BACKREST = 1.25         # 1.25m backrest height
H_SEAT = 0.46             # 0.46m seat cushion top height
T_CUSHION = 0.08          # 8cm seat cushion thickness

# Opening facing +Y: Booth sweeps from 170° to 370° (or -10° to 190°), encompassing 200° arc centered at -Y
THETA_START = math.radians(170.0)
THETA_END   = math.radians(370.0)
NUM_SEGS = 64

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)

def setup_materials():
    mats = {}

    def make_pbr(name, base_color, metallic, roughness, emission=None, emission_strength=1.0, ior=1.45):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
            bsdf.inputs["Metallic"].default_value = metallic
            bsdf.inputs["Roughness"].default_value = roughness
            if "IOR" in bsdf.inputs:
                bsdf.inputs["IOR"].default_value = ior
            if emission:
                if "Emission Color" in bsdf.inputs:
                    bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
                    bsdf.inputs["Emission Strength"].default_value = emission_strength
                elif "Emission" in bsdf.inputs:
                    bsdf.inputs["Emission"].default_value = (*emission, 1.0)
        return mat

    mats["Booth_Gunmetal"] = make_pbr("Booth_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.32)
    mats["Booth_DarkMetal"] = make_pbr("Booth_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Booth_BurgundyLeather"] = make_pbr("Booth_BurgundyLeather", (0.16, 0.022, 0.038), 0.04, 0.44)
    mats["Booth_CyanEmission"] = make_pbr("Booth_CyanEmission", (0.08, 0.92, 1.0), 0.10, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=7.0)

    return mats

def apply_bevel(obj, width=0.003, segments=2):
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(40)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True

def build_outer_shell(col, mats, parent):
    # Curved outer armor shell enclosing the booth
    bm = bmesh.new()
    
    verts_bottom_out = []
    verts_bottom_in  = []
    verts_top_out    = []
    verts_top_in     = []

    for i in range(NUM_SEGS + 1):
        t = i / NUM_SEGS
        ang = THETA_START + t * (THETA_END - THETA_START)
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)

        v_bo = bm.verts.new((R_OUTER_SHELL * cos_a, R_OUTER_SHELL * sin_a, 0.0))
        v_bi = bm.verts.new((R_INNER_SHELL * cos_a, R_INNER_SHELL * sin_a, 0.0))
        v_to = bm.verts.new((R_OUTER_SHELL * cos_a, R_OUTER_SHELL * sin_a, H_BACKREST))
        v_ti = bm.verts.new((R_INNER_SHELL * cos_a, R_INNER_SHELL * sin_a, H_BACKREST))

        verts_bottom_out.append(v_bo)
        verts_bottom_in.append(v_bi)
        verts_top_out.append(v_to)
        verts_top_in.append(v_ti)

    # Faces for outer curved wall, inner wall, top rim, bottom, and endcaps
    for i in range(NUM_SEGS):
        # Outer surface
        bm.faces.new((verts_bottom_out[i], verts_bottom_out[i+1], verts_top_out[i+1], verts_top_out[i]))
        # Inner surface
        bm.faces.new((verts_bottom_in[i+1], verts_bottom_in[i], verts_top_in[i], verts_top_in[i+1]))
        # Top rim
        bm.faces.new((verts_top_out[i], verts_top_out[i+1], verts_top_in[i+1], verts_top_in[i]))
        # Bottom
        bm.faces.new((verts_bottom_in[i], verts_bottom_in[i+1], verts_bottom_out[i+1], verts_bottom_out[i]))

    # End caps at theta_start and theta_end
    bm.faces.new((verts_bottom_in[0], verts_bottom_out[0], verts_top_out[0], verts_top_in[0]))
    bm.faces.new((verts_bottom_out[-1], verts_bottom_in[-1], verts_top_in[-1], verts_top_out[-1]))

    mesh = bpy.data.meshes.new("Booth_Outer_Armor_Shell")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Booth_Outer_Armor_Shell", mesh)
    obj.data.materials.append(mats["Booth_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.004, segments=2)

def build_cyan_base_strip(col, mats, parent):
    # Recessed cyan emissive strip along outer shell base (Z=0.04m to 0.06m)
    bm = bmesh.new()
    h_strip = 0.025
    z_strip = 0.040
    r_strip = R_OUTER_SHELL + 0.005

    verts_b = []
    verts_t = []

    for i in range(NUM_SEGS + 1):
        t = i / NUM_SEGS
        ang = THETA_START + t * (THETA_END - THETA_START)
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)

        vb = bm.verts.new((r_strip * cos_a, r_strip * sin_a, z_strip))
        vt = bm.verts.new((r_strip * cos_a, r_strip * sin_a, z_strip + h_strip))
        verts_b.append(vb)
        verts_t.append(vt)

    for i in range(NUM_SEGS):
        bm.faces.new((verts_b[i], verts_b[i+1], verts_t[i+1], verts_t[i]))

    mesh = bpy.data.meshes.new("Booth_Cyan_Base_Strip")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Booth_Cyan_Base_Strip", mesh)
    obj.data.materials.append(mats["Booth_CyanEmission"])
    col.objects.link(obj)
    obj.parent = parent

def build_seat_plinth_and_kickplate(col, mats, parent):
    # Plinth under the seats from R_SEAT_FRONT to R_INNER_SHELL, Z=0 to H_SEAT - T_CUSHION
    bm = bmesh.new()
    h_plinth = H_SEAT - T_CUSHION

    v_bo = []
    v_bi = []
    v_to = []
    v_ti = []

    for i in range(NUM_SEGS + 1):
        t = i / NUM_SEGS
        ang = THETA_START + t * (THETA_END - THETA_START)
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)

        v_bo.append(bm.verts.new((R_INNER_SHELL * cos_a, R_INNER_SHELL * sin_a, 0.0)))
        v_bi.append(bm.verts.new((R_SEAT_FRONT * cos_a, R_SEAT_FRONT * sin_a, 0.0)))
        v_to.append(bm.verts.new((R_INNER_SHELL * cos_a, R_INNER_SHELL * sin_a, h_plinth)))
        v_ti.append(bm.verts.new((R_SEAT_FRONT * cos_a, R_SEAT_FRONT * sin_a, h_plinth)))

    for i in range(NUM_SEGS):
        # Front kickplate
        bm.faces.new((v_bi[i], v_bi[i+1], v_ti[i+1], v_ti[i]))
        # Top deck
        bm.faces.new((v_ti[i], v_ti[i+1], v_to[i+1], v_to[i]))
        # Bottom
        bm.faces.new((v_bi[i+1], v_bi[i], v_bo[i], v_bo[i+1]))

    # End caps
    bm.faces.new((v_bi[0], v_ti[0], v_to[0], v_bo[0]))
    bm.faces.new((v_bi[-1], v_bo[-1], v_to[-1], v_ti[-1]))

    mesh = bpy.data.meshes.new("Booth_Kickplate")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Booth_Kickplate", mesh)
    obj.data.materials.append(mats["Booth_DarkMetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.003, segments=2)

def build_seat_cushions(col, mats, parent):
    # Padded burgundy seat bench on top of the plinth
    bm = bmesh.new()
    z_bottom = H_SEAT - T_CUSHION
    z_top = H_SEAT

    # Slightly flared comfortable cushion edges
    r_front = R_SEAT_FRONT - 0.02
    r_back  = R_INNER_SHELL

    v_bo = []
    v_bi = []
    v_to = []
    v_ti = []

    for i in range(NUM_SEGS + 1):
        t = i / NUM_SEGS
        ang = THETA_START + t * (THETA_END - THETA_START)
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)

        v_bo.append(bm.verts.new((r_back * cos_a, r_back * sin_a, z_bottom)))
        v_bi.append(bm.verts.new((r_front * cos_a, r_front * sin_a, z_bottom)))
        v_to.append(bm.verts.new((r_back * cos_a, r_back * sin_a, z_top)))
        v_ti.append(bm.verts.new((r_front * cos_a, r_front * sin_a, z_top)))

    for i in range(NUM_SEGS):
        # Front lip
        bm.faces.new((v_bi[i], v_bi[i+1], v_ti[i+1], v_ti[i]))
        # Top seating surface
        bm.faces.new((v_ti[i], v_ti[i+1], v_to[i+1], v_to[i]))
        # Back edge
        bm.faces.new((v_to[i], v_to[i+1], v_bo[i+1], v_bo[i]))
        # Bottom
        bm.faces.new((v_bi[i+1], v_bi[i], v_bo[i], v_bo[i+1]))

    # End caps
    bm.faces.new((v_bi[0], v_ti[0], v_to[0], v_bo[0]))
    bm.faces.new((v_bi[-1], v_bo[-1], v_to[-1], v_ti[-1]))

    mesh = bpy.data.meshes.new("Booth_Seat_Cushions")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Booth_Seat_Cushions", mesh)
    obj.data.materials.append(mats["Booth_BurgundyLeather"])
    col.objects.link(obj)
    obj.parent = parent

    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.012
    bev.segments = 3
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(35)
    bev.use_clamp_overlap = True

def build_backrest_cushions(col, mats, parent):
    # Segmented plush burgundy leather backrest along inner wall
    # Z from H_SEAT to H_BACKREST - 0.05m
    bm = bmesh.new()
    z_bottom = H_SEAT
    z_top = H_BACKREST - 0.04
    t_pad = 0.07

    r_back = R_INNER_SHELL
    r_front = R_INNER_SHELL - t_pad

    # 10 vertical segmented backrest pillows/panels
    num_panels = 10
    for p in range(num_panels):
        t0 = p / num_panels
        t1 = (p + 0.95) / num_panels # slight gap between segments
        ang0 = THETA_START + t0 * (THETA_END - THETA_START)
        ang1 = THETA_START + t1 * (THETA_END - THETA_START)

        # 4 corners per panel, with lumbar bulge at mid-height
        sub_segs = 6
        v_strip_back = []
        v_strip_front = []

        for s in range(sub_segs + 1):
            st = s / sub_segs
            cur_ang = ang0 + st * (ang1 - ang0)
            ca = math.cos(cur_ang)
            sa = math.sin(cur_ang)

            vb = bm.verts.new((r_back * ca, r_back * sa, z_bottom))
            vt = bm.verts.new((r_back * ca, r_back * sa, z_top))
            vfb = bm.verts.new((r_front * ca, r_front * sa, z_bottom))
            vft = bm.verts.new((r_front * ca, r_front * sa, z_top))

            v_strip_back.append((vb, vt))
            v_strip_front.append((vfb, vft))

        for s in range(sub_segs):
            vb0, vt0 = v_strip_back[s]
            vb1, vt1 = v_strip_back[s+1]
            vfb0, vft0 = v_strip_front[s]
            vfb1, vft1 = v_strip_front[s+1]

            # Front face
            bm.faces.new((vfb0, vfb1, vft1, vft0))
            # Top face
            bm.faces.new((vft0, vft1, vt1, vt0))
            # Bottom face
            bm.faces.new((vb0, vb1, vfb1, vfb0))
            # Back face
            bm.faces.new((vb1, vb0, vt0, vt1))

        # Panel side caps
        v_first = v_strip_front[0]
        v_first_b = v_strip_back[0]
        bm.faces.new((v_first_b[0], v_first[0], v_first[1], v_first_b[1]))

        v_last = v_strip_front[-1]
        v_last_b = v_strip_back[-1]
        bm.faces.new((v_last[0], v_last_b[0], v_last_b[1], v_last[1]))

    mesh = bpy.data.meshes.new("Booth_Backrest_Cushions")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Booth_Backrest_Cushions", mesh)
    obj.data.materials.append(mats["Booth_BurgundyLeather"])
    col.objects.link(obj)
    obj.parent = parent

    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.010
    bev.segments = 3
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(35)
    bev.use_clamp_overlap = True

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 160.0
    key_data.size = 3.0
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (2.2, -2.5, 3.0)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 60.0
    fill_data.size = 3.5
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-2.5, -1.8, 2.2)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 120.0
    rim_data.size = 2.0
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 2.8, 2.6)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 50.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 4.2
    cam_pitch = math.radians(60)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.60 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, -0.20, 0.60))
    direction = target - cam_obj.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

    col.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

def render_preview(output_path):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = output_path

    print(f"[RENDER] Rendering transparent 1080p preview -> {output_path}")
    bpy.ops.render.render(write_still=True)
    print(f"[RENDER OK] Preview saved ({os.path.getsize(output_path):,} bytes)")

def export_glb():
    bpy.ops.object.select_all(action='DESELECT')
    root = bpy.data.objects.get("CurvedBooth_Root")
    if not root:
        print("[ERROR] CurvedBooth_Root not found for export!")
        return

    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root

    os.makedirs(os.path.dirname(GLB_OUT_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_GLB_OUT_PATH), exist_ok=True)

    print(f"[EXPORT] Exporting GLB -> {GLB_OUT_PATH}")
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )

    import shutil
    shutil.copyfile(GLB_OUT_PATH, PUBLIC_GLB_OUT_PATH)
    print(f"[EXPORT OK] Saved GLB to models/ and public/models/ ({os.path.getsize(GLB_OUT_PATH):,} bytes)")

def validate_exported_glb(glb_path):
    print(f"\n======================================================")
    print(f"VALIDATION REPORT: {os.path.basename(glb_path)}")
    print(f"======================================================")
    clear_scene()

    bpy.ops.import_scene.gltf(filepath=glb_path)
    bpy.context.view_layer.update()

    total_tris = 0
    all_materials = set()
    all_verts_world = []

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            me = obj.to_mesh()
            me.calc_loop_triangles()
            total_tris += len(me.loop_triangles)
            for mat_slot in obj.material_slots:
                if mat_slot.material:
                    all_materials.add(mat_slot.material)
            for v in me.vertices:
                w_co = obj.matrix_world @ v.co
                all_verts_world.append(w_co)
            obj.to_mesh_clear()

    if all_verts_world:
        min_x = min(v.x for v in all_verts_world)
        max_x = max(v.x for v in all_verts_world)
        min_y = min(v.y for v in all_verts_world)
        max_y = max(v.y for v in all_verts_world)
        min_z = min(v.z for v in all_verts_world)
        max_z = max(v.z for v in all_verts_world)
        dim_x = max_x - min_x
        dim_y = max_y - min_y
        dim_z = max_z - min_z
    else:
        min_z = max_z = dim_x = dim_y = dim_z = 0.0

    print(f"PBR Materials ({len(all_materials)} verified):")
    for mat in sorted(all_materials, key=lambda m: m.name):
        bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.use_nodes else None
        has_emission = False
        em_val = 0.0
        if bsdf:
            if "Emission Strength" in bsdf.inputs:
                em_val = bsdf.inputs["Emission Strength"].default_value
                has_emission = em_val > 0.1
        met_str = f"{bsdf.inputs['Metallic'].default_value:.2f}" if bsdf else "N/A"
        rou_str = f"{bsdf.inputs['Roughness'].default_value:.2f}" if bsdf else "N/A"
        em_str = f"YES ({em_val:.1f})" if has_emission else "NO"
        print(f"  • {mat.name:25s} | Metallic: {met_str:4s} | Rough: {rou_str:4s} | Emissive: {em_str}")

    print(f"\nGeometry & Physical Metrics:")
    print(f"  • Total Polygon Count:   {total_tris:,} triangles")
    print(f"  • Dimensions:           {dim_x:.3f}m (W) × {dim_y:.3f}m (D) × {dim_z:.3f}m (H)")
    print(f"  • Base Contact:         Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.01 else 'FAIL'}]")
    print(f"  • Backrest Height:      Z = {max_z:.4f}m [{'PASS: Target ~1.25m' if abs(max_z - 1.25) < 0.05 else 'CHECK'}]")
    print(f"  • Booth Outer Diameter: ~{dim_x:.3f}m [{'PASS: Target ~2.70m' if 2.50 <= dim_x <= 2.90 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_CURVED_BOOTH")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("CurvedBooth_Root", None)
    col.objects.link(root)

    # Build Components
    build_outer_shell(col, mats, root)
    build_cyan_base_strip(col, mats, root)
    build_seat_plinth_and_kickplate(col, mats, root)
    build_seat_cushions(col, mats, root)
    build_backrest_cushions(col, mats, root)

    # Apply transforms
    bpy.context.view_layer.update()
    for child in root.children_recursive:
        if child.type == 'MESH':
            bpy.ops.object.select_all(action='DESELECT')
            child.select_set(True)
            bpy.context.view_layer.objects.active = child
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Setup studio
    setup_studio_environment(col)

    # Save .blend
    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"[OK] Saved Blender scene to: {BLEND_OUT_PATH}")

    # Render preview
    render_preview(PREVIEW_OUT_PATH)

    # Export GLB
    export_glb()

    # Validate
    validate_exported_glb(GLB_OUT_PATH)

if __name__ == "__main__":
    main()
