import { Children, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type SarkariCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

export function SarkariCarousel({ children, ariaLabel, className = "" }: SarkariCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrevious(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncControls);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncControls);
    if (trackRef.current) observer?.observe(trackRef.current);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [children, syncControls]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={`sarkari-carousel ${className}`}>
      <div className="sarkari-carousel-controls" aria-label={`${ariaLabel} carousel controls`}>
        <button type="button" onClick={() => move(-1)} disabled={!canPrevious} aria-label={`Previous ${ariaLabel}`}><ArrowLeft /></button>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label={`Next ${ariaLabel}`}><ArrowRight /></button>
      </div>
      <div className="sarkari-carousel-track" ref={trackRef} onScroll={syncControls} aria-label={ariaLabel} tabIndex={0}>
        {Children.map(children, (child) => <div className="sarkari-carousel-item">{child}</div>)}
      </div>
    </div>
  );
}
