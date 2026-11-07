"""
Blender 5.2+ AAA High-Poly Hero Hard-Surface Weapon Generator
Project Nova - NOVA Arc-Pistol (Hero FPS Weapon Model)

High-density cinematic asset unconstrained by low-poly budgets:
- Sub-D & multi-segment bevel modifiers with weighted normals
- Skeletonized competition flat-face trigger with safety bar
- Full MIL-STD-1913 Picatinny rail with 12 milled recoil slots & clamping undercuts
- Machined slide serrations (front & rear), slide lightning windows, and ejection port
- Multi-component holographic reflex optic with hooded cowl, knurled adjustment turrets & lenses
- Ported muzzle brake with radial compensator vents & 64-segment plasma induction rings
- Sculpted ergonomic grip with palm swells, finger grooving, beavertail & stippling pads
- Frame controls: slide release catch, takedown lever, ambidextrous safety, and mag release
- 7-fin rear heat radiator array with glowing zero-point energy core
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
    def make_mat(name, base_color, metallic, roughness, emission=None, emission_strength=1.0, alpha=1.0, ior=1.45):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*base_color, alpha)
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

    mats["chassis_dark"] = make_mat("Mat_Nova_ChassisDark", (0.04, 0.06, 0.09), 0.92, 0.20)
    mats["chassis_accent"] = make_mat("Mat_Nova_ChassisAccent", (0.09, 0.12, 0.17), 0.88, 0.28)
    mats["chassis_chrome"] = make_mat("Mat_Nova_ChassisChrome", (0.65, 0.68, 0.72), 0.98, 0.12)
    mats["grip_composite"] = make_mat("Mat_Nova_GripComposite", (0.02, 0.03, 0.04), 0.05, 0.60)
    mats["grip_stipple"] = make_mat("Mat_Nova_GripStipple", (0.015, 0.02, 0.025), 0.10, 0.75)
    mats["cyan_glow"] = make_mat("Mat_Nova_CyanPlasma", (0.08, 0.90, 1.0), 0.2, 0.08, emission=(0.08, 0.90, 1.0), emission_strength=6.0)
    mats["heat_radiator"] = make_mat("Mat_Nova_HeatRadiator", (0.35, 0.18, 0.09), 0.90, 0.25)
    mats["sight_glass"] = make_mat("Mat_Nova_SightLens", (0.1, 0.95, 1.0), 0.0, 0.05, emission=(0.1, 0.95, 1.0), emission_strength=4.0, alpha=0.92)
    mats["safety_red"] = make_mat("Mat_Nova_SafetyRed", (0.85, 0.05, 0.08), 0.3, 0.3)
    return mats

def apply_high_poly_bevel(obj, bevel_width=0.0018, segments=3):
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = bevel_width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(30)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True
    
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(60)

def build_curved_ergonomic_grip(col, mats, parent):
    bm = bmesh.new()
    slices_data = [
        # (z, y_center, width_x, depth_y, x_radius, y_radius)
        ( 0.012, -0.018, 0.034, 0.058),
        (-0.010, -0.026, 0.036, 0.054),  # Beavertail crest
        (-0.035, -0.034, 0.039, 0.052),  # Upper palm swell
        (-0.060, -0.042, 0.038, 0.050),  # Waist curve
        (-0.085, -0.050, 0.037, 0.052),  # Lower finger rest
        (-0.110, -0.058, 0.040, 0.056),  # Flared mag base
    ]
    
    rings = []
    # 16-point oval cross section for smooth curvature
    num_pts = 16
    for z, y_c, wx, dy in slices_data:
        r_x = wx / 2.0
        r_y = dy / 2.0
        ring_verts = []
        for i in range(num_pts):
            theta = (i / num_pts) * 2.0 * math.pi
            vx = math.cos(theta) * r_x
            vy = y_c + math.sin(theta) * r_y
            v = bm.verts.new((vx, vy, z))
            ring_verts.append(v)
        rings.append(ring_verts)
    
    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i+1]
        for j in range(num_pts):
            j_next = (j + 1) % num_pts
            bm.faces.new([r1[j], r1[j_next], r2[j_next], r2[j]])
            
    bm.faces.new(list(reversed(rings[-1])))
    
    mesh = bpy.data.meshes.new("Grip_HighPoly_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    grip_obj = bpy.data.objects.new("Grip_Ergonomic_Body", mesh)
    col.objects.link(grip_obj)
    grip_obj.parent = parent
    grip_obj.data.materials.append(mats["grip_composite"])
    
    sub = grip_obj.modifiers.new(name="Subdivision", type='SUBSURF')
    sub.levels = 2
    sub.render_levels = 2

    # Diamond Stippled Textured Grip Panels
    for side in [1, -1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 0.020, -0.036, -0.050))
        panel = bpy.context.active_object
        panel.name = f"Grip_Stipple_Insert_{'L' if side > 0 else 'R'}"
        panel.scale = (0.0025, 0.038, 0.075)
        panel.rotation_euler = (math.radians(-14), 0, 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        panel.data.materials.append(mats["grip_stipple"])
        panel.parent = parent
        col.objects.link(panel)
        bpy.context.scene.collection.objects.unlink(panel)
        apply_high_poly_bevel(panel, 0.0012, 3)

    return grip_obj

def build_high_poly_hero_weapon(col, mats):
    gun_root = bpy.data.objects.new("NOVA_FPS_PISTOL", None)
    col.objects.link(gun_root)

    def add_box(name, loc, size, mat, bevel_w=0.0018, segs=3, rot=(0,0,0)):
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
        apply_high_poly_bevel(obj, bevel_w, segs)
        return obj

    def add_cyl(name, loc, r, depth, mat, verts=64, rot=(math.radians(90),0,0), bevel_w=0.001, segs=3):
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
        apply_high_poly_bevel(obj, bevel_w, segs)
        return obj

    # 1. UPPER RECEIVER / SLIDE ASSEMBLY
    # Main Slide Chassis
    add_box("Slide_Main_Chassis", (0, 0.012, 0.042), (0.042, 0.220, 0.044), mats["chassis_dark"], bevel_w=0.003, segs=4)
    # Tapered Aerospace Nose Shroud
    add_box("Slide_Nose_Cowling", (0, 0.122, 0.036), (0.038, 0.026, 0.036), mats["chassis_accent"], bevel_w=0.0025, segs=3)
    # Top Slide Lightning Window Cutout (Revealing inner glowing barrel)
    add_box("Slide_Vent_Window_L", (0.013, 0.080, 0.063), (0.006, 0.040, 0.008), mats["chassis_accent"], bevel_w=0.0008)
    add_box("Slide_Vent_Window_R", (-0.013, 0.080, 0.063), (0.006, 0.040, 0.008), mats["chassis_accent"], bevel_w=0.0008)
    # Ejection Port / Heat Expulsion Gate (Right Side)
    add_box("Ejection_Port_Bevel", (0.020, -0.010, 0.046), (0.004, 0.042, 0.018), mats["chassis_accent"], bevel_w=0.001)

    # 2. MACHINED COCKING SERRATIONS (Front & Rear Grips)
    # Rear Serrations (8 cuts)
    for s in range(8):
        y_cut = -0.032 - (s * 0.007)
        add_box(f"Slide_Serration_Rear_L_{s+1}", (0.0215, y_cut, 0.042), (0.002, 0.0035, 0.032), mats["chassis_accent"], bevel_w=0.0006)
        add_box(f"Slide_Serration_Rear_R_{s+1}", (-0.0215, y_cut, 0.042), (0.002, 0.0035, 0.032), mats["chassis_accent"], bevel_w=0.0006)
    # Front Press-Check Serrations (4 cuts)
    for s in range(4):
        y_cut = 0.065 + (s * 0.007)
        add_box(f"Slide_Serration_Front_L_{s+1}", (0.0215, y_cut, 0.042), (0.002, 0.0035, 0.026), mats["chassis_accent"], bevel_w=0.0006)
        add_box(f"Slide_Serration_Front_R_{s+1}", (-0.0215, y_cut, 0.042), (0.002, 0.0035, 0.026), mats["chassis_accent"], bevel_w=0.0006)

    # 3. MIL-STD-1913 PICATINNY RAIL (Full 12-Slot Tactical Top Rail)
    add_box("Rail_Base_Profile", (0, 0.015, 0.067), (0.0212, 0.180, 0.006), mats["chassis_dark"], bevel_w=0.0008)
    # Undercut side clamping grooves
    add_box("Rail_Clamp_Groove_L", (0.011, 0.015, 0.066), (0.002, 0.180, 0.004), mats["chassis_accent"], bevel_w=0.0004)
    add_box("Rail_Clamp_Groove_R", (-0.011, 0.015, 0.066), (0.002, 0.180, 0.004), mats["chassis_accent"], bevel_w=0.0004)
    # 12 Transverse Recoil Lugs
    for r in range(12):
        y_lug = -0.068 + (r * 0.0145)
        add_box(f"Rail_Slot_Lug_{r+1}", (0, y_lug, 0.071), (0.023, 0.008, 0.004), mats["chassis_accent"], bevel_w=0.0006)

    # 4. MULTI-COMPONENT HOLOGRAPHIC REFLEX OPTIC
    add_box("Optic_Quick_Detach_Mount", (0, -0.025, 0.077), (0.028, 0.054, 0.010), mats["chassis_dark"], bevel_w=0.0012)
    # Knurled Mount Clamp Screw
    add_cyl("Optic_Mount_Screw", (0.015, -0.025, 0.077), 0.004, 0.004, mats["chassis_chrome"], rot=(0, math.radians(90), 0))
    # Beveled Protective Shroud
    add_box("Optic_Shroud_L", (0.014, -0.025, 0.093), (0.0035, 0.052, 0.024), mats["chassis_dark"], bevel_w=0.0015)
    add_box("Optic_Shroud_R", (-0.014, -0.025, 0.093), (0.0035, 0.052, 0.024), mats["chassis_dark"], bevel_w=0.0015)
    add_box("Optic_Shroud_Roof", (0, -0.025, 0.104), (0.029, 0.052, 0.0035), mats["chassis_dark"], bevel_w=0.0015)
    # Windage & Elevation Adjustment Knobs
    add_cyl("Optic_Elevation_Turret", (0, -0.025, 0.108), 0.0045, 0.005, mats["chassis_accent"], rot=(0,0,0))
    add_cyl("Optic_Windage_Turret", (0.017, -0.025, 0.093), 0.0045, 0.005, mats["chassis_accent"], rot=(0, math.radians(90), 0))
    # Front & Rear Coated Optical Lenses
    add_box("Optic_Lens_Front", (0, 0.000, 0.093), (0.022, 0.002, 0.018), mats["sight_glass"], bevel_w=0.0004)
    add_box("Optic_Lens_Rear", (0, -0.050, 0.093), (0.022, 0.002, 0.018), mats["sight_glass"], bevel_w=0.0004)
    # Projected Holographic Reticle Ring + Center Dot
    add_cyl("Optic_Reticle_Ring", (0, -0.025, 0.093), 0.005, 0.001, mats["cyan_glow"], verts=32)
    add_cyl("Optic_Reticle_Dot", (0, -0.025, 0.093), 0.0012, 0.0015, mats["cyan_glow"], verts=16)

    # 5. HIGH-DENSITY PLASMA BARREL & RADIAL PORTED MUZZLE BRAKE
    # Inner Barrel Core with rifled interior appearance
    add_cyl("Barrel_Inner_Core", (0, 0.130, 0.038), 0.0135, 0.080, mats["chassis_dark"], verts=64)
    # Heavy Fluted Barrel Shroud
    add_cyl("Barrel_Fluted_Shroud", (0, 0.118, 0.038), 0.0165, 0.060, mats["chassis_accent"], verts=64)
    # Ported Muzzle Brake with 8 Radial Compensator Vents
    add_cyl("Muzzle_Brake_Body", (0, 0.165, 0.038), 0.018, 0.024, mats["chassis_dark"], verts=64)
    # Radial Compensator Ports
    for a in range(8):
        theta = (a / 8) * math.pi * 2
        px = math.cos(theta) * 0.017
        pz = 0.038 + math.sin(theta) * 0.017
        add_cyl(f"Muzzle_Compensator_Port_{a+1}", (px, 0.168, pz), 0.002, 0.006, mats["cyan_glow"], verts=16, rot=(math.sin(theta), 0, math.cos(theta)))
    # Recessed Plasma Focusing Emitter Core
    add_cyl("Plasma_Emitter_Core", (0, 0.174, 0.038), 0.010, 0.008, mats["cyan_glow"], verts=64)

    # 6. DUAL MAGNETIC INDUCTION RINGS (Polished Metal Collars + Cyan Plasma Glow)
    add_cyl("Induction_Ring_Front_Glow", (0, 0.150, 0.038), 0.0188, 0.007, mats["cyan_glow"], verts=64)
    add_cyl("Induction_Ring_Front_Collar", (0, 0.150, 0.038), 0.0195, 0.002, mats["chassis_chrome"], verts=64)
    add_cyl("Induction_Ring_Rear_Glow", (0, 0.122, 0.038), 0.0188, 0.007, mats["cyan_glow"], verts=64)
    add_cyl("Induction_Ring_Rear_Collar", (0, 0.122, 0.038), 0.0195, 0.002, mats["chassis_chrome"], verts=64)

    # 7. SCULPTED ERGONOMIC COMBAT GRIP
    build_curved_ergonomic_grip(col, mats, gun_root)

    # 8. FRAME CONTROLS & COMPETITION FLAT TRIGGER
    # Lower Frame Spine
    add_box("Frame_Lower_Spine", (0, -0.008, 0.012), (0.036, 0.175, 0.024), mats["chassis_accent"], bevel_w=0.002)
    # Skeletonized Flat-Face Competition Trigger
    add_box("Trigger_Flat_Shoe", (0, -0.006, -0.010), (0.006, 0.012, 0.022), mats["chassis_dark"], bevel_w=0.0008, rot=(math.radians(-22), 0, 0))
    add_box("Trigger_Safety_Blade", (0, -0.003, -0.010), (0.002, 0.006, 0.018), mats["safety_red"], bevel_w=0.0004, rot=(math.radians(-22), 0, 0))
    # Undercut Beveled Trigger Guard
    add_box("Trigger_Guard_Bottom", (0, 0.005, -0.032), (0.013, 0.068, 0.004), mats["chassis_dark"], bevel_w=0.0012)
    add_box("Trigger_Guard_Front", (0, 0.038, -0.014), (0.013, 0.004, 0.036), mats["chassis_dark"], bevel_w=0.0012)
    # Slide Release Catch Lever (Left Side)
    add_box("Control_Slide_Release", (0.019, -0.005, 0.026), (0.003, 0.018, 0.006), mats["chassis_chrome"], bevel_w=0.0006)
    # Takedown Lever (Left Side)
    add_box("Control_Takedown_Lever", (0.019, 0.035, 0.024), (0.003, 0.012, 0.007), mats["chassis_dark"], bevel_w=0.0006)
    # Magazine Release Button (Tactile Checked)
    add_box("Control_Mag_Release", (0.019, -0.012, -0.015), (0.003, 0.009, 0.009), mats["chassis_chrome"], bevel_w=0.0006)
    # Ambidextrous Safety Selector Switch (SEMI / BURST / FULL)
    for s_side in [1, -1]:
        add_box(f"Control_Safety_Lever_{'L' if s_side > 0 else 'R'}", (s_side * 0.019, -0.045, 0.025), (0.003, 0.016, 0.006), mats["chassis_dark"], bevel_w=0.0006, rot=(math.radians(15), 0, 0))
        # Selector indicator dots (White & Red)
        add_cyl(f"Safety_Indicator_White_{'L' if s_side > 0 else 'R'}", (s_side * 0.0205, -0.048, 0.030), 0.0012, 0.001, mats["chassis_chrome"], rot=(0, math.radians(90), 0))
        add_cyl(f"Safety_Indicator_Red_{'L' if s_side > 0 else 'R'}", (s_side * 0.0205, -0.042, 0.030), 0.0012, 0.001, mats["safety_red"], rot=(0, math.radians(90), 0))

    # 9. REMOVABLE ZERO-POINT POWER CELL & EXTENDED COMPETITION MAGWELL
    mag_rot = (math.radians(-14), 0, 0)
    add_box("Magwell_Competition_Funnel", (0, -0.064, -0.112), (0.042, 0.060, 0.012), mats["chassis_dark"], bevel_w=0.002, rot=mag_rot)
    add_box("PowerCell_Baseplate", (0, -0.068, -0.126), (0.036, 0.052, 0.018), mats["chassis_accent"], bevel_w=0.0025, rot=mag_rot)
    # Lanyard Loop Hole
    add_cyl("PowerCell_Lanyard_Pin", (0, -0.076, -0.130), 0.002, 0.015, mats["chassis_chrome"], rot=(0, math.radians(90), 0))
    # 4-Stage Cyan LED Power Status Gauge
    for b in range(4):
        z_led = -0.120 - (b * 0.004)
        add_box(f"PowerCell_LED_Gauge_{b+1}", (0.0185, -0.068, z_led), (0.0015, 0.022, 0.0025), mats["cyan_glow"], bevel_w=0.0004, rot=mag_rot)

    # 10. REAR HEAT RADIATOR ARRAY & ZERO-POINT INTERNAL CORE
    # 7 Precision Heat Radiator Fins
    for f in range(7):
        y_fin = -0.060 - (f * 0.0075)
        add_box(f"Radiator_Fin_{f+1}", (0, y_fin, 0.042), (0.045, 0.0020, 0.046), mats["heat_radiator"], bevel_w=0.0006)
    # Internal Zero-Point Heat Core (visible through the radiator slits)
    add_box("Internal_Heat_Core_Cell", (0, -0.082, 0.042), (0.030, 0.048, 0.030), mats["cyan_glow"], bevel_w=0.0015)

    # 11. DUAL LONGITUDINAL PLASMA POWER CONDUITS
    add_box("Power_Conduit_L", (0.0225, 0.014, 0.034), (0.0035, 0.165, 0.007), mats["cyan_glow"], bevel_w=0.0008)
    add_box("Power_Conduit_R", (-0.0225, 0.014, 0.034), (0.0035, 0.165, 0.007), mats["cyan_glow"], bevel_w=0.0008)
    # Conduit Retention Clips
    for cl in range(3):
        y_cl = -0.020 + (cl * 0.055)
        add_box(f"Conduit_Clip_L_{cl+1}", (0.0235, y_cl, 0.034), (0.002, 0.006, 0.010), mats["chassis_accent"], bevel_w=0.0004)
        add_box(f"Conduit_Clip_R_{cl+1}", (-0.0235, y_cl, 0.034), (0.002, 0.006, 0.010), mats["chassis_accent"], bevel_w=0.0004)

    # Set smooth shading
    for child in gun_root.children_recursive:
        if child.type == 'MESH':
            for poly in child.data.polygons:
                poly.use_smooth = True

    print(f"[OK] AAA High-Poly Hero NOVA Arc-Pistol constructed ({len(gun_root.children_recursive)} parts).")
    return gun_root

def setup_studio_environment(col):
    cam_persp_data = bpy.data.cameras.new("Cam_Perspective_Hero")
    cam_persp_data.lens = 70
    cam_persp = bpy.data.objects.new("Cam_Perspective_Hero", cam_persp_data)
    cam_persp.location = (0.32, 0.30, 0.20)
    cam_persp.rotation_euler = (math.radians(65), 0, math.radians(132))
    col.objects.link(cam_persp)
    bpy.context.scene.camera = cam_persp

    # Key Light (Warm Key)
    light_key_data = bpy.data.lights.new("Light_Key", type='AREA')
    light_key_data.energy = 95.0
    light_key_data.size = 0.5
    light_key = bpy.data.objects.new("Light_Key", light_key_data)
    light_key.location = (0.4, 0.4, 0.45)
    light_key.rotation_euler = (math.radians(45), 0, math.radians(135))
    col.objects.link(light_key)

    # Cyan Accent Rim Light
    light_rim_data = bpy.data.lights.new("Light_Rim", type='SPOT')
    light_rim_data.energy = 160.0
    light_rim_data.color = (0.08, 0.90, 1.0)
    light_rim = bpy.data.objects.new("Light_Rim", light_rim_data)
    light_rim.location = (-0.45, -0.45, 0.28)
    light_rim.rotation_euler = (math.radians(60), 0, math.radians(-45))
    col.objects.link(light_rim)

    # Soft Fill Light
    light_fill_data = bpy.data.lights.new("Light_Fill", type='AREA')
    light_fill_data.energy = 30.0
    light_fill_data.size = 0.8
    light_fill = bpy.data.objects.new("Light_Fill", light_fill_data)
    light_fill.location = (-0.3, 0.3, -0.05)
    light_fill.rotation_euler = (math.radians(-30), 0, math.radians(120))
    col.objects.link(light_fill)

    # Dark Studio Shadow Plane
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, -0.15))
    floor = bpy.context.active_object
    floor.name = "Studio_Shadow_Floor"
    mat_floor = bpy.data.materials.new(name="Mat_Floor")
    mat_floor.use_nodes = True
    bsdf = mat_floor.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.03, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.4
    floor.data.materials.append(mat_floor)
    col.objects.link(floor)
    bpy.context.scene.collection.objects.unlink(floor)

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
    print(f"[OK] Exported AAA Hero GLB: {GLB_OUT_PATH}")

    import shutil
    shutil.copyfile(GLB_OUT_PATH, PUBLIC_GLB_OUT_PATH)
    print(f"[OK] Copied GLB to: {PUBLIC_GLB_OUT_PATH}")

def render_preview_image(output_path):
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 95
    bpy.ops.render.render(write_still=True)
    print(f"[OK] Rendered 1080p Hero 3D preview: {output_path}")

def main():
    clear_scene()
    master_col = bpy.data.collections.new("NOVA_FPS_WEAPON")
    bpy.context.scene.collection.children.link(master_col)

    mats = setup_materials()
    build_high_poly_hero_weapon(master_col, mats)
    setup_studio_environment(master_col)

    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"[OK] Saved Blender master workspace: {BLEND_OUT_PATH}")

    export_glb()
    render_preview_image(PREVIEW_OUT_PATH)

if __name__ == "__main__":
    main()
