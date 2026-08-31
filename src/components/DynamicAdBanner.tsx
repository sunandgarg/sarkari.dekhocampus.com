import { motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { useAds } from "@/hooks/useAds";

interface DynamicAdBannerProps {
  variant?: "horizontal" | "vertical" | "square" | "leaderboard";
  position?: string;
  page?: string;
  itemSlug?: string;
  state?: string;
  city?: string;
  className?: string;
}

export function DynamicAdBanner({
  variant,
  position = "mid-page",
  page,
  itemSlug,
  state,
  city,
  className = "",
}: DynamicAdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { data: ad } = useAds({ page, itemSlug, state, city, variant, position });

  if (!isVisible || !ad) return null;

  const { title, subtitle, cta_text, link_url, bg_gradient, image_url } = ad;
  const effectiveVariant = (variant || ad.variant || "horizontal") as NonNullable<DynamicAdBannerProps["variant"]>;

  const bgStyle = image_url
    ? { backgroundImage: `url(${image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const overlayClass = image_url ? "bg-black/40" : "";

  if (effectiveVariant === "leaderboard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        data-ad-position={position}
        data-ad-variant={effectiveVariant}
        className={`relative w-full bg-gradient-to-r ${bg_gradient} h-14 md:h-16 flex items-center justify-center px-4 overflow-hidden ${className}`}
        style={bgStyle}
      >
        {image_url && <div className={`absolute inset-0 ${overlayClass}`} />}
        <div className="relative flex items-center gap-4 overflow-hidden">
          <p className="text-white text-sm md:text-base font-medium truncate animate-marquee">
            {title}
          </p>
           <a
            href={link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-1.5 bg-accent text-accent-foreground text-sm font-semibold rounded-full hover:bg-accent/90 transition-colors"
          >
            {cta_text}
          </a>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white/70 hover:text-white z-10" aria-label="Close ad">
          <X className="w-4 h-4" />
        </button>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/50 uppercase tracking-wider z-10">Ad</span>
      </motion.div>
    );
  }

  if (effectiveVariant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        data-ad-position={position}
        data-ad-variant={effectiveVariant}
        className={`relative w-full bg-gradient-to-r ${bg_gradient} h-24 md:h-28 rounded-2xl overflow-hidden ${className}`}
        style={bgStyle}
      >
        {image_url && <div className={`absolute inset-0 ${overlayClass}`} />}
        <div className="relative h-full flex items-center justify-between px-6 md:px-8">
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="truncate text-base font-bold text-white md:text-xl">{title}</h4>
            {subtitle && <p className="truncate text-xs text-white/80 md:text-sm">{subtitle}</p>}
          </div>
          <a href={link_url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 md:px-5 md:py-2.5 md:text-base">
            {cta_text}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <span className="absolute left-3 bottom-2 text-[10px] text-white/40 uppercase tracking-wider z-10">Ad</span>
      </motion.div>
    );
  }

  if (effectiveVariant === "vertical") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        data-ad-position={position}
        data-ad-variant={effectiveVariant}
        className={`relative mx-auto w-full max-w-[300px] bg-gradient-to-b ${bg_gradient} min-h-[280px] rounded-2xl overflow-hidden flex flex-col justify-between p-5 ${className}`}
        style={bgStyle}
      >
        {image_url && <div className={`absolute inset-0 ${overlayClass}`} />}
        <div className="relative">
          <span className="text-[10px] text-white/50 uppercase tracking-wider mb-3 block">Ad</span>
          <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
          {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
        </div>
        <a href={link_url} target="_blank" rel="noopener noreferrer" className="relative w-full py-2.5 bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 transition-colors mt-4 text-center block">
          {cta_text}
        </a>
      </motion.div>
    );
  }

  // Square
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      data-ad-position={position}
      data-ad-variant={effectiveVariant}
      className={`relative mx-auto aspect-[6/5] w-full max-w-[336px] bg-gradient-to-br ${bg_gradient} rounded-2xl overflow-hidden flex flex-col items-center justify-center p-5 text-center ${className}`}
      style={bgStyle}
    >
      {image_url && <div className={`absolute inset-0 ${overlayClass}`} />}
      <span className="absolute top-2 left-2 text-[10px] text-white/50 uppercase tracking-wider z-10">Ad</span>
      <div className="relative">
        <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
        {subtitle && <p className="text-white/80 text-sm mb-4">{subtitle}</p>}
        <a href={link_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 transition-colors">
          {cta_text}
        </a>
      </div>
    </motion.div>
  );
}
