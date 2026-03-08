import { motion, useReducedMotion } from "framer-motion";
import type { PortalNode } from "../data/portalNodes";

interface NetworkLayerProps {
  nodes: PortalNode[];
  nodePositions: Record<string, { x: number; y: number }>;
  hoveredId: string | null;
  activeId: string | null;
  hoveredSubitem: { nodeId: string; index: number } | null;
  isMobile: boolean;
}

export default function NetworkLayer({
  nodes,
  nodePositions,
  hoveredId,
  activeId,
  hoveredSubitem,
  isMobile,
}: NetworkLayerProps) {
  const reduceMotion = useReducedMotion();
  const core = { x: 50, y: isMobile ? 42 : 50 };
  const hasFocus = Boolean(hoveredId || activeId);
  const nodeHueBases = [6, 48, 132, 214, 292];

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="flow-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
          <stop offset="35%" stopColor="rgba(209, 227, 255, 0.45)" />
          <stop offset="100%" stopColor="rgba(209, 227, 255, 0)" />
        </radialGradient>
        <filter id="edge-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.35" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {nodes.map((node, nodeIndex) => {
        const pos = nodePositions[node.id] ?? (isMobile ? node.positionMobile : node.positionDesktop);
        const isHighlighted = hoveredId === node.id || activeId === node.id;
        const highlightedSubIndex = hoveredSubitem?.nodeId === node.id ? hoveredSubitem.index : null;
        const dx = pos.x - core.x;
        const dy = pos.y - core.y;
        const len = Math.max(0.001, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;

        // Keep strand count aligned with visible subitem count of each neuron.
        const strandCount = Math.max(1, node.subItems.length);
        const baseOffsets = Array.from({ length: strandCount }, (_, i) => {
          const mid = (strandCount - 1) / 2;
          return (i - mid) * 1.7;
        });

        return (
          <g key={node.id} filter="url(#edge-soft-glow)">
            {Array.from({ length: strandCount }).map((_, strandIndex) => {
              const side = strandIndex % 2 === 0 ? 1 : -1;
              const wave = (nodeIndex + 1) * (strandIndex + 1) * 0.9;
              const base = baseOffsets[strandIndex] * side;
              const drift = Math.sin(wave) * 3.8;
              const offset = base + drift;
              const hue = (nodeHueBases[nodeIndex % nodeHueBases.length] + strandIndex * 24) % 360;
              const strandColor = `hsla(${hue}, 96%, 70%, ${isHighlighted ? 0.94 : 0.58})`;
              const strandHighlight = `hsla(${hue}, 100%, 90%, 0.9)`;
              const isSubHighlighted = highlightedSubIndex === strandIndex;
              const isSubDimmed = highlightedSubIndex !== null && highlightedSubIndex !== strandIndex;

              const c1x = core.x * 0.67 + pos.x * 0.33 + nx * (8 + offset);
              const c1y = core.y * 0.67 + pos.y * 0.33 + ny * (8 + offset);
              const c2x = core.x * 0.33 + pos.x * 0.67 - nx * (6 - offset * 0.5);
              const c2y = core.y * 0.33 + pos.y * 0.67 - ny * (6 - offset * 0.5);
              const pathD = `M ${core.x} ${core.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${pos.x} ${pos.y}`;

              const c1xAlt = core.x * 0.67 + pos.x * 0.33 + nx * (12 + offset * 1.2);
              const c1yAlt = core.y * 0.67 + pos.y * 0.33 + ny * (12 + offset * 1.2);
              const c2xAlt = core.x * 0.33 + pos.x * 0.67 - nx * (9 - offset * 0.9);
              const c2yAlt = core.y * 0.33 + pos.y * 0.67 - ny * (9 - offset * 0.9);
              const pathAlt = `M ${core.x} ${core.y} C ${c1xAlt} ${c1yAlt}, ${c2xAlt} ${c2yAlt}, ${pos.x} ${pos.y}`;

              const c1xAlt2 = core.x * 0.67 + pos.x * 0.33 + nx * (5 + offset * 0.75);
              const c1yAlt2 = core.y * 0.67 + pos.y * 0.33 + ny * (5 + offset * 0.75);
              const c2xAlt2 = core.x * 0.33 + pos.x * 0.67 - nx * (4 - offset * 0.6);
              const c2yAlt2 = core.y * 0.33 + pos.y * 0.67 - ny * (4 - offset * 0.6);
              const pathAlt2 = `M ${core.x} ${core.y} C ${c1xAlt2} ${c1yAlt2}, ${c2xAlt2} ${c2yAlt2}, ${pos.x} ${pos.y}`;

              return (
                <g key={`${node.id}-${strandIndex}`}>
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? strandHighlight : strandColor}
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      d: reduceMotion ? pathD : [pathD, pathAlt, pathAlt2, pathD],
                      opacity: isSubHighlighted
                        ? 1
                        : isSubDimmed
                          ? 0.15
                          : isHighlighted
                            ? 0.95
                            : hasFocus
                              ? 0.2
                              : 0.52,
                      strokeWidth: isSubHighlighted ? 0.56 : isHighlighted ? 0.34 : 0.18,
                    }}
                    transition={{
                      d: {
                        duration: 5.8 + strandIndex * 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                      opacity: { duration: 0.35, ease: "easeOut" },
                      strokeWidth: { duration: 0.35, ease: "easeOut" },
                    }}
                  />

                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={`hsla(${(hue + 42) % 360}, 100%, 88%, 0.2)`}
                    strokeWidth={0.1}
                    strokeDasharray="1.1 3.4"
                    animate={{
                      d: reduceMotion ? pathD : [pathD, pathAlt2, pathAlt, pathD],
                      strokeDashoffset: reduceMotion ? 0 : [-12, 0],
                      opacity: isSubHighlighted ? 0.9 : isSubDimmed ? 0.08 : 1,
                    }}
                    transition={{
                      d: {
                        duration: 5.2 + strandIndex,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                      strokeDashoffset: {
                        duration: 7.5 + strandIndex * 1.4,
                        repeat: Infinity,
                        ease: "linear",
                      },
                    }}
                  />

                  {!reduceMotion ? (
                    <circle r={0.62} fill="url(#flow-dot)">
                      <animateMotion
                        dur={`${6.2 + strandIndex * 0.8 + nodeIndex * 0.25}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                        path={pathD}
                      />
                    </circle>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
