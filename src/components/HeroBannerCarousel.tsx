import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, GraduationCap, ArrowRight } from "lucide-react";
import { useHeroBanners, type HeroBanner } from "@/hooks/useHeroBanners";
import { useSiteIntegration, useSiteIntegrationEnabled } from "@/hooks/useSiteIntegration";

export function HeroBannerCarousel() {
  const { data: banners } = useHeroBanners();
  const { data: sectionEnabled = true } = useSiteIntegrationEnabled("recommended_for_you", true);
  const { data: speedValue = "7.5" } = useSiteIntegration("recommended_for_you_speed_seconds");
  const [current, setCurrent] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const total = banners?.length ?? 0;
  const autoplayMs = Math.max(1, Number(speedValue) || 7.5) * 1000;

  const goTo = (index: number, behavior: ScrollBehavior = "smooth") => {
    const normalized = (index + total) % total;
    const scroller = scrollerRef.current;
    const slide = scroller?.children.item(normalized) as HTMLElement | null;
    if (scroller && slide) {
      scroller.scrollTo({ left: slide.offsetLeft, behavior });
    }
    setCurrent(normalized);
  };

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => {
      setCurrent((active) => {
        const next = (active + 1) % total;
        const scroller = scrollerRef.current;
        const slide = scroller?.children.item(next) as HTMLElement | null;
        if (scroller && slide) scroller.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
        return next;
      });
    }, autoplayMs);
    return () => clearInterval(id);
  }, [total, autoplayMs]);

  if (!sectionEnabled || !banners || total === 0) return null;

  const goToLink = (url: string) => {
    if (!url || url === "#") return;
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  };

  const handleClick = (b: HeroBanner) => {
    goToLink(b.link_url || "");
  };

  return (
    <section className="py-8 md:py-12" aria-labelledby="recommended-colleges-heading">
      <div className="container">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> Featured Picks
          </div>
          <h2 id="recommended-colleges-heading" className="text-headline font-bold text-primary">
            Recommended <span className="text-foreground">For You</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">Carefully Handpicked Institutions for Your Future</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const scroller = event.currentTarget;
              const width = scroller.clientWidth || 1;
              setCurrent(Math.min(total - 1, Math.max(0, Math.round(scroller.scrollLeft / width))));
            }}
            aria-label="Recommended for You carousel"
          >
            {banners.map((banner, i) => (
                <motion.div
                  key={banner.id}
                  className="min-w-full snap-center"
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(banner)}
                    aria-label={`View ${banner.title}`}
                    className="group block w-full overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      {...({ fetchpriority: i === 0 ? "high" : "low" } as any)}
                      sizes="(max-width: 768px) 100vw, 1024px"
                      className="w-full h-56 sm:h-64 md:h-80 object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </button>

                  <div className="text-center mt-4 px-4">
                    <button
                      type="button"
                      onClick={() => handleClick(banner)}
                      className="text-lg sm:text-xl md:text-2xl font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                    >
                      {banner.title}
                      <ArrowRight className="w-5 h-5 text-primary transition-transform group-hover:translate-x-1" />
                    </button>
                    {banner.subtitle && (
                      <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                </motion.div>
            ))}
          </div>

          {total > 1 && (
            <>
              <button
                onClick={() => goTo(current - 1)}
                aria-label="Previous"
                className="absolute left-2 top-32 md:top-40 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background shadow-md"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => goTo(current + 1)}
                aria-label="Next"
                className="absolute right-2 top-32 md:top-40 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background shadow-md"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex justify-center gap-1.5 mt-4">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === current ? "bg-primary w-6" : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
