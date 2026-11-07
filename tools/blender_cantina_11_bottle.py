"""
Blender 5.2+ Cantina Bottle Generator
Project Nova - Station Nova-1 Cantina
Asset 11: Cantina Bottle (cantina_11_bottle)

Strictly reconstructed from: art_src/cantina/cantina_11_bottle_3d_source.png
- Standalone rugged futuristic space-cantina spirit bottle
- Weighted hexagonal faceted base designed for microgravity stability
- Opaque deep emerald-green ceramic body with chamfered facets
- Front recessed blank rectangular identification plate
- Machined gunmetal neck collar with knurled bronze cap stopper
- PBR Materials: Bottle_EmeraldGreen, Bottle_GunmetalCollar, Bottle_BronzeCap, Bottle_BlankLabel
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_11_bottle.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_11_bottle.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_11_bottle.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_11_bottle_preview.png")

# Dimensions (in meters)
H_BOTTLE = 0.28           # 28cm tall bottle
R_BASE = 0.052            # ~10.4cm base diameter
R_NECK = 0.018            # 3.6cm neck diameter
NUM_FACETS = 6            # Hexagonal cross-section

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

    mats["Bottle_EmeraldGreen"] = make_pbr("Bottle_EmeraldGreen", (0.04, 0.28, 0.12), 0.12, 0.26)
    mats["Bottle_GunmetalCollar"] = make_pbr("Bottle_GunmetalCollar", (0.07, 0.09, 0.12), 0.88, 0.28)
    mats["Bottle_BronzeCap"] = make_pbr("Bottle_BronzeCap", (0.70, 0.45, 0.22), 0.92, 0.24)
    mats["Bottle_BlankLabel"] = make_pbr("Bottle_BlankLabel", (0.08, 0.10, 0.12), 0.08, 0.50)

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

def build_bottle(col, mats, parent):
    bm = bmesh.new()

    # 1. Hexagonal weighted base plinth at Z=0 to 0.03m
    h_plinth = 0.03
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE,
        radius2=R_BASE * 0.96,
        depth=h_plinth,
        matrix=Matrix.Translation((0, 0, h_plinth / 2))
    )

    # 2. Main faceted body from Z=0.03m to 0.18m
    h_body = 0.15
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE * 0.96,
        radius2=R_BASE * 0.88,
        depth=h_body,
        matrix=Matrix.Translation((0, 0, h_plinth + h_body / 2))
    )

    # 3. Shoulder taper from Z=0.18m to 0.22m
    h_sh = 0.04
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_FACETS,
        radius1=R_BASE * 0.88,
        radius2=R_NECK * 1.15,
        depth=h_sh,
        matrix=Matrix.Translation((0, 0, h_plinth + h_body + h_sh / 2))
    )

    mesh = bpy.data.meshes.new("Bottle_Main_Body")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Bottle_Main_Body", mesh)
    obj.data.materials.append(mats["Bottle_EmeraldGreen"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # 4. Front blank label plate
    bm_lbl = bmesh.new()
    w_lbl = 0.042
    h_lbl = 0.075
    y_lbl = (R_BASE * 0.92) * math.cos(math.pi / NUM_FACETS) # on front flat facet
    z_lbl = h_plinth + h_body * 0.50
    bmesh.ops.create_cube(
        bm_lbl,
        size=1.0,
        matrix=Matrix.Translation((0, -y_lbl - 0.001, z_lbl)) @
               Matrix.Scale(w_lbl, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.002, 4, Vector((0, 1, 0))) @
               Matrix.Scale(h_lbl, 4, Vector((0, 0, 1)))
    )
    mesh_lbl = bpy.data.meshes.new("Bottle_Blank_Label")
    bm_lbl.to_mesh(mesh_lbl)
    bm_lbl.free()
    obj_lbl = bpy.data.objects.new("Bottle_Blank_Label", mesh_lbl)
    obj_lbl.data.materials.append(mats["Bottle_BlankLabel"])
    col.objects.link(obj_lbl)
    obj_lbl.parent = parent

    # 5. Neck reinforcement collar (Gunmetal)
    z_neck_start = h_plinth + h_body + h_sh
    h_neck = 0.045
    bm_neck = bmesh.new()
    bmesh.ops.create_cone(
        bm_neck,
        cap_ends=True,
        cap_tris=False,
        segments=24,
        radius1=R_NECK * 1.15,
        radius2=R_NECK * 1.05,
        depth=h_neck,
        matrix=Matrix.Translation((0, 0, z_neck_start + h_neck / 2))
    )
    mesh_neck = bpy.data.meshes.new("Bottle_Neck_Collar")
    bm_neck.to_mesh(mesh_neck)
    bm_neck.free()
    obj_neck = bpy.data.objects.new("Bottle_Neck_Collar", mesh_neck)
    obj_neck.data.materials.append(mats["Bottle_GunmetalCollar"])
    col.objects.link(obj_neck)
    obj_neck.parent = parent
    apply_bevel(obj_neck, width=0.001, segments=1)

    # 6. Knurled cap stopper (Bronze)
    z_cap_start = z_neck_start + h_neck
    h_cap = 0.025
    bm_cap = bmesh.new()
    bmesh.ops.create_cone(
        bm_cap,
        cap_ends=True,
        cap_tris=False,
        segments=24,
        radius1=R_NECK * 1.18,
        radius2=R_NECK * 1.12,
        depth=h_cap,
        matrix=Matrix.Translation((0, 0, z_cap_start + h_cap / 2))
    )
    mesh_cap = bpy.data.meshes.new("Bottle_Bronze_Cap")
    bm_cap.to_mesh(mesh_cap)
    bm_cap.free()
    obj_cap = bpy.data.objects.new("Bottle_Bronze_Cap", mesh_cap)
    obj_cap.data.materials.append(mats["Bottle_BronzeCap"])
    col.objects.link(obj_cap)
    obj_cap.parent = parent
    apply_bevel(obj_cap, width=0.001, segments=1)

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 25.0
    key_data.size = 0.8
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (0.6, -0.8, 0.8)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 10.0
    fill_data.size = 1.0
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-0.7, -0.5, 0.6)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 18.0
    rim_data.size = 0.6
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 0.8, 0.8)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 65.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 0.95
    cam_pitch = math.radians(60)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.14 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.14))
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
    root = bpy.data.objects.get("CantinaBottle_Root")
    if not root:
        print("[ERROR] CantinaBottle_Root not found for export!")
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
    print(f"  • Bottle Height:        Z = {max_z:.4f}m [{'PASS: Target ~0.28m' if abs(max_z - 0.28) < 0.03 else 'CHECK'}]")
    print(f"  • Bottle Diameter:      ~{dim_x:.3f}m [{'PASS: Target ~0.10m' if 0.08 <= dim_x <= 0.12 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_BOTTLE")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("CantinaBottle_Root", None)
    col.objects.link(root)

    # Build Components
    build_bottle(col, mats, root)

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
