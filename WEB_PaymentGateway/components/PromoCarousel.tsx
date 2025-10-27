"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Shield, MessagesSquare, Rocket, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Slide = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  cta?: { label: string; onClick: () => void };
};

type PromoCarouselProps = {
  className?: string;
  slides: Slide[];
  intervalMs?: number;
};

export default function PromoCarousel({
  className,
  slides,
  intervalMs = 5000,
}: PromoCarouselProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIndex(i => (i + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(next, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, next]);

  const current = useMemo(() => slides[index], [slides, index]);

  return (
    <div className={["relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-5 shadow-[0_12px_28px_rgba(10,15,45,0.35)]", className || ""].join(" ")}>
      <div className="flex items-start gap-3">
        <div className="rounded-3xl bg-primary/10 p-2 text-primary shrink-0">
          <current.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {current.description}
          </p>
          {current.cta && (
            <Button
              variant="ghost"
              className="mt-4 w-full justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              onClick={current.cta.onClick}
            >
              {current.cta.label}
              <Rocket className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <div className="mt-4 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <span
                key={s.id}
                className={[
                  "h-1.5 w-4 rounded-full",
                  i === index ? "bg-primary" : "bg-white/20",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
