import { useRef, type ReactNode, type PointerEvent } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  max?: number;
}

/**
 * Wraps children with a CSS 3D tilt on pointer move.
 * Uses transform + perspective; no library.
 */
export function TiltCard({ children, className, max = 12 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * max * 2;
    const ry = (px - 0.5) * max * 2;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerDown={reset}
      style={{ transformStyle: "preserve-3d", transition: "transform 120ms ease-out", willChange: "transform" }}
      className={className}
    >
      {children}
    </div>
  );
}
