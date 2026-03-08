import { motion, useReducedMotion } from "framer-motion";
import { useMemo, type PointerEvent } from "react";
import type { PortalNode } from "../data/portalNodes";

interface PrimaryNodeProps {
  node: PortalNode;
  position: { x: number; y: number };
  orbitBiasAngle: number;
  depth: number;
  highlighted: boolean;
  expanded: boolean;
  hoveredSubitemIndex: number | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSubitemHover: (index: number | null) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}

export default function PrimaryNode({
  node,
  position,
  orbitBiasAngle,
  depth,
  highlighted,
  expanded,
  hoveredSubitemIndex,
  onHoverStart,
  onHoverEnd,
  onSubitemHover,
  onPointerDown,
  onClick,
}: PrimaryNodeProps) {
  const reduceMotion = useReducedMotion();
  const orbitRadius = node.subItems.length >= 5 ? 108 : 94;

  const shapeVariants: Record<PortalNode["id"], string> = {
    research: "rounded-[34%_66%_57%_43%/41%_31%_69%_59%]",
    resources: "rounded-[63%_37%_31%_69%/52%_66%_34%_48%]",
    community: "rounded-[41%_59%_68%_32%/63%_37%_54%_46%]",
    team: "rounded-[69%_31%_46%_54%/35%_64%_36%_65%]",
    founder: "rounded-[38%_62%_28%_72%/68%_43%_57%_32%]",
  };

  const toneVariants: Record<PortalNode["id"], string> = {
    research: "bg-[radial-gradient(circle_at_40%_34%,rgba(236,241,250,0.14),rgba(26,28,34,0.96)_70%)]",
    resources: "bg-[radial-gradient(circle_at_40%_34%,rgba(234,239,248,0.13),rgba(25,27,33,0.96)_70%)]",
    community: "bg-[radial-gradient(circle_at_40%_34%,rgba(237,242,251,0.14),rgba(27,29,35,0.96)_70%)]",
    team: "bg-[radial-gradient(circle_at_40%_34%,rgba(233,238,247,0.13),rgba(24,26,32,0.96)_70%)]",
    founder: "bg-[radial-gradient(circle_at_40%_34%,rgba(236,241,250,0.14),rgba(28,30,36,0.96)_70%)]",
  };

  // Expand labels along a biased arc toward the center to avoid overlap and clipping.
  const orbitalPoints = useMemo(() => {
    const count = node.subItems.length;
    const arcSpan = Math.min(Math.PI * 1.18, Math.PI * 0.72 + count * 0.24);
    const safeCount = Math.max(1, count - 1);
    const start = orbitBiasAngle - arcSpan / 2;

    const minGap = count >= 5 ? 30 : 24;
    const polar = node.subItems.map((_, index) => {
      const ratio = safeCount === 0 ? 0.5 : index / safeCount;
      const angle = start + arcSpan * ratio;
      const layeredRadius = count >= 5 ? orbitRadius + (index % 2 === 0 ? 8 : -6) : orbitRadius;
      return { angle, radius: layeredRadius };
    });

    // Two lightweight passes: push neighbors outward if their projected spacing is too tight.
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 1; i < polar.length; i += 1) {
        const prev = polar[i - 1];
        const current = polar[i];
        const p1x = Math.cos(prev.angle) * prev.radius;
        const p1y = Math.sin(prev.angle) * prev.radius;
        const p2x = Math.cos(current.angle) * current.radius;
        const p2y = Math.sin(current.angle) * current.radius;
        const gap = Math.hypot(p2x - p1x, p2y - p1y);

        if (gap < minGap) {
          current.radius += (minGap - gap) * 0.95;
        }
      }
    }

    return polar.map((entry) => {
      return {
        x: Math.cos(entry.angle) * entry.radius,
        y: Math.sin(entry.angle) * entry.radius,
      };
    });
  }, [node.subItems, orbitBiasAngle, orbitRadius]);

  return (
    <motion.div
      className="absolute"
      data-neuron-root
      initial={false}
      animate={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        x: "-50%",
        y: "-50%",
      }}
      transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.42 }}
      onMouseEnter={onHoverStart}
      onMouseLeave={() => onHoverEnd()}
    >
      <motion.button
        type="button"
        className={`group relative flex h-[7.45rem] w-[8.35rem] cursor-grab items-center justify-center border border-zinc-100/24 text-center shadow-[0_10px_24px_rgba(4,6,12,0.58)] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100/70 active:cursor-grabbing ${shapeVariants[node.id]} ${toneVariants[node.id]}`}
        onFocus={onHoverStart}
        onBlur={onHoverEnd}
        onPointerDown={onPointerDown}
        onClick={onClick}
        initial={false}
        animate={{
          scale: highlighted ? 1.06 : 1,
          boxShadow: highlighted
            ? "0 12px 26px rgba(6, 9, 18, 0.62)"
            : "0 8px 20px rgba(5, 8, 16, 0.54)",
          rotate: reduceMotion ? 0 : [0, 1.2, -0.8, 0],
          y: reduceMotion ? 0 : [0, -1.5 * depth, 0],
        }}
        transition={
          reduceMotion
            ? { duration: 0.2 }
            : {
                rotate: {
                  duration: 9 + depth,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                y: {
                  duration: 6 + depth,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                scale: { duration: 0.2 },
              }
        }
        aria-expanded={expanded}
        aria-label={`${node.label}: ${node.shortDescription}`}
      >
        <span className="pointer-events-none absolute inset-[-8px] rounded-[54%_46%_61%_39%/38%_61%_39%_62%] border border-zinc-100/16" />
        <motion.span
          layoutId={`node-title-${node.id}`}
          className="font-tech relative z-10 text-[0.81rem] font-semibold tracking-[0.08em] text-zinc-100/90"
        >
          {node.label}
        </motion.span>
      </motion.button>

      {node.subItems.map((item, index) => {
        const point = orbitalPoints[index];
        const isSubHighlighted = hoveredSubitemIndex === index;
        const isSubDimmed = hoveredSubitemIndex !== null && hoveredSubitemIndex !== index;
        return (
          <motion.a
            key={`${node.id}-${item}`}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            className={`absolute left-1/2 top-1/2 z-[2] min-w-[5.8rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-100/24 bg-[radial-gradient(circle_at_38%_26%,rgba(239,243,250,0.14),rgba(21,22,28,0.9)_64%)] px-3 py-1.5 text-center text-[0.63rem] tracking-wide text-zinc-100/94 shadow-[0_8px_18px_rgba(6,8,14,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200/85 ${expanded ? "pointer-events-auto" : "pointer-events-none"}`}
            tabIndex={expanded ? 0 : -1}
            initial={false}
            animate={{
              opacity: expanded ? (isSubDimmed ? 0.42 : 1) : 0,
              scale: expanded ? (isSubHighlighted ? 1.1 : 1) : 0.72,
              x: expanded ? point.x : 0,
              y: expanded ? point.y : 0,
              boxShadow: isSubHighlighted
                ? "0 0 26px rgba(239, 243, 252, 0.46)"
                : "0 0 16px rgba(209,216,236,0.22)",
            }}
            transition={{ duration: 0.34, ease: "easeOut", delay: index * 0.03 }}
            onMouseEnter={() => onSubitemHover(index)}
            onMouseLeave={() => onSubitemHover(null)}
            onFocus={() => onSubitemHover(index)}
            onBlur={() => onSubitemHover(null)}
          >
            {item.label}
          </motion.a>
        );
      })}
    </motion.div>
  );
}
