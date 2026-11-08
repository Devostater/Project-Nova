"""
Blender 5.2+ Triple Drink Dispenser Generator
Project Nova - Station Nova-1 Cantina
Asset 08: Triple Drink Dispenser (cantina_08_drink_dispenser)

Strictly reconstructed from: art_src/cantina/cantina_08_drink_dispenser_3d_source.png
- High-tech industrial station beverage dispensing unit mounted on bar surfaces
- Heavy gunmetal chassis base with integrated drip tray and maintenance hatch
- Three sealed luminous reservoir cartridges:
  * Left: Saturated Purple Luminous Fluid
  * Center: Cyan Luminous Fluid
  * Right: Emerald Green Luminous Fluid
- Three chrome dispensing spigots with levers and conduit pipes
- Ambient amber and cyan LED status indicators
- PBR Materials: Dispenser_Gunmetal, Dispenser_DarkMetal, Dispenser_Chrome,
                 Dispenser_Liquid_Purple, Dispenser_Liquid_Cyan, Dispenser_Liquid_Green, Dispenser_Status_Amber
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_08_drink_dispenser.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_08_drink_dispenser.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_08_drink_dispenser.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_08_drink_dispenser_preview.png")

# Dimensions (in meters)
W_BASE = 0.52             # 52cm width
D_BASE = 0.38             # 38cm depth
H_TOTAL = 0.70            # 70cm total height
H_BASE_PLATFORM = 0.12    # 12cm base unit with drip tray
R_CARTRIDGE = 0.055       # 11cm diameter fluid tanks
H_CARTRIDGE = 0.45        # 45cm tall reservoir tanks
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

    mats["Dispenser_Gunmetal"] = make_pbr("Dispenser_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["Dispenser_DarkMetal"] = make_pbr("Dispenser_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Dispenser_Chrome"] = make_pbr("Dispenser_Chrome", (0.82, 0.84, 0.88), 0.98, 0.14)
    mats["Dispenser_Liquid_Purple"] = make_pbr("Dispenser_Liquid_Purple", (0.72, 0.12, 0.92), 0.08, 0.12, emission=(0.72, 0.12, 0.92), emission_strength=7.5)
    mats["Dispenser_Liquid_Cyan"] = make_pbr("Dispenser_Liquid_Cyan", (0.08, 0.92, 1.0), 0.08, 0.12, emission=(0.08, 0.92, 1.0), emission_strength=8.0)
    mats["Dispenser_Liquid_Green"] = make_pbr("Dispenser_Liquid_Green", (0.12, 0.95, 0.35), 0.08, 0.12, emission=(0.12, 0.95, 0.35), emission_strength=7.5)
    mats["Dispenser_Status_Amber"] = make_pbr("Dispenser_Status_Amber", (1.0, 0.55, 0.06), 0.10, 0.10, emission=(1.0, 0.55, 0.06), emission_strength=6.0)

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

def build_base_platform(col, mats, parent):
    bm = bmesh.new()

    # Main base block resting at Z=0
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, H_BASE_PLATFORM / 2)) @
               Matrix.Scale(W_BASE, 4, Vector((1, 0, 0))) @
               Matrix.Scale(D_BASE, 4, Vector((0, 1, 0))) @
               Matrix.Scale(H_BASE_PLATFORM, 4, Vector((0, 0, 1)))
    )

    # Rear upright tower backing
    h_back = H_TOTAL - H_BASE_PLATFORM
    w_back = W_BASE * 0.92
    d_back = D_BASE * 0.35
    y_back = (D_BASE / 2) - (d_back / 2)
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, y_back, H_BASE_PLATFORM + h_back / 2)) @
               Matrix.Scale(w_back, 4, Vector((1, 0, 0))) @
               Matrix.Scale(d_back, 4, Vector((0, 1, 0))) @
               Matrix.Scale(h_back, 4, Vector((0, 0, 1)))
    )

    mesh = bpy.data.meshes.new("Dispenser_Base_Chassis")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Dispenser_Base_Chassis", mesh)
    obj.data.materials.append(mats["Dispenser_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.004, segments=2)

    # Front drip tray grate
    w_tray = W_BASE * 0.88
    d_tray = D_BASE * 0.45
    y_tray = -(D_BASE / 2) + (d_tray / 2) + 0.02
    h_tray = 0.012

    bm_tray = bmesh.new()
    bmesh.ops.create_cube(
        bm_tray,
        size=1.0,
        matrix=Matrix.Translation((0, y_tray, H_BASE_PLATFORM + h_tray / 2)) @
               Matrix.Scale(w_tray, 4, Vector((1, 0, 0))) @
               Matrix.Scale(d_tray, 4, Vector((0, 1, 0))) @
               Matrix.Scale(h_tray, 4, Vector((0, 0, 1)))
    )
    mesh_tray = bpy.data.meshes.new("Dispenser_Drip_Tray")
    bm_tray.to_mesh(mesh_tray)
    bm_tray.free()
    obj_tray = bpy.data.objects.new("Dispenser_Drip_Tray", mesh_tray)
    obj_tray.data.materials.append(mats["Dispenser_DarkMetal"])
    col.objects.link(obj_tray)
    obj_tray.parent = parent
    apply_bevel(obj_tray, width=0.001, segments=1)

def build_reservoirs(col, mats, parent):
    # Positions of 3 cartridges: Left (X=-0.15m), Center (X=0.0m), Right (X=0.15m)
    xs = [-0.15, 0.0, 0.15]
    colors = ["Dispenser_Liquid_Purple", "Dispenser_Liquid_Cyan", "Dispenser_Liquid_Green"]
    names = ["Left_Purple", "Center_Cyan", "Right_Green"]

    y_pos = -0.02  # slightly forward from back upright panel
    z_bottom = H_BASE_PLATFORM + 0.06

    for x, c_name, name in zip(xs, colors, names):
        # 1. Liquid core cylinder
        bm_fluid = bmesh.new()
        bmesh.ops.create_cone(
            bm_fluid,
            cap_ends=True,
            cap_tris=False,
            segments=NUM_CIRC_SEGS,
            radius1=R_CARTRIDGE * 0.92,
            radius2=R_CARTRIDGE * 0.92,
            depth=H_CARTRIDGE * 0.88,
            matrix=Matrix.Translation((x, y_pos, z_bottom + H_CARTRIDGE / 2))
        )
        mesh_fluid = bpy.data.meshes.new(f"Fluid_{name}")
        bm_fluid.to_mesh(mesh_fluid)
        bm_fluid.free()
        obj_fluid = bpy.data.objects.new(f"Fluid_{name}", mesh_fluid)
        obj_fluid.data.materials.append(mats[c_name])
        col.objects.link(obj_fluid)
        obj_fluid.parent = parent

        # 2. Cartridge metal end caps and brackets
        bm_caps = bmesh.new()
        # Bottom collar
        bmesh.ops.create_cone(
            bm_caps,
            cap_ends=True,
            cap_tris=False,
            segments=NUM_CIRC_SEGS,
            radius1=R_CARTRIDGE * 1.08,
            radius2=R_CARTRIDGE * 1.08,
            depth=0.035,
            matrix=Matrix.Translation((x, y_pos, z_bottom + 0.0175))
        )
        # Top collar and valve dome
        z_top = z_bottom + H_CARTRIDGE
        bmesh.ops.create_cone(
            bm_caps,
            cap_ends=True,
            cap_tris=False,
            segments=NUM_CIRC_SEGS,
            radius1=R_CARTRIDGE * 1.08,
            radius2=R_CARTRIDGE * 0.80,
            depth=0.040,
            matrix=Matrix.Translation((x, y_pos, z_top - 0.020))
        )
        # Middle clamping ring
        bmesh.ops.create_cone(
            bm_caps,
            cap_ends=True,
            cap_tris=False,
            segments=NUM_CIRC_SEGS,
            radius1=R_CARTRIDGE * 1.05,
            radius2=R_CARTRIDGE * 1.05,
            depth=0.020,
            matrix=Matrix.Translation((x, y_pos, z_bottom + H_CARTRIDGE * 0.55))
        )

        mesh_caps = bpy.data.meshes.new(f"Caps_{name}")
        bm_caps.to_mesh(mesh_caps)
        bm_caps.free()
        obj_caps = bpy.data.objects.new(f"Caps_{name}", mesh_caps)
        obj_caps.data.materials.append(mats["Dispenser_Gunmetal"])
        col.objects.link(obj_caps)
        obj_caps.parent = parent
        apply_bevel(obj_caps, width=0.002, segments=2)

def build_dispensing_spigots(col, mats, parent):
    # 3 Spigots protruding from bottom of cartridges toward the drip tray
    xs = [-0.15, 0.0, 0.15]
    y_tank = -0.02
    z_spigot = H_BASE_PLATFORM + 0.05

    bm = bmesh.new()
    for x in xs:
        # Chrome conduit pipe descending and turning forward
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=False,
            segments=16,
            radius1=0.012,
            radius2=0.012,
            depth=0.045,
            matrix=Matrix.Translation((x, y_tank, z_spigot + 0.01))
        )
        # Spout nozzle pointing down toward tray
        y_nozzle = y_tank - 0.06
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=False,
            segments=16,
            radius1=0.014,
            radius2=0.010,
            depth=0.035,
            matrix=Matrix.Translation((x, y_nozzle, z_spigot - 0.015))
        )
        # Valve lever handle
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((x, y_nozzle + 0.015, z_spigot + 0.025)) @
                   Matrix.Rotation(math.radians(-25), 4, 'X') @
                   Matrix.Scale(0.012, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.045, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Dispenser_Spigots")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Dispenser_Spigots", mesh)
    obj.data.materials.append(mats["Dispenser_Chrome"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.001, segments=1)

def build_status_indicators(col, mats, parent):
    # Status light strips on the top header backing
    bm = bmesh.new()
    y_front = (D_BASE / 2) - (D_BASE * 0.35) - 0.005
    z_led = H_TOTAL - 0.04

    xs = [-0.15, 0.0, 0.15]
    for x in xs:
        # Small amber status LED
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((x, y_front - 0.005, z_led)) @
                   Matrix.Scale(0.025, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.008, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Dispenser_Status_LEDs")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Dispenser_Status_LEDs", mesh)
    obj.data.materials.append(mats["Dispenser_Status_Amber"])
    col.objects.link(obj)
    obj.parent = parent

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
    key_data.size = 1.6
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.4, -1.6, 1.8)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 35.0
    fill_data.size = 1.8
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.5, -1.0, 1.4)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 65.0
    rim_data.size = 1.2
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.6, 1.6)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 2.1
    cam_pitch = math.radians(62)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.35 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.35))
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
    root = bpy.data.objects.get("DrinkDispenser_Root")
    if not root:
        print("[ERROR] DrinkDispenser_Root not found for export!")
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
    print(f"  • Unit Height:          Z = {max_z:.4f}m [{'PASS: Target ~0.70m' if abs(max_z - 0.70) < 0.05 else 'CHECK'}]")
    print(f"  • Unit Width:           ~{dim_x:.3f}m [{'PASS: Target ~0.52m' if 0.48 <= dim_x <= 0.56 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_DRINK_DISPENSER")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("DrinkDispenser_Root", None)
    col.objects.link(root)

    # Build Components
    build_base_platform(col, mats, root)
    build_reservoirs(col, mats, root)
    build_dispensing_spigots(col, mats, root)
    build_status_indicators(col, mats, root)

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
