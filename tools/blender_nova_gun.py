"""
Blender 5.2+ Automation Script: High-Fidelity NOVA FPS Arc-Pistol 3D Model
Project Nova - WebXR FPS Player Weapon

Generates a game-ready, high-fidelity 3D model of the NOVA Arc-Pistol
aligned directly with the 2D concept art reference sheet and VR scale.
"""

import sys
import os
import math

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler, Matrix
except ImportError:
    print("[ERROR] This script must be run inside Blender.")
    sys.exit(1)

# Paths
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMAGE_PATH = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_pistol_concept.jpg")
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_gun_workspace.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "nova_gun.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "nova_gun.glb")

# Real-world VR Dimensions (in meters)
WEAPON_LENGTH = 0.26   # 26 cm total length

def clear_scene():
    """Clear default startup scene objects."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)

def setup_materials():
    """Create PBR materials matching Project Nova's aesthetic."""
    mats = {}

    def make_mat(name, base_color, metallic, roughness, emission=None, emission_strength=1.0, alpha=1.0):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*base_color, alpha)
            bsdf.inputs["Metallic"].default_value = metallic
            bsdf.inputs["Roughness"].default_value = roughness
            if emission:
                if "Emission Color" in bsdf.inputs:
                    bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
                    bsdf.inputs["Emission Strength"].default_value = emission_strength
                elif "Emission" in bsdf.inputs:
                    bsdf.inputs["Emission"].default_value = (*emission, 1.0)
        return mat

    mats["chassis_dark"] = make_mat("Mat_Nova_ChassisDark", (0.07, 0.10, 0.15), 0.88, 0.26)
    mats["chassis_accent"] = make_mat("Mat_Nova_ChassisAccent", (0.12, 0.16, 0.22), 0.82, 0.32)
    mats["grip_composite"] = make_mat("Mat_Nova_GripComposite", (0.04, 0.05, 0.06), 0.08, 0.65)
    mats["cyan_glow"] = make_mat("Mat_Nova_CyanPlasma", (0.12, 0.85, 1.0), 0.2, 0.15, emission=(0.12, 0.85, 1.0), emission_strength=4.5)
    mats["heat_radiator"] = make_mat("Mat_Nova_HeatRadiator", (0.28, 0.15, 0.09), 0.85, 0.38)
    mats["sight_glass"] = make_mat("Mat_Nova_SightReticle", (0.2, 0.9, 1.0), 0.0, 0.1, emission=(0.2, 0.9, 1.0), emission_strength=3.0, alpha=0.85)

    return mats

def setup_reference_image(col):
    """Import the concept art image as an orthographic background reference."""
    if not os.path.exists(IMAGE_PATH):
        print(f"[WARN] Reference image not found at {IMAGE_PATH}")
        return None

    bpy.ops.object.empty_add(type='IMAGE', location=(0.18, 0.02, 0.015))
    ref_empty = bpy.context.active_object
    ref_empty.name = "Ref_NOVA_Pistol_SideView"
    col.objects.link(ref_empty)
    bpy.context.scene.collection.objects.unlink(ref_empty)

    img = bpy.data.images.load(IMAGE_PATH)
    ref_empty.data = img
    ref_empty.empty_display_size = WEAPON_LENGTH * 1.5
    ref_empty.empty_image_side = 'DOUBLE_SIDED'
    ref_empty.rotation_euler = (math.radians(90), 0, math.radians(90))
    ref_empty.color = (1, 1, 1, 0.6)
    return ref_empty

def create_mesh_object(name, col, parent=None, material=None):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    if parent:
        obj.parent = parent
    if material:
        obj.data.materials.append(material)
    return obj, mesh

def build_detailed_gun_model(col, mats):
    """
    Constructs the full high-fidelity 3D weapon matching the 2D concept art:
    Y+ is Forward (Barrel/Muzzle), Z+ is Up (Sight/Rail), X is Right/Left.
    """
    gun_root = bpy.data.objects.new("NOVA_FPS_PISTOL", None)
    col.objects.link(gun_root)

    def add_box(name, loc, size, mat, parent=gun_root, rot=(0,0,0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = size
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if mat:
            obj.data.materials.append(mat)
        obj.parent = parent
        col.objects.link(obj)
        bpy.context.scene.collection.objects.unlink(obj)
        return obj

    def add_cylinder(name, loc, r, depth, mat, parent=gun_root, rot=(math.radians(90),0,0), verts=16):
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if mat:
            obj.data.materials.append(mat)
        obj.parent = parent
        col.objects.link(obj)
        bpy.context.scene.collection.objects.unlink(obj)
        return obj

    # 1. Main Upper Receiver (Slide)
    add_box("Receiver_Main", (0, 0.015, 0.038), (0.040, 0.21, 0.048), mats["chassis_dark"])
    # Chamfered front nose
    add_box("Receiver_Nose", (0, 0.115, 0.032), (0.036, 0.03, 0.036), mats["chassis_accent"])
    # Lower receiver housing
    add_box("Receiver_LowerFrame", (0, -0.01, 0.008), (0.034, 0.16, 0.024), mats["chassis_accent"])

    # 2. Picatinny Tactical Top Rail
    add_box("Rail_Base", (0, 0.015, 0.066), (0.022, 0.17, 0.008), mats["chassis_dark"])
    # Rail teeth / recoil grooves (5 segmented notches)
    for i in range(5):
        y_pos = -0.05 + (i * 0.028)
        add_box(f"Rail_Notch_{i+1}", (0, y_pos, 0.071), (0.024, 0.014, 0.004), mats["chassis_accent"])

    # 3. Holographic Reflex Sight
    add_box("Sight_Mount", (0, -0.025, 0.076), (0.026, 0.055, 0.012), mats["chassis_dark"])
    add_box("Sight_Hood_L", (0.014, -0.025, 0.092), (0.004, 0.052, 0.022), mats["chassis_dark"])
    add_box("Sight_Hood_R", (-0.014, -0.025, 0.092), (0.004, 0.052, 0.022), mats["chassis_dark"])
    add_box("Sight_Hood_Top", (0, -0.025, 0.102), (0.028, 0.052, 0.004), mats["chassis_dark"])
    # Holographic reticle emitter glass
    add_box("Sight_Reticle_Glass", (0, -0.025, 0.091), (0.022, 0.003, 0.016), mats["sight_glass"])

    # 4. Plasma Emitter Barrel Assembly
    # Stepped outer barrel jacket
    add_cylinder("Barrel_Jacket", (0, 0.125, 0.038), 0.015, 0.065, mats["chassis_accent"])
    # Forward muzzle brake
    add_cylinder("Muzzle_Brake", (0, 0.158, 0.038), 0.017, 0.018, mats["chassis_dark"])
    # Recessed inner plasma emitter core
    add_cylinder("Plasma_Emitter_Core", (0, 0.165, 0.038), 0.009, 0.012, mats["cyan_glow"])

    # 5. Dual Cyan Induction Focusing Coils
    add_cylinder("Induction_Coil_Front", (0, 0.145, 0.038), 0.0175, 0.006, mats["cyan_glow"])
    add_cylinder("Induction_Coil_Mid", (0, 0.118, 0.038), 0.0175, 0.006, mats["cyan_glow"])

    # 6. Ergonomic Combat Grip (15 degree backward rake)
    grip_rake = (math.radians(-15), 0, 0)
    add_box("Grip_Core", (0, -0.048, -0.050), (0.032, 0.052, 0.115), mats["grip_composite"], rot=grip_rake)
    # Side palm swell textured panels
    add_box("Grip_Panel_L", (0.017, -0.048, -0.050), (0.003, 0.042, 0.095), mats["chassis_dark"], rot=grip_rake)
    add_box("Grip_Panel_R", (-0.017, -0.048, -0.050), (0.003, 0.042, 0.095), mats["chassis_dark"], rot=grip_rake)

    # 7. Magwell & Energy Cell Magazine
    add_box("Magwell_Flange", (0, -0.064, -0.110), (0.036, 0.058, 0.012), mats["chassis_dark"], rot=grip_rake)
    add_box("Energy_Cell_Base", (0, -0.068, -0.122), (0.030, 0.046, 0.016), mats["chassis_accent"], rot=grip_rake)
    # 3-segment cyan battery charge indicator on the magazine heel
    for b in range(3):
        z_ind = -0.118 - (b * 0.005)
        add_box(f"Cell_Indicator_{b+1}", (0.016, -0.068, z_ind), (0.002, 0.022, 0.003), mats["cyan_glow"], rot=grip_rake)

    # 8. Trigger Guard & Trigger Blade
    add_box("Trigger_Guard_Bottom", (0, 0.005, -0.030), (0.014, 0.062, 0.005), mats["chassis_dark"])
    add_box("Trigger_Guard_Front", (0, 0.035, -0.015), (0.014, 0.005, 0.032), mats["chassis_dark"])
    add_box("Trigger_Blade", (0, -0.005, -0.012), (0.007, 0.016, 0.024), mats["chassis_dark"], rot=(math.radians(-22), 0, 0))

    # 9. Rear Heat Dissipation Radiator Fins
    for f in range(5):
        y_fin = -0.065 - (f * 0.009)
        add_box(f"Heat_Fin_{f+1}", (0, y_fin, 0.038), (0.042, 0.003, 0.042), mats["heat_radiator"])
    # Internal soft cyan glow core inside heat radiator
    add_box("Heat_Core_Glow", (0, -0.082, 0.038), (0.026, 0.036, 0.026), mats["cyan_glow"])

    # 10. Longitudinal Cyan Plasma Power Conduits (Left & Right)
    add_box("Conduit_Channel_L", (0.021, 0.015, 0.032), (0.003, 0.155, 0.006), mats["cyan_glow"])
    add_box("Conduit_Channel_R", (-0.021, 0.015, 0.032), (0.003, 0.155, 0.006), mats["cyan_glow"])

    # Smooth shading across all mesh components
    for child in gun_root.children_recursive:
        if child.type == 'MESH':
            for poly in child.data.polygons:
                poly.use_smooth = True

    print(f"[OK] High-Fidelity NOVA FPS Arc-Pistol constructed ({len(gun_root.children_recursive)} parts).")
    return gun_root

def setup_studio_environment(col):
    """Set up cameras and studio lighting for inspecting the model."""
    cam_side_data = bpy.data.cameras.new("Cam_Side_Ortho")
    cam_side_data.type = 'ORTHO'
    cam_side_data.ortho_scale = 0.35
    cam_side = bpy.data.objects.new("Cam_Side_Ortho", cam_side_data)
    cam_side.location = (0.5, 0.02, 0.01)
    cam_side.rotation_euler = (math.radians(90), 0, math.radians(90))
    col.objects.link(cam_side)

    # 3/4 Perspective Camera for thumbnail rendering
    cam_persp_data = bpy.data.cameras.new("Cam_Perspective_Hero")
    cam_persp_data.lens = 50
    cam_persp = bpy.data.objects.new("Cam_Perspective_Hero", cam_persp_data)
    cam_persp.location = (0.35, 0.30, 0.20)
    cam_persp.rotation_euler = (math.radians(65), 0, math.radians(130))
    col.objects.link(cam_persp)
    bpy.context.scene.camera = cam_persp

    # Key Light (Pure White)
    light_key_data = bpy.data.lights.new("Light_Key", type='AREA')
    light_key_data.energy = 60.0
    light_key_data.size = 0.4
    light_key = bpy.data.objects.new("Light_Key", light_key_data)
    light_key.location = (0.35, 0.35, 0.35)
    light_key.rotation_euler = (math.radians(45), 0, math.radians(135))
    col.objects.link(light_key)

    # Cyan Accent Rim Light
    light_rim_data = bpy.data.lights.new("Light_Rim", type='SPOT')
    light_rim_data.energy = 100.0
    light_rim_data.color = (0.12, 0.85, 1.0)
    light_rim = bpy.data.objects.new("Light_Rim", light_rim_data)
    light_rim.location = (-0.4, -0.4, 0.25)
    light_rim.rotation_euler = (math.radians(60), 0, math.radians(-45))
    col.objects.link(light_rim)

def export_glb():
    """Exports the modeled gun into GLB format for Project Nova."""
    os.makedirs(os.path.dirname(GLB_OUT_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_GLB_OUT_PATH), exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    gun = bpy.data.objects.get("NOVA_FPS_PISTOL")
    if not gun:
        print("[ERROR] NOVA_FPS_PISTOL not found for export.")
        return

    gun.select_set(True)
    for child in gun.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = gun

    # Export to models/nova_gun.glb
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )
    print(f"[OK] Exported GLB: {GLB_OUT_PATH}")

    # Copy to public/models/nova_gun.glb
    import shutil
    shutil.copyfile(GLB_OUT_PATH, PUBLIC_GLB_OUT_PATH)
    print(f"[OK] Copied GLB to: {PUBLIC_GLB_OUT_PATH}")

def render_preview_image(output_path):
    """Renders a 3D perspective thumbnail preview of the modeled weapon."""
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 90
    bpy.ops.render.render(write_still=True)
    print(f"[OK] Rendered 3D preview: {output_path}")

def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    do_export = "--export-glb" in args or True
    do_render = "--render" in args or True

    clear_scene()

    master_col = bpy.data.collections.new("NOVA_FPS_WEAPON")
    bpy.context.scene.collection.children.link(master_col)

    mats = setup_materials()
    setup_reference_image(master_col)
    build_detailed_gun_model(master_col, mats)
    setup_studio_environment(master_col)

    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"[OK] Saved Blender workspace: {BLEND_OUT_PATH}")

    if do_export:
        export_glb()

    if do_render:
        preview_path = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_gun_3d_render.jpg")
        render_preview_image(preview_path)

if __name__ == "__main__":
    main()
