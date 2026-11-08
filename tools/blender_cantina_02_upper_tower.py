"""
Blender 5.2+ Upper Cantina Tower & Balcony Generator
Project Nova - Station Nova-1 Cantina
Asset 02: Upper Cantina Tower & Balcony (cantina_02_upper_tower)

Strictly reconstructed from: art_src/cantina/cantina_02_upper_tower_3d_source.png
- High-level freestanding industrial mezzanine module matching the upper observation room
- Cylindrical station module (~4.4m diameter) with curved gunmetal armor shell
- Circular cantilevered balcony observation walkway with triangular truss safety railing
- Continuous cyan illuminated light ring circling the balcony perimeter
- Open portal / observation bay with warm amber interior lighting
- Underside heavy structural support beams and industrial cable connections
- PBR Materials: Tower_Gunmetal, Tower_DarkMetal, Tower_RailingBlack, Tower_CyanEmission, Tower_AmberEmission
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_02_upper_tower.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_02_upper_tower.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_02_upper_tower.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_02_upper_tower_preview.png")

# Engineering Dimensions (in meters)
R_CORE_WALL = 1.90        # 3.80m diameter cylindrical core room
T_CORE_WALL = 0.12        # 12cm thick structural walls
R_BALCONY_OUTER = 2.40    # 4.80m diameter outer balcony walkway
H_TOTAL = 3.60            # 3.60m total architectural height
H_BALCONY_DECK = 1.20     # Balcony floor sits 1.20m above lowest support plinth
H_RAILING = 1.05          # 1.05m high safety railing
NUM_CIRC_SEGS = 64

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

    mats["Tower_Gunmetal"] = make_pbr("Tower_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.32)
    mats["Tower_DarkMetal"] = make_pbr("Tower_DarkMetal", (0.035, 0.042, 0.055), 0.92, 0.22)
    mats["Tower_RailingBlack"] = make_pbr("Tower_RailingBlack", (0.025, 0.028, 0.032), 0.85, 0.28)
    mats["Tower_CyanEmission"] = make_pbr("Tower_CyanEmission", (0.08, 0.92, 1.0), 0.10, 0.10, emission=(0.08, 0.92, 1.0), emission_strength=8.0)
    mats["Tower_AmberEmission"] = make_pbr("Tower_AmberEmission", (1.0, 0.55, 0.06), 0.10, 0.10, emission=(1.0, 0.55, 0.06), emission_strength=6.5)

    return mats

def apply_bevel(obj, width=0.004, segments=2):
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(40)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True

def build_underside_supports(col, mats, parent):
    # Underside cantilever beams and support plinth
    bm = bmesh.new()

    # Center underside hub column
    h_hub = H_BALCONY_DECK
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CORE_WALL * 0.75,
        radius2=R_CORE_WALL * 0.85,
        depth=h_hub,
        matrix=Matrix.Translation((0, 0, h_hub / 2))
    )

    # 8 Radial cantilever structural gusset trusses extending to support the balcony
    num_gussets = 8
    for i in range(num_gussets):
        ang = (2 * math.pi / num_gussets) * i
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)

        r_in = R_CORE_WALL * 0.80
        r_out = R_BALCONY_OUTER * 0.95
        w_beam = r_out - r_in
        mid_r = (r_in + r_out) / 2
        
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((mid_r * cos_a, mid_r * sin_a, H_BALCONY_DECK - 0.18)) @
                   Matrix.Rotation(ang, 4, 'Z') @
                   Matrix.Scale(w_beam, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.08, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.24, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Tower_Underside_Supports")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Tower_Underside_Supports", mesh)
    obj.data.materials.append(mats["Tower_DarkMetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.004, segments=2)

def build_balcony_deck(col, mats, parent):
    # Balcony cantilevered floor slab
    t_deck = 0.14
    bm = bmesh.new()

    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BALCONY_OUTER,
        radius2=R_BALCONY_OUTER,
        depth=t_deck,
        matrix=Matrix.Translation((0, 0, H_BALCONY_DECK - t_deck / 2))
    )

    mesh = bpy.data.meshes.new("Tower_Balcony_Deck")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Tower_Balcony_Deck", mesh)
    obj.data.materials.append(mats["Tower_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.005, segments=2)

    # Cyan glowing light ring beneath the balcony rim
    h_cyan = 0.03
    bm_cyan = bmesh.new()
    bmesh.ops.create_cone(
        bm_cyan,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_BALCONY_OUTER * 1.005,
        radius2=R_BALCONY_OUTER * 1.005,
        depth=h_cyan,
        matrix=Matrix.Translation((0, 0, H_BALCONY_DECK - t_deck / 2))
    )
    mesh_cyan = bpy.data.meshes.new("Tower_Cyan_Light_Ring")
    bm_cyan.to_mesh(mesh_cyan)
    bm_cyan.free()
    obj_cyan = bpy.data.objects.new("Tower_Cyan_Light_Ring", mesh_cyan)
    obj_cyan.data.materials.append(mats["Tower_CyanEmission"])
    col.objects.link(obj_cyan)
    obj_cyan.parent = parent

def build_balcony_railing(col, mats, parent):
    # Triangular / truss safety railing around balcony rim
    bm = bmesh.new()
    z_rail_bottom = H_BALCONY_DECK
    z_rail_top = H_BALCONY_DECK + H_RAILING
    r_rail = R_BALCONY_OUTER - 0.04

    # Top handrail ring
    # Made from multiple segments
    num_posts = 16
    for i in range(num_posts):
        ang0 = (2 * math.pi / num_posts) * i
        ang1 = (2 * math.pi / num_posts) * (i + 1)
        ca0, sa0 = math.cos(ang0), math.sin(ang0)
        ca1, sa1 = math.cos(ang1), math.sin(ang1)

        # Vertical stanchion post
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((r_rail * ca0, r_rail * sa0, z_rail_bottom + H_RAILING / 2)) @
                   Matrix.Rotation(ang0, 4, 'Z') @
                   Matrix.Scale(0.04, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.04, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(H_RAILING, 4, Vector((0, 0, 1)))
        )

        # Top handrail segment
        mid_x = (r_rail * ca0 + r_rail * ca1) / 2
        mid_y = (r_rail * sa0 + r_rail * sa1) / 2
        seg_len = 2 * r_rail * math.sin(math.pi / num_posts)
        mid_ang = (ang0 + ang1) / 2

        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((mid_x, mid_y, z_rail_top)) @
                   Matrix.Rotation(mid_ang + math.pi/2, 4, 'Z') @
                   Matrix.Scale(seg_len, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.05, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.03, 4, Vector((0, 0, 1)))
        )

        # Mid rail
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((mid_x, mid_y, z_rail_bottom + H_RAILING * 0.50)) @
                   Matrix.Rotation(mid_ang + math.pi/2, 4, 'Z') @
                   Matrix.Scale(seg_len, 4, Vector((1, 0, 0))) @
                   Matrix.Scale(0.02, 4, Vector((0, 1, 0))) @
                   Matrix.Scale(0.02, 4, Vector((0, 0, 1)))
        )

    mesh = bpy.data.meshes.new("Tower_Safety_Railing")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Tower_Safety_Railing", mesh)
    obj.data.materials.append(mats["Tower_RailingBlack"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.002, segments=1)

def build_tower_room_core(col, mats, parent):
    # Cylindrical room body rising above balcony deck
    bm = bmesh.new()
    z_floor = H_BALCONY_DECK
    h_room = H_TOTAL - z_floor

    # Outer wall cylinder
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CORE_WALL,
        radius2=R_CORE_WALL * 0.96,
        depth=h_room,
        matrix=Matrix.Translation((0, 0, z_floor + h_room / 2))
    )

    # Top roof cap flange
    h_roof = 0.12
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=NUM_CIRC_SEGS,
        radius1=R_CORE_WALL * 1.05,
        radius2=R_CORE_WALL * 0.98,
        depth=h_roof,
        matrix=Matrix.Translation((0, 0, H_TOTAL + h_roof / 2))
    )

    mesh = bpy.data.meshes.new("Tower_Room_Core")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Tower_Room_Core", mesh)
    obj.data.materials.append(mats["Tower_Gunmetal"])
    col.objects.link(obj)
    obj.parent = parent
    apply_bevel(obj, width=0.004, segments=2)

    # Warm amber observation opening / interior arch portal
    # Facing forward (+Y)
    bm_amber = bmesh.new()
    w_portal = 1.40
    h_portal = 1.80
    y_portal = R_CORE_WALL - 0.08
    z_portal = z_floor + h_portal / 2 + 0.10

    bmesh.ops.create_cube(
        bm_amber,
        size=1.0,
        matrix=Matrix.Translation((0, y_portal, z_portal)) @
               Matrix.Scale(w_portal, 4, Vector((1, 0, 0))) @
               Matrix.Scale(0.12, 4, Vector((0, 1, 0))) @
               Matrix.Scale(h_portal, 4, Vector((0, 0, 1)))
    )

    mesh_amber = bpy.data.meshes.new("Tower_Interior_Amber_Light")
    bm_amber.to_mesh(mesh_amber)
    bm_amber.free()
    obj_amber = bpy.data.objects.new("Tower_Interior_Amber_Light", mesh_amber)
    obj_amber.data.materials.append(mats["Tower_AmberEmission"])
    col.objects.link(obj_amber)
    obj_amber.parent = parent

def setup_studio_environment(col):
    world = bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.015, 0.018, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 0.4
    bpy.context.scene.world = world

    key_data = bpy.data.lights.new(name="Key_Light", type='AREA')
    key_data.energy = 220.0
    key_data.size = 4.0
    key_data.color = (1.0, 0.95, 0.90)
    key_obj = bpy.data.objects.new(name="Key_Light", object_data=key_data)
    key_obj.location = (3.5, -4.0, 5.0)
    key_obj.rotation_euler = Euler((math.radians(45), math.radians(20), math.radians(-35)), 'XYZ')
    col.objects.link(key_obj)

    fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
    fill_data.energy = 90.0
    fill_data.size = 4.5
    fill_data.color = (0.6, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
    fill_obj.location = (-4.0, -2.5, 3.5)
    fill_obj.rotation_euler = Euler((math.radians(35), math.radians(-30), math.radians(40)), 'XYZ')
    col.objects.link(fill_obj)

    rim_data = bpy.data.lights.new(name="Rim_Light", type='AREA')
    rim_data.energy = 160.0
    rim_data.size = 3.0
    rim_data.color = (0.7, 0.9, 1.0)
    rim_obj = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
    rim_obj.location = (0.0, 4.5, 4.0)
    rim_obj.rotation_euler = Euler((math.radians(-45), 0, math.radians(180)), 'XYZ')
    col.objects.link(rim_obj)

    cam_data = bpy.data.cameras.new("RenderCam")
    cam_data.lens = 48.0
    cam_obj = bpy.data.objects.new("RenderCam", cam_data)
    cam_dist = 6.2
    cam_pitch = math.radians(58)
    cam_yaw = math.radians(-38)
    cx = cam_dist * math.cos(cam_pitch) * math.sin(cam_yaw)
    cy = -cam_dist * math.cos(cam_pitch) * math.cos(cam_yaw)
    cz = 1.80 + cam_dist * math.sin(cam_pitch)
    cam_obj.location = Vector((cx, cy, cz))
    
    target = Vector((0.0, 0.0, 1.80))
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
    root = bpy.data.objects.get("UpperTower_Root")
    if not root:
        print("[ERROR] UpperTower_Root not found for export!")
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
    print(f"  • Support Plinth Contact: Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.01 else 'FAIL'}]")
    print(f"  • Module Total Height:  Z = {max_z:.4f}m [{'PASS: Target ~3.7m' if abs(max_z - 3.72) < 0.10 else 'CHECK'}]")
    print(f"  • Outer Balcony Width:  ~{dim_x:.3f}m [{'PASS: Target ~4.80m' if 4.60 <= dim_x <= 5.00 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    col = bpy.data.collections.new("CANTINA_UPPER_TOWER")
    bpy.context.scene.collection.children.link(col)

    mats = setup_materials()

    root = bpy.data.objects.new("UpperTower_Root", None)
    col.objects.link(root)

    # Build Components
    build_underside_supports(col, mats, root)
    build_balcony_deck(col, mats, root)
    build_balcony_railing(col, mats, root)
    build_tower_room_core(col, mats, root)

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
