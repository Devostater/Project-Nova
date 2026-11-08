"""
Blender 5.2+ Cantina Patron Character Generator
Project Nova - Station Nova-1 Cantina
Asset 16: Cantina Patron (cantina_16_cantina_patron)

Strictly reconstructed from: art_src/cantina/cantina_16_cantina_patron_3d_source.png
- Full-body human frontier pilot matching the seated figure in the cantina concept booth
- Neutral A-pose with separated arms, hands, fingers, and legs for 3D reconstruction / animation
- Practical flight suit with segmented ballistic vest, padded shoulder guards, and flight collar
- Tactical utility belt with ammo pouches, drop-leg harness, and holstered sidearm pistol
- Forearm gauntlets with glowing cyan comms status display on wrist
- Articulated flight gloves with separated fingers
- Armored kneepads on flight trousers and heavy station deck flight boots
- Weathered mature human pilot head with cropped dark hair
- Standing flat at floor Z = 0.0000m, real-world height ~1.82m
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_16_cantina_patron.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_16_cantina_patron.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_16_cantina_patron.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_16_cantina_patron_preview.png")

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

    mats["Patron_Skin"] = make_pbr("Patron_Skin", (0.74, 0.54, 0.44), 0.02, 0.60)
    mats["Patron_Hair"] = make_pbr("Patron_Hair", (0.07, 0.06, 0.05), 0.04, 0.85)
    mats["Patron_FlightSuit"] = make_pbr("Patron_FlightSuit", (0.07, 0.08, 0.10), 0.05, 0.70)
    mats["Patron_PaddedVest"] = make_pbr("Patron_PaddedVest", (0.13, 0.15, 0.10), 0.06, 0.62)
    mats["Patron_ArmorPlates"] = make_pbr("Patron_ArmorPlates", (0.05, 0.055, 0.065), 0.85, 0.32)
    mats["Patron_LeatherBrown"] = make_pbr("Patron_LeatherBrown", (0.15, 0.09, 0.05), 0.04, 0.52)
    mats["Patron_Gunmetal"] = make_pbr("Patron_Gunmetal", (0.08, 0.09, 0.11), 0.92, 0.22)
    mats["Patron_GauntletCyan"] = make_pbr("Patron_GauntletCyan", (0.08, 0.92, 1.0), 0.10, 0.12,
                                          emission=(0.08, 0.92, 1.0), emission_strength=5.5)

    return mats

def build_head_and_neck(col, mats, parent):
    """Head, facial features, hair, and neck."""
    bm_head = bmesh.new()
    bm_hair = bmesh.new()

    # 1. Neck
    bmesh.ops.create_cone(
        bm_head,
        cap_ends=True,
        cap_tris=False,
        segments=16,
        radius1=0.062,
        radius2=0.058,
        depth=0.12,
        matrix=Matrix.Translation((0, -0.01, 1.54))
    )

    # 2. Cranium & Face
    # Main cranium (egg shape)
    bmesh.ops.create_uvsphere(
        bm_head,
        u_segments=20,
        v_segments=16,
        radius=0.105,
        matrix=Matrix.Translation((0, -0.01, 1.68)) @ Matrix.Scale(1.22, 4, Vector((0, 0, 1))) @ Matrix.Scale(1.10, 4, Vector((0, 1, 0)))
    )

    # Jaw and chin block
    bmesh.ops.create_cube(
        bm_head,
        size=1.0,
        matrix=Matrix.Translation((0, 0.045, 1.60)) @
               Matrix.Scale(0.11, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.12, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.08, 4, Vector((0, 0, 1)))
    )

    # Nose ridge
    bmesh.ops.create_cone(
        bm_head,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=0.014,
        radius2=0.005,
        depth=0.045,
        matrix=Matrix.Translation((0, 0.105, 1.67)) @ Matrix.Rotation(math.radians(-30), 4, 'X')
    )

    # Brow ridge
    bmesh.ops.create_cube(
        bm_head,
        size=1.0,
        matrix=Matrix.Translation((0, 0.082, 1.71)) @
               Matrix.Scale(0.13, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.025, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.020, 4, Vector((0, 0, 1)))
    )

    # Ears (left and right)
    for ex in (-0.098, 0.098):
        bmesh.ops.create_cube(
            bm_head,
            size=1.0,
            matrix=Matrix.Translation((ex, -0.01, 1.67)) @
                   Matrix.Scale(0.016, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.026, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.048, 4, Vector((0, 0, 1)))
        )

    # 3. Cropped Hair
    bmesh.ops.create_uvsphere(
        bm_hair,
        u_segments=20,
        v_segments=14,
        radius=0.112,
        matrix=Matrix.Translation((0, -0.015, 1.71)) @ Matrix.Scale(1.15, 4, Vector((0, 0, 1))) @ Matrix.Scale(1.10, 4, Vector((0, 1, 0)))
    )

    mesh_head = bpy.data.meshes.new("Patron_Head")
    bm_head.to_mesh(mesh_head)
    bm_head.free()
    obj_head = bpy.data.objects.new("Patron_Head", mesh_head)
    obj_head.parent = parent
    obj_head.data.materials.append(mats["Patron_Skin"])
    col.objects.link(obj_head)

    sub_head = obj_head.modifiers.new(name="Subsurf", type='SUBSURF')
    sub_head.levels = 1
    sub_head.render_levels = 1

    mesh_hair = bpy.data.meshes.new("Patron_Hair")
    bm_hair.to_mesh(mesh_hair)
    bm_hair.free()
    obj_hair = bpy.data.objects.new("Patron_Hair", mesh_hair)
    obj_hair.parent = parent
    obj_hair.data.materials.append(mats["Patron_Hair"])
    col.objects.link(obj_hair)

def build_torso_and_vest(col, mats, parent):
    """Inner flight suit torso and outer tactical padded vest."""
    bm_suit = bmesh.new()
    bm_vest = bmesh.new()
    bm_hw = bmesh.new()

    # 1. Inner flight suit torso (from neck base Z=1.48 to waist Z=1.02)
    bmesh.ops.create_cube(
        bm_suit,
        size=1.0,
        matrix=Matrix.Translation((0, -0.005, 1.25)) @
               Matrix.Scale(0.38, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.22, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.46, 4, Vector((0, 0, 1)))
    )

    # 2. Padded Tactical Vest (Outer military layer)
    # Main chest and back armor wrap
    bmesh.ops.create_cube(
        bm_vest,
        size=1.0,
        matrix=Matrix.Translation((0, -0.005, 1.27)) @
               Matrix.Scale(0.42, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.25, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.42, 4, Vector((0, 0, 1)))
    )

    # High padded collar
    bmesh.ops.create_cone(
        bm_vest,
        cap_ends=True,
        cap_tris=False,
        segments=16,
        radius1=0.095,
        radius2=0.085,
        depth=0.08,
        matrix=Matrix.Translation((0, -0.01, 1.49))
    )

    # Segmented quilted armor plates on chest
    for pz in (1.35, 1.25, 1.15):
        # Left & Right chest pads
        for px in (-0.11, 0.11):
            bmesh.ops.create_cube(
                bm_vest,
                size=1.0,
                matrix=Matrix.Translation((px, 0.125, pz)) @
                       Matrix.Scale(0.16, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.018, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.085, 4, Vector((0, 0, 1)))
            )

    # Center vest zipper / storm flap
    bmesh.ops.create_cube(
        bm_hw,
        size=1.0,
        matrix=Matrix.Translation((0, 0.13, 1.26)) @
               Matrix.Scale(0.035, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.015, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.40, 4, Vector((0, 0, 1)))
    )

    # Shoulder armor caps / epaulets
    for sx in (-0.23, 0.23):
        bmesh.ops.create_cube(
            bm_vest,
            size=1.0,
            matrix=Matrix.Translation((sx, 0, 1.44)) @
                   Matrix.Rotation(math.radians(20 if sx < 0 else -20), 4, 'Y') @
                   Matrix.Scale(0.08, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.18, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.04, 4, Vector((0, 0, 1)))
        )

    mesh_suit = bpy.data.meshes.new("Patron_TorsoSuit")
    bm_suit.to_mesh(mesh_suit)
    bm_suit.free()
    obj_suit = bpy.data.objects.new("Patron_TorsoSuit", mesh_suit)
    obj_suit.parent = parent
    obj_suit.data.materials.append(mats["Patron_FlightSuit"])
    col.objects.link(obj_suit)

    bev_suit = obj_suit.modifiers.new(name="Bevel", type='BEVEL')
    bev_suit.width = 0.04
    bev_suit.segments = 3

    mesh_vest = bpy.data.meshes.new("Patron_TacticalVest")
    bm_vest.to_mesh(mesh_vest)
    bm_vest.free()
    obj_vest = bpy.data.objects.new("Patron_TacticalVest", mesh_vest)
    obj_vest.parent = parent
    obj_vest.data.materials.append(mats["Patron_PaddedVest"])
    col.objects.link(obj_vest)

    bev_vest = obj_vest.modifiers.new(name="Bevel", type='BEVEL')
    bev_vest.width = 0.02
    bev_vest.segments = 3

    mesh_hw = bpy.data.meshes.new("Patron_VestHardware")
    bm_hw.to_mesh(mesh_hw)
    bm_hw.free()
    obj_hw = bpy.data.objects.new("Patron_VestHardware", mesh_hw)
    obj_hw.parent = parent
    obj_hw.data.materials.append(mats["Patron_Gunmetal"])
    col.objects.link(obj_hw)

def build_utility_belt_and_holster(col, mats, parent):
    """Utility belt, pouches, thigh harness, and holstered sidearm."""
    bm_belt = bmesh.new()
    bm_hw = bmesh.new()
    bm_gun = bmesh.new()

    # 1. Main belt ring at waist (Z = 1.04)
    bmesh.ops.create_cube(
        bm_belt,
        size=1.0,
        matrix=Matrix.Translation((0, 0, 1.04)) @
               Matrix.Scale(0.39, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.24, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.065, 4, Vector((0, 0, 1)))
    )

    # Belt buckle
    bmesh.ops.create_cube(
        bm_hw,
        size=1.0,
        matrix=Matrix.Translation((0, 0.125, 1.04)) @
               Matrix.Scale(0.08, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.025, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.075, 4, Vector((0, 0, 1)))
    )

    # Belt utility pouches (left side and back)
    pouch_positions = [
        (-0.16, 0.10, 1.04),
        (-0.19, -0.02, 1.04),
        (-0.16, -0.11, 1.04),
        (0.0, -0.125, 1.04),
        (0.15, -0.11, 1.04)
    ]
    for px, py, pz in pouch_positions:
        bmesh.ops.create_cube(
            bm_belt,
            size=1.0,
            matrix=Matrix.Translation((px, py, pz)) @
                   Matrix.Scale(0.065, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.045, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.075, 4, Vector((0, 0, 1)))
        )

    # 2. Right Thigh Drop Holster & Harness
    # Drop strap down right thigh
    bmesh.ops.create_cube(
        bm_belt,
        size=1.0,
        matrix=Matrix.Translation((0.20, 0.02, 0.94)) @
               Matrix.Scale(0.035, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.008, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.16, 4, Vector((0, 0, 1)))
    )
    # Thigh wrap strap
    bmesh.ops.create_cube(
        bm_belt,
        size=1.0,
        matrix=Matrix.Translation((0.15, 0.0, 0.84)) @
               Matrix.Scale(0.20, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.18, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.035, 4, Vector((0, 0, 1)))
    )
    # Holster bucket
    bmesh.ops.create_cube(
        bm_belt,
        size=1.0,
        matrix=Matrix.Translation((0.23, 0.02, 0.80)) @
               Matrix.Rotation(math.radians(-6), 4, 'Y') @
               Matrix.Scale(0.07, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.09, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.18, 4, Vector((0, 0, 1)))
    )

    # 3. Holstered Sidearm Pistol (Grip, slide, hammer visible in holster)
    # Pistol grip protruding upward
    bmesh.ops.create_cube(
        bm_gun,
        size=1.0,
        matrix=Matrix.Translation((0.22, 0.01, 0.90)) @
               Matrix.Rotation(math.radians(-20), 4, 'Y') @
               Matrix.Rotation(math.radians(15), 4, 'X') @
               Matrix.Scale(0.032, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.045, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.10, 4, Vector((0, 0, 1)))
    )
    # Pistol slide top
    bmesh.ops.create_cube(
        bm_gun,
        size=1.0,
        matrix=Matrix.Translation((0.23, 0.02, 0.88)) @
               Matrix.Scale(0.035, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.12, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.038, 4, Vector((0, 0, 1)))
    )

    mesh_belt = bpy.data.meshes.new("Patron_UtilityBelt")
    bm_belt.to_mesh(mesh_belt)
    bm_belt.free()
    obj_belt = bpy.data.objects.new("Patron_UtilityBelt", mesh_belt)
    obj_belt.parent = parent
    obj_belt.data.materials.append(mats["Patron_LeatherBrown"])
    col.objects.link(obj_belt)

    mesh_hw = bpy.data.meshes.new("Patron_BeltHardware")
    bm_hw.to_mesh(mesh_hw)
    bm_hw.free()
    obj_hw = bpy.data.objects.new("Patron_BeltHardware", mesh_hw)
    obj_hw.parent = parent
    obj_hw.data.materials.append(mats["Patron_Gunmetal"])
    col.objects.link(obj_hw)

    mesh_gun = bpy.data.meshes.new("Patron_Sidearm")
    bm_gun.to_mesh(mesh_gun)
    bm_gun.free()
    obj_gun = bpy.data.objects.new("Patron_Sidearm", mesh_gun)
    obj_gun.parent = parent
    obj_gun.data.materials.append(mats["Patron_Gunmetal"])
    col.objects.link(obj_gun)

def build_arms_and_hands(col, mats, parent):
    """Arms in neutral A-pose (~32 deg angle), gloves with separated fingers, wrist comms display."""
    bm_arms = bmesh.new()
    bm_gloves = bmesh.new()
    bm_gaunt = bmesh.new()
    bm_led = bmesh.new()

    for side in (-1, 1):  # -1 = Left, 1 = Right
        # Upper Arm: starts at shoulder (side * 0.23, 0, 1.42) angled down/out
        arm_angle = side * math.radians(-32)
        sh_x = side * 0.23
        el_x = side * 0.36
        el_z = 1.18

        # Upper arm cylinder
        bmesh.ops.create_cone(
            bm_arms,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.065,
            radius2=0.055,
            depth=0.28,
            matrix=Matrix.Translation(((sh_x + el_x)/2, 0, (1.42 + el_z)/2)) @
                   Matrix.Rotation(arm_angle, 4, 'Y')
        )

        # Elbow pad armor
        bmesh.ops.create_cube(
            bm_gaunt,
            size=1.0,
            matrix=Matrix.Translation((el_x, -0.03, el_z)) @
                   Matrix.Rotation(arm_angle, 4, 'Y') @
                   Matrix.Scale(0.07, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.07, 4, Vector((0, 0, 1)))
        )

        # Forearm: starts at elbow (el_x, 0, el_z) down to wrist (wr_x, 0, wr_z)
        wr_x = side * 0.48
        wr_z = 0.94

        bmesh.ops.create_cone(
            bm_arms,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.052,
            radius2=0.044,
            depth=0.26,
            matrix=Matrix.Translation(((el_x + wr_x)/2, 0, (el_z + wr_z)/2)) @
                   Matrix.Rotation(arm_angle, 4, 'Y')
        )

        # Tactical Gauntlet on forearm
        bmesh.ops.create_cone(
            bm_gaunt,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.058,
            radius2=0.048,
            depth=0.16,
            matrix=Matrix.Translation(((el_x + wr_x)/2 + side * 0.02, 0, (el_z + wr_z)/2 - 0.02)) @
                   Matrix.Rotation(arm_angle, 4, 'Y')
        )

        # Left wrist has glowing cyan comms datapad display!
        if side == -1:
            bmesh.ops.create_cube(
                bm_led,
                size=1.0,
                matrix=Matrix.Translation((wr_x + 0.015, 0.04, wr_z + 0.03)) @
                       Matrix.Rotation(arm_angle, 4, 'Y') @
                       Matrix.Scale(0.038, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.010, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.065, 4, Vector((0, 0, 1)))
            )

        # Flight Glove & Palm
        palm_x = wr_x + side * 0.04
        palm_z = wr_z - 0.07
        bmesh.ops.create_cube(
            bm_gloves,
            size=1.0,
            matrix=Matrix.Translation((palm_x, 0, palm_z)) @
                   Matrix.Rotation(arm_angle, 4, 'Y') @
                   Matrix.Scale(0.035, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.085, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.09, 4, Vector((0, 0, 1)))
        )

        # Separated fingers in relaxed A-pose (thumb + 4 fingers)
        # Thumb pointing slightly forward and down
        bmesh.ops.create_cube(
            bm_gloves,
            size=1.0,
            matrix=Matrix.Translation((palm_x - side * 0.015, 0.045, palm_z + 0.01)) @
                   Matrix.Rotation(arm_angle, 4, 'Y') @
                   Matrix.Rotation(math.radians(-30), 4, 'X') @
                   Matrix.Scale(0.016, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.045, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.016, 4, Vector((0, 0, 1)))
        )

        # 4 Fingers spread apart
        for fi, fy in enumerate((-0.03, -0.01, 0.01, 0.03)):
            f_len = 0.065 - abs(fi - 1.5) * 0.006
            bmesh.ops.create_cube(
                bm_gloves,
                size=1.0,
                matrix=Matrix.Translation((palm_x + side * 0.01, fy, palm_z - 0.06)) @
                       Matrix.Rotation(arm_angle, 4, 'Y') @
                       Matrix.Scale(0.014, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.016, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(f_len, 4, Vector((0, 0, 1)))
            )

    mesh_arms = bpy.data.meshes.new("Patron_ArmsSuit")
    bm_arms.to_mesh(mesh_arms)
    bm_arms.free()
    obj_arms = bpy.data.objects.new("Patron_ArmsSuit", mesh_arms)
    obj_arms.parent = parent
    obj_arms.data.materials.append(mats["Patron_FlightSuit"])
    col.objects.link(obj_arms)

    mesh_gloves = bpy.data.meshes.new("Patron_FlightGloves")
    bm_gloves.to_mesh(mesh_gloves)
    bm_gloves.free()
    obj_gloves = bpy.data.objects.new("Patron_FlightGloves", mesh_gloves)
    obj_gloves.parent = parent
    obj_gloves.data.materials.append(mats["Patron_LeatherBrown"])
    col.objects.link(obj_gloves)

    mesh_gaunt = bpy.data.meshes.new("Patron_Gauntlets")
    bm_gaunt.to_mesh(mesh_gaunt)
    bm_gaunt.free()
    obj_gaunt = bpy.data.objects.new("Patron_Gauntlets", mesh_gaunt)
    obj_gaunt.parent = parent
    obj_gaunt.data.materials.append(mats["Patron_ArmorPlates"])
    col.objects.link(obj_gaunt)

    mesh_led = bpy.data.meshes.new("Patron_WristCommsLED")
    bm_led.to_mesh(mesh_led)
    bm_led.free()
    obj_led = bpy.data.objects.new("Patron_WristCommsLED", mesh_led)
    obj_led.parent = parent
    obj_led.data.materials.append(mats["Patron_GauntletCyan"])
    col.objects.link(obj_led)

def build_legs_and_boots(col, mats, parent):
    """Trousers, kneepads, and heavy station flight boots resting at Z = 0."""
    bm_legs = bmesh.new()
    bm_armor = bmesh.new()
    bm_boots = bmesh.new()

    # Stance width: legs at X = ±0.135
    for side in (-1, 1):
        leg_x = side * 0.135

        # 1. Thigh (Z = 1.02 down to knee Z = 0.54)
        bmesh.ops.create_cone(
            bm_legs,
            cap_ends=True,
            cap_tris=False,
            segments=14,
            radius1=0.105,
            radius2=0.082,
            depth=0.46,
            matrix=Matrix.Translation((leg_x, 0, 0.77))
        )

        # 2. Hard-shell kneepad armor on front of knee (Z = 0.52)
        bmesh.ops.create_cube(
            bm_armor,
            size=1.0,
            matrix=Matrix.Translation((leg_x, 0.085, 0.52)) @
                   Matrix.Scale(0.12, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.13, 4, Vector((0, 0, 1)))
        )

        # 3. Calf / Shin (Z = 0.52 down to ankle Z = 0.22)
        bmesh.ops.create_cone(
            bm_legs,
            cap_ends=True,
            cap_tris=False,
            segments=14,
            radius1=0.080,
            radius2=0.068,
            depth=0.32,
            matrix=Matrix.Translation((leg_x, 0, 0.36))
        )

        # Shin guard plate
        bmesh.ops.create_cube(
            bm_armor,
            size=1.0,
            matrix=Matrix.Translation((leg_x, 0.068, 0.32)) @
                   Matrix.Scale(0.09, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.025, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.20, 4, Vector((0, 0, 1)))
        )

        # 4. Flight Boot (Shaft, heel, reinforced toe, tread sole resting at Z = 0.000)
        # Boot shaft wrapping shin/ankle
        bmesh.ops.create_cone(
            bm_boots,
            cap_ends=True,
            cap_tris=False,
            segments=14,
            radius1=0.075,
            radius2=0.072,
            depth=0.20,
            matrix=Matrix.Translation((leg_x, 0, 0.18))
        )

        # Boot foot body (extended forward)
        bmesh.ops.create_cube(
            bm_boots,
            size=1.0,
            matrix=Matrix.Translation((leg_x, 0.045, 0.055)) @
                   Matrix.Scale(0.115, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.26, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.09, 4, Vector((0, 0, 1)))
        )

        # Steel toe cap armor
        bmesh.ops.create_cube(
            bm_armor,
            size=1.0,
            matrix=Matrix.Translation((leg_x, 0.14, 0.055)) @
                   Matrix.Scale(0.118, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.08, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.095, 4, Vector((0, 0, 1)))
        )

        # Lugged Rubber Sole resting flush at Z = 0.000
        # Sole base: Z from 0.000 to 0.024
        bmesh.ops.create_cube(
            bm_boots,
            size=1.0,
            matrix=Matrix.Translation((leg_x, 0.045, 0.012)) @
                   Matrix.Scale(0.125, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.28, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.024, 4, Vector((0, 0, 1)))
        )

        # Heel lift block
        bmesh.ops.create_cube(
            bm_boots,
            size=1.0,
            matrix=Matrix.Translation((leg_x, -0.055, 0.020)) @
                   Matrix.Scale(0.122, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.09, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.024, 4, Vector((0, 0, 1)))
        )

    # Pelvis / Crotch joining thighs at waist (Z = 1.02)
    bmesh.ops.create_cube(
        bm_legs,
        size=1.0,
        matrix=Matrix.Translation((0, 0, 0.98)) @
               Matrix.Scale(0.34, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.22, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.12, 4, Vector((0, 0, 1)))
    )

    mesh_legs = bpy.data.meshes.new("Patron_Trousers")
    bm_legs.to_mesh(mesh_legs)
    bm_legs.free()
    obj_legs = bpy.data.objects.new("Patron_Trousers", mesh_legs)
    obj_legs.parent = parent
    obj_legs.data.materials.append(mats["Patron_FlightSuit"])
    col.objects.link(obj_legs)

    bev_legs = obj_legs.modifiers.new(name="Bevel", type='BEVEL')
    bev_legs.width = 0.03
    bev_legs.segments = 2

    mesh_armor = bpy.data.meshes.new("Patron_LegArmor")
    bm_armor.to_mesh(mesh_armor)
    bm_armor.free()
    obj_armor = bpy.data.objects.new("Patron_LegArmor", mesh_armor)
    obj_armor.parent = parent
    obj_armor.data.materials.append(mats["Patron_ArmorPlates"])
    col.objects.link(obj_armor)

    bev_arm = obj_armor.modifiers.new(name="Bevel", type='BEVEL')
    bev_arm.width = 0.012
    bev_arm.segments = 2

    mesh_boots = bpy.data.meshes.new("Patron_FlightBoots")
    bm_boots.to_mesh(mesh_boots)
    bm_boots.free()
    obj_boots = bpy.data.objects.new("Patron_FlightBoots", mesh_boots)
    obj_boots.parent = parent
    obj_boots.data.materials.append(mats["Patron_LeatherBrown"])
    col.objects.link(obj_boots)

    bev_boot = obj_boots.modifiers.new(name="Bevel", type='BEVEL')
    bev_boot.width = 0.015
    bev_boot.segments = 2

def setup_studio_environment(col):
    """Studio lighting and camera centered on the full-body pilot."""
    world = bpy.data.worlds.new("Studio_World")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    # Key light
    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 85.0
    key_data.size = 1.8
    key_data.color = (1.0, 0.96, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.6, -1.8, 2.2)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    # Fill light
    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 38.0
    fill_data.size = 2.0
    fill_data.color = (0.65, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.8, -1.2, 1.6)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    # Rim light
    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 65.0
    rim_data.size = 1.4
    rim_data.color = (0.75, 0.92, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.8, 2.0)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    # Camera - Front 3/4 full-body framing (65mm lens)
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 65.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 3.6
    cam_pitch = math.radians(12)
    cam_yaw = math.radians(-30)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.95 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))

    target = Vector((0.0, 0.0, 0.95))
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
    root = bpy.data.objects.get("CantinaPatron_Root")
    if not root:
        print("[ERROR] CantinaPatron_Root not found for export!")
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
        print(f"  • {mat.name:28s} | Metallic: {met_str:4s} | Rough: {rou_str:4s} | Emissive: {em_str}")

    print(f"\nGeometry & Physical Metrics:")
    print(f"  • Total Polygon Count:   {total_tris:,} triangles")
    print(f"  • Dimensions:           {dim_x:.3f}m (W) × {dim_y:.3f}m (D) × {dim_z:.3f}m (H)")
    print(f"  • Base Contact:         Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.005 else 'FAIL'}]")
    print(f"  • Pilot Height:         Z = {max_z:.4f}m [{'PASS: Target ~1.82m' if abs(max_z - 1.82) < 0.06 else 'CHECK'}]")
    print(f"  • Arm Span (A-Pose):    ~{dim_x:.3f}m [{'PASS: Target ~1.05m' if 0.95 <= dim_x <= 1.20 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_PATRON")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("CantinaPatron_Root", None)
    col.objects.link(root)

    # Build character components
    build_head_and_neck(col, mats, root)
    build_torso_and_vest(col, mats, root)
    build_utility_belt_and_holster(col, mats, root)
    build_arms_and_hands(col, mats, root)
    build_legs_and_boots(col, mats, root)

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
