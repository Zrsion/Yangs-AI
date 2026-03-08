import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import NetworkLayer from "./NetworkLayer";
import PrimaryNode from "./PrimaryNode";
import { coreNode, portalNodes, type PortalNodeId } from "../data/portalNodes";

type NodePositionMap = Record<PortalNodeId, { x: number; y: number }>;
type Point = { x: number; y: number };
type CorePosition = { x: number; y: number };

const NODE_DRAG_THRESHOLD_PX = 5;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, steps = 12) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      x: cubicAt(t, p0.x, p1.x, p2.x, p3.x),
      y: cubicAt(t, p0.y, p1.y, p2.y, p3.y),
    };
  });
}

function buildStrandSamplePoints(nodePositions: NodePositionMap, core: CorePosition) {
  const points: Point[] = [];

  portalNodes.forEach((node, nodeIndex) => {
    const pos = nodePositions[node.id];
    const dx = pos.x - core.x;
    const dy = pos.y - core.y;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    const strandCount = Math.max(1, node.subItems.length);
    const baseOffsets = Array.from({ length: strandCount }, (_, i) => {
      const mid = (strandCount - 1) / 2;
      return (i - mid) * 1.7;
    });

    Array.from({ length: strandCount }).forEach((_, strandIndex) => {
      const side = strandIndex % 2 === 0 ? 1 : -1;
      const wave = (nodeIndex + 1) * (strandIndex + 1) * 0.9;
      const base = baseOffsets[strandIndex] * side;
      const drift = Math.sin(wave) * 3.8;
      const offset = base + drift;

      const c1x = core.x * 0.67 + pos.x * 0.33 + nx * (8 + offset);
      const c1y = core.y * 0.67 + pos.y * 0.33 + ny * (8 + offset);
      const c2x = core.x * 0.33 + pos.x * 0.67 - nx * (6 - offset * 0.5);
      const c2y = core.y * 0.33 + pos.y * 0.67 - ny * (6 - offset * 0.5);

      points.push(
        ...sampleCubicBezier(core, { x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: pos.x, y: pos.y }, 12),
      );
    });
  });

  return points;
}

const DESKTOP_FIXED_LAYOUT: NodePositionMap = {
  research: { x: 35.498, y: 20.9284 },
  resources: { x: 90.1171, y: 52.313 },
  community: { x: 13.6436, y: 41.8864 },
  team: { x: 76.6481, y: 75.8675 },
  founder: { x: 32.193, y: 71.1542 },
};

function getDefaultLayout(isMobile: boolean): NodePositionMap {
  if (!isMobile) {
    return DESKTOP_FIXED_LAYOUT;
  }

  return portalNodes.reduce((acc, node) => {
    acc[node.id] = { ...node.positionMobile };
    return acc;
  }, {} as NodePositionMap);
}

function getLayoutStorageKey(isMobile: boolean) {
  return isMobile ? "yangsai-neuron-layout-mobile-v1" : "yangsai-neuron-layout-desktop-v1";
}

function getCoreStorageKey(isMobile: boolean) {
  return isMobile ? "yangsai-core-layout-mobile-v1" : "yangsai-core-layout-desktop-v1";
}

function getDefaultCorePosition(isMobile: boolean): CorePosition {
  return { x: 50, y: isMobile ? 42 : 50 };
}

function isPositionMap(value: unknown): value is NodePositionMap {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return ["research", "resources", "community", "team", "founder"].every((id) => {
    const pos = record[id] as Record<string, unknown> | undefined;
    return (
      pos &&
      typeof pos.x === "number" &&
      typeof pos.y === "number" &&
      Number.isFinite(pos.x) &&
      Number.isFinite(pos.y)
    );
  });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function isValidPlacement(
  candidate: { x: number; y: number },
  placed: Array<{ x: number; y: number }>,
  core: { x: number; y: number },
  minNodeGap: number,
  minCoreGap: number,
) {
  if (distance(candidate, core) < minCoreGap) {
    return false;
  }
  return placed.every((pos) => distance(candidate, pos) >= minNodeGap);
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export default function NeuralPortal() {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [hoveredNodeId, setHoveredNodeId] = useState<PortalNodeId | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<PortalNodeId | null>(null);
  const [hoveredSubitem, setHoveredSubitem] = useState<{ nodeId: PortalNodeId; index: number } | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const dragStateRef = useRef<{
    nodeId: PortalNodeId;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const coreDragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);

  const [nodePositions, setNodePositions] = useState<NodePositionMap>(() => getDefaultLayout(false));
  const [corePosition, setCorePosition] = useState<CorePosition>({ x: 50, y: 50 });

  useEffect(() => {
    setLayoutReady(false);
    const storageKey = getLayoutStorageKey(isMobile);
    const coreStorageKey = getCoreStorageKey(isMobile);
    const fallback = getDefaultLayout(isMobile);
    const fallbackCore = getDefaultCorePosition(isMobile);
    let nextPositions = fallback;
    let nextCore = fallbackCore;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isPositionMap(parsed)) {
          nextPositions = parsed;
        }
      }

      const coreRaw = window.localStorage.getItem(coreStorageKey);
      if (coreRaw) {
        const parsedCore = JSON.parse(coreRaw) as unknown;
        if (
          parsedCore &&
          typeof parsedCore === "object" &&
          typeof (parsedCore as Record<string, unknown>).x === "number" &&
          typeof (parsedCore as Record<string, unknown>).y === "number"
        ) {
          nextCore = {
            x: (parsedCore as Record<string, number>).x,
            y: (parsedCore as Record<string, number>).y,
          };
        }
      }
    } catch {}

    setNodePositions(nextPositions);
    setCorePosition(nextCore);
    setLayoutReady(true);
  }, [isMobile]);

  useEffect(() => {
    if (!layoutReady) {
      return;
    }
    const storageKey = getLayoutStorageKey(isMobile);
    const coreStorageKey = getCoreStorageKey(isMobile);
    window.localStorage.setItem(storageKey, JSON.stringify(nodePositions));
    window.localStorage.setItem(coreStorageKey, JSON.stringify(corePosition));
  }, [nodePositions, corePosition, isMobile, layoutReady]);

  useEffect(() => {
    if (isMobile) {
      setHoveredNodeId(null);
      setHoveredSubitem(null);
    }
  }, [isMobile]);

  useEffect(() => {
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const insideNeuron = target.closest("[data-neuron-root]");
      const insideCore = target.closest("[data-core-node]");
      const insidePanel = target.closest("[data-info-panel]");
      if (!insideNeuron && !insideCore && !insidePanel) {
        setActiveNodeId(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      const container = sectionRef.current;
      if (!drag || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const dragDistance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
      if (dragDistance < NODE_DRAG_THRESHOLD_PX) {
        return;
      }

      const nextX = event.clientX - rect.left - drag.offsetX;
      const nextY = event.clientY - rect.top - drag.offsetY;
      const nextXPct = (nextX / rect.width) * 100;
      const nextYPct = (nextY / rect.height) * 100;
      const clampedX = Math.max(8, Math.min(92, nextXPct));
      const clampedY = Math.max(10, Math.min(88, nextYPct));
      const candidate = { x: clampedX, y: clampedY };
      const core = corePosition;
      const minNodeGap = isMobile ? 22 : 18;
      const minCoreGap = isMobile ? 24 : 20;

      setNodePositions((prev) => {
        const others = (Object.entries(prev) as Array<[PortalNodeId, { x: number; y: number }]>).filter(
          ([id]) => id !== drag.nodeId,
        );
        const placed = others.map(([, pos]) => pos);

        if (!isValidPlacement(candidate, placed, core, minNodeGap, minCoreGap)) {
          return prev;
        }

        dragStateRef.current = { ...drag, moved: true };
        return {
          ...prev,
          [drag.nodeId]: candidate,
        };
      });
    };

    const handleUp = () => {
      if (dragStateRef.current) {
        window.setTimeout(() => {
          dragStateRef.current = null;
        }, 0);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [corePosition, isMobile]);

  useEffect(() => {
    const handleCoreMove = (event: PointerEvent) => {
      const drag = coreDragStateRef.current;
      const container = sectionRef.current;
      if (!drag || !container) {
        return;
      }

      const dragDistance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
      if (dragDistance < NODE_DRAG_THRESHOLD_PX) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextX = event.clientX - rect.left - drag.offsetX;
      const nextY = event.clientY - rect.top - drag.offsetY;
      const nextXPct = (nextX / rect.width) * 100;
      const nextYPct = (nextY / rect.height) * 100;
      setCorePosition({
        x: Math.max(20, Math.min(80, nextXPct)),
        y: Math.max(20, Math.min(80, nextYPct)),
      });
      coreDragStateRef.current = { ...drag, moved: true };
    };

    const handleCoreUp = () => {
      if (coreDragStateRef.current) {
        window.setTimeout(() => {
          coreDragStateRef.current = null;
        }, 0);
      }
    };

    window.addEventListener("pointermove", handleCoreMove);
    window.addEventListener("pointerup", handleCoreUp);
    return () => {
      window.removeEventListener("pointermove", handleCoreMove);
      window.removeEventListener("pointerup", handleCoreUp);
    };
  }, []);

  const handleNodePointerDown = (nodeId: PortalNodeId, event: ReactPointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    const container = sectionRef.current;
    const pos = nodePositions[nodeId];
    if (!container || !pos) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const nodeX = (pos.x / 100) * rect.width;
    const nodeY = (pos.y / 100) * rect.height;

    dragStateRef.current = {
      nodeId,
      offsetX: event.clientX - rect.left - nodeX,
      offsetY: event.clientY - rect.top - nodeY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  };

  const handleNodeClick = (nodeId: PortalNodeId) => {
    if (dragStateRef.current?.nodeId === nodeId && dragStateRef.current.moved) {
      return;
    }

    const targetNode = portalNodes.find((node) => node.id === nodeId);
    if (targetNode && targetNode.subItems.length === 0 && targetNode.links.length === 0) {
      const fallback = targetNode.fallbackLink;
      if (!fallback?.href || fallback.draft) {
        window.dispatchEvent(new CustomEvent("show-maintenance-notice"));
        return;
      }

      if (fallback.external) {
        window.open(fallback.href, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = fallback.href;
      }
      return;
    }

    setActiveNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleCorePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const container = sectionRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const coreX = (corePosition.x / 100) * rect.width;
    const coreY = (corePosition.y / 100) * rect.height;
    coreDragStateRef.current = {
      offsetX: event.clientX - rect.left - coreX,
      offsetY: event.clientY - rect.top - coreY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  };

  const hoveredNode = useMemo(
    () => portalNodes.find((node) => node.id === hoveredNodeId) ?? null,
    [hoveredNodeId],
  );

  const activeNode = useMemo(
    () => portalNodes.find((node) => node.id === activeNodeId) ?? null,
    [activeNodeId],
  );

  const infoNode = hoveredNode ?? activeNode;

  const panelLinks = useMemo(() => {
    if (!infoNode) {
      return [];
    }

    if (infoNode.subItems.length === 0 && infoNode.links.length === 0) {
      return [];
    }

    return infoNode.links.map((link) => ({
      label: link.label,
      href: link.href,
      external: link.external,
      draft: link.draft,
    }));
  }, [infoNode]);

  const fireflies = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const x = ((i * 31) % 100) + ((i % 4) - 1.5) * 1.25;
        const y = ((i * 23) % 100) + ((i % 5) - 2) * 1.15;
        const sizeRem = 0.14 + (i % 4) * 0.07;
        const alpha = 0.2 + (i % 5) * 0.075;
        const driftX = ((i % 3) - 1) * (0.6 + (i % 4) * 0.26);
        const driftY = ((i % 4) - 1.5) * (0.8 + (i % 5) * 0.22);
        const duration = 3.8 + (i % 6) * 0.75;
        const delay = (i % 7) * 0.24;
        return { x, y, sizeRem, alpha, driftX, driftY, duration, delay };
      }),
    [],
  );

  const strandSamplePoints = useMemo(
    () => buildStrandSamplePoints(nodePositions, corePosition),
    [nodePositions, corePosition],
  );

  const firefliesWithAttraction = useMemo(() => {
    const influenceRadius = isMobile ? 7.2 : 6.6;

    // Fireflies brighten near sampled neural strands to feel subtly "drawn" by the network.
    return fireflies.map((firefly) => {
      let minDist = Number.POSITIVE_INFINITY;

      for (const sample of strandSamplePoints) {
        const dx = firefly.x - sample.x;
        const dy = firefly.y - sample.y;
        const d = Math.hypot(dx, dy);
        if (d < minDist) {
          minDist = d;
        }
      }

      const attraction = Math.pow(clamp01(1 - minDist / influenceRadius), 1.6);
      return { ...firefly, attraction };
    });
  }, [fireflies, strandSamplePoints, isMobile]);

  // Expansion is click-driven to keep subitems open while users explore.
  const expandedNodeId = activeNodeId;

  // Convert pointer position into a tiny parallax vector for the whole network layer.
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduceMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setPointer({ x: (x - 0.5) * 2, y: (y - 0.5) * 2 });
  };

  return (
    <div className="h-full">
      <LayoutGroup id="yangs-portal-layout">
        <section
          ref={sectionRef}
          className="relative h-full min-h-[26rem] overflow-hidden rounded-2xl border border-white/20 bg-[rgba(18,18,22,0.52)] shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            setPointer({ x: 0, y: 0 });
            setHoveredNodeId(null);
            setHoveredSubitem(null);
          }}
          aria-label="YangsAI neural portal"
        >
      <motion.div
        className="absolute inset-0"
        animate={{
          x: reduceMotion ? 0 : pointer.x * 8,
          y: reduceMotion ? 0 : pointer.y * 8,
        }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,252,255,0.12),transparent_60%)]" />
        <div className="absolute left-[14%] top-[18%] h-56 w-56 rounded-full bg-white/14 blur-3xl" />
        <div className="absolute right-[8%] top-[6%] h-72 w-72 rounded-full bg-zinc-200/12 blur-3xl" />
        <div className="absolute bottom-[8%] left-[44%] h-56 w-56 rounded-full bg-zinc-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {firefliesWithAttraction.map((firefly, index) => (
            <motion.span
              key={`firefly-${index}`}
              className="absolute rounded-full bg-zinc-100"
              style={{
                left: `${firefly.x}%`,
                top: `${firefly.y}%`,
                width: `${firefly.sizeRem}rem`,
                height: `${firefly.sizeRem}rem`,
              }}
              initial={false}
              animate={
                reduceMotion
                  ? {
                      x: 0,
                      y: 0,
                      opacity: firefly.alpha + firefly.attraction * 0.2,
                      scale: 1 + firefly.attraction * 0.18,
                    }
                  : {
                      x: [0, firefly.driftX * 8, 0],
                      y: [0, firefly.driftY * 8, 0],
                      opacity: [
                        firefly.alpha * (0.42 + firefly.attraction * 0.2),
                        firefly.alpha + firefly.attraction * 0.32,
                        firefly.alpha * (0.55 + firefly.attraction * 0.24),
                      ],
                      scale: [1, 1.08 + firefly.attraction * 0.36, 1],
                    }
              }
              transition={{
                duration: firefly.duration,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: firefly.delay,
              }}
            />
          ))}
        </div>
      </motion.div>

      <div className="absolute inset-x-0 top-0 bottom-24">
      <NetworkLayer
        nodes={portalNodes}
        nodePositions={nodePositions}
        corePosition={corePosition}
        hoveredId={hoveredNodeId}
        activeId={activeNodeId}
        hoveredSubitem={hoveredSubitem}
        isMobile={isMobile}
      />

      <div className="absolute inset-0 z-20">
        {portalNodes.map((node, index) => {
          const position = nodePositions[node.id];
          const highlighted = hoveredNodeId === node.id || activeNodeId === node.id;
          const orbitBiasAngle = Math.atan2(corePosition.y - position.y, corePosition.x - position.x);

          return (
            <PrimaryNode
              key={node.id}
              node={node}
              position={position}
              orbitBiasAngle={orbitBiasAngle}
              depth={1 + (index % 3)}
              highlighted={highlighted}
              expanded={expandedNodeId === node.id}
              hoveredSubitemIndex={hoveredSubitem?.nodeId === node.id ? hoveredSubitem.index : null}
              // Desktop uses hover-to-expand, mobile uses tap-to-expand only.
              onHoverStart={() => {
                setHoveredNodeId(node.id);
              }}
              onHoverEnd={() => {
                setHoveredNodeId(null);
                setHoveredSubitem(null);
              }}
              onSubitemHover={(index) => {
                if (index === null) {
                  setHoveredSubitem(null);
                  return;
                }
                setHoveredNodeId(node.id);
                setHoveredSubitem({ nodeId: node.id, index });
              }}
              onPointerDown={(event) => handleNodePointerDown(node.id, event)}
              onClick={() => handleNodeClick(node.id)}
            />
          );
        })}
      </div>

      <motion.div
        className="absolute z-20 flex h-20 w-24 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-[58%_42%_49%_51%/48%_56%_44%_52%] border border-zinc-100/24 bg-[radial-gradient(circle_at_42%_36%,rgba(236,241,249,0.1),rgba(23,24,30,0.94)_64%)] text-center shadow-[0_8px_22px_rgba(4,6,12,0.54)] backdrop-blur-sm active:cursor-grabbing md:h-24 md:w-28"
        style={{ left: `${corePosition.x}%`, top: `${corePosition.y}%` }}
        onPointerDown={handleCorePointerDown}
        animate={{
          rotate: reduceMotion ? 0 : [0, 0.9, -0.8, 0],
          boxShadow: reduceMotion
            ? "0 10px 24px rgba(6,10,18,0.56)"
            : [
              "0 8px 22px rgba(6,10,18,0.5)",
              "0 11px 28px rgba(8,12,20,0.62)",
              "0 8px 22px rgba(6,10,18,0.5)",
              ],
        }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        aria-label={coreNode.shortDescription}
        role="button"
        tabIndex={0}
        data-core-node
        onClick={() => {
          if (coreDragStateRef.current?.moved) {
            return;
          }
          setActiveNodeId(null);
          setHoveredSubitem(null);
          setHoveredNodeId(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setActiveNodeId(null);
            setHoveredSubitem(null);
            setHoveredNodeId(null);
          }
        }}
      >
        <span className="font-tech relative z-10 text-xs font-semibold tracking-[0.16em] text-zinc-100/88 md:text-sm">
          {coreNode.label}
        </span>
      </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.aside
          key={infoNode?.id ?? "core"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute bottom-2 left-1/2 z-40 w-[min(90vw,24rem)] -translate-x-1/2 rounded-2xl border border-zinc-100/18 bg-[rgba(24,24,28,0.82)] p-3 backdrop-blur-md"
          data-info-panel
        >
          <p className="mb-1 text-sm font-semibold tracking-wide text-zinc-100">
            {infoNode?.label ?? coreNode.label}
          </p>
          <p className="mb-2 text-xs leading-relaxed text-zinc-300/92">
            {infoNode?.shortDescription ?? coreNode.shortDescription}
          </p>
          {infoNode?.detailDescription && infoNode.detailDescription !== infoNode.shortDescription ? (
            <p className="mb-2 text-xs leading-relaxed text-zinc-400/92">{infoNode.detailDescription}</p>
          ) : null}
          {panelLinks.length > 0 ? (
            <>
              <p className="mb-1 text-[0.65rem] uppercase tracking-[0.12em] text-zinc-300/64">Curated Links</p>
              <div className="flex flex-wrap gap-2">
                {panelLinks.map((link) => (
                  <a
                    key={`${link.label}-${link.href}`}
                    href={link.href || "#"}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                    data-draft-link={link.draft || !link.href ? "true" : undefined}
                    className="rounded-xl border border-zinc-100/24 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/85"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </motion.aside>
      </AnimatePresence>

      <button
        type="button"
        className="absolute bottom-2 right-2 z-50 cursor-pointer rounded-lg border border-zinc-100/24 bg-[rgba(20,20,24,0.88)] px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.12em] text-zinc-200 hover:bg-zinc-100/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/85"
        onClick={() => {
          setNodePositions(getDefaultLayout(isMobile));
          setCorePosition(getDefaultCorePosition(isMobile));
        }}
      >
        Reset Layout
      </button>
        </section>
      </LayoutGroup>
    </div>
  );
}
