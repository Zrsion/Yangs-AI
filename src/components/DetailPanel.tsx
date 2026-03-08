import { AnimatePresence, motion } from "framer-motion";
import type { PortalNode } from "../data/portalNodes";

interface DetailPanelProps {
  node: PortalNode | null;
  onClose: () => void;
}

export default function DetailPanel({ node, onClose }: DetailPanelProps) {
  return (
    <AnimatePresence>
      {node ? (
        <motion.aside
          key={node.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-auto absolute bottom-4 right-4 z-30 w-[min(92vw,22rem)] rounded-2xl border border-white/18 bg-[rgba(12,18,34,0.84)] p-5 text-slate-100 shadow-[0_15px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl md:bottom-8 md:right-8"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <motion.h2 layoutId={`node-title-${node.id}`} className="text-lg font-semibold tracking-wide">
                {node.label}
              </motion.h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300/25 px-2 py-1 text-xs text-slate-200 hover:bg-slate-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80"
            >
              Close
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
            {node.detailDescription}
          </p>

          <ul className="mt-4 space-y-1 text-sm text-slate-200/92">
            {node.subItems.map((item) => (
              <li key={item.label} className="rounded-md bg-white/5 px-2 py-1">
                {item.label}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {node.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                className="rounded-md border border-sky-100/25 bg-sky-50/10 px-3 py-1.5 text-xs tracking-wide text-sky-100 hover:bg-sky-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/80"
              >
                {link.label}
              </a>
            ))}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
