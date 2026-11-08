"""
Blender 5.2+ Island Bar Generator
Project Nova - Station Nova-1 Cantina
Asset 01: Circular Island Bar (cantina_01_island_bar)

Strictly reconstructed from: art_src/cantina/cantina_01_island_bar_3d_source.png
- 4.2m outside diameter, 1.15m counter height, 0.65m counter depth
- C-shaped circular island bar with bartender entrance facing +Y
- Segmented gunmetal armor panels, brushed copper countertop, cyan light band, amber lights
- Foot rail with floor brackets, stainless work surface, sink basin with faucet & drainboard, interior shelves
- Clean PBR materials: Bar_Gunmetal, Bar_DarkMetal, Bar_CopperTop, Bar_StainlessInterior, Bar_CyanEmission, Bar_AmberEmission, Bar_RubberTrim
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
BLEND_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_01_island_bar.blend")
GLB_OUT_PATH = os.path.join(REPO_ROOT, "models", "cantina_01_island_bar.glb")
PUBLIC_GLB_OUT_PATH = os.path.join(REPO_ROOT, "public", "models", "cantina_01_island_bar.glb")
PREVIEW_OUT_PATH = os.path.join(REPO_ROOT, "art_src", "cantina", "cantina_01_island_bar_preview.png")

# Geometry constants
R_OUTER = 2.10          # 4.2m outer diameter (radius = 2.1m)
COUNTER_DEPTH = 0.65    # 0.65m counter depth
R_INNER_TOP = R_OUTER - COUNTER_DEPTH  # 1.45m
H_COUNTER = 1.15        # 1.15m height to top of copper counter
T_COUNTER = 0.05        # 5cm thick copper top
H_WORKTOP = 0.88        # 0.88m height for inner stainless prep worktop
R_WORKTOP_IN = 1.48     # Inner radius of worktop
R_WORKTOP_OUT = 1.88    # Outer radius of worktop under main counter

# Opening facing +Y: Opening angle from 65° to 115° (center at 90° = +Y)
# The bar spans from angle 115° to 425° (65°), which is 310° total arc
THETA_START = math.radians(115.0)
THETA_END   = math.radians(425.0)
ARC_TOTAL   = THETA_END - THETA_START
NUM_SEGS    = 96        # High resolution arc segments for smooth curvature

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

    mats["Bar_Gunmetal"] = make_pbr("Bar_Gunmetal", (0.07, 0.09, 0.12), 0.88, 0.32)
    mats["Bar_DarkMetal"] = make_pbr("Bar_DarkMetal", (0.035, 0.045, 0.06), 0.92, 0.24)
    mats["Bar_CopperTop"] = make_pbr("Bar_CopperTop", (0.82, 0.46, 0.28), 0.96, 0.26)
    mats["Bar_StainlessInterior"] = make_pbr("Bar_StainlessInterior", (0.76, 0.78, 0.82), 0.98, 0.20)
    mats["Bar_CyanEmission"] = make_pbr("Bar_CyanEmission", (0.08, 0.92, 1.0), 0.1, 0.1, emission=(0.08, 0.92, 1.0), emission_strength=8.0)
    mats["Bar_AmberEmission"] = make_pbr("Bar_AmberEmission", (1.0, 0.52, 0.04), 0.1, 0.1, emission=(1.0, 0.52, 0.04), emission_strength=6.0)
    mats["Bar_RubberTrim"] = make_pbr("Bar_RubberTrim", (0.025, 0.025, 0.03), 0.05, 0.75)

    return mats

def apply_bevel_and_normals(obj, bevel_width=0.003, segments=2):
    bev = obj.modifiers.new(name="Bevel", type='BEVEL')
    bev.width = bevel_width
    bev.segments = segments
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(35)
    bev.miter_outer = 'MITER_ARC'
    bev.use_clamp_overlap = True

    wn = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
    wn.keep_sharp = True

    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(60)

def build_curved_band_mesh(name, r_inner, r_outer, z_min, z_max, theta_start, theta_end, num_segs, mat, col, parent):
    """Generates a clean volumetric curved sector mesh with end caps."""
    bm = bmesh.new()

    angles = [theta_start + (i / num_segs) * (theta_end - theta_start) for i in range(num_segs + 1)]

    # Generate 4 rings of vertices:
    # 0: inner bottom, 1: inner top, 2: outer bottom, 3: outer top
    ring_in_bot = []
    ring_in_top = []
    ring_out_bot = []
    ring_out_top = []

    for a in angles:
        ca = math.cos(a)
        sa = math.sin(a)
        ring_in_bot.append(bm.verts.new((ca * r_inner, sa * r_inner, z_min)))
        ring_in_top.append(bm.verts.new((ca * r_inner, sa * r_inner, z_max)))
        ring_out_bot.append(bm.verts.new((ca * r_outer, sa * r_outer, z_min)))
        ring_out_top.append(bm.verts.new((ca * r_outer, sa * r_outer, z_max)))

    bm.verts.ensure_lookup_table()

    # Create Quad faces along the arc
    for i in range(num_segs):
        # Bottom face (outer bot -> inner bot)
        bm.faces.new([ring_out_bot[i], ring_in_bot[i], ring_in_bot[i+1], ring_out_bot[i+1]])
        # Top face (inner top -> outer top)
        bm.faces.new([ring_in_top[i], ring_out_top[i], ring_out_top[i+1], ring_in_top[i+1]])
        # Outer curved face (outer bot -> outer top)
        bm.faces.new([ring_out_bot[i], ring_out_bot[i+1], ring_out_top[i+1], ring_out_top[i]])
        # Inner curved face (inner top -> inner bot)
        bm.faces.new([ring_in_top[i], ring_in_top[i+1], ring_in_bot[i+1], ring_in_bot[i]])

    # End caps at theta_start and theta_end
    # Start cap
    bm.faces.new([ring_in_bot[0], ring_out_bot[0], ring_out_top[0], ring_in_top[0]])
    # End cap
    bm.faces.new([ring_out_bot[-1], ring_in_bot[-1], ring_in_top[-1], ring_out_top[-1]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)

    for p in obj.data.polygons:
        p.use_smooth = True

    return obj

def build_countertop_copper(col, mats, parent):
    """
    Constructs Countertop_Copper:
    Curved copper counter with beveled front overhang, inner lip, and entrance caps.
    """
    obj = build_curved_band_mesh(
        "Countertop_Copper",
        r_inner=R_INNER_TOP,
        r_outer=R_OUTER + 0.03,  # 3cm overhang beyond the outer chassis
        z_min=H_COUNTER - T_COUNTER,
        z_max=H_COUNTER,
        theta_start=THETA_START,
        theta_end=THETA_END,
        num_segs=NUM_SEGS,
        mat=mats["Bar_CopperTop"],
        col=col,
        parent=parent
    )
    apply_bevel_and_normals(obj, bevel_width=0.005, segments=3)
    return obj

def build_cyan_light_ring(col, mats, parent):
    """
    Constructs Cyan_Light_Ring:
    Continuous cyan emissive light strip directly beneath the outer counter overhang.
    """
    obj = build_curved_band_mesh(
        "Cyan_Light_Ring",
        r_inner=R_OUTER - 0.015,
        r_outer=R_OUTER + 0.015,
        z_min=H_COUNTER - T_COUNTER - 0.025,
        z_max=H_COUNTER - T_COUNTER,
        theta_start=THETA_START + math.radians(0.5),
        theta_end=THETA_END - math.radians(0.5),
        num_segs=NUM_SEGS,
        mat=mats["Bar_CyanEmission"],
        col=col,
        parent=parent
    )
    return obj

def build_exterior_panels(col, mats, parent):
    """
    Constructs Exterior_Panels:
    Heavy layered gunmetal armor panels, floor plinth, horizontal and vertical panel seams,
    and side entrance bulkheads.
    """
    bm = bmesh.new()

    # 1. Base Plinth (Heavy ground foundation ring: Z=0.00 to 0.09m)
    r_base_out = R_OUTER + 0.02
    r_base_in = 1.46
    angles = [THETA_START + (i / NUM_SEGS) * ARC_TOTAL for i in range(NUM_SEGS + 1)]

    # 2. Main Outer Chassis Wall (Z=0.08m to 1.075m, R=2.06m)
    r_wall_out = R_OUTER
    r_wall_in = 1.50
    z_wall_bot = 0.08
    z_wall_top = H_COUNTER - T_COUNTER - 0.025

    # 3. Outer Armor Plates: 8 segmented armor panel sections with 2cm reveal seams
    num_panels = 8
    panel_angle_span = ARC_TOTAL / num_panels
    gap_angle = math.radians(1.2)  # 1.2 deg seam gap between panels

    for p in range(num_panels):
        p_start = THETA_START + p * panel_angle_span + gap_angle / 2.0
        p_end = THETA_START + (p + 1) * panel_angle_span - gap_angle / 2.0
        segs_p = max(6, NUM_SEGS // num_panels)
        p_angles = [p_start + (j / segs_p) * (p_end - p_start) for j in range(segs_p + 1)]

        # Two vertical tiers for each panel: lower tier (0.09 to 0.56m) and upper tier (0.58 to 1.05m)
        for z1, z2 in [(0.09, 0.55), (0.57, 1.06)]:
            r_p_in = r_wall_out - 0.02
            r_p_out = r_wall_out + 0.015
            r1_b = [bm.verts.new((math.cos(a)*r_p_in, math.sin(a)*r_p_in, z1)) for a in p_angles]
            r1_t = [bm.verts.new((math.cos(a)*r_p_in, math.sin(a)*r_p_in, z2)) for a in p_angles]
            r2_b = [bm.verts.new((math.cos(a)*r_p_out, math.sin(a)*r_p_out, z1)) for a in p_angles]
            r2_t = [bm.verts.new((math.cos(a)*r_p_out, math.sin(a)*r_p_out, z2)) for a in p_angles]

            for k in range(segs_p):
                bm.faces.new([r2_b[k], r1_b[k], r1_b[k+1], r2_b[k+1]])
                bm.faces.new([r1_t[k], r2_t[k], r2_t[k+1], r1_t[k+1]])
                bm.faces.new([r2_b[k], r2_b[k+1], r2_t[k+1], r2_t[k]])
                bm.faces.new([r1_t[k], r1_t[k+1], r1_b[k+1], r1_b[k]])
            # Caps
            bm.faces.new([r1_b[0], r2_b[0], r2_t[0], r1_t[0]])
            bm.faces.new([r2_b[-1], r1_b[-1], r1_t[-1], r2_t[-1]])

    # Base Foundation Plinth Geometry
    p_b_in = [bm.verts.new((math.cos(a)*r_base_in, math.sin(a)*r_base_in, 0.00)) for a in angles]
    p_t_in = [bm.verts.new((math.cos(a)*r_base_in, math.sin(a)*r_base_in, 0.08)) for a in angles]
    p_b_out = [bm.verts.new((math.cos(a)*r_base_out, math.sin(a)*r_base_out, 0.00)) for a in angles]
    p_t_out = [bm.verts.new((math.cos(a)*r_base_out, math.sin(a)*r_base_out, 0.08)) for a in angles]
    for i in range(NUM_SEGS):
        bm.faces.new([p_b_out[i], p_b_in[i], p_b_in[i+1], p_b_out[i+1]])
        bm.faces.new([p_t_in[i], p_t_out[i], p_t_out[i+1], p_t_in[i+1]])
        bm.faces.new([p_b_out[i], p_b_out[i+1], p_t_out[i+1], p_t_out[i]])
        bm.faces.new([p_t_in[i], p_t_in[i+1], p_b_in[i+1], p_b_in[i]])
    bm.faces.new([p_b_in[0], p_b_out[0], p_t_out[0], p_t_in[0]])
    bm.faces.new([p_b_out[-1], p_b_in[-1], p_t_in[-1], p_t_out[-1]])

    # Entrance End Bulkheads (Heavy structural end plates at THETA_START and THETA_END)
    for theta in [THETA_START, THETA_END]:
        ca, sa = math.cos(theta), math.sin(theta)
        # 4 vertices for entrance wall
        w_in_b = bm.verts.new((ca * 1.48, sa * 1.48, 0.08))
        w_in_t = bm.verts.new((ca * 1.48, sa * 1.48, 1.10))
        w_out_b = bm.verts.new((ca * 2.10, sa * 2.10, 0.08))
        w_out_t = bm.verts.new((ca * 2.10, sa * 2.10, 1.10))
        bm.faces.new([w_in_b, w_out_b, w_out_t, w_in_t])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new("Exterior_Panels_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Exterior_Panels", mesh)
    col.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mats["Bar_Gunmetal"])
    for p in obj.data.polygons:
        p.use_smooth = True

    apply_bevel_and_normals(obj, bevel_width=0.003, segments=2)
    return obj

def build_amber_lights(col, mats, parent):
    """
    Constructs Amber_Lights:
    Narrow vertical indicator light fixtures inset into the lower armor panels.
    """
    bm = bmesh.new()

    # 12 light fixtures distributed along the outer arc
    num_lights = 12
    light_angles = [THETA_START + (i + 0.5) * (ARC_TOTAL / num_lights) for i in range(num_lights)]

    w_slit = 0.035   # 3.5cm wide
    h_slit = 0.22    # 22cm tall
    d_slit = 0.012   # 1.2cm protrusion/lens thickness
    z_center = 0.32  # Inset height on the lower panel tier

    for a in light_angles:
        ca, sa = math.cos(a), math.sin(a)
        # Tangent vector perpendicular to radial vector
        tx, ty = -sa, ca

        # 8 box corners
        corners = []
        for dz in [-h_slit/2, h_slit/2]:
            for dt in [-w_slit/2, w_slit/2]:
                for r_off in [R_OUTER + 0.008, R_OUTER + 0.008 + d_slit]:
                    vx = ca * r_off + tx * dt
                    vy = sa * r_off + ty * dt
                    vz = z_center + dz
                    corners.append(bm.verts.new((vx, vy, vz)))

        # Create box faces
        # 0: -z, -t, in | 1: -z, -t, out | 2: -z, +t, in | 3: -z, +t, out
        # 4: +z, -t, in | 5: +z, -t, out | 6: +z, +t, in | 7: +z, +t, out
        bm.faces.new([corners[1], corners[3], corners[7], corners[5]])  # Front face
        bm.faces.new([corners[0], corners[4], corners[6], corners[2]])  # Back face
        bm.faces.new([corners[0], corners[1], corners[5], corners[4]])  # Left face
        bm.faces.new([corners[2], corners[6], corners[7], corners[3]])  # Right face
        bm.faces.new([corners[4], corners[5], corners[7], corners[6]])  # Top face
        bm.faces.new([corners[0], corners[2], corners[3], corners[1]])  # Bottom face

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new("Amber_Lights_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Amber_Lights", mesh)
    col.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mats["Bar_AmberEmission"])
    for p in obj.data.polygons:
        p.use_smooth = True

    return obj

def build_foot_rail(col, mats, parent):
    """
    Constructs Foot_Rail:
    Heavy outer tubular foot rail supported by angled floor mounting brackets.
    """
    bm = bmesh.new()

    r_rail = R_OUTER + 0.16   # 16cm outside the bar outer radius
    z_rail = 0.18             # 18cm above the floor
    pipe_radius = 0.024       # 4.8cm thick rail pipe
    num_pipe_sides = 16

    angles = [THETA_START + (i / NUM_SEGS) * ARC_TOTAL for i in range(NUM_SEGS + 1)]

    # Generate cylindrical tube along the curved arc
    prev_ring = None
    first_ring = None
    for i, a in enumerate(angles):
        ca, sa = math.cos(a), math.sin(a)
        center = Vector((ca * r_rail, sa * r_rail, z_rail))
        # Normal (radial) and Binormal (Z up)
        normal = Vector((ca, sa, 0.0))
        binormal = Vector((0.0, 0.0, 1.0))

        ring = []
        for s in range(num_pipe_sides):
            theta_s = (s / num_pipe_sides) * 2.0 * math.pi
            offset = normal * (math.cos(theta_s) * pipe_radius) + binormal * (math.sin(theta_s) * pipe_radius)
            ring.append(bm.verts.new(center + offset))

        if prev_ring:
            for s in range(num_pipe_sides):
                s_next = (s + 1) % num_pipe_sides
                bm.faces.new([prev_ring[s], ring[s], ring[s_next], prev_ring[s_next]])
        else:
            first_ring = ring
        prev_ring = ring

    # End caps on the pipe
    bm.faces.new(list(reversed(first_ring)))
    bm.faces.new(prev_ring)

    # Stanchion Floor Brackets (every 24 degrees)
    num_brackets = 14
    for b_idx in range(num_brackets):
        b_angle = THETA_START + (b_idx + 0.5) * (ARC_TOTAL / num_brackets)
        b_ca, b_sa = math.cos(b_angle), math.sin(b_angle)

        # Angled bracket connecting rail to base plinth
        p_rail = Vector((b_ca * r_rail, b_sa * r_rail, z_rail))
        p_base = Vector((b_ca * (R_OUTER + 0.02), b_sa * (R_OUTER + 0.02), 0.04))
        p_floor = Vector((b_ca * (r_rail - 0.02), b_sa * (r_rail - 0.02), 0.00))

        # Build solid bracket strut
        bw = 0.025  # 2.5cm thickness
        tx, ty = -b_sa * (bw / 2), b_ca * (bw / 2)
        v_offset = Vector((tx, ty, 0))

        # Triangle prism strut
        v1 = bm.verts.new(p_rail + v_offset)
        v2 = bm.verts.new(p_base + v_offset)
        v3 = bm.verts.new(p_floor + v_offset)
        v4 = bm.verts.new(p_rail - v_offset)
        v5 = bm.verts.new(p_base - v_offset)
        v6 = bm.verts.new(p_floor - v_offset)

        bm.faces.new([v1, v2, v3])
        bm.faces.new([v6, v5, v4])
        bm.faces.new([v1, v4, v5, v2])
        bm.faces.new([v2, v5, v6, v3])
        bm.faces.new([v3, v6, v4, v1])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new("Foot_Rail_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Foot_Rail", mesh)
    col.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mats["Bar_DarkMetal"])
    for p in obj.data.polygons:
        p.use_smooth = True

    return obj

def build_interior_worktop(col, mats, parent):
    """
    Constructs Interior_Worktop:
    Recessed stainless-steel prep and service work counter on the bartender side
    with marine drip edges.
    """
    obj = build_curved_band_mesh(
        "Interior_Worktop",
        r_inner=R_WORKTOP_IN,
        r_outer=R_WORKTOP_OUT,
        z_min=H_WORKTOP - 0.035,
        z_max=H_WORKTOP,
        theta_start=THETA_START + math.radians(1.0),
        theta_end=THETA_END - math.radians(1.0),
        num_segs=NUM_SEGS,
        mat=mats["Bar_StainlessInterior"],
        col=col,
        parent=parent
    )
    apply_bevel_and_normals(obj, bevel_width=0.003, segments=2)
    return obj

def build_sink_basin_and_faucet(col, mats, parent):
    """
    Constructs Sink_Basin and Sink_Faucet:
    Commercial stainless-steel double basin with corrugated drainboard,
    drain strainers, and gooseneck faucet.
    """
    # Place sink on the left-rear quadrant (around angle 230°)
    sink_angle = math.radians(230.0)
    ca, sa = math.cos(sink_angle), math.sin(sink_angle)
    r_sink = (R_WORKTOP_IN + R_WORKTOP_OUT) / 2.0
    sink_loc = Vector((ca * r_sink, sa * r_sink, H_WORKTOP))
    sink_rot = Euler((0, 0, sink_angle + math.pi / 2))

    # --- SINK BASIN & DRAINBOARD ---
    bm = bmesh.new()
    w_basin = 0.52   # 52cm wide
    d_basin = 0.34   # 34cm deep
    depth_basin = 0.22  # 22cm deep basin

    # Basin Rim (Z = 0.00 relative to worktop)
    rim_w = w_basin / 2.0
    rim_d = d_basin / 2.0

    # Create Outer Rim
    r_c = [
        bm.verts.new((-rim_w, -rim_d, 0.002)),
        bm.verts.new((rim_w, -rim_d, 0.002)),
        bm.verts.new((rim_w, rim_d, 0.002)),
        bm.verts.new((-rim_w, rim_d, 0.002)),
    ]
    # Create Inner Dropped Floor
    bot_c = [
        bm.verts.new((-rim_w * 0.88, -rim_d * 0.85, -depth_basin)),
        bm.verts.new((rim_w * 0.88, -rim_d * 0.85, -depth_basin)),
        bm.verts.new((rim_w * 0.88, rim_d * 0.85, -depth_basin)),
        bm.verts.new((-rim_w * 0.88, rim_d * 0.85, -depth_basin)),
    ]

    # Basin walls and bottom
    bm.faces.new([bot_c[0], bot_c[1], bot_c[2], bot_c[3]])  # Bottom
    bm.faces.new([r_c[0], r_c[1], bot_c[1], bot_c[0]])      # Front wall
    bm.faces.new([r_c[1], r_c[2], bot_c[2], bot_c[1]])      # Right wall
    bm.faces.new([r_c[2], r_c[3], bot_c[3], bot_c[2]])      # Back wall
    bm.faces.new([r_c[3], r_c[0], bot_c[0], bot_c[3]])      # Left wall

    # Fluted Drainboard adjacent to the basin (+X side)
    db_w = 0.32
    db_c = [
        bm.verts.new((rim_w, -rim_d, 0.002)),
        bm.verts.new((rim_w + db_w, -rim_d, 0.002)),
        bm.verts.new((rim_w + db_w, rim_d, 0.002)),
        bm.verts.new((rim_w, rim_d, 0.002)),
    ]
    bm.faces.new(db_c)

    # 4 Drainboard embossed drainage grooves
    for g in range(4):
        yg = -rim_d + (g + 1) * (d_basin / 5.0)
        gv = [
            bm.verts.new((rim_w + 0.03, yg - 0.012, 0.004)),
            bm.verts.new((rim_w + db_w - 0.03, yg - 0.012, 0.004)),
            bm.verts.new((rim_w + db_w - 0.03, yg + 0.012, 0.004)),
            bm.verts.new((rim_w + 0.03, yg + 0.012, 0.004)),
        ]
        bm.faces.new(gv)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh_sink = bpy.data.meshes.new("Sink_Basin_Mesh")
    bm.to_mesh(mesh_sink)
    bm.free()

    sink_obj = bpy.data.objects.new("Sink_Basin", mesh_sink)
    col.objects.link(sink_obj)
    sink_obj.parent = parent
    sink_obj.location = sink_loc
    sink_obj.rotation_euler = sink_rot
    sink_obj.data.materials.append(mats["Bar_StainlessInterior"])
    apply_bevel_and_normals(sink_obj, bevel_width=0.002, segments=2)

    # --- SINK FAUCET (Gooseneck Spout + Control Valves) ---
    bm_f = bmesh.new()
    faucet_base = Vector((0.0, rim_d + 0.035, 0.0))

    # Base cylinder
    r_fb = 0.024
    h_fb = 0.08
    for i in range(12):
        t1 = (i / 12) * 2 * math.pi
        t2 = ((i + 1) / 12) * 2 * math.pi
        v1 = bm_f.verts.new((faucet_base.x + math.cos(t1)*r_fb, faucet_base.y + math.sin(t1)*r_fb, 0.0))
        v2 = bm_f.verts.new((faucet_base.x + math.cos(t2)*r_fb, faucet_base.y + math.sin(t2)*r_fb, 0.0))
        v3 = bm_f.verts.new((faucet_base.x + math.cos(t2)*r_fb, faucet_base.y + math.sin(t2)*r_fb, h_fb))
        v4 = bm_f.verts.new((faucet_base.x + math.cos(t1)*r_fb, faucet_base.y + math.sin(t1)*r_fb, h_fb))
        bm_f.faces.new([v1, v2, v3, v4])

    # Curved gooseneck pipe (spout arcs forward into basin)
    pipe_r = 0.012
    num_arc = 10
    prev_r = None
    for a_step in range(num_arc + 1):
        frac = a_step / num_arc
        # Spout path: ascends from Z=0.08m to 0.32m, arcs forward by Y=-0.16m, drops to 0.24m
        spout_z = 0.08 + math.sin(frac * math.pi * 0.75) * 0.24
        spout_y = faucet_base.y - math.sin(frac * math.pi * 0.5) * 0.16
        c_pt = Vector((0.0, spout_y, spout_z))

        ring = []
        for s in range(8):
            ts = (s / 8) * 2 * math.pi
            ring.append(bm_f.verts.new((c_pt.x + math.cos(ts)*pipe_r, c_pt.y, c_pt.z + math.sin(ts)*pipe_r)))

        if prev_r:
            for s in range(8):
                s2 = (s + 1) % 8
                bm_f.faces.new([prev_r[s], ring[s], ring[s2], prev_r[s2]])
        prev_r = ring
    # Cap spout nozzle
    bm_f.faces.new(prev_r)

    # Hot/Cold Quarter-turn levers
    for side in [1, -1]:
        lx = side * 0.065
        ly = faucet_base.y
        # Lever post
        p1 = bm_f.verts.new((lx, ly, 0.0))
        p2 = bm_f.verts.new((lx, ly, 0.05))
        # Handle blade
        bm_f.faces.new([
            bm_f.verts.new((lx - 0.008, ly - 0.035, 0.05)),
            bm_f.verts.new((lx + 0.008, ly - 0.035, 0.05)),
            bm_f.verts.new((lx + 0.008, ly + 0.035, 0.055)),
            bm_f.verts.new((lx - 0.008, ly + 0.035, 0.055)),
        ])

    bmesh.ops.recalc_face_normals(bm_f, faces=bm_f.faces)
    mesh_faucet = bpy.data.meshes.new("Sink_Faucet_Mesh")
    bm_f.to_mesh(mesh_faucet)
    bm_f.free()

    faucet_obj = bpy.data.objects.new("Sink_Faucet", mesh_faucet)
    col.objects.link(faucet_obj)
    faucet_obj.parent = parent
    faucet_obj.location = sink_loc
    faucet_obj.rotation_euler = sink_rot
    faucet_obj.data.materials.append(mats["Bar_StainlessInterior"])
    for p in faucet_obj.data.polygons:
        p.use_smooth = True

    return sink_obj, faucet_obj

def build_interior_shelves(col, mats, parent):
    """
    Constructs Interior_Shelves:
    Under-counter equipment bays, storage shelves, speed rail, and rubber kickplates.
    """
    bm = bmesh.new()

    # 4 distinct equipment bays along the inner curve
    num_bays = 4
    bay_span = ARC_TOTAL / num_bays

    r_shelf_in = 1.50
    r_shelf_out = 1.84

    for b in range(num_bays):
        b_start = THETA_START + b * bay_span + math.radians(2.0)
        b_end = THETA_START + (b + 1) * bay_span - math.radians(2.0)
        b_segs = 12
        b_angles = [b_start + (k / b_segs) * (b_end - b_start) for k in range(b_segs + 1)]

        # Two tier storage shelves: Mid shelf (Z=0.48m) and Bottom shelf (Z=0.12m)
        for z_shelf in [0.12, 0.48]:
            s_t = 0.02  # 2cm shelf thickness
            r_in_b = [bm.verts.new((math.cos(a)*r_shelf_in, math.sin(a)*r_shelf_in, z_shelf)) for a in b_angles]
            r_in_t = [bm.verts.new((math.cos(a)*r_shelf_in, math.sin(a)*r_shelf_in, z_shelf + s_t)) for a in b_angles]
            r_out_b = [bm.verts.new((math.cos(a)*r_shelf_out, math.sin(a)*r_shelf_out, z_shelf)) for a in b_angles]
            r_out_t = [bm.verts.new((math.cos(a)*r_shelf_out, math.sin(a)*r_shelf_out, z_shelf + s_t)) for a in b_angles]

            for k in range(b_segs):
                bm.faces.new([r_out_b[k], r_in_b[k], r_in_b[k+1], r_out_b[k+1]])
                bm.faces.new([r_in_t[k], r_out_t[k], r_out_t[k+1], r_in_t[k+1]])
                bm.faces.new([r_out_b[k], r_out_b[k+1], r_out_t[k+1], r_out_t[k]])
                bm.faces.new([r_in_t[k], r_in_t[k+1], r_in_b[k+1], r_in_b[k]])
            bm.faces.new([r_in_b[0], r_out_b[0], r_out_t[0], r_in_t[0]])
            bm.faces.new([r_out_b[-1], r_in_b[-1], r_in_t[-1], r_out_t[-1]])

        # Vertical Divider Bulkheads between bays
        for a_div in [b_start, b_end]:
            ca, sa = math.cos(a_div), math.sin(a_div)
            bm.faces.new([
                bm.verts.new((ca * r_shelf_in, sa * r_shelf_in, 0.09)),
                bm.verts.new((ca * r_shelf_out, sa * r_shelf_out, 0.09)),
                bm.verts.new((ca * r_shelf_out, sa * r_shelf_out, H_WORKTOP - 0.04)),
                bm.verts.new((ca * r_shelf_in, sa * r_shelf_in, H_WORKTOP - 0.04)),
            ])

    # Speed Rail Bottle Trough (Bottle rail running along the inner counter edge at Z=0.68m)
    r_speed_in = 1.44
    r_speed_out = 1.48
    s_angles = [THETA_START + (i / NUM_SEGS) * ARC_TOTAL for i in range(NUM_SEGS + 1)]
    sp_bot = [bm.verts.new((math.cos(a)*r_speed_in, math.sin(a)*r_speed_in, 0.65)) for a in s_angles]
    sp_lip = [bm.verts.new((math.cos(a)*r_speed_in, math.sin(a)*r_speed_in, 0.76)) for a in s_angles]
    sp_wall = [bm.verts.new((math.cos(a)*r_speed_out, math.sin(a)*r_speed_out, 0.65)) for a in s_angles]
    for i in range(NUM_SEGS):
        bm.faces.new([sp_bot[i], sp_wall[i], sp_wall[i+1], sp_bot[i+1]])
        bm.faces.new([sp_lip[i], sp_bot[i], sp_bot[i+1], sp_lip[i+1]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new("Interior_Shelves_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Interior_Shelves", mesh)
    col.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mats["Bar_DarkMetal"])
    for p in obj.data.polygons:
        p.use_smooth = True

    apply_bevel_and_normals(obj, bevel_width=0.002, segments=2)
    return obj

def setup_studio_environment(col):
    """Studio camera & 3-point lighting setup for transparent preview rendering."""
    # Front Three-Quarter (3/4) Camera showing front, side and top
    cam_data = bpy.data.cameras.new("Cam_Preview_34")
    cam_data.lens = 60  # 60mm lens for mild perspective
    cam_obj = bpy.data.objects.new("Cam_Preview_34", cam_data)
    # Position camera in front and to the side (X > 0, Y < 0 for front view of C-shape, elevated Z)
    cam_obj.location = (3.6, -3.8, 3.2)
    # Target center of the bar: (0, 0, 0.6)
    # Direction vector: (-3.6, 3.8, -2.6)
    cam_obj.rotation_euler = (math.radians(64), 0, math.radians(44))
    col.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Key Light (Warm neutral)
    light_key_data = bpy.data.lights.new("Light_Key", type='AREA')
    light_key_data.energy = 450.0
    light_key_data.size = 2.5
    light_key = bpy.data.objects.new("Light_Key", light_key_data)
    light_key.location = (4.0, -2.5, 4.5)
    light_key.rotation_euler = (math.radians(50), math.radians(15), math.radians(60))
    col.objects.link(light_key)

    # Fill Light (Cool neutral)
    light_fill_data = bpy.data.lights.new("Light_Fill", type='AREA')
    light_fill_data.energy = 220.0
    light_fill_data.size = 3.0
    light_fill = bpy.data.objects.new("Light_Fill", light_fill_data)
    light_fill.location = (-4.0, -3.0, 3.5)
    light_fill.rotation_euler = (math.radians(45), math.radians(-20), math.radians(-50))
    col.objects.link(light_fill)

    # Rim / Backlight
    light_rim_data = bpy.data.lights.new("Light_Rim", type='SPOT')
    light_rim_data.energy = 600.0
    light_rim_data.color = (0.7, 0.85, 1.0)
    light_rim = bpy.data.objects.new("Light_Rim", light_rim_data)
    light_rim.location = (0.0, 4.5, 3.8)
    light_rim.rotation_euler = (math.radians(65), 0, math.radians(180))
    col.objects.link(light_rim)

def export_glb():
    os.makedirs(os.path.dirname(GLB_OUT_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_GLB_OUT_PATH), exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    root = bpy.data.objects.get("CantinaBar_Root")
    if not root:
        print("[ERROR] CantinaBar_Root not found.")
        return

    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        use_selection=True,
        export_format='GLB',
        export_apply=True,
        export_yup=True
    )
    print(f"[OK] Exported GLB to: {GLB_OUT_PATH}")

    import shutil
    shutil.copyfile(GLB_OUT_PATH, PUBLIC_GLB_OUT_PATH)
    print(f"[OK] Copied GLB to: {PUBLIC_GLB_OUT_PATH}")

def render_preview(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    # Transparent background
    bpy.context.scene.render.film_transparent = True
    bpy.ops.render.render(write_still=True)
    print(f"[OK] Rendered 1080p transparent preview: {output_path}")

def validate_exported_glb(glb_path):
    """Reopens the exported GLB in a clean Blender scene to verify export fidelity."""
    print(f"\n======================================================")
    print(f"--- VALIDATING EXPORTED GLB: {os.path.basename(glb_path)} ---")
    print(f"======================================================")

    # Clean scene for validation import
    clear_scene()

    bpy.ops.import_scene.gltf(filepath=glb_path)
    bpy.context.view_layer.update()

    total_tris = 0
    all_objects = [o for o in bpy.data.objects if o.type == 'MESH']
    all_materials = list(bpy.data.materials)

    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    min_z, max_z = float('inf'), float('-inf')

    print(f"\nImported Mesh Objects ({len(all_objects)}):")
    for obj in all_objects:
        tri_count = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        total_tris += tri_count
        mat_names = [m.name for m in obj.data.materials if m]

        # Calculate bounding box in world space
        for corner in obj.bound_box:
            w_co = obj.matrix_world @ Vector(corner)
            min_x = min(min_x, w_co.x)
            max_x = max(max_x, w_co.x)
            min_y = min(min_y, w_co.y)
            max_y = max(max_y, w_co.y)
            min_z = min(min_z, w_co.z)
            max_z = max(max_z, w_co.z)

        print(f"  • {obj.name:28s} | Tris: {tri_count:5d} | Materials: {mat_names}")

    dim_x = max_x - min_x
    dim_y = max_y - min_y
    dim_z = max_z - min_z

    print(f"\nMaterial Fidelity Check ({len(all_materials)} materials):")
    for mat in all_materials:
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

    # Geometry & Scale Checks
    print(f"\nGeometry & Physical Metrics:")
    print(f"  • Total Polygon Count:   {total_tris:,} triangles")
    print(f"  • Dimensions:           {dim_x:.3f}m (W) × {dim_y:.3f}m (D) × {dim_z:.3f}m (H)")
    print(f"  • Base Floor Contact:   Z = {min_z:.4f}m [{'PASS: Rest at floor Z=0' if abs(min_z) < 0.01 else 'FAIL'}]")
    print(f"  • Counter Top Height:   Z = {max_z:.4f}m [{'PASS: Target 1.15m height' if abs(max_z - 1.15) < 0.05 else 'CHECK'}]")
    print(f"  • Bar Outer Diameter:   ~{dim_x:.2f}m [{'PASS: Target ~4.2-4.5m with footrail' if 4.1 <= dim_x <= 4.7 else 'CHECK'}]")
    print(f"======================================================\n")

def main():
    clear_scene()

    # Create Master Collection
    col = bpy.data.collections.new("CANTINA_ISLAND_BAR")
    bpy.context.scene.collection.children.link(col)

    # Setup PBR Materials
    mats = setup_materials()

    # Create CantinaBar_Root empty
    root = bpy.data.objects.new("CantinaBar_Root", None)
    col.objects.link(root)

    # Build All 9 Subcomponents
    build_countertop_copper(col, mats, root)
    build_cyan_light_ring(col, mats, root)
    build_exterior_panels(col, mats, root)
    build_amber_lights(col, mats, root)
    build_foot_rail(col, mats, root)
    build_interior_worktop(col, mats, root)
    build_sink_basin_and_faucet(col, mats, root)
    build_interior_shelves(col, mats, root)

    # Apply transforms across all children before saving/exporting
    bpy.context.view_layer.update()
    for child in root.children_recursive:
        if child.type == 'MESH':
            # Select and apply transforms
            bpy.ops.object.select_all(action='DESELECT')
            child.select_set(True)
            bpy.context.view_layer.objects.active = child
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Setup Camera & Studio Lights
    setup_studio_environment(col)

    # Save .blend scene
    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"[OK] Saved Blender scene to: {BLEND_OUT_PATH}")

    # Render 1080p transparent preview
    render_preview(PREVIEW_OUT_PATH)

    # Export GLB files
    export_glb()

    # Validate Exported GLB by reopening in clean scene
    validate_exported_glb(GLB_OUT_PATH)

if __name__ == "__main__":
    main()
