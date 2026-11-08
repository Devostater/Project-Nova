"""
Blender 5.2+ Pilot Duffel Bag Generator
Project Nova - Station Nova-1 Cantina
Asset 13: Pilot Duffel Bag (cantina_13_pilot_duffel)

Strictly reconstructed from: art_src/cantina/cantina_13_pilot_duffel_3d_source.png
- Rugged military / flight-crew duffel bag resting on the cantina deck
- Dark olive technical Cordura fabric body with reinforced ballistic panels
- Molded rubber corner reinforcements and protective bottom skid runners
- Twin heavy-duty nylon webbing harness straps wrapping the body
- Dual top carry handles with padded hook-and-loop coupler wrap
- Padded shoulder strap secured against the bag with gunmetal swivel snap hooks and D-rings
- Front utility cargo pouch with blank anodized identification plate (no readable text)
- End-cap utility pouches with covered zipper tracks
- Subtle cyan electronic tracker tag accent
- Base resting flush at Z = 0.0000m
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_13_pilot_duffel.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_13_pilot_duffel.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_13_pilot_duffel.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_13_pilot_duffel_preview.png")

# Dimensions (in meters)
BAG_LEN = 0.62    # Length along X
BAG_WIDTH = 0.32  # Depth along Y
BAG_HEIGHT = 0.28 # Height along Z (body top ~ 0.28, handles reach ~ 0.38)

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

    mats["Duffel_OliveFabric"] = make_pbr("Duffel_OliveFabric", (0.12, 0.145, 0.085), 0.03, 0.78)
    mats["Duffel_ReinforcedBlack"] = make_pbr("Duffel_ReinforcedBlack", (0.035, 0.038, 0.042), 0.08, 0.65)
    mats["Duffel_WebbingStraps"] = make_pbr("Duffel_WebbingStraps", (0.055, 0.065, 0.050), 0.05, 0.60)
    mats["Duffel_GunmetalHardware"] = make_pbr("Duffel_GunmetalHardware", (0.08, 0.10, 0.12), 0.90, 0.25)
    mats["Duffel_BrassZippers"] = make_pbr("Duffel_BrassZippers", (0.42, 0.38, 0.26), 0.85, 0.35)
    mats["Duffel_CyanAccent"] = make_pbr("Duffel_CyanAccent", (0.08, 0.92, 1.0), 0.10, 0.12,
                                         emission=(0.08, 0.92, 1.0), emission_strength=5.0)

    return mats

def build_duffel_body(col, mats, parent):
    """Main duffel bag body with rounded rectangular barrel silhouette."""
    bm = bmesh.new()

    # Base body centered at (0, 0, BAG_HEIGHT/2 + 0.01)
    center_z = (BAG_HEIGHT - 0.015) / 2.0 + 0.015
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, center_z)) @
               Matrix.Scale(BAG_LEN - 0.06, 4, Vector((1, 0, 0))) @
               Matrix.Scale(BAG_WIDTH - 0.04, 4, Vector((0, 1, 0))) @
               Matrix.Scale(BAG_HEIGHT - 0.02, 4, Vector((0, 0, 1)))
    )

    mesh = bpy.data.meshes.new("Duffel_MainBody")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Duffel_MainBody", mesh)
    obj.parent = parent
    obj.data.materials.append(mats["Duffel_OliveFabric"])
    col.objects.link(obj)

    # Bevel to round off corners into a cushioned duffel shape
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.045
    bev.segments = 4
    bev.limit_method = 'NONE'

    sub = obj.modifiers.new(name="Subsurf", type='SUBSURF')
    sub.levels = 1
    sub.render_levels = 1

    # Main top zipper strip
    bm_zip = bmesh.new()
    bmesh.ops.create_cube(
        bm_zip,
        size=1.0,
        matrix=Matrix.Translation((0, 0, BAG_HEIGHT + 0.002)) @
               Matrix.Scale(BAG_LEN * 0.70, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.028, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.008, 4, Vector((0, 0, 1)))
    )
    # Double zipper sliders
    for zx in (-0.03, 0.03):
        bmesh.ops.create_cube(
            bm_zip,
            size=1.0,
            matrix=Matrix.Translation((zx, 0, BAG_HEIGHT + 0.008)) @
                   Matrix.Scale(0.018, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.016, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.010, 4, Vector((0, 0, 1)))
        )
    mesh_zip = bpy.data.meshes.new("Duffel_TopZipper")
    bm_zip.to_mesh(mesh_zip)
    bm_zip.free()

    obj_zip = bpy.data.objects.new("Duffel_TopZipper", mesh_zip)
    obj_zip.parent = parent
    obj_zip.data.materials.append(mats["Duffel_BrassZippers"])
    col.objects.link(obj_zip)

def build_bottom_and_corners(col, mats, parent):
    """Molded protective skid rails and corner wear patches."""
    bm = bmesh.new()

    # 1. Skid rails (runners) on bottom resting at Z = 0
    # Two longitudinal runners along X
    for ry in (-0.08, 0.08):
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((0, ry, 0.007)) @
                   Matrix.Scale(BAG_LEN * 0.75, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.014, 4, Vector((0, 0, 1)))
        )
        # Slat grooves on runners
        for sx in range(-5, 6):
            bmesh.ops.create_cube(
                bm,
                size=1.0,
                matrix=Matrix.Translation((sx * 0.04, ry, 0.014)) @
                       Matrix.Scale(0.012, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.036, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.004, 4, Vector((0, 0, 1)))
            )

    # 2. Four reinforced corner bumper patches
    cx_vals = (-BAG_LEN/2 + 0.035, BAG_LEN/2 - 0.035)
    cy_vals = (-BAG_WIDTH/2 + 0.03, BAG_WIDTH/2 - 0.03)
    for cx in cx_vals:
        for cy in cy_vals:
            bmesh.ops.create_cube(
                bm,
                size=1.0,
                matrix=Matrix.Translation((cx, cy, 0.045)) @
                       Matrix.Scale(0.07, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.07, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.07, 4, Vector((0, 0, 1)))
            )

    # 3. Base protective tray layer
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, 0.018)) @
               Matrix.Scale(BAG_LEN - 0.04, 4, Vector((1, 0, 0))) @
               Matrix.Scale(BAG_WIDTH - 0.02, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
    )

    mesh = bpy.data.meshes.new("Duffel_BaseReinforcements")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Duffel_BaseReinforcements", mesh)
    obj.parent = parent
    obj.data.materials.append(mats["Duffel_ReinforcedBlack"])
    col.objects.link(obj)

    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.008
    bev.segments = 2

def build_webbing_and_handles(col, mats, parent):
    """Twin vertical webbing harness straps wrapping around the bag with top carry handles."""
    bm_web = bmesh.new()
    bm_wrap = bmesh.new()

    strap_x = (-0.16, 0.16)
    strap_w = 0.045
    strap_thick = 0.006

    for sx in strap_x:
        # Front vertical strap (+Y)
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((sx, BAG_WIDTH/2 + 0.002, BAG_HEIGHT/2)) @
                   Matrix.Scale(strap_w, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(strap_thick, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(BAG_HEIGHT * 0.90, 4, Vector((0, 0, 1)))
        )
        # Back vertical strap (-Y)
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((sx, -BAG_WIDTH/2 - 0.002, BAG_HEIGHT/2)) @
                   Matrix.Scale(strap_w, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(strap_thick, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(BAG_HEIGHT * 0.90, 4, Vector((0, 0, 1)))
        )
        # Bottom connecting strap segment
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((sx, 0, 0.012)) @
                   Matrix.Scale(strap_w, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(BAG_WIDTH, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(strap_thick, 4, Vector((0, 0, 1)))
        )

        # Top arch handles rising from front & back straps to center top
        # Front handle leg
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((sx, 0.06, BAG_HEIGHT + 0.05)) @
                   Matrix.Rotation(math.radians(-25), 4, 'X') @
                   Matrix.Scale(strap_w * 0.9, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(strap_thick * 1.5, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.12, 4, Vector((0, 0, 1)))
        )
        # Back handle leg
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((sx, -0.06, BAG_HEIGHT + 0.05)) @
                   Matrix.Rotation(math.radians(25), 4, 'X') @
                   Matrix.Scale(strap_w * 0.9, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(strap_thick * 1.5, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.12, 4, Vector((0, 0, 1)))
        )

    # Horizontal top handle bridge joining across sx (-0.16 to +0.16)
    for hy in (-0.025, 0.025):
        bmesh.ops.create_cube(
            bm_web,
            size=1.0,
            matrix=Matrix.Translation((0, hy, BAG_HEIGHT + 0.10)) @
                   Matrix.Scale(0.36, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.010, 4, Vector((0, 0, 1)))
        )

    # Padded central handle wrap (joins both handle loops at the apex)
    bmesh.ops.create_cube(
        bm_wrap,
        size=1.0,
        matrix=Matrix.Translation((0, 0, BAG_HEIGHT + 0.102)) @
               Matrix.Scale(0.16, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.075, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.032, 4, Vector((0, 0, 1)))
    )

    mesh_web = bpy.data.meshes.new("Duffel_WebbingStraps")
    bm_web.to_mesh(mesh_web)
    bm_web.free()
    obj_web = bpy.data.objects.new("Duffel_WebbingStraps", mesh_web)
    obj_web.parent = parent
    obj_web.data.materials.append(mats["Duffel_WebbingStraps"])
    col.objects.link(obj_web)

    mesh_wrap = bpy.data.meshes.new("Duffel_HandleWrap")
    bm_wrap.to_mesh(mesh_wrap)
    bm_wrap.free()
    obj_wrap = bpy.data.objects.new("Duffel_HandleWrap", mesh_wrap)
    obj_wrap.parent = parent
    obj_wrap.data.materials.append(mats["Duffel_ReinforcedBlack"])
    col.objects.link(obj_wrap)

    bev = obj_wrap.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.012
    bev.segments = 3

def build_pockets_and_id_plate(col, mats, parent):
    """Front utility cargo pocket, blank identification plate, and end cap utility pockets."""
    bm_poc = bmesh.new()
    bm_hw = bmesh.new()
    bm_led = bmesh.new()

    # 1. Front utility pocket (+Y face)
    poc_w = 0.28
    poc_h = 0.15
    poc_d = 0.04
    poc_y = BAG_WIDTH/2 + poc_d/2 - 0.005
    poc_z = BAG_HEIGHT/2 - 0.01

    bmesh.ops.create_cube(
        bm_poc,
        size=1.0,
        matrix=Matrix.Translation((0, poc_y, poc_z)) @
               Matrix.Scale(poc_w, 4, Vector((1, 0, 0))) @
               Matrix.Scale(poc_d, 4, Vector((0, 1, 0))) @
               Matrix.Scale(poc_h, 4, Vector((0, 0, 1)))
    )

    # Zipper flap along top of pocket
    bmesh.ops.create_cube(
        bm_poc,
        size=1.0,
        matrix=Matrix.Translation((0, poc_y + 0.004, poc_z + poc_h/2 + 0.008)) @
               Matrix.Scale(poc_w * 0.95, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.015, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.016, 4, Vector((0, 0, 1)))
    )

    # 2. Blank Identification Plate on the front pocket face
    id_w = 0.09
    id_h = 0.045
    id_d = 0.004
    id_y = poc_y + poc_d/2 + id_d/2
    bmesh.ops.create_cube(
        bm_hw,
        size=1.0,
        matrix=Matrix.Translation((0, id_y, poc_z)) @
               Matrix.Scale(id_w, 4, Vector((1, 0, 0))) @
               Matrix.Scale(id_d, 4, Vector((0, 1, 0))) @
               Matrix.Scale(id_h, 4, Vector((0, 0, 1)))
    )
    # Recessed inner field of ID plate (blank)
    bmesh.ops.create_cube(
        bm_hw,
        size=1.0,
        matrix=Matrix.Translation((0, id_y + 0.001, poc_z)) @
               Matrix.Scale(id_w - 0.012, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.002, 4, Vector((0, 1, 0))) @
               Matrix.Scale(id_h - 0.012, 4, Vector((0, 0, 1)))
    )
    # 4 Corner rivets on the ID plate
    for rx in (-id_w/2 + 0.006, id_w/2 - 0.006):
        for rz in (-id_h/2 + 0.006, id_h/2 - 0.006):
            bmesh.ops.create_cube(
                bm_hw,
                size=1.0,
                matrix=Matrix.Translation((rx, id_y + 0.002, poc_z + rz)) @
                       Matrix.Scale(0.004, 4, Vector((1, 0, 0))) @
                       Matrix.Scale(0.003, 4, Vector((0, 1, 0))) @
                       Matrix.Scale(0.004, 4, Vector((0, 0, 1)))
            )

    # 3. Cyan electronics tracker tag next to ID plate
    bmesh.ops.create_cube(
        bm_led,
        size=1.0,
        matrix=Matrix.Translation((poc_w/2 - 0.02, poc_y + poc_d/2 + 0.002, poc_z + poc_h/2 - 0.01)) @
               Matrix.Scale(0.025, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.006, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
    )

    # 4. End cap utility pouches (+X and -X)
    for ex, rot_z in ((BAG_LEN/2 - 0.015, 0), (-BAG_LEN/2 + 0.015, math.pi)):
        # End compartment
        bmesh.ops.create_cube(
            bm_poc,
            size=1.0,
            matrix=Matrix.Translation((ex, 0, BAG_HEIGHT/2)) @
                   Matrix.Scale(0.045, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(BAG_WIDTH * 0.70, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(BAG_HEIGHT * 0.65, 4, Vector((0, 0, 1)))
        )

        # End grab handle
        bmesh.ops.create_cube(
            bm_hw,
            size=1.0,
            matrix=Matrix.Translation((ex + (0.025 if ex > 0 else -0.025), 0, BAG_HEIGHT/2)) @
                   Matrix.Scale(0.010, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.12, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 0, 1)))
        )

        # Metal D-Ring anchor tab for shoulder strap
        d_x = ex + (0.015 if ex > 0 else -0.015)
        d_z = BAG_HEIGHT * 0.75
        # Reinforced webbing tab
        bmesh.ops.create_cube(
            bm_hw,
            size=1.0,
            matrix=Matrix.Translation((d_x, 0, d_z)) @
                   Matrix.Scale(0.012, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.045, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.035, 4, Vector((0, 0, 1)))
        )
        # Heavy metal D-Ring loop
        bmesh.ops.create_cube(
            bm_hw,
            size=1.0,
            matrix=Matrix.Translation((d_x + (0.012 if ex > 0 else -0.012), 0, d_z + 0.01)) @
                   Matrix.Scale(0.006, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.048, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.030, 4, Vector((0, 0, 1)))
        )

    mesh_poc = bpy.data.meshes.new("Duffel_UtilityPockets")
    bm_poc.to_mesh(mesh_poc)
    bm_poc.free()
    obj_poc = bpy.data.objects.new("Duffel_UtilityPockets", mesh_poc)
    obj_poc.parent = parent
    obj_poc.data.materials.append(mats["Duffel_OliveFabric"])
    col.objects.link(obj_poc)

    bev = obj_poc.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.015
    bev.segments = 3

    mesh_hw = bpy.data.meshes.new("Duffel_Hardware")
    bm_hw.to_mesh(mesh_hw)
    bm_hw.free()
    obj_hw = bpy.data.objects.new("Duffel_Hardware", mesh_hw)
    obj_hw.parent = parent
    obj_hw.data.materials.append(mats["Duffel_GunmetalHardware"])
    col.objects.link(obj_hw)

    mesh_led = bpy.data.meshes.new("Duffel_CyanAccent")
    bm_led.to_mesh(mesh_led)
    bm_led.free()
    obj_led = bpy.data.objects.new("Duffel_CyanAccent", mesh_led)
    obj_led.parent = parent
    obj_led.data.materials.append(mats["Duffel_CyanAccent"])
    col.objects.link(obj_led)

def build_shoulder_strap(col, mats, parent):
    """Adjustable shoulder strap secured and draped neatly against the bag body."""
    bm = bmesh.new()

    # Shoulder strap runs along rear/top edge from -X D-ring to +X D-ring
    # Padded center section resting along top edge
    strap_z = BAG_HEIGHT + 0.02
    strap_y = -BAG_WIDTH/2 * 0.45

    # Main draped strap ribbon
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, strap_y, strap_z)) @
               Matrix.Scale(BAG_LEN * 0.88, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.042, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.006, 4, Vector((0, 0, 1)))
    )

    # Thick cushioned shoulder pad slider
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0.02, strap_y, strap_z + 0.005)) @
               Matrix.Scale(0.22, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.068, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.018, 4, Vector((0, 0, 1)))
    )

    # Adjustment metal slider buckle
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((-0.18, strap_y, strap_z + 0.004)) @
               Matrix.Scale(0.025, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.052, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
    )

    mesh = bpy.data.meshes.new("Duffel_ShoulderStrap")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Duffel_ShoulderStrap", mesh)
    obj.parent = parent
    obj.data.materials.append(mats["Duffel_WebbingStraps"])
    col.objects.link(obj)

    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = 0.006
    bev.segments = 2

def setup_studio_environment(col):
    """Studio lighting and camera matching the 50-70mm front 3/4 perspective."""
    world = bpy.data.worlds.new("Studio_World")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    # Key light
    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 60.0
    key_data.size = 1.2
    key_data.color = (1.0, 0.96, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.2, -1.3, 1.3)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    # Fill light
    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 24.0
    fill_data.size = 1.5
    fill_data.color = (0.65, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.3, -0.9, 1.0)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    # Rim light
    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 45.0
    rim_data.size = 1.0
    rim_data.color = (0.75, 0.92, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.3, 1.1)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    # Camera - Front 3/4 view (50-70mm lens equivalent)
    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 65.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 1.75
    cam_pitch = math.radians(60)
    cam_yaw = math.radians(-35)
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
    root = bpy.data.objects.get("PilotDuffel_Root")
    if not root:
        print("[ERROR] PilotDuffel_Root not found for export!")
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
    print(f"  • Bag Top Height:       Z = {max_z:.4f}m [{'PASS: Target ~0.38m' if abs(max_z - 0.38) < 0.05 else 'CHECK'}]")
    print(f"  • Duffel Length:        ~{dim_x:.3f}m [{'PASS: Target ~0.62m' if 0.55 <= dim_x <= 0.70 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_PILOT_DUFFEL")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("PilotDuffel_Root", None)
    col.objects.link(root)

    # Build Components
    build_duffel_body(col, mats, root)
    build_bottom_and_corners(col, mats, root)
    build_webbing_and_handles(col, mats, root)
    build_pockets_and_id_plate(col, mats, root)
    build_shoulder_strap(col, mats, root)

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
