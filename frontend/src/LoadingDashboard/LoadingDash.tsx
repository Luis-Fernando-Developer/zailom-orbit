// @refresh reset

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
// import CardBgScale from "@/ContentDashboard/CardBackgroundScale/CardBgScale";

interface LoadingDashProps {
  onComplete?: () => void;
}

export default function LoadingDash({ onComplete }: LoadingDashProps) {
  
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    console.log("LoadingDash useLayoutEffect called");
    const element = containerRef.current;

    if (!element) return;

    const timeline = gsap.timeline({
      onComplete,
    });

    //logo inicia no centro
    timeline.fromTo(
      ".loading-dash-logo",
      {
        opacity: 1,
        x: 0,
        y: 0,
        ease: "power2.inOut",
        width: "20px",
        height: "20px",
      },
      //logo se move para o canto superior esquerdo
      {
        opacity: 0.7,
        duration: 7,
        scale: 0.2,
        x: -630,
        y: -250,
        ease: "power2.inOut",
        width: "0px",
        height: "0px",
      },
    );

    //buraco negro aparece e cresce
    timeline.fromTo(
      ".loading-black-hole",
      {
        opacity: 0,
        // background: "transparent",
        scale: 1,
        borderRadius: "100%",
        // border: "0.1px solid green",
        duration: 1,
        ease: "power2.inOut",
      },
      {
        opacity: 1,
        scale: 3,
        duration: 3.5,
        background: "black",
        ease: "power2.inOut",
      },
      -">",
    );

    //buraco negro desparece
    timeline.to(".loading-black-hole", {
      opacity: 1,
      scale: 0,
      duration: 2.2,
      ease: "power2.inOut"
    }, 
  
    );

    timeline.to(
      ".loading-dash-logo",
      {
        x: -625,
        y: -250,
        opacity: 0,
        scale: 0,
        width: "0px",
        height: "0px",
        duration: 1,
        ease: "power2.inOut",
      },
      "<",
    );

    timeline.to(
      ".loading-black-hole",
      {
        opacity: 1,
        width: "40px",
        height: "40px",
        scale: 2,
        duration: 0.8,
        // repeat: 0,
        background: "rgba(0,0,0,0.3)",
        ease: "power2.inOut",
        borderRadius: "10px",
      },
    
    );

    timeline.to(element, {
      opacity: 1,
      duration: -2,
      ease: "power2.inOut",
    });
  }, [onComplete]);

  return (
    <div ref={containerRef} className="loading-dash flex! relative!">
      <span className="loading-black-hole h-5 w-5 absolute top-16 left-16 "></span>
      <div className="loading-dash-logo p-0 m-0 gap-0 text-[5rem] flex">
        <span className="loading-dash-symbol p-0 m-0 gap-0 text-[5rem] flex">
          O<span></span>
        </span>
        <span className="loading-dash-name p-0 m-0 gap-0 text-[5rem] space-y-0 flex ">
          <strong className="pl-2 pt-2">zailom</strong>
          <small className="pl-1.75 -pt-[25px]">RBIT</small>
        </span>
      </div>
    </div>
  );
}
