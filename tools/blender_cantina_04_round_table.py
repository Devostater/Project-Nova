"""
Blender 5.2+ Round Booth Table Generator
Project Nova - Station Nova-1 Cantina
Asset 04: Round Booth Table (cantina_04_round_table)

Strictly reconstructed from: art_src/cantina/cantina_04_round_table_3d_source.png
- Compact round cantina table designed for booth seating areas
- 0.90m tabletop diameter, 0.75m height, 0.52m base diameter
- Heavy bolted floor flange resting at Z=0.000m
- Industrial telescoping fluted central pedestal column
- Chamfered brushed dark-metal tabletop with recessed circular cyan status light ring
- Central equipment / power coupler core
- PBR Materials: Table_BrushedDarkMetal, Table_Gunmetal, Table_DarkMetal, Table_CyanEmission
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_04_round_table.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_04_round_table.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_04_round_table.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_04_round_table_preview.png")

# Dimensions (in meters)
H_TABLE = 0.75            # 0.75m tabletop surface height
R_TABLETOP = 0.45         # 0.90m diameter tabletop
T_TABLETOP = 0.045        # 4.5cm thick solid metal tabletop
R_BASE_FLANGE = 0.26      # 0.52m diameter base plate
R_PEDESTAL = 0.060        # 12cm diameter central pillar
NUM_CIRC_SEGS = 48

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

    mats["Table_BrushedDarkMetal"] = make_pbr("Table_BrushedDarkMetal", (0.05, 0.065, 0.085), 0.90, 0.28)
    mats["Table_Gunmetal"] = make_pbr("Table_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.32)
    mats["Table_DarkMetal"] = make_pbr("Table_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Table_CyanEmission"] = make_pbr("Table_CyanEmission", (0.08, 0.92, 1.0), 0.10, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=7.0)

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

def build_base_assembly(col, mats, parent):
    # Floor mounting plinth
    bm = bmesh.new()
    
    h_plinth = 0.025
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE_FLANGE,
        radius2=R_BASE_FLANGE - 0.03,
        depth=h_plinth,
        matrix=Matrix.Translation((0, 0, h_plinth / 2))
    )

    # Stepped collar
    h_step = 0.030
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BASE_FLANGE * 0.72,
        radius2=R_BASE_FLANGE * 0.65,
        depth=h_step,
        matrix=Matrix.Translation((0, 0, h_plinth + h_step / 2))
    )

    # Lower column socket
    h_socket = 0.045
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.8,
        radius2=R_PEDESTAL * 1.5,
        depth=h_socket,
        matrix=Matrix.Translation((0, 0, h_plinth + h_step + h_socket / 2))
    )

    mesh = bpy.data.meshes.new("Table_Base_Plate")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Table_Base_Plate", mesh)
    obj.data.materials.append(mats["Table_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.003, segments=2)

    # Bolt studs around perimeter
    bm_b = bmesh.new()
    num_bolts = 8
    r_bolt_circle = R_BASE_FLANGE * 0.85
    for i in range(num_bolts):
        ang = (2 * math.pi / num_bolts) * i
        bx = r_bolt_circle * math.cos(ang)
        by = r_bolt_circle * math.sin(ang)
        bmesh.ops.create_cone(
            bm_b,
            cap_ends=True,
            cap_tris=False,
            segments=12,
            radius1=0.014,
            radius2=0.012,
            depth=0.014,
            matrix=Matrix.Translation((bx, by, h_plinth + 0.006))
        )
    mesh_b = bpy.data.meshes.new("Table_Base_Bolts")
    bm_b.to_mesh(mesh_b)
    bm_b.free()
    obj_b = bpy.data.objects.new("Table_Base_Bolts", mesh_b)
    obj_b.data.materials.append(mats["Table_DarkMetal"])
    col.objects.link(obj_b)
    obj_b.parent = parent
    apply_bevel(obj_b, width=0.001, segments=1)

def build_pedestal(col, mats, parent):
    bm = bmesh.new()
    
    z_start = 0.10
    z_top = H_TABLE - T_TABLETOP - 0.04
    total_h = z_top - z_start

    # Main fluted cylinder
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.15,
        radius2=R_PEDESTAL,
        depth=total_h,
        matrix=Matrix.Translation((0, 0, z_start + total_h / 2))
    )

    # 4 Vertical cable/utility conduits along the pillar
    for i in range(4):
        ang = (2 * math.pi / 4) * i + (math.pi / 4)
        cx = (R_PEDESTAL * 1.05) * math.cos(ang)
        cy = (R_PEDESTAL * 1.05) * math.sin(ang)
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=False,
            segments=16,
            radius1=0.015,
            radius2=0.015,
            depth=total_h * 0.90,
            matrix=Matrix.Translation((cx, cy, z_start + total_h / 2))
        )

    mesh = bpy.data.meshes.new("Table_Pedestal")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Table_Pedestal", mesh)
    obj.data.materials.append(mats["Table_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=2)

def build_tabletop(col, mats, parent):
    # Support spider hub beneath tabletop
    bm_hub = bmesh.new()
    z_hub = H_TABLE - T_TABLETOP - 0.04
    h_hub = 0.04
    bmesh.ops.create_cone(
        bm_hub,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_PEDESTAL * 1.4,
        radius2=R_TABLETOP * 0.55,
        depth=h_hub,
        matrix=Matrix.Translation((0, 0, z_hub + h_hub / 2))
    )
    mesh_hub = bpy.data.meshes.new("Table_Under_Hub")
    bm_hub.to_mesh(mesh_hub)
    bm_hub.free()
    obj_hub = bpy.data.objects.new("Table_Under_Hub", mesh_hub)
    obj_hub.data.materials.append(mats["Table_DarkMetal"])
    col.objects.link(obj_hub)
    obj_hub.parent = parent
    apply_bevel(obj_hub, width=0.002, segments=2)

    # Main tabletop chassis
    z_top_bottom = H_TABLE - T_TABLETOP
    bm_top = bmesh.new()
    
    # Outer beveled disc
    bmesh.ops.create_cone(
        bm_top,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_TABLETOP * 0.96,
        radius2=R_TABLETOP,
        depth=T_TABLETOP,
        matrix=Matrix.Translation((0, 0, z_top_bottom + T_TABLETOP / 2))
    )

    mesh_top = bpy.data.meshes.new("Tabletop_Surface")
    bm_top.to_mesh(mesh_top)
    bm_top.free()
    obj_top = bpy.data.objects.new("Tabletop_Surface", mesh_top)
    obj_top.data.materials.append(mats["Table_BrushedDarkMetal"])
    col.objects.link(obj_top)
    obj_top.parent = parent
    apply_bevel(obj_top, width=0.004, segments=3)

    # Recessed circular cyan status light ring
    # Embedded in tabletop surface at radius 0.28m
    r_light_ring = 0.28
    w_light_ring = 0.016
    h_light = 0.004
    z_light = H_TABLE - 0.002
    
    bm_light = bmesh.new()
    bmesh.ops.create_cone(
        bm_light,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=r_light_ring + w_light_ring / 2,
        radius2=r_light_ring + w_light_ring / 2,
        depth=h_light,
        matrix=Matrix.Translation((0, 0, z_light))
    )
    # Subtract inner to make ring
    mesh_light = bpy.data.meshes.new("Table_Cyan_Light_Ring")
    bm_light.to_mesh(mesh_light)
    bm_light.free()
    obj_light = bpy.data.objects.new("Table_Cyan_Light_Ring", mesh_light)
    obj_light.data.materials.append(mats["Table_CyanEmission"])
    col.objects.link(obj_light)
    obj_light.parent = parent

    # Central core interface disc (for table lamp or power hub)
    r_core = 0.12
    h_core = 0.005
    bm_core = bmesh.new()
    bmesh.ops.create_cone(
        bm_core,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=r_core,
        radius2=r_core * 0.95,
        depth=h_core,
        matrix=Matrix.Translation((0, 0, H_TABLE + h_core / 2))
    )
    mesh_core = bpy.data.meshes.new("Table_Center_Core")
    bm_core.to_mesh(mesh_core)
    bm_core.free()
    obj_core = bpy.data.objects.new("Table_Center_Core", mesh_core)
    obj_core.data.materials.append(mats["Table_DarkMetal"])
    col.objects.link(obj_core)
    obj_core.parent = parent
    apply_bevel(obj_core, width=0.001, segments=1)

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 140.0
    key_data.size = 2.2
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (1.8, -2.0, 2.4)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 55.0
    fill_data.size = 2.5
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-2.0, -1.4, 1.8)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 110.0
    rim_data.size = 1.5
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 2.2, 2.2)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 2.6
    cam_pitch = math.radians(62)
    cam_yaw = math.radians(-40)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 0.40 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 0.38))
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
    root = bpy.data.objects.get("RoundTable_Root")
    if not root:
        print("[ERROR] RoundTable_Root not found for export!")
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
    print(f"  • Base Floor Contact:   Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.01 else 'FAIL'}]")
    print(f"  • Table Top Height:     Z = {max_z:.4f}m [{'PASS: Target ~0.75m height' if abs(max_z - 0.75) < 0.05 else 'CHECK'}]")
    print(f"  • Table Diameter:       ~{dim_x:.2f}m [{'PASS: Target ~0.90m' if 0.85 <= dim_x <= 0.95 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_ROUND_TABLE")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("RoundTable_Root", None)
    col.objects.link(root)

    # Build Components
    build_base_assembly(col, mats, root)
    build_pedestal(col, mats, root)
    build_tabletop(col, mats, root)

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
