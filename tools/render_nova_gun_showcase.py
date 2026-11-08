"""Render the NOVA Arc-Pistol as a high-resolution portfolio hero image.

Run with Blender in background mode after opening the generated weapon workspace.
This changes only the presentation scene; it does not export or modify the game GLB.
"""

import math
import os

import bpy
from mathutils import Vector


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_arc_pistol_showcase_4k.png")
SHOWCASE_BLEND = os.path.join(REPO_ROOT, "art_src", "weapons", "nova_arc_pistol_showcase.blend")


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def remove_presentation_objects():
    for obj in list(bpy.data.objects):
        if obj.type in {"CAMERA", "LIGHT"} or obj.name == "Studio_Shadow_Floor":
            bpy.data.objects.remove(obj, do_unlink=True)


def tune_materials():
    settings = {
        "Mat_Nova_ChassisDark": ((0.012, 0.022, 0.038, 1), 0.94, 0.17),
        "Mat_Nova_ChassisAccent": ((0.035, 0.065, 0.105, 1), 0.88, 0.21),
        "Mat_Nova_ChassisChrome": ((0.46, 0.56, 0.66, 1), 1.0, 0.075),
        "Mat_Nova_GripComposite": ((0.012, 0.016, 0.021, 1), 0.08, 0.48),
        "Mat_Nova_GripStipple": ((0.006, 0.009, 0.012, 1), 0.04, 0.62),
        "Mat_Nova_HeatRadiator": ((0.31, 0.085, 0.026, 1), 0.91, 0.20),
        "Mat_Nova_SafetyRed": ((0.62, 0.008, 0.015, 1), 0.48, 0.23),
    }
    for name, (color, metallic, roughness) in settings.items():
        mat = bpy.data.materials.get(name)
        if not mat or not mat.use_nodes:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = 0.24
            bsdf.inputs["Coat Roughness"].default_value = 0.12

    for name, strength in (("Mat_Nova_CyanPlasma", 4.5), ("Mat_Nova_SightLens", 2.5)):
        mat = bpy.data.materials.get(name)
        if not mat or not mat.use_nodes:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = (0.015, 0.82, 1.0, 1)
                bsdf.inputs["Emission Strength"].default_value = strength
            bsdf.inputs["Roughness"].default_value = 0.06


def material(name, color, metallic=0.0, roughness=0.4, emission=None, strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def add_plane(name, location, scale, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=2, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    return obj


def add_area(name, location, energy, size, color, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def add_strip(name, location, scale, emission_mat, rotation=(math.radians(90), 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    strip = bpy.context.object
    strip.name = name
    strip.scale = scale
    strip.data.materials.append(emission_mat)
    bevel = strip.modifiers.new("Soft bevel", "BEVEL")
    bevel.width = 0.01
    bevel.segments = 5
    return strip


def configure_scene():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 192
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 10
    scene.cycles.diffuse_bounces = 4
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 6
    scene.render.use_persistent_data = True
    cycles_addon = bpy.context.preferences.addons.get("cycles")
    if cycles_addon:
        prefs = cycles_addon.preferences
        for backend in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = backend
                prefs.get_devices()
                for device in prefs.devices:
                    device.use = device.type != "CPU"
                scene.cycles.device = "GPU"
                break
            except Exception:
                continue
    scene.render.resolution_x = 3840
    scene.render.resolution_y = 2160
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "16"
    scene.render.filepath = OUTPUT
    scene.render.film_transparent = False
    scene.render.image_settings.compression = 35

    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("Showcase World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.002, 0.004, 0.009, 1)
    background.inputs["Strength"].default_value = 0.035

def build_stage():
    floor_mat = material("Showcase Floor", (0.012, 0.017, 0.026, 1), metallic=0.58, roughness=0.20)
    wall_mat = material("Showcase Wall", (0.008, 0.014, 0.025, 1), metallic=0.20, roughness=0.38)
    cyan = material(
        "Showcase Cyan",
        (0.005, 0.12, 0.16, 1),
        roughness=0.12,
        emission=(0.01, 0.72, 1.0, 1),
        strength=2.5,
    )
    add_plane("Showcase Floor", (0, 0.01, -0.162), (1.6, 1.6, 1), floor_mat)
    add_plane("Showcase Backdrop", (0, -0.38, 0.35), (1.6, 0.8, 1), wall_mat, (math.radians(90), 0, 0))
    add_strip("Cyan Stage Strip Left", (-0.34, -0.37, 0.12), (0.008, 0.42, 0.008), cyan)
    add_strip("Cyan Stage Strip Right", (0.34, -0.37, 0.12), (0.008, 0.42, 0.008), cyan)

    target = (0, 0.015, -0.005)
    add_area("Key Softbox", (0.38, 0.36, 0.44), 62, 0.42, (0.74, 0.86, 1.0), target)
    add_area("Warm Edge", (-0.32, 0.18, 0.27), 38, 0.28, (1.0, 0.32, 0.10), target)
    add_area("Cyan Rim", (-0.30, -0.25, 0.16), 74, 0.25, (0.02, 0.72, 1.0), target)
    add_area("Top Card", (0.0, 0.02, 0.62), 48, 0.50, (0.62, 0.78, 1.0), target)
    add_area("Front Fill", (0.12, 0.58, -0.02), 18, 0.32, (0.18, 0.42, 0.68), target)


def add_camera():
    data = bpy.data.cameras.new("Showcase Hero Camera")
    data.lens = 63
    data.sensor_width = 36
    data.dof.use_dof = False
    camera = bpy.data.objects.new("Showcase Hero Camera", data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (0.48, 0.61, 0.235)
    look_at(camera, (0, 0.012, -0.012))
    bpy.context.scene.camera = camera


def main():
    remove_presentation_objects()
    tune_materials()
    configure_scene()
    build_stage()
    add_camera()
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=SHOWCASE_BLEND)
    bpy.ops.render.render(write_still=True)
    print(f"[OK] Showcase blend: {SHOWCASE_BLEND}")
    print(f"[OK] Showcase render: {OUTPUT}")


if __name__ == "__main__":
    main()
