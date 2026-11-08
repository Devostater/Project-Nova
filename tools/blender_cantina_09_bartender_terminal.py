"""
Blender 5.2+ Bartender Terminal Generator
Project Nova - Station Nova-1 Cantina
Asset 09: Bartender Terminal (cantina_09_bartender_terminal)

Strictly reconstructed from: art_src/cantina/cantina_09_bartender_terminal_3d_source.png
- High-tech point-of-sale terminal unit mounted on bar work surfaces
- Heavy circular swivel mounting base with bolt flange resting at Z=0.000m
- Reinforced cylindrical swivel neck / pivot joint
- 45-degree tilted terminal head unit with dark gunmetal chamfered armor casing
- Glowing cyan telemetry / POS display screen (abstract UI telemetry, zero readable text)
- Tactile backlit mechanical keypad buttons, knurled rotary dial, cred-chip slot
- Warm amber status LEDs along the bezel
- PBR Materials: Terminal_Gunmetal, Terminal_DarkMetal, Terminal_Screen_Cyan, Terminal_AmberLED, Terminal_KeypadRubber
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_09_bartender_terminal.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_09_bartender_terminal.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_09_bartender_terminal.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_09_bartender_terminal_preview.png")

# Engineering Dimensions (in meters)
W_HEAD = 0.30             # 30cm wide screen head
D_HEAD = 0.24             # 24cm deep
H_TOTAL = 0.36            # 36cm total height
R_BASE_FLANGE = 0.09      # 18cm diameter mounting base
H_BASE_STEM = 0.12        # 12cm swivel stand
NUM_CIRC_SEGS = 32

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

    mats["Terminal_Gunmetal"] = make_pbr("Terminal_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["Terminal_DarkMetal"] = make_pbr("Terminal_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Terminal_Screen_Cyan"] = make_pbr("Terminal_Screen_Cyan", (0.08, 0.92, 1.0), 0.08, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=8.0)
    mats["Terminal_AmberLED"] = make_pbr("Terminal_AmberLED", (1.0, 0.55, 0.06), 0.10, 0.10, emission=(1.0, 0.55, 0.06), emission_strength=6.0)
    mats["Terminal_KeypadRubber"] = make_pbr("Terminal_KeypadRubber", (0.03, 0.03, 0.035), 0.05, 0.60)

    return mats

def apply_bevel(obj, width=0.002, segments=2):
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(40)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True

def build_swivel_base(col, mats, parent):
    bm = bmesh.new()

    # Circular mounting plinth resting at Z=0
    h_plinth = 0.015
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE_FLANGE,
        radius2=R_BASE_FLANGE - 0.01,
        depth=h_plinth,
        matrix=Matrix.Translation((0, 0, h_plinth / 2))
    )

    # Swivel stem pillar
    h_stem = H_BASE_STEM - h_plinth
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=0.038,
        radius2=0.032,
        depth=h_stem,
        matrix=Matrix.Translation((0, 0, h_plinth + h_stem / 2))
    )

    # Swivel pivot knuckle
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=24,
        radius1=0.045,
        radius2=0.045,
        depth=0.040,
        matrix=Matrix.Translation((0, 0, H_BASE_STEM)) @
               Matrix.Rotation(math.pi/2, 4, 'Y')
    )

    mesh = bpy.data.meshes.new("Terminal_Swivel_Base")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Terminal_Swivel_Base", mesh)
    obj.data.materials.append(mats["Terminal_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # Bolt studs around perimeter
    bm_bolts = bmesh.new()
    for i in range(6):
        ang = (2 * math.pi / 6) * i
        bx = (R_BASE_FLANGE * 0.82) * math.cos(ang)
        by = (R_BASE_FLANGE * 0.82) * math.sin(ang)
        bmesh.ops.create_cone(
            bm_bolts,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.007,
            radius2=0.006,
            depth=0.008,
            matrix=Matrix.Translation((bx, by, h_plinth + 0.002))
        )
    mesh_bolts = bpy.data.meshes.new("Terminal_Base_Bolts")
    bm_bolts.to_mesh(mesh_bolts)
    bm_bolts.free()
    obj_bolts = bpy.data.objects.new("Terminal_Base_Bolts", mesh_bolts)
    obj_bolts.data.materials.append(mats["Terminal_DarkMetal"])
    col.objects.link(obj_bolts)
    obj_bolts.parent = parent

def build_terminal_head(col, mats, parent):
    # Angled head unit tilted ~40 degrees
    # Pivot point is at (0, 0, H_BASE_STEM)
    tilt_rad = math.radians(40)
    z_head = H_BASE_STEM + 0.09
    y_head = -0.02

    # 1. Main outer casing
    bm_case = bmesh.new()
    t_case = 0.07
    bmesh.ops.create_cube(
        bm_case,
        size=1.0,
        matrix=Matrix.Translation((0, y_head, z_head)) @
               Matrix.Rotation(tilt_rad, 4, 'X') @
               Matrix.Scale(W_HEAD, 4, Vector((1, 0, 0))) @
               Matrix.Scale(D_HEAD, 4, Vector((0, 1, 0))) @
               Matrix.Scale(t_case, 4, Vector((0, 0, 1)))
    )
    mesh_case = bpy.data.meshes.new("Terminal_Casing")
    bm_case.to_mesh(mesh_case)
    bm_case.free()
    obj_case = bpy.data.objects.new("Terminal_Casing", mesh_case)
    obj_case.data.materials.append(mats["Terminal_Gunmetal"])
    col.objects.link(obj_case)
    obj_case.parent = parent
    apply_bevel(obj_case, width=0.004, segments=2)

    # 2. Glowing cyan display screen (top 60% of tilted face)
    bm_screen = bmesh.new()
    w_scr = W_HEAD * 0.86
    d_scr = D_HEAD * 0.55
    y_scr_offset = 0.035
    bmesh.ops.create_cube(
        bm_screen,
        size=1.0,
        matrix=Matrix.Translation((0, y_head, z_head)) @
               Matrix.Rotation(tilt_rad, 4, 'X') @
               Matrix.Translation((0, y_scr_offset, t_case / 2 + 0.003)) @
               Matrix.Scale(w_scr, 4, Vector((1, 0, 0))) @
               Matrix.Scale(d_scr, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.004, 4, Vector((0, 0, 1)))
    )
    mesh_screen = bpy.data.meshes.new("Terminal_Display_Screen")
    bm_screen.to_mesh(mesh_screen)
    bm_screen.free()
    obj_screen = bpy.data.objects.new("Terminal_Display_Screen", mesh_screen)
    obj_screen.data.materials.append(mats["Terminal_Screen_Cyan"])
    col.objects.link(obj_screen)
    obj_screen.parent = parent

    # 3. Lower tactile keypad & physical controls (bottom 35% of tilted face)
    bm_ctrl = bmesh.new()
    # Keypad grid of buttons
    rows, cols = 3, 4
    btn_w = 0.020
    btn_d = 0.015
    y_base_ctrl = -0.055
    for r in range(rows):
        for c in range(cols):
            bx = -0.06 + c * 0.028
            by = y_base_ctrl - r * 0.022
            bmesh.ops.create_cube(
                bm_ctrl,
                size=1.0,
                matrix=Matrix.Translation((0, y_head, z_head)) @
                       Matrix.Rotation(tilt_rad, 4, 'X') @
                       Matrix.Translation((bx, by, t_case / 2 + 0.006)) @
                       Matrix.Scale(btn_w, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(btn_d, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.008, 4, Vector((0, 0, 1)))
            )
    
    # Rotary encoder dial on right
    bmesh.ops.create_cone(
        bm_ctrl,
        cap_ends=True,
        cap_tris=False,
        segments=20,
        radius1=0.018,
        radius2=0.016,
        depth=0.014,
        matrix=Matrix.Translation((0, y_head, z_head)) @
               Matrix.Rotation(tilt_rad, 4, 'X') @
               Matrix.Translation((0.085, y_base_ctrl - 0.022, t_case / 2 + 0.008))
    )

    mesh_ctrl = bpy.data.meshes.new("Terminal_Keypad_Controls")
    bm_ctrl.to_mesh(mesh_ctrl)
    bm_ctrl.free()
    obj_ctrl = bpy.data.objects.new("Terminal_Keypad_Controls", mesh_ctrl)
    obj_ctrl.data.materials.append(mats["Terminal_KeypadRubber"])
    col.objects.link(obj_ctrl)
    obj_ctrl.parent = parent
    apply_bevel(obj_ctrl, width=0.001, segments=1)

    # 4. Status LEDs along bezel corners
    bm_leds = bmesh.new()
    for lx in [-w_scr/2 + 0.01, w_scr/2 - 0.01]:
        for ly in [d_scr/2 - 0.01, -d_scr/2 + 0.01]:
            bmesh.ops.create_cone(
                bm_leds,
                cap_ends=True,
                cap_tris=False,
                segments=12,
                radius1=0.004,
                radius2=0.004,
                depth=0.004,
                matrix=Matrix.Translation((0, y_head, z_head)) @
                       Matrix.Rotation(tilt_rad, 4, 'X') @
                       Matrix.Translation((lx, y_scr_offset + ly, t_case / 2 + 0.005))
            )
    mesh_leds = bpy.data.meshes.new("Terminal_Status_LEDs")
    bm_leds.to_mesh(mesh_leds)
    bm_leds.free()
    obj_leds = bpy.data.objects.new("Terminal_Status_LEDs", mesh_leds)
    obj_leds.data.materials.append(mats["Terminal_AmberLED"])
    col.objects.link(obj_leds)
    obj_leds.parent = parent

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 35.0
    key_data.size = 1.0
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (0.8, -1.0, 1.0)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 15.0
    fill_data.size = 1.2
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.0, -0.6, 0.8)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 25.0
    rim_data.size = 0.8
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.0, 1.0)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 65.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 1.2
    cam_pitch = math.radians(62)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.18 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.18))
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
    root = bpy.data.objects.get("BartenderTerminal_Root")
    if not root:
        print("[ERROR] BartenderTerminal_Root not found for export!")
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
    print(f"  • Terminal Height:      Z = {max_z:.4f}m [{'PASS: Target ~0.35m' if abs(max_z - 0.35) < 0.05 else 'CHECK'}]")
    print(f"  • Terminal Width:       ~{dim_x:.3f}m [{'PASS: Target ~0.30m' if 0.25 <= dim_x <= 0.35 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_BARTENDER_TERMINAL")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("BartenderTerminal_Root", None)
    col.objects.link(root)

    # Build Components
    build_swivel_base(col, mats, root)
    build_terminal_head(col, mats, root)

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
