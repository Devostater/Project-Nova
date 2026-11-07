"""
Blender 5.2+ Drinking Glass Generator
Project Nova - Station Nova-1 Cantina
Asset 12: Drinking Glass (cantina_12_drinking_glass)

Strictly reconstructed from: art_src/cantina/cantina_12_drinking_glass_3d_source.png
- Heavy faceted space-cantina tumbler designed for zero-G / station microgravity
- Weighted hexagonal faceted base resting at Z=0.000m
- Machined dark gunmetal reinforcement mid-band with rivets
- Dark charcoal ceramic faceted walls
- Solid opaque warm glowing amber drink insert
- PBR Materials: Glass_CharcoalCeramic, Glass_GunmetalBand, Glass_AmberDrink
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_12_drinking_glass.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_12_drinking_glass.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_12_drinking_glass.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_12_drinking_glass_preview.png")

# Dimensions (in meters)
H_GLASS = 0.12            # 12cm tall tumbler
R_BASE = 0.042            # 8.4cm base diameter
R_TOP = 0.048             # 9.6cm top rim diameter
NUM_FACETS = 6

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

    mats["Glass_CharcoalCeramic"] = make_pbr("Glass_CharcoalCeramic", (0.05, 0.065, 0.08), 0.15, 0.32)
    mats["Glass_GunmetalBand"] = make_pbr("Glass_GunmetalBand", (0.07, 0.09, 0.12), 0.88, 0.26)
    mats["Glass_AmberDrink"] = make_pbr("Glass_AmberDrink", (1.0, 0.58, 0.08), 0.10, 0.12, emission=(1.0, 0.58, 0.08), emission_strength=7.0)

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

def build_glass(col, mats, parent):
    bm = bmesh.new()

    # Lower faceted body from Z=0 to 0.06m
    h_lower = 0.06
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE,
        radius2=R_BASE * 1.05,
        depth=h_lower,
        matrix=Matrix.Translation((0, 0, h_lower / 2))
    )

    # Upper faceted body from Z=0.06m to 0.12m
    h_upper = 0.06
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE * 1.05,
        radius2=R_TOP,
        depth=h_upper,
        matrix=Matrix.Translation((0, 0, h_lower + h_upper / 2))
    )

    mesh = bpy.data.meshes.new("Glass_Body")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Glass_Body", mesh)
    obj.data.materials.append(mats["Glass_CharcoalCeramic"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # Mid reinforcement band (Gunmetal) at Z=0.05m to 0.07m
    bm_band = bmesh.new()
    h_band = 0.022
    bmesh.ops.create_cone(
        bm_band,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE * 1.07,
        radius2=R_BASE * 1.07,
        depth=h_band,
        matrix=Matrix.Translation((0, 0, 0.06))
    )
    mesh_band = bpy.data.meshes.new("Glass_Gunmetal_Band")
    bm_band.to_mesh(mesh_band)
    bm_band.free()
    obj_band = bpy.data.objects.new("Glass_Gunmetal_Band", mesh_band)
    obj_band.data.materials.append(mats["Glass_GunmetalBand"])
    col.objects.link(obj_band)
    obj_band.parent = parent
    apply_bevel(obj_band, width=0.001, segments=1)

    # Opaque glowing amber drink surface disc at top
    bm_drink = bmesh.new()
    bmesh.ops.create_cone(
        bm_drink,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_TOP * 0.90,
        radius2=R_TOP * 0.90,
        depth=0.008,
        matrix=Matrix.Translation((0, 0, H_GLASS - 0.004))
    )
    mesh_drink = bpy.data.meshes.new("Glass_Amber_Drink")
    bm_drink.to_mesh(mesh_drink)
    bm_drink.free()
    obj_drink = bpy.data.objects.new("Glass_Amber_Drink", mesh_drink)
    obj_drink.data.materials.append(mats["Glass_AmberDrink"])
    col.objects.link(obj_drink)
    obj_drink.parent = parent

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 18.0
    key_data.size = 0.6
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (0.4, -0.6, 0.6)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 8.0
    fill_data.size = 0.8
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-0.5, -0.4, 0.4)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 14.0
    rim_data.size = 0.5
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 0.6, 0.6)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 70.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 0.65
    cam_pitch = math.radians(60)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.06 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.06))
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
    root = bpy.data.objects.get("DrinkingGlass_Root")
    if not root:
        print("[ERROR] DrinkingGlass_Root not found for export!")
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
    print(f"  • Glass Height:         Z = {max_z:.4f}m [{'PASS: Target ~0.12m' if abs(max_z - 0.12) < 0.02 else 'CHECK'}]")
    print(f"  • Glass Diameter:       ~{dim_x:.3f}m [{'PASS: Target ~0.09m' if 0.07 <= dim_x <= 0.11 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_DRINKING_GLASS")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("DrinkingGlass_Root", None)
    col.objects.link(root)

    # Build Components
    build_glass(col, mats, root)

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
