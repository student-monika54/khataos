import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * SplineScene — Lazy-loaded placeholder for an interactive Spline 3D scene.
 *
 * To embed an actual Spline scene later:
 *   1. npm install @splinetool/react-spline @splinetool/runtime
 *   2. Replace <PlaceholderVisual /> with:
 *      const Spline = lazy(() => import("@splinetool/react-spline"));
 *      <Suspense fallback={<PlaceholderVisual />}>
 *        <Spline scene="https://prod.spline.design/your-scene-url/scene.splinecode" />
 *      </Suspense>
 */
export function SplineScene({ sceneUrl }: { sceneUrl?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      setMx(x);
      setMy(y);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  // sceneUrl reserved for future use
  void sceneUrl;

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-white to-surface"
      style={{ perspective: "1200px" }}
    >
      <PlaceholderVisual mx={mx} my={my} />
    </div>
  );
}

function PlaceholderVisual({ mx, my }: { mx: number; my: number }) {
  // Nodes: 0=AI Brain (center), 1=Kirana, 2=Customer, 3=Credit, 4=Trust
  const nodes = [
    { id: "ai", label: "AI Brain", x: 50, y: 50, big: true },
    { id: "kirana", label: "Kirana", x: 18, y: 26 },
    { id: "customer", label: "Customer", x: 82, y: 26 },
    { id: "credit", label: "Credit", x: 20, y: 80 },
    { id: "trust", label: "Trust", x: 80, y: 80 },
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [3, 4],
    [1, 3],
    [2, 4],
  ] as const;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        transform: `rotateY(${mx * 8}deg) rotateX(${-my * 8}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 200ms ease-out",
      }}
    >
      {/* soft glow */}
      <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />

      {/* grid */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="g" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth="0.2" />
          </pattern>
          <linearGradient id="edge" x1="0" x2="1">
            <stop offset="0" stopColor="#0F172A" stopOpacity="0.15" />
            <stop offset="1" stopColor="#10B981" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#g)" />

        {edges.map(([a, b], i) => {
          const A = nodes[a];
          const B = nodes[b];
          return (
            <line
              key={i}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke="url(#edge)"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              className="animate-dash"
            />
          );
        })}
      </svg>

      {/* nodes */}
      {nodes.map((n, i) => (
        <motion.div
          key={n.id}
          className="absolute"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%,-50%)" }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 120 }}
        >
          <div className="relative">
            {n.big && (
              <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-accent/30" />
            )}
            <div
              className={`flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-md ${
                n.big ? "ring-2 ring-accent/40" : ""
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  n.big ? "bg-accent" : "bg-primary"
                }`}
              />
              <span className="text-xs font-semibold text-foreground">
                {n.label}
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* floating chips */}
      <motion.div
        className="absolute right-4 top-4 soft-card flex items-center gap-2 px-3 py-2 text-xs animate-float-slow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-medium text-foreground">On-device AI active</span>
      </motion.div>

      <motion.div
        className="absolute bottom-4 left-4 soft-card px-3 py-2 text-xs animate-float-slow"
        style={{ animationDelay: "1.2s" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="font-semibold text-foreground">Trust score</div>
        <div className="text-ink-muted">812 · Excellent</div>
      </motion.div>
    </motion.div>
  );
}
