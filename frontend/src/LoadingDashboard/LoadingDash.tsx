
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

interface LoadingDashProps {
  onComplete?: () => void;
}

export default function LoadingDash({ onComplete }: LoadingDashProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          onComplete,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div ref={containerRef} className="loading-dash">
      <div className="loading-dash-brand">
        <span className="loading-dash-symbol">
          o<span>.</span>
        </span>

        <span className="loading-dash-name">
          <strong>zailom</strong>
          <small>ORBIT</small>
        </span>
      </div>
    </div>
  );
}
