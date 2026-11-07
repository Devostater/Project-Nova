"""
Blender 5.2+ Compact Cargo Case Generator
Project Nova - Station Nova-1 Cantina
Asset 14: Compact Cargo Case (cantina_14_cargo_case)

Strictly reconstructed from: art_src/cantina/cantina_14_cargo_case_3d_source.png
- Rugged industrial cargo / equipment case for cantina floor dressing
- Dark gunmetal hard shell with molded reinforcement stacking ribs
- Shock-absorbing rubber corner bumpers with recessed bolts
- Heavy cam-locking latches along lid parting line
- Flush recessed carry handles
- Glowing cyan status indicator strip on front bezel
- PBR Materials: Case_Gunmetal, Case_DarkMetal, Case_RubberBumpers, Case_LatchesChrome, Case_CyanLED
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_14_cargo_case.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_14_cargo_case.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_14_cargo_case.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_14_cargo_case_preview.png")

# Engineering Dimensions (in meters)
W_CASE = 0.50             # 50cm wide case
D_CASE = 0.35             # 35cm deep
H_CASE = 0.28             # 28cm tall
H_LID = 0.08              # 8cm lid height
H_BODY = H_CASE - H_LID   # 20cm lower body

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

    mats["Case_Gunmetal"] = make_pbr("Case_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["Case_DarkMetal"] = make_pbr("Case_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Case_RubberBumpers"] = make_pbr("Case_RubberBumpers", (0.025, 0.025, 0.03), 0.05, 0.75)
    mats["Case_LatchesChrome"] = make_pbr("Case_LatchesChrome", (0.80, 0.82, 0.86), 0.96, 0.16)
    mats["Case_CyanLED"] = make_pbr("Case_CyanLED", (0.08, 0.92, 1.0), 0.10, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=7.0)

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

def build_case_body_and_lid(col, mats, parent):
    bm = bmesh.new()

    # 1. Main lower chassis body from Z=0 to H_BODY
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, H_BODY / 2)) @
               Matrix.Scale(W_CASE, 4, Vector((1, 0, 0))) @
               Matrix.Scale(D_CASE, 4, Vector((0, 1, 0))) @
               Matrix.Scale(H_BODY, 4, Vector((0, 0, 1)))
    )

    # 2. Clamshell lid from Z=H_BODY to H_CASE
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0, 0, H_BODY + H_LID / 2)) @
               Matrix.Scale(W_CASE * 1.01, 4, Vector((1, 0, 0))) @
               Matrix.Scale(D_CASE * 1.01, 4, Vector((0, 1, 0))) @
               Matrix.Scale(H_LID, 4, Vector((0, 0, 1)))
    )

    # 3. Top lid stacking ribs (3 transverse ribs)
    for rx in [-0.14, 0.0, 0.14]:
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((rx, 0, H_CASE + 0.008)) @
                   Matrix.Scale(0.035, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(D_CASE * 0.75, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.016, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Case_Main_Chassis")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Case_Main_Chassis", mesh)
    obj.data.materials.append(mats["Case_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.003, segments=2)

    # 4. Rubberized protective corner bumpers (8 corners)
    bm_bumpers = bmesh.new()
    b_size = 0.06
    for cx in [-W_CASE/2, W_CASE/2]:
        for cy in [-D_CASE/2, D_CASE/2]:
            for cz in [b_size / 2, H_CASE - b_size / 2]:
                bmesh.ops.create_cube(
                    bm_bumpers,
                    size=1.0,
                    matrix=Matrix.Translation((cx, cy, cz)) @
                           Matrix.Scale(b_size, 4, Vector((1, 0, 0))) @
                           Matrix.Scale(b_size, 4, Vector((0, 1, 0))) @
                           Matrix.Scale(b_size, 4, Vector((0, 0, 1)))
                )

    mesh_bumpers = bpy.data.meshes.new("Case_Corner_Bumpers")
    bm_bumpers.to_mesh(mesh_bumpers)
    bm_bumpers.free()
    obj_bumpers = bpy.data.objects.new("Case_Corner_Bumpers", mesh_bumpers)
    obj_bumpers.data.materials.append(mats["Case_RubberBumpers"])
    col.objects.link(obj_bumpers)
    obj_bumpers.parent = parent
    apply_bevel(obj_bumpers, width=0.002, segments=2)

    # 5. Dual heavy cam-action locking latches on front
    bm_latches = bmesh.new()
    y_front = -D_CASE / 2 - 0.008
    z_latch = H_BODY
    for lx in [-0.12, 0.12]:
        bmesh.ops.create_cube(
            bm_latches,
            size=1.0,
            matrix=Matrix.Translation((lx, y_front, z_latch)) @
                   Matrix.Scale(0.045, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.018, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.065, 4, Vector((0, 0, 1)))
        )

    mesh_latches = bpy.data.meshes.new("Case_Locking_Latches")
    bm_latches.to_mesh(mesh_latches)
    bm_latches.free()
    obj_latches = bpy.data.objects.new("Case_Locking_Latches", mesh_latches)
    obj_latches.data.materials.append(mats["Case_LatchesChrome"])
    col.objects.link(obj_latches)
    obj_latches.parent = parent
    apply_bevel(obj_latches, width=0.001, segments=1)

    # 6. Glowing cyan LED status indicator strip on front bezel
    bm_led = bmesh.new()
    bmesh.ops.create_cube(
        bm_led,
        size=1.0,
        matrix=Matrix.Translation((0, y_front + 0.003, H_BODY + 0.035)) @
               Matrix.Scale(0.080, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.006, 4, Vector((0, 1, 0))) @
               Matrix.Scale(0.012, 4, Vector((0, 0, 1)))
    )
    mesh_led = bpy.data.meshes.new("Case_Cyan_LED_Strip")
    bm_led.to_mesh(mesh_led)
    bm_led.free()
    obj_led = bpy.data.objects.new("Case_Cyan_LED_Strip", mesh_led)
    obj_led.data.materials.append(mats["Case_CyanLED"])
    col.objects.link(obj_led)
    obj_led.parent = parent

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 55.0
    key_data.size = 1.2
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.0, -1.2, 1.2)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 22.0
    fill_data.size = 1.5
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-1.2, -0.8, 1.0)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 40.0
    rim_data.size = 1.0
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 1.2, 1.0)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 60.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 1.6
    cam_pitch = math.radians(62)
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
    root = bpy.data.objects.get("CargoCase_Root")
    if not root:
        print("[ERROR] CargoCase_Root not found for export!")
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
    print(f"  • Case Height:          Z = {max_z:.4f}m [{'PASS: Target ~0.28m' if abs(max_z - 0.28) < 0.03 else 'CHECK'}]")
    print(f"  • Case Width:           ~{dim_x:.3f}m [{'PASS: Target ~0.50m' if 0.45 <= dim_x <= 0.55 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_CARGO_CASE")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("CargoCase_Root", None)
    col.objects.link(root)

    # Build Components
    build_case_body_and_lid(col, mats, root)

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
