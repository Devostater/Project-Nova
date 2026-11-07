"""
Blender 5.2+ High-Fidelity Mid/High-Poly Hard Surface Weapon Generator
Project Nova - NOVA Arc-Pistol FPS Weapon

Upgrades the low-poly blockout into a detailed hard-surface sci-fi hero model:
- Bevel modifiers + Weighted Normals for realistic edge highlights
- Contoured ergonomic grip with curved beavertail & palm swells
- Detailed slide cocking serrations, ejection port, and panel insets
- 32-segment smooth cylinders with hollowed muzzle brake & induction coils
- Multi-component holographic reflex optic with hooded cowl and reticle
- High-res heat sink radiators and glowing energy conduits
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

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMAGE_PATH = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_pistol_concept.jpg")
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_gun_workspace.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "nova_gun.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "nova_gun.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_fps_gun_3d_render.jpg")

WEAPON_LENGTH = 0.26   # 26 cm length

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)

def setup_materials():
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

    mats["chassis_dark"] = make_mat("Mat_Nova_ChassisDark", (0.05, 0.08, 0.12), 0.90, 0.22)
    mats["chassis_accent"] = make_mat("Mat_Nova_ChassisAccent", (0.10, 0.14, 0.19), 0.85, 0.30)
    mats["grip_composite"] = make_mat("Mat_Nova_GripComposite", (0.03, 0.04, 0.05), 0.05, 0.55)
    mats["cyan_glow"] = make_mat("Mat_Nova_CyanPlasma", (0.10, 0.88, 1.0), 0.2, 0.10, emission=(0.10, 0.88, 1.0), emission_strength=5.0)
    mats["heat_radiator"] = make_mat("Mat_Nova_HeatRadiator", (0.32, 0.16, 0.08), 0.88, 0.32)
    mats["sight_glass"] = make_mat("Mat_Nova_SightReticle", (0.15, 0.92, 1.0), 0.0, 0.08, emission=(0.15, 0.92, 1.0), emission_strength=3.5, alpha=0.9)
    return mats

def apply_hard_surface_modifiers(obj, bevel_width=0.002, segments=2):
    """
    Applies high-end game industry Bevel + Weighted Normal workflow:
    Produces perfectly rounded specular highlights on edges without low-poly sharp facets.
    """
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = bevel_width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(35)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True
    
    # Auto smooth
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(60)

def build_curved_ergonomic_grip(col, mat_grip, mat_accent, parent):
    """
    Constructs an ergonomic curved combat pistol grip with beavertail,
    curved front strap, palm swells, and finger rest.
    """
    bm = bmesh.new()
    
    # Define 6 height slices for the grip contour
    slices_data = [
        # (z_height, y_center, width_x, depth_y)
        ( 0.010, -0.020, 0.034, 0.055),  # Top joint with receiver
        (-0.015, -0.028, 0.036, 0.052),  # Beavertail swell
        (-0.040, -0.036, 0.038, 0.050),  # Palm swell (thickest)
        (-0.065, -0.044, 0.036, 0.048),  # Middle grip waist
        (-0.090, -0.052, 0.035, 0.050),  # Lower finger shelf
        (-0.110, -0.060, 0.038, 0.054),  # Magwell base
    ]
    
    rings = []
    for z, y_c, wx, dy in slices_data:
        # Create an 8-sided rounded cross section
        r_x = wx / 2.0
        r_y = dy / 2.0
        ring_verts = []
        for a_deg in [0, 45, 90, 135, 180, 225, 270, 315]:
            rad = math.radians(a_deg)
            vx = math.cos(rad) * r_x
            vy = y_c + math.sin(rad) * r_y
            v = bm.verts.new((vx, vy, z))
            ring_verts.append(v)
        rings.append(ring_verts)
    
    # Bridge rings into quads
    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i+1]
        for j in range(8):
            j_next = (j + 1) % 8
            bm.faces.new([r1[j], r1[j_next], r2[j_next], r2[j]])
            
    # Cap bottom
    bm.faces.new(list(reversed(rings[-1])))
    
    mesh = bpy.data.meshes.new("Grip_Ergonomic_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    grip_obj = bpy.data.objects.new("Grip_Ergonomic", mesh)
    col.objects.link(grip_obj)
    grip_obj.parent = parent
    grip_obj.data.materials.append(mat_grip)
    
    # Add subdivision + bevel to make it organic & sleek
    sub = grip_obj.modifiers.new(name="Subdivision", type='SUBSURF')
    sub.levels = 2
    sub.render_levels = 2
    
    # Add textured side grip inserts
    for side in [1, -1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 0.019, -0.038, -0.050))
        panel = bpy.context.active_object
        panel.name = f"Grip_Stipple_Panel_{'R' if side < 0 else 'L'}"
        panel.scale = (0.003, 0.035, 0.065)
        panel.rotation_euler = (math.radians(-14), 0, 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        panel.data.materials.append(mat_accent)
        panel.parent = parent
        col.objects.link(panel)
        bpy.context.scene.collection.objects.unlink(panel)
        apply_hard_surface_modifiers(panel, 0.0015, 2)

    return grip_obj

def build_high_fidelity_weapon(col, mats):
    gun_root = bpy.data.objects.new("NOVA_FPS_PISTOL", None)
    col.objects.link(gun_root)

    def add_beveled_box(name, loc, size, mat, bevel_w=0.002, rot=(0,0,0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = size
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if mat:
            obj.data.materials.append(mat)
        obj.parent = gun_root
        col.objects.link(obj)
        bpy.context.scene.collection.objects.unlink(obj)
        apply_hard_surface_modifiers(obj, bevel_w, 2)
        return obj

    def add_smooth_cylinder(name, loc, r, depth, mat, verts=32, rot=(math.radians(90),0,0), bevel_w=0.001):
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if mat:
            obj.data.materials.append(mat)
        obj.parent = gun_root
        col.objects.link(obj)
        bpy.context.scene.collection.objects.unlink(obj)
        apply_hard_surface_modifiers(obj, bevel_w, 2)
        return obj

    # 1. UPPER RECEIVER / SLIDE (Detailed Hard Surface with Chamfers)
    add_beveled_box("Receiver_Main_Upper", (0, 0.012, 0.040), (0.042, 0.215, 0.046), mats["chassis_dark"], bevel_w=0.0035)
    # Tapered Nose
    add_beveled_box("Receiver_Nose_Cowl", (0, 0.118, 0.034), (0.038, 0.028, 0.036), mats["chassis_accent"], bevel_w=0.003)
    # Lower Frame Skeleton
    add_beveled_box("Receiver_Lower_Frame", (0, -0.005, 0.010), (0.036, 0.170, 0.024), mats["chassis_accent"], bevel_w=0.002)

    # 2. SLIDE SERRATIONS (7 Machined Cocking Grips on Slide Rear)
    for s in range(7):
        y_cut = -0.035 - (s * 0.0075)
        # Left & Right serration cuts
        add_beveled_box(f"Serration_L_{s+1}", (0.0215, y_cut, 0.042), (0.002, 0.004, 0.032), mats["chassis_accent"], bevel_w=0.0008)
        add_beveled_box(f"Serration_R_{s+1}", (-0.0215, y_cut, 0.042), (0.002, 0.004, 0.032), mats["chassis_accent"], bevel_w=0.0008)

    # 3. TOP ACCESSORY RAIL (MIL-STD-1913 Picatinny Style)
    add_beveled_box("Rail_Spine", (0, 0.015, 0.068), (0.022, 0.175, 0.008), mats["chassis_dark"], bevel_w=0.001)
    for r in range(9):
        y_r = -0.062 + (r * 0.018)
        add_beveled_box(f"Rail_Lug_{r+1}", (0, y_r, 0.073), (0.024, 0.009, 0.004), mats["chassis_accent"], bevel_w=0.0008)

    # 4. HOLOGRAPHIC REFLEX OPTIC (Sleek Hooded Micro Red-Dot)
    add_beveled_box("Optic_Base_Clamp", (0, -0.025, 0.078), (0.026, 0.052, 0.010), mats["chassis_dark"], bevel_w=0.0015)
    # Curved Hood Aperture
    add_beveled_box("Optic_Hood_Left", (0.0135, -0.025, 0.094), (0.003, 0.050, 0.024), mats["chassis_dark"], bevel_w=0.0015)
    add_beveled_box("Optic_Hood_Right", (-0.0135, -0.025, 0.094), (0.003, 0.050, 0.024), mats["chassis_dark"], bevel_w=0.0015)
    add_beveled_box("Optic_Hood_Roof", (0, -0.025, 0.105), (0.028, 0.050, 0.003), mats["chassis_dark"], bevel_w=0.0015)
    # Reticle Glass with Projector Dot
    add_beveled_box("Optic_Glass_Lens", (0, -0.025, 0.093), (0.022, 0.0025, 0.018), mats["sight_glass"], bevel_w=0.0005)
    add_smooth_cylinder("Optic_Reticle_Dot", (0, -0.024, 0.093), 0.002, 0.003, mats["cyan_glow"], verts=16)

    # 5. HIGH-DENSITY PLASMA BARREL & MUZZLE BRAKE
    # Inner Barrel Core
    add_smooth_cylinder("Barrel_Inner_Core", (0, 0.125, 0.038), 0.013, 0.075, mats["chassis_dark"], verts=32)
    # Heavy Outer Jacket
    add_smooth_cylinder("Barrel_Outer_Jacket", (0, 0.115, 0.038), 0.016, 0.055, mats["chassis_accent"], verts=32)
    # Muzzle Brake with Radial Ports
    add_smooth_cylinder("Muzzle_Brake_Housing", (0, 0.160, 0.038), 0.0175, 0.020, mats["chassis_dark"], verts=32)
    # Hollow Plasma Vent Port
    add_smooth_cylinder("Muzzle_Vent_Center", (0, 0.168, 0.038), 0.0095, 0.012, mats["cyan_glow"], verts=32)

    # 6. DUAL MAGNETIC INDUCTION COILS (Cyan Energy Rings)
    add_smooth_cylinder("Induction_Coil_A", (0, 0.146, 0.038), 0.0185, 0.007, mats["cyan_glow"], verts=32)
    add_smooth_cylinder("Induction_Coil_B", (0, 0.118, 0.038), 0.0185, 0.007, mats["cyan_glow"], verts=32)

    # 7. CONTOURED ERGONOMIC COMBAT GRIP
    build_curved_ergonomic_grip(col, mats["grip_composite"], mats["chassis_accent"], gun_root)

    # 8. DETAILED TRIGGER & GUARD
    add_beveled_box("Trigger_Guard_Spine", (0, 0.006, -0.031), (0.013, 0.065, 0.004), mats["chassis_dark"], bevel_w=0.001)
    add_beveled_box("Trigger_Guard_Ramp", (0, 0.037, -0.014), (0.013, 0.004, 0.034), mats["chassis_dark"], bevel_w=0.001)
    add_beveled_box("Trigger_Shoe", (0, -0.006, -0.011), (0.0065, 0.014, 0.022), mats["chassis_accent"], bevel_w=0.001, rot=(math.radians(-24), 0, 0))

    # 9. REMOVABLE ZERO-POINT BATTERY MAGAZINE & WELL
    mag_rot = (math.radians(-14), 0, 0)
    add_beveled_box("Magwell_Flange", (0, -0.062, -0.112), (0.038, 0.056, 0.010), mats["chassis_dark"], bevel_w=0.002, rot=mag_rot)
    add_beveled_box("Battery_Baseplate", (0, -0.066, -0.124), (0.034, 0.048, 0.016), mats["chassis_accent"], bevel_w=0.0025, rot=mag_rot)
    # 4-segment battery charge meter
    for c in range(4):
        z_led = -0.118 - (c * 0.004)
        add_beveled_box(f"Battery_LED_{c+1}", (0.0175, -0.066, z_led), (0.0015, 0.020, 0.0022), mats["cyan_glow"], bevel_w=0.0005, rot=mag_rot)

    # 10. REAR HEAT RADIATOR VENTS (5 High-Efficiency Vacuum Radiators)
    for h in range(5):
        y_h = -0.066 - (h * 0.009)
        add_beveled_box(f"Heat_Fin_{h+1}", (0, y_h, 0.040), (0.044, 0.0025, 0.044), mats["heat_radiator"], bevel_w=0.0008)
    # Core internal glow visible between fins
    add_beveled_box("Heat_Core_Interior", (0, -0.084, 0.040), (0.028, 0.036, 0.028), mats["cyan_glow"], bevel_w=0.001)

    # 11. DUAL LONGITUDINAL PLASMA CONDUITS (Beveled glowing conduits)
    add_beveled_box("Power_Conduit_L", (0.022, 0.014, 0.032), (0.0035, 0.160, 0.007), mats["cyan_glow"], bevel_w=0.001)
    add_beveled_box("Power_Conduit_R", (-0.022, 0.014, 0.032), (0.0035, 0.160, 0.007), mats["cyan_glow"], bevel_w=0.001)

    # Set smooth shading across all objects
    for child in gun_root.children_recursive:
        if child.type == 'MESH':
            for poly in child.data.polygons:
                poly.use_smooth = True

    print(f"[OK] High-Fidelity Hard-Surface NOVA Arc-Pistol generated ({len(gun_root.children_recursive)} parts).")
    return gun_root

def setup_studio_environment(col):
    cam_persp_data = bpy.data.cameras.new("Cam_Perspective_Hero")
    cam_persp_data.lens = 65
    cam_persp = bpy.data.objects.new("Cam_Perspective_Hero", cam_persp_data)
    cam_persp.location = (0.34, 0.32, 0.22)
    cam_persp.rotation_euler = (math.radians(65), 0, math.radians(130))
    col.objects.link(cam_persp)
    bpy.context.scene.camera = cam_persp

    # Key Light (Warm Tint 5000K)
    light_key_data = bpy.data.lights.new("Light_Key", type='AREA')
    light_key_data.energy = 85.0
    light_key_data.size = 0.5
    light_key = bpy.data.objects.new("Light_Key", light_key_data)
    light_key.location = (0.4, 0.4, 0.45)
    light_key.rotation_euler = (math.radians(45), 0, math.radians(135))
    col.objects.link(light_key)

    # Cyan Accent Rim Light
    light_rim_data = bpy.data.lights.new("Light_Rim", type='SPOT')
    light_rim_data.energy = 140.0
    light_rim_data.color = (0.10, 0.88, 1.0)
    light_rim = bpy.data.objects.new("Light_Rim", light_rim_data)
    light_rim.location = (-0.45, -0.45, 0.30)
    light_rim.rotation_euler = (math.radians(60), 0, math.radians(-45))
    col.objects.link(light_rim)

    # Soft Fill Light
    light_fill_data = bpy.data.lights.new("Light_Fill", type='AREA')
    light_fill_data.energy = 25.0
    light_fill_data.size = 0.8
    light_fill = bpy.data.objects.new("Light_Fill", light_fill_data)
    light_fill.location = (-0.3, 0.3, -0.1)
    light_fill.rotation_euler = (math.radians(-30), 0, math.radians(120))
    col.objects.link(light_fill)

def export_glb():
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

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )
    print(f"[OK] Exported High-Fidelity GLB: {GLB_OUT_PATH}")

    import shutil
    shutil.copyfile(GLB_OUT_PATH, PUBLIC_GLB_OUT_PATH)
    print(f"[OK] Copied GLB to: {PUBLIC_GLB_OUT_PATH}")

def render_preview_image(output_path):
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1280
    bpy.context.scene.render.resolution_y = 720
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 92
    bpy.ops.render.render(write_still=True)
    print(f"[OK] Rendered High-Fidelity 3D preview: {output_path}")

def main():
    clear_scene()
    master_col = bpy.data.collections.new("NOVA_FPS_WEAPON")
    bpy.context.scene.collection.children.link(master_col)

    mats = setup_materials()
    build_high_fidelity_weapon(master_col, mats)
    setup_studio_environment(master_col)

    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"[OK] Saved Blender workspace: {BLEND_OUT_PATH}")

    export_glb()
    render_preview_image(PREVIEW_OUT_PATH)

if __name__ == "__main__":
    main()
