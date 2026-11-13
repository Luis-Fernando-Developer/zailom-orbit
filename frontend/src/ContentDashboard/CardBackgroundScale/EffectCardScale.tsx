// @refresh reset

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import CardBgScale from "./CardBgScale";

interface EffectCardScaleProps {
  onSignOut: () => void;
}

export default function EffectCardScale({ onSignOut }: EffectCardScaleProps) {
  
  const containerCardRef = useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {

    const element = containerCardRef.current;

    if (!element) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline();

      timeline.fromTo(
        ".card-bg-scale",
        {
          width: "0px",
          height: "0px",
          opacity: 1,
          duration: 1,
          ease: "power2.inOut",
          background: "rgba(0,0,0,0.3)",
        },
        {
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.3)",
          opacity: 0.5,
          borderRadius: 16,
          duration: 2,
        },
        ">",
      );

      timeline.to(element, {
        opacity: 1,
        duration: -2,
        ease: "power2.inOut",
      });
    }, element);

    return () => context.revert();

  }, []);

  return (
    <div ref={containerCardRef} className="h-full min-h-0 w-full">
      <CardBgScale className="card-bg-scale" onSignOut={onSignOut} />
    </div>
  )
}
