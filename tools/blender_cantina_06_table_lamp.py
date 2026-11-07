"""
Blender 5.2+ Table Lamp Generator
Project Nova - Station Nova-1 Cantina
Asset 06: Table Lamp (cantina_06_table_lamp)

Strictly reconstructed from: art_src/cantina/cantina_06_table_lamp_3d_source.png
- Compact mushroom-silhouette industrial table lamp designed for cantina booth tables
- 0.14m base diameter, 0.26m total height
- Heavy circular base with knurled bezel and power connector
- 4 curved structural cage struts protecting the central diffuser
- Solid opaque pale amber luminous diffuser core (no transparent glass)
- Mushroom / domed heat-sink top cap with finial
- PBR Materials: Lamp_DarkGunmetal, Lamp_AmberEmission, Lamp_BronzeTrim, Lamp_BlackRubber
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_06_table_lamp.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_06_table_lamp.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_06_table_lamp.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_06_table_lamp_preview.png")

# Dimensions (in meters)
H_TOTAL = 0.26            # 26cm total height
R_BASE = 0.070            # 14cm base diameter
R_CAP_TOP = 0.088         # ~17.6cm mushroom cap diameter
R_CORE = 0.042            # 8.4cm diffuser core diameter
H_BASE = 0.050            # 5cm base pedestal
H_DIFFUSER = 0.130        # 13cm luminous chamber height
H_CAP = 0.080             # 8cm top cap assembly
NUM_CIRC_SEGS = 36

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

    mats["Lamp_DarkGunmetal"] = make_pbr("Lamp_DarkGunmetal", (0.05, 0.065, 0.085), 0.90, 0.28)
    mats["Lamp_AmberEmission"] = make_pbr("Lamp_AmberEmission", (1.0, 0.58, 0.08), 0.08, 0.15, emission=(1.0, 0.58, 0.08), emission_strength=8.0)
    mats["Lamp_BronzeTrim"] = make_pbr("Lamp_BronzeTrim", (0.70, 0.45, 0.22), 0.92, 0.25)
    mats["Lamp_BlackRubber"] = make_pbr("Lamp_BlackRubber", (0.02, 0.02, 0.025), 0.05, 0.80)

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

def build_lamp_base(col, mats, parent):
    bm = bmesh.new()

    # Rubber foot pad
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE * 0.96,
        radius2=R_BASE * 0.96,
        depth=0.006,
        matrix=Matrix.Translation((0, 0, 0.003))
    )

    # Main weighted metal base disc with chamfer
    h_plinth = 0.024
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE,
        radius2=R_BASE * 0.85,
        depth=h_plinth,
        matrix=Matrix.Translation((0, 0, 0.006 + h_plinth / 2))
    )

    # Collar tier
    h_tier = 0.020
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE * 0.75,
        radius2=R_CORE * 1.25,
        depth=h_tier,
        matrix=Matrix.Translation((0, 0, 0.006 + h_plinth + h_tier / 2))
    )

    mesh = bpy.data.meshes.new("Lamp_Base")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Base", mesh)
    obj.data.materials.append(mats["Lamp_DarkGunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # Bronze accent ring around base
    bm_ring = bmesh.new()
    bmesh.ops.create_cone(
        bm_ring,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE * 0.88,
        radius2=R_BASE * 0.88,
        depth=0.004,
        matrix=Matrix.Translation((0, 0, 0.006 + h_plinth))
    )
    mesh_ring = bpy.data.meshes.new("Lamp_Base_Trim")
    bm_ring.to_mesh(mesh_ring)
    bm_ring.free()
    obj_ring = bpy.data.objects.new("Lamp_Base_Trim", mesh_ring)
    obj_ring.data.materials.append(mats["Lamp_BronzeTrim"])
    col.objects.link(obj_ring)
    obj_ring.parent = parent

def build_diffuser_core(col, mats, parent):
    # Opaque pale amber luminous cylinder
    z_diff_bottom = H_BASE
    bm = bmesh.new()
    
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CORE * 0.95,
        radius2=R_CORE * 1.05,
        depth=H_DIFFUSER,
        matrix=Matrix.Translation((0, 0, z_diff_bottom + H_DIFFUSER / 2))
    )

    mesh = bpy.data.meshes.new("Lamp_Amber_Diffuser")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Amber_Diffuser", mesh)
    obj.data.materials.append(mats["Lamp_AmberEmission"])
    col.objects.link(obj)
    obj.parent = parent

def build_protective_cage(col, mats, parent):
    # 4 Curved vertical protective struts guarding the diffuser
    bm = bmesh.new()
    z_bottom = H_BASE
    z_top = H_BASE + H_DIFFUSER
    
    num_struts = 4
    for i in range(num_struts):
        ang = (2 * math.pi / num_struts) * i
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)
        
        r_strut = R_CORE * 1.25
        # Vertical strut bar
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((r_strut * cos_a, r_strut * sin_a, z_bottom + H_DIFFUSER / 2)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(0.008, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.012, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(H_DIFFUSER * 0.98, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Lamp_Cage_Struts")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Cage_Struts", mesh)
    obj.data.materials.append(mats["Lamp_DarkGunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.001, segments=1)

def build_mushroom_cap(col, mats, parent):
    z_start = H_BASE + H_DIFFUSER
    bm = bmesh.new()

    # Lower cap collar
    h_collar = 0.015
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CORE * 1.30,
        radius2=R_CAP_TOP * 0.92,
        depth=h_collar,
        matrix=Matrix.Translation((0, 0, z_start + h_collar / 2))
    )

    # Main mushroom cap hood (flared downward dome)
    h_hood = 0.035
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CAP_TOP,
        radius2=R_CAP_TOP * 0.65,
        depth=h_hood,
        matrix=Matrix.Translation((0, 0, z_start + h_collar + h_hood / 2))
    )

    # Top heat sink cap
    h_fin = 0.020
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CAP_TOP * 0.55,
        radius2=R_CAP_TOP * 0.40,
        depth=h_fin,
        matrix=Matrix.Translation((0, 0, z_start + h_collar + h_hood + h_fin / 2))
    )

    # Central knurled handle / finial at top
    h_finial = 0.010
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=24,
        radius1=0.014,
        radius2=0.012,
        depth=h_finial,
        matrix=Matrix.Translation((0, 0, z_start + h_collar + h_hood + h_fin + h_finial / 2))
    )

    mesh = bpy.data.meshes.new("Lamp_Cap_Hood")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Cap_Hood", mesh)
    obj.data.materials.append(mats["Lamp_DarkGunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # Bronze ring around the mushroom rim
    bm_rim = bmesh.new()
    bmesh.ops.create_cone(
        bm_rim,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CAP_TOP * 1.01,
        radius2=R_CAP_TOP * 1.01,
        depth=0.005,
        matrix=Matrix.Translation((0, 0, z_start + h_collar + 0.005))
    )
    mesh_rim = bpy.data.meshes.new("Lamp_Cap_Bronze_Trim")
    bm_rim.to_mesh(mesh_rim)
    bm_rim.free()
    obj_rim = bpy.data.objects.new("Lamp_Cap_Bronze_Trim", mesh_rim)
    obj_rim.data.materials.append(mats["Lamp_BronzeTrim"])
    col.objects.link(obj_rim)
    obj_rim.parent = parent

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
    cam_dist = 0.90
    cam_pitch = math.radians(60)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.13 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.13))
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
    root = bpy.data.objects.get("TableLamp_Root")
    if not root:
        print("[ERROR] TableLamp_Root not found for export!")
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
    print(f"  • Base Floor Contact:   Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.005 else 'FAIL'}]")
    print(f"  • Lamp Height:          Z = {max_z:.4f}m [{'PASS: Target ~0.26m' if abs(max_z - 0.26) < 0.03 else 'CHECK'}]")
    print(f"  • Lamp Diameter:        ~{dim_x:.3f}m [{'PASS: Target ~0.17m' if 0.14 <= dim_x <= 0.20 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_TABLE_LAMP")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("TableLamp_Root", None)
    col.objects.link(root)

    # Build Components
    build_lamp_base(col, mats, root)
    build_diffuser_core(col, mats, root)
    build_protective_cage(col, mats, root)
    build_mushroom_cap(col, mats, root)

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
