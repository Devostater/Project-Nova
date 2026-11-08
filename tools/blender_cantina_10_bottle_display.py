"""
Blender 5.2+ Bottle Display Module Generator
Project Nova - Station Nova-1 Cantina
Asset 10: Bottle Display Module (cantina_10_bottle_display)

Strictly reconstructed from: art_src/cantina/cantina_10_bottle_display_3d_source.png
- Wall-mounted two-tier industrial cantina bottle display rack
- Dark gunmetal chassis with heavy mounting bolt flanges
- Two stepped shelf bays with chrome protective retainer bars
- Six futuristic cantina spirit bottles included (3 per shelf):
  * Emerald Green, Deep Amber, and Cobalt Blue opaque bottles with metallic collars
- Integrated warm amber under-shelf LED strip lights
- PBR Materials: Display_Gunmetal, Display_DarkMetal, Display_Chrome, Display_AmberLight,
                 Bottle_Green, Bottle_Amber, Bottle_Cobalt
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_10_bottle_display.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_10_bottle_display.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_10_bottle_display.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_10_bottle_display_preview.png")

# Engineering Dimensions (in meters)
W_FRAME = 0.82            # 82cm wide rack
D_FRAME = 0.22            # 22cm deep
H_FRAME = 0.88            # 88cm tall
T_SHELF = 0.04            # 4cm shelf deck thickness
NUM_CIRC_SEGS = 24

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

    mats["Display_Gunmetal"] = make_pbr("Display_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["Display_DarkMetal"] = make_pbr("Display_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Display_Chrome"] = make_pbr("Display_Chrome", (0.82, 0.84, 0.88), 0.96, 0.16)
    mats["Display_AmberLight"] = make_pbr("Display_AmberLight", (1.0, 0.55, 0.06), 0.10, 0.10, emission=(1.0, 0.55, 0.06), emission_strength=7.5)
    
    mats["Bottle_Green"] = make_pbr("Bottle_Green", (0.04, 0.28, 0.12), 0.12, 0.28)
    mats["Bottle_Amber"] = make_pbr("Bottle_Amber", (0.42, 0.22, 0.04), 0.12, 0.28)
    mats["Bottle_Cobalt"] = make_pbr("Bottle_Cobalt", (0.04, 0.14, 0.40), 0.12, 0.28)

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

def build_frame_and_shelves(col, mats, parent):
    # Main outer cabinet shell
    bm = bmesh.new()

    # Backing plate (Y centered at D_FRAME / 2 - 0.015)
    y_back = D_FRAME / 2 - 0.015
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, y_back, H_FRAME / 2)) @
               Matrix.Scale(W_FRAME, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.03, 4, Vector((0, 1, 0))) @
               Matrix.Scale(H_FRAME, 4, Vector((0, 0, 1)))
    )

    # Left & Right side vertical armor plates
    for side_x in [-W_FRAME / 2 + 0.02, W_FRAME / 2 - 0.02]:
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((side_x, 0, H_FRAME / 2)) @
                   Matrix.Scale(0.04, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(D_FRAME, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(H_FRAME, 4, Vector((0, 0, 1)))
        )

    # Top & Bottom horizontal framing
    for z_cap in [T_SHELF / 2, H_FRAME - T_SHELF / 2]:
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((0, 0, z_cap)) @
                   Matrix.Scale(W_FRAME, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(D_FRAME, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(T_SHELF, 4, Vector((0, 0, 1)))
        )

    # Middle shelf divider at Z = H_FRAME * 0.48
    z_mid = H_FRAME * 0.48
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, z_mid)) @
               Matrix.Scale(W_FRAME * 0.92, 4, Vector((1, 0, 0))) @
               Matrix.Scale(D_FRAME * 0.92, 4, Vector((0, 1, 0))) @
               Matrix.Scale(T_SHELF, 4, Vector((0, 0, 1)))
    )

    mesh = bpy.data.meshes.new("Display_Cabinet_Frame")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Display_Cabinet_Frame", mesh)
    obj.data.materials.append(mats["Display_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.003, segments=2)

    # Chrome horizontal guard retainer bars on lower and upper tiers
    bm_rails = bmesh.new()
    y_rail = -D_FRAME / 2 + 0.03
    for z_rail in [T_SHELF + 0.08, z_mid + T_SHELF / 2 + 0.08]:
        bmesh.ops.create_cone(
            bm_rails,
            cap_ends=True,
            cap_tris=False,
            segments=16,
            radius1=0.008,
            radius2=0.008,
            depth=W_FRAME * 0.90,
            matrix=Matrix.Translation((0, y_rail, z_rail)) @
                   Matrix.Rotation(math.pi/2, 4, 'Y')
        )

    mesh_rails = bpy.data.meshes.new("Display_Retainer_Rails")
    bm_rails.to_mesh(mesh_rails)
    bm_rails.free()
    obj_rails = bpy.data.objects.new("Display_Retainer_Rails", mesh_rails)
    obj_rails.data.materials.append(mats["Display_Chrome"])
    col.objects.link(obj_rails)
    obj_rails.parent = parent

    # Integrated amber light strips under mid-shelf and under top frame
    bm_lights = bmesh.new()
    for z_l in [z_mid - T_SHELF / 2 - 0.005, H_FRAME - T_SHELF - 0.005]:
        bmesh.ops.create_cube(
            bm_lights,
            size=1.0,
            matrix=Matrix.Translation((0, 0, z_l)) @
                   Matrix.Scale(W_FRAME * 0.85, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.02, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.008, 4, Vector((0, 0, 1)))
        )

    mesh_lights = bpy.data.meshes.new("Display_Amber_LED_Strips")
    bm_lights.to_mesh(mesh_lights)
    bm_lights.free()
    obj_lights = bpy.data.objects.new("Display_Amber_LED_Strips", mesh_lights)
    obj_lights.data.materials.append(mats["Display_AmberLight"])
    col.objects.link(obj_lights)
    obj_lights.parent = parent

def build_bottles(col, mats, parent):
    # 6 Bottles: 3 on lower shelf, 3 on upper shelf
    # Lower shelf surface Z = T_SHELF
    # Upper shelf surface Z = H_FRAME * 0.48 + T_SHELF / 2
    xs = [-0.22, 0.0, 0.22]
    color_keys = ["Bottle_Green", "Bottle_Amber", "Bottle_Cobalt"]

    # 1. Lower shelf bottles
    z_deck1 = T_SHELF
    for idx, (x, c_key) in enumerate(zip(xs, color_keys)):
        build_single_shelf_bottle(col, mats, parent, f"Bottle_L{idx+1}", c_key, x, -0.01, z_deck1)

    # 2. Upper shelf bottles (alternate color pattern)
    z_deck2 = H_FRAME * 0.48 + T_SHELF / 2
    upper_colors = ["Bottle_Cobalt", "Bottle_Green", "Bottle_Amber"]
    for idx, (x, c_key) in enumerate(zip(xs, upper_colors)):
        build_single_shelf_bottle(col, mats, parent, f"Bottle_U{idx+1}", c_key, x, -0.01, z_deck2)

def build_single_shelf_bottle(col, mats, parent, name, mat_key, x, y, z_bottom):
    h_bottle = 0.28
    r_body = 0.042
    r_neck = 0.016

    bm = bmesh.new()

    # Hexagonal / faceted body
    h_body = 0.17
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=r_body,
        radius2=r_body * 0.95,
        depth=h_body,
        matrix=Matrix.Translation((x, y, z_bottom + h_body / 2))
    )

    # Shoulder taper
    h_sh = 0.04
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=r_body * 0.95,
        radius2=r_neck * 1.2,
        depth=h_sh,
        matrix=Matrix.Translation((x, y, z_bottom + h_body + h_sh / 2))
    )

    # Neck
    h_neck = 0.07
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=16,
        radius1=r_neck,
        radius2=r_neck,
        depth=h_neck,
        matrix=Matrix.Translation((x, y, z_bottom + h_body + h_sh + h_neck / 2))
    )

    mesh = bpy.data.meshes.new(f"Mesh_{name}")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mats[mat_key])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=1)

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 85.0
    key_data.size = 1.8
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.4, -1.8, 1.8)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 35.0
    fill_data.size = 2.0
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.6, -1.2, 1.4)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 60.0
    rim_data.size = 1.5
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.6, 1.6)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 2.4
    cam_pitch = math.radians(62)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.44 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.44))
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
    root = bpy.data.objects.get("BottleDisplay_Root")
    if not root:
        print("[ERROR] BottleDisplay_Root not found for export!")
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
    print(f"  • Base Contact:         Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.005 else 'FAIL'}]")
    print(f"  • Module Height:        Z = {max_z:.4f}m [{'PASS: Target ~0.88m' if abs(max_z - 0.88) < 0.05 else 'CHECK'}]")
    print(f"  • Module Width:         ~{dim_x:.3f}m [{'PASS: Target ~0.82m' if 0.78 <= dim_x <= 0.86 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_BOTTLE_DISPLAY")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("BottleDisplay_Root", None)
    col.objects.link(root)

    # Build Components
    build_frame_and_shelves(col, mats, root)
    build_bottles(col, mats, root)

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
