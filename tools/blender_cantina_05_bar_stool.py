"""
Blender 5.2+ Bar Stool Generator
Project Nova - Station Nova-1 Cantina
Asset 05: Bar Stool (cantina_05_bar_stool)

Strictly reconstructed from: art_src/cantina/cantina_05_bar_stool_3d_source.png
- High-tech industrial rotating station bar stool paired with Asset 01 Circular Island Bar
- Floor-mounted heavy circular base with mounting bolts
- Heavy-duty telescoping hydraulic pedestal with collar rings
- Circular tubular footrest ring with 4 heavy radial gusset support arms
- Swivel bearing housing beneath seat pan
- Continuous cyan light ring beneath seat cushion
- Premium burgundy synthetic-leather circular seat cushion with rounded ergonomic bevel
- PBR Materials: Stool_Gunmetal, Stool_DarkMetal, Stool_BurgundyLeather, Stool_CyanEmission, Stool_ChromeTrim
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_05_bar_stool.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_05_bar_stool.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_05_bar_stool.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_05_bar_stool_preview.png")

# Engineering Dimensions (in meters)
H_TOTAL_SEAT = 0.80       # 0.80m seat top height (ergonomic match for 1.15m bar counter)
R_SEAT = 0.22             # 0.44m diameter seat cushion
T_CUSHION = 0.08          # 8cm thick padded cushion
H_SEAT_BASE = H_TOTAL_SEAT - T_CUSHION # 0.72m
R_BASE_FLANGE = 0.26      # 0.52m floor base diameter
R_PEDESTAL = 0.045        # 9cm diameter main hydraulic column
R_FOOTREST_RING = 0.20    # 0.40m diameter footrest
H_FOOTREST = 0.28         # 0.28m height above floor
R_FOOTREST_TUBE = 0.016   # 3.2cm tube diameter

NUM_CIRC_SEGS = 48        # Smooth curvature for cylinders and rings

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

    mats["Stool_Gunmetal"] = make_pbr("Stool_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["Stool_DarkMetal"] = make_pbr("Stool_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.24)
    mats["Stool_ChromeTrim"] = make_pbr("Stool_ChromeTrim", (0.78, 0.80, 0.84), 0.96, 0.16)
    mats["Stool_BurgundyLeather"] = make_pbr("Stool_BurgundyLeather", (0.16, 0.022, 0.038), 0.04, 0.42)
    mats["Stool_CyanEmission"] = make_pbr("Stool_CyanEmission", (0.08, 0.92, 1.0), 0.10, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=7.5)
    mats["Stool_AmberEmission"] = make_pbr("Stool_AmberEmission", (1.0, 0.52, 0.04), 0.10, 0.10, emission=(1.0, 0.52, 0.04), emission_strength=6.0)

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

def build_base_flange(col, mats, parent):
    # Base disc on floor
    bm = bmesh.new()
    
    # Layer 1: Floor plinth with chamfered edge
    h_plinth = 0.025
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE_FLANGE,
        radius2=R_BASE_FLANGE - 0.025,
        depth=h_plinth,
        matrix=Matrix.Translation((0, 0, h_plinth / 2))
    )
    
    # Layer 2: Stepped inner ring
    h_step = 0.020
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE_FLANGE * 0.75,
        radius2=R_BASE_FLANGE * 0.70,
        depth=h_step,
        matrix=Matrix.Translation((0, 0, h_plinth + h_step / 2))
    )

    # Layer 3: Central collar
    h_collar = 0.035
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.8,
        radius2=R_PEDESTAL * 1.5,
        depth=h_collar,
        matrix=Matrix.Translation((0, 0, h_plinth + h_step + h_collar / 2))
    )

    mesh = bpy.data.meshes.new("Floor_Base_Plate")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Floor_Base_Plate", mesh)
    obj.data.materials.append(mats["Stool_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.003, segments=2)

    # Floor mounting bolt studs
    bm_bolts = bmesh.new()
    num_bolts = 8
    r_bolt_circle = R_BASE_FLANGE * 0.86
    for i in range(num_bolts):
        ang = (2 * math.pi / num_bolts) * i
        bx = r_bolt_circle * math.cos(ang)
        by = r_bolt_circle * math.sin(ang)
        bmesh.ops.create_cone(
            bm_bolts,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.012,
            radius2=0.010,
            depth=0.012,
            matrix=Matrix.Translation((bx, by, h_plinth + 0.005))
        )
    mesh_bolts = bpy.data.meshes.new("Base_Bolts")
    bm_bolts.to_mesh(mesh_bolts)
    bm_bolts.free()
    obj_bolts = bpy.data.objects.new("Base_Bolts", mesh_bolts)
    obj_bolts.data.materials.append(mats["Stool_DarkMetal"])
    col.objects.link(obj_bolts)
    obj_bolts.parent = parent
    apply_bevel(obj_bolts, width=0.001, segments=1)

def build_pedestal(col, mats, parent):
    bm = bmesh.new()
    
    # Outer lower hydraulic housing
    z_bottom = 0.075
    z_mid = 0.45
    h_lower = z_mid - z_bottom
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.35,
        radius2=R_PEDESTAL * 1.25,
        depth=h_lower,
        matrix=Matrix.Translation((0, 0, z_bottom + h_lower / 2))
    )

    # Middle adjustment collar ring
    h_mid_collar = 0.03
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.45,
        radius2=R_PEDESTAL * 1.45,
        depth=h_mid_collar,
        matrix=Matrix.Translation((0, 0, z_mid + h_mid_collar / 2))
    )

    # Upper chrome hydraulic piston
    z_piston_top = H_SEAT_BASE - 0.06
    h_piston = z_piston_top - (z_mid + h_mid_collar)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 0.95,
        radius2=R_PEDESTAL * 0.95,
        depth=h_piston,
        matrix=Matrix.Translation((0, 0, (z_mid + h_mid_collar) + h_piston / 2))
    )

    mesh = bpy.data.meshes.new("Pedestal_Column")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Pedestal_Column", mesh)
    obj.data.materials.append(mats["Stool_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

def build_footrest(col, mats, parent):
    # Circular foot ring
    bpy.ops.mesh.primitive_torus_add(
        align='WORLD',
        location=(0, 0, H_FOOTREST),
        rotation=(0, 0, 0),
        major_radius=R_FOOTREST_RING,
        minor_radius=R_FOOTREST_TUBE,
        major_segments=NUM_CIRC_SEGS,
        minor_segments=20
    )
    ring_obj = bpy.context.active_object
    ring_obj.name = "Footrest_Ring"
    ring_obj.data.materials.append(mats["Stool_ChromeTrim"])
    ring_obj.parent = parent

    # 4 Radial Support Arms / Brackets
    bm_arms = bmesh.new()
    num_arms = 4
    for i in range(num_arms):
        ang = (2 * math.pi / num_arms) * i
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)
        
        # Arm runs from pedestal radius to ring inner edge
        r_inner = R_PEDESTAL * 1.25
        r_outer = R_FOOTREST_RING
        length = r_outer - r_inner
        mid_r = (r_inner + r_outer) / 2
        
        # Angled reinforcement arm
        arm_depth = 0.025
        arm_thick = 0.016
        
        bmesh.ops.create_cube(
            bm_arms,
            size=1.0,
            matrix=Matrix.Translation((mid_r * cos_a, mid_r * sin_a, H_FOOTREST - 0.012)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(length, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(arm_thick, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(arm_depth, 4, Vector((0, 0, 1)))
        )
        
        # Hub mounting collar segment
        bmesh.ops.create_cube(
            bm_arms,
            size=1.0,
            matrix=Matrix.Translation((r_inner * cos_a, r_inner * sin_a, H_FOOTREST - 0.012)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(0.02, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.03, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.04, 4, Vector((0, 0, 1)))
        )

    mesh_arms = bpy.data.meshes.new("Footrest_Arms")
    bm_arms.to_mesh(mesh_arms)
    bm_arms.free()
    obj_arms = bpy.data.objects.new("Footrest_Arms", mesh_arms)
    obj_arms.data.materials.append(mats["Stool_DarkMetal"])
    col.objects.link(obj_arms)
    obj_arms.parent = parent
    apply_bevel(obj_arms, width=0.002, segments=2)

def build_seat_assembly(col, mats, parent):
    # 1. Swivel collar and seat under-pan
    bm_pan = bmesh.new()
    
    # Swivel flared hub
    h_hub = 0.04
    z_hub = H_SEAT_BASE - h_hub
    bmesh.ops.create_cone(
        bm_pan,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.5,
        radius2=R_SEAT * 0.70,
        depth=h_hub,
        matrix=Matrix.Translation((0, 0, z_hub + h_hub / 2))
    )

    # Seat sub-pan disc
    h_pan = 0.025
    bmesh.ops.create_cone(
        bm_pan,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_SEAT * 0.96,
        radius2=R_SEAT * 1.02,
        depth=h_pan,
        matrix=Matrix.Translation((0, 0, H_SEAT_BASE + h_pan / 2))
    )

    mesh_pan = bpy.data.meshes.new("Seat_Base_Pan")
    bm_pan.to_mesh(mesh_pan)
    bm_pan.free()
    obj_pan = bpy.data.objects.new("Seat_Base_Pan", mesh_pan)
    obj_pan.data.materials.append(mats["Stool_Gunmetal"])
    col.objects.link(obj_pan)
    obj_pan.parent = parent
    apply_bevel(obj_pan, width=0.002, segments=2)

    # 2. Cyan illuminated light band ring beneath cushion
    h_light = 0.014
    z_light = H_SEAT_BASE + h_pan
    bm_light = bmesh.new()
    bmesh.ops.create_cone(
        bm_light,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_SEAT * 0.99,
        radius2=R_SEAT * 0.99,
        depth=h_light,
        matrix=Matrix.Translation((0, 0, z_light + h_light / 2))
    )
    mesh_light = bpy.data.meshes.new("Seat_Cyan_Light_Ring")
    bm_light.to_mesh(mesh_light)
    bm_light.free()
    obj_light = bpy.data.objects.new("Seat_Cyan_Light_Ring", mesh_light)
    obj_light.data.materials.append(mats["Stool_CyanEmission"])
    col.objects.link(obj_light)
    obj_light.parent = parent

    # 3. Ergonomic burgundy padded seat cushion
    # Made from curved profile revolved or layered bevel cylinder
    z_cushion_bottom = z_light + h_light
    h_cushion_body = H_TOTAL_SEAT - z_cushion_bottom
    
    bm_cush = bmesh.new()
    # Bottom rim of cushion
    bmesh.ops.create_cone(
        bm_cush,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_SEAT * 0.98,
        radius2=R_SEAT,
        depth=h_cushion_body * 0.6,
        matrix=Matrix.Translation((0, 0, z_cushion_bottom + (h_cushion_body * 0.6) / 2))
    )
    # Crown of cushion (slightly domed top)
    bmesh.ops.create_cone(
        bm_cush,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_SEAT,
        radius2=R_SEAT * 0.88,
        depth=h_cushion_body * 0.4,
        matrix=Matrix.Translation((0, 0, z_cushion_bottom + (h_cushion_body * 0.6) + (h_cushion_body * 0.4) / 2))
    )

    mesh_cush = bpy.data.meshes.new("Seat_Cushion")
    bm_cush.to_mesh(mesh_cush)
    bm_cush.free()
    obj_cush = bpy.data.objects.new("Seat_Cushion", mesh_cush)
    obj_cush.data.materials.append(mats["Stool_BurgundyLeather"])
    col.objects.link(obj_cush)
    obj_cush.parent = parent
    
    # Smooth cushion bevel
    bev = obj_cush.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.015
    bev.segments = 4
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(30)
    bev.use_clamp_overlap = True

    # Subdivision for plush organic look
    sub = obj_cush.modifiers.new(name="Subdivision", type='SUBSURF')
    sub.levels = 1
    sub.render_levels = 1

def setup_studio_environment(col):
    # Studio lighting setup matching Asset 01
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    # Key light (warm station light)
    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 120.0
    key_data.size = 1.8
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.5, -1.8, 2.2)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    # Fill light (soft station cyan fill)
    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 45.0
    fill_data.size = 2.2
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.8, -1.2, 1.5)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    # Rim light (sharp back edge definition)
    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 90.0
    rim_data.size = 1.2
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 2.0, 2.0)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    # Camera setup (50mm lens, front 3/4 isometric perspective)
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 2.4
    cam_pitch = math.radians(65)
    cam_yaw = math.radians(-40)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.45 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    # Look at stool center (Z=0.42m)
    target = Vector((0.0, 0.0, 0.42))
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
    # Deselect all, select root and children
    bpy.ops.object.select_all(action='DESELECT')
    root = bpy.data.objects.get("BarStool_Root")
    if not root:
        print("[ERROR] BarStool_Root not found for export!")
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

    # Identical copy to public/models/
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
    print(f"  • Base Floor Contact:   Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.01 else 'FAIL'}]")
    print(f"  • Seat Top Height:      Z = {max_z:.4f}m [{'PASS: Target ~0.80m height' if abs(max_z - 0.80) < 0.05 else 'CHECK'}]")
    print(f"  • Stool Diameter:       ~{dim_x:.2f}m [{'PASS: Target ~0.45-0.55m' if 0.40 <= dim_x <= 0.60 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_BAR_STOOL")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("BarStool_Root", None)
    col.objects.link(root)

    # Build Components
    build_base_flange(col, mats, root)
    build_pedestal(col, mats, root)
    build_footrest(col, mats, root)
    build_seat_assembly(col, mats, root)

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
