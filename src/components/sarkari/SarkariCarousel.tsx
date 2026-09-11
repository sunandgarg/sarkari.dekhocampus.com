import { Children, type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type SarkariCarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

function getPageTargets(track: HTMLDivElement) {
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  if (maxScroll <= 4) return [0];

  const trackLeft = track.getBoundingClientRect().left;
  const columnOffsets = Array.from(track.children)
    .map((child) => Math.max(0, child.getBoundingClientRect().left - trackLeft + track.scrollLeft))
    .sort((a, b) => a - b)
    .filter((offset, index, offsets) => index === 0 || Math.abs(offset - offsets[index - 1]) > 2);
  const firstOffset = columnOffsets[0] || 0;
  const normalizedOffsets = columnOffsets.map((offset) => Math.max(0, offset - firstOffset));
  const visibleColumns = Math.max(1, normalizedOffsets.filter((offset) => offset < track.clientWidth - 4).length);
  const targets = normalizedOffsets
    .filter((_, index) => index % visibleColumns === 0)
    .map((offset) => Math.min(maxScroll, offset))
    .filter((offset, index, offsets) => index === 0 || Math.abs(offset - offsets[index - 1]) > 2);
  if (targets[targets.length - 1] < maxScroll - 4) targets.push(maxScroll);
  return targets;
}

export function SarkariCarousel({ children, ariaLabel, className = "" }: SarkariCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number>();
  const trackId = useId();
  const items = Children.toArray(children);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const syncControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const targets = getPageTargets(track);
    const nextPageCount = targets.length;
    const nextPage = targets.reduce(
      (closest, target, index) => Math.abs(target - track.scrollLeft) < Math.abs(targets[closest - 1] - track.scrollLeft) ? index + 1 : closest,
      1,
    );
    setCanPrevious(track.scrollLeft > 4);
    setCanNext(track.scrollLeft < maxScroll - 4);
    setPageCount(nextPageCount);
    setCurrentPage(nextPage);
  }, []);

  const queueSync = useCallback(() => {
    if (scrollFrameRef.current !== undefined) window.cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = undefined;
      syncControls();
    });
  }, [syncControls]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncControls);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queueSync);
    if (trackRef.current) observer?.observe(trackRef.current);
    window.addEventListener("resize", queueSync);
    return () => {
      window.cancelAnimationFrame(frame);
      if (scrollFrameRef.current !== undefined) window.cancelAnimationFrame(scrollFrameRef.current);
      observer?.disconnect();
      window.removeEventListener("resize", queueSync);
    };
  }, [items.length, queueSync, syncControls]);

  const scrollToPage = (page: number) => {
    const track = trackRef.current;
    if (!track) return;
    const targets = getPageTargets(track);
    const nextPage = Math.min(targets.length, Math.max(1, page));
    const target = targets[nextPage - 1] || 0;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    track.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const move = (direction: -1 | 1) => {
    scrollToPage(currentPage + direction);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      scrollToPage(event.key === "Home" ? 1 : pageCount);
    }
  };

  return (
    <div className={`sarkari-carousel ${className}`} role="group" aria-roledescription="carousel" aria-label={ariaLabel}>
      <div className="sarkari-carousel-controls" role="group" aria-label="Carousel navigation">
        <span className="sarkari-carousel-status" aria-live="polite" aria-atomic="true">Page {currentPage} of {pageCount}</span>
        <button type="button" onClick={() => move(-1)} disabled={!canPrevious} aria-label={`Previous ${ariaLabel}`} aria-controls={trackId}><ArrowLeft aria-hidden="true" /></button>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label={`Next ${ariaLabel}`} aria-controls={trackId}><ArrowRight aria-hidden="true" /></button>
      </div>
      <div id={trackId} className="sarkari-carousel-track" ref={trackRef} onScroll={queueSync} onKeyDown={handleKeyDown} aria-label={`${ariaLabel}. Use left and right arrow keys to browse.`} tabIndex={0}>
        {items.map((child, index) => (
          <div className="sarkari-carousel-item" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}`} key={index}>{child}</div>
        ))}
      </div>
    </div>
  );
}
