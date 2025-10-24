import { useEffect, useRef } from "react";

const CURSOR_TRAIL_EASING = 0.18;

const LightningCursor = () => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pointerFineQuery = window.matchMedia("(pointer: fine)");
    if (!pointerFineQuery.matches) {
      return;
    }

    const cursorEl = cursorRef.current;
    const trailEl = trailRef.current;

    if (!cursorEl || !trailEl) {
      return;
    }

    const body = document.body;
    body.classList.add("custom-cursor-enabled");

    const cursorPosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const trailPosition = { ...cursorPosition };

    let cursorScale = 1;
    let animationFrame = 0;
    let releaseTimeout: number | undefined;

    const updateTransforms = () => {
      cursorEl.style.transform = `translate3d(${cursorPosition.x}px, ${cursorPosition.y}px, 0) translate(-50%, -50%) scale(${cursorScale})`;
      trailEl.style.transform = `translate3d(${trailPosition.x}px, ${trailPosition.y}px, 0) translate(-50%, -50%)`;
    };

    const animate = () => {
      trailPosition.x += (cursorPosition.x - trailPosition.x) * CURSOR_TRAIL_EASING;
      trailPosition.y += (cursorPosition.y - trailPosition.y) * CURSOR_TRAIL_EASING;
      updateTransforms();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      cursorPosition.x = event.clientX;
      cursorPosition.y = event.clientY;
      cursorEl.style.opacity = "1";
      trailEl.style.opacity = "0.7";
    };

    const handleMouseLeave = (event: MouseEvent) => {
      if (event.relatedTarget !== null) {
        return;
      }
      cursorEl.style.opacity = "0";
      trailEl.style.opacity = "0";
      cursorScale = 1;
    };

    const handleWindowBlur = () => {
      cursorEl.style.opacity = "0";
      trailEl.style.opacity = "0";
      cursorScale = 1;
    };

    const handlePointerDown = () => {
      cursorScale = 0.88;
      trailEl.style.opacity = "0.5";
    };

    const handlePointerUp = () => {
      cursorScale = 1.12;
      trailEl.style.opacity = "0.68";

      if (releaseTimeout) {
        window.clearTimeout(releaseTimeout);
      }

      releaseTimeout = window.setTimeout(() => {
        cursorScale = 1;
      }, 140);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cursorEl.style.opacity = "0";
        trailEl.style.opacity = "0";
      }
    };

    updateTransforms();
    animationFrame = window.requestAnimationFrame(animate);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseout", handleMouseLeave);
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      if (releaseTimeout) {
        window.clearTimeout(releaseTimeout);
      }

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      body.classList.remove("custom-cursor-enabled");
    };
  }, []);

  return (
    <>
      <div ref={trailRef} className="lightning-cursor-trail" aria-hidden="true" />
      <div ref={cursorRef} className="lightning-cursor" aria-hidden="true" />
    </>
  );
};

export default LightningCursor;
