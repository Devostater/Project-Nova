"""
Blender 5.2+ Hanging Bar Lamp Generator
Project Nova - Station Nova-1 Cantina
Asset 07: Hanging Bar Lamp (cantina_07_hanging_lamp)

Strictly reconstructed from: art_src/cantina/cantina_07_hanging_lamp_3d_source.png
- Industrial ceiling pendant lamp fixture mounted beneath balconies and overhangs
- Ceiling mounting flange with anchor bolts
- Reinforced flexible power conduit cable
- Blackened steel lamp housing with radial heat-sink fins
- Internal opaque warm amber luminous cylinder chamber
- Protective lower guard cage rim with cross-struts
- PBR Materials: HangingLamp_BlackMetal, HangingLamp_Gunmetal, HangingLamp_AmberEmission, HangingLamp_Cable
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_07_hanging_lamp.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_07_hanging_lamp.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_07_hanging_lamp.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_07_hanging_lamp_preview.png")

# Dimensions (in meters)
# Let's orient with lowest rim resting at Z=0.000m, top ceiling cap at Z=0.65m
H_TOTAL = 0.65            # 65cm total fixture height
R_CEILING_CAP = 0.080     # 16cm ceiling mounting flange
R_LAMP_BODY = 0.085       # 17cm lamp housing diameter
R_DIFFUSER = 0.055        # 11cm luminous core diameter
H_LAMP_FIXTURE = 0.32     # 32cm lamp body + cage
H_CABLE = 0.28            # 28cm conduit cable
H_CEILING_FLANGE = 0.05   # 5cm ceiling mount
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

    mats["HangingLamp_BlackMetal"] = make_pbr("HangingLamp_BlackMetal", (0.035, 0.042, 0.055), 0.92, 0.24)
    mats["HangingLamp_Gunmetal"] = make_pbr("HangingLamp_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.30)
    mats["HangingLamp_AmberEmission"] = make_pbr("HangingLamp_AmberEmission", (1.0, 0.55, 0.06), 0.08, 0.15, emission=(1.0, 0.55, 0.06), emission_strength=8.0)
    mats["HangingLamp_Cable"] = make_pbr("HangingLamp_Cable", (0.02, 0.02, 0.025), 0.15, 0.70)

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

def build_ceiling_mount(col, mats, parent):
    # Ceiling cap at Z = [H_TOTAL - H_CEILING_FLANGE, H_TOTAL]
    z_bottom = H_TOTAL - H_CEILING_FLANGE
    bm = bmesh.new()

    # Mounting flange disc against ceiling
    h_flange = 0.018
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CEILING_CAP,
        radius2=R_CEILING_CAP,
        depth=h_flange,
        matrix=Matrix.Translation((0, 0, H_TOTAL - h_flange / 2))
    )

    # Conical cable gland socket
    h_socket = H_CEILING_FLANGE - h_flange
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CEILING_CAP * 0.70,
        radius2=0.022,
        depth=h_socket,
        matrix=Matrix.Translation((0, 0, z_bottom + h_socket / 2))
    )

    mesh = bpy.data.meshes.new("Lamp_Ceiling_Mount")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Ceiling_Mount", mesh)
    obj.data.materials.append(mats["HangingLamp_BlackMetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

    # 4 Ceiling anchor bolts
    bm_bolts = bmesh.new()
    for i in range(4):
        ang = (2 * math.pi / 4) * i + (math.pi / 4)
        bx = (R_CEILING_CAP * 0.82) * math.cos(ang)
        by = (R_CEILING_CAP * 0.82) * math.sin(ang)
        bmesh.ops.create_cone(
            bm_bolts,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.008,
            radius2=0.007,
            depth=0.008,
            matrix=Matrix.Translation((bx, by, H_TOTAL - h_flange - 0.002))
        )
    mesh_bolts = bpy.data.meshes.new("Lamp_Ceiling_Bolts")
    bm_bolts.to_mesh(mesh_bolts)
    bm_bolts.free()
    obj_bolts = bpy.data.objects.new("Lamp_Ceiling_Bolts", mesh_bolts)
    obj_bolts.data.materials.append(mats["HangingLamp_Gunmetal"])
    col.objects.link(obj_bolts)
    obj_bolts.parent = parent

def build_cable(col, mats, parent):
    # Conduit cable extending from ceiling socket to lamp top collar
    z_bottom = H_LAMP_FIXTURE
    z_top = H_TOTAL - H_CEILING_FLANGE
    length = z_top - z_bottom
    
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=24,
        radius1=0.010,
        radius2=0.010,
        depth=length,
        matrix=Matrix.Translation((0, 0, z_bottom + length / 2))
    )

    mesh = bpy.data.meshes.new("Lamp_Suspension_Cable")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Suspension_Cable", mesh)
    obj.data.materials.append(mats["HangingLamp_Cable"])
    col.objects.link(obj)
    obj.parent = parent

def build_lamp_housing(col, mats, parent):
    bm = bmesh.new()

    # Top cable strain-relief collar
    h_collar = 0.035
    z_collar = H_LAMP_FIXTURE - h_collar
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=0.024,
        radius2=0.018,
        depth=h_collar,
        matrix=Matrix.Translation((0, 0, z_collar + h_collar / 2))
    )

    # Upper housing dome
    h_dome = 0.045
    z_dome = z_collar - h_dome
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_LAMP_BODY * 0.90,
        radius2=0.032,
        depth=h_dome,
        matrix=Matrix.Translation((0, 0, z_dome + h_dome / 2))
    )

    # Main cylindrical heat-sink body
    h_body = 0.090
    z_body = z_dome - h_body
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_LAMP_BODY,
        radius2=R_LAMP_BODY,
        depth=h_body,
        matrix=Matrix.Translation((0, 0, z_body + h_body / 2))
    )

    # Cooling fins around housing perimeter
    num_fins = 8
    for i in range(num_fins):
        ang = (2 * math.pi / num_fins) * i
        fx = (R_LAMP_BODY + 0.008) * math.cos(ang)
        fy = (R_LAMP_BODY + 0.008) * math.sin(ang)
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((fx, fy, z_body + h_body / 2)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(0.016, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.004, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(h_body * 0.85, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Lamp_Housing")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Lamp_Housing", mesh)
    obj.data.materials.append(mats["HangingLamp_BlackMetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

def build_diffuser_and_cage(col, mats, parent):
    # Luminous warm amber chamber extending below housing
    z_diff_bottom = 0.025
    h_diffuser = 0.125
    
    bm_diff = bmesh.new()
    bmesh.ops.create_cone(
        bm_diff,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_DIFFUSER,
        radius2=R_DIFFUSER * 0.95,
        depth=h_diffuser,
        matrix=Matrix.Translation((0, 0, z_diff_bottom + h_diffuser / 2))
    )
    mesh_diff = bpy.data.meshes.new("Lamp_Luminous_Chamber")
    bm_diff.to_mesh(mesh_diff)
    bm_diff.free()
    obj_diff = bpy.data.objects.new("Lamp_Luminous_Chamber", mesh_diff)
    obj_diff.data.materials.append(mats["HangingLamp_AmberEmission"])
    col.objects.link(obj_diff)
    obj_diff.parent = parent

    # Protective guard cage around chamber
    bm_cage = bmesh.new()
    
    # Bottom guard rim at Z=0.000m
    h_rim = 0.025
    bmesh.ops.create_cone(
        bm_cage,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_LAMP_BODY * 0.95,
        radius2=R_LAMP_BODY * 0.95,
        depth=h_rim,
        matrix=Matrix.Translation((0, 0, h_rim / 2))
    )

    # 4 Vertical cage bars
    num_bars = 4
    for i in range(num_bars):
        ang = (2 * math.pi / num_bars) * i
        bx = (R_LAMP_BODY * 0.88) * math.cos(ang)
        by = (R_LAMP_BODY * 0.88) * math.sin(ang)
        bmesh.ops.create_cube(
            bm_cage,
            size=1.0,
            matrix=Matrix.Translation((bx, by, z_diff_bottom + h_diffuser / 2)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(0.008, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.012, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(h_diffuser * 1.1, 4, Vector((0, 0, 1)))
        )

    mesh_cage = bpy.data.meshes.new("Lamp_Protective_Cage")
    bm_cage.to_mesh(mesh_cage)
    bm_cage.free()
    obj_cage = bpy.data.objects.new("Lamp_Protective_Cage", mesh_cage)
    obj_cage.data.materials.append(mats["HangingLamp_Gunmetal"])
    col.objects.link(obj_cage)
    obj_cage.parent = parent
    apply_bevel(obj_cage, width=0.002, segments=2)

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
    cam_dist = 1.8
    cam_pitch = math.radians(64)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.32 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.32))
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
    root = bpy.data.objects.get("HangingLamp_Root")
    if not root:
        print("[ERROR] HangingLamp_Root not found for export!")
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
    print(f"  • Bottom Cage Contact:  Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.005 else 'FAIL'}]")
    print(f"  • Fixture Total Height: Z = {max_z:.4f}m [{'PASS: Target ~0.65m' if abs(max_z - 0.65) < 0.05 else 'CHECK'}]")
    print(f"  • Housing Diameter:     ~{dim_x:.3f}m [{'PASS: Target ~0.18m' if 0.15 <= dim_x <= 0.22 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_HANGING_LAMP")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("HangingLamp_Root", None)
    col.objects.link(root)

    # Build Components
    build_ceiling_mount(col, mats, root)
    build_cable(col, mats, root)
    build_lamp_housing(col, mats, root)
    build_diffuser_and_cage(col, mats, root)

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
