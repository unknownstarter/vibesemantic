"use client";

import { useEffect, useRef } from "react";
import { viewSection } from "./analytics";

export function useSectionView(sectionName: string, threshold = 0.1) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasViewed = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasViewed.current) {
            hasViewed.current = true;
            viewSection(sectionName);
          }
        });
      },
      { threshold }
    );

    const currentSection = sectionRef.current;
    if (currentSection) {
      observer.observe(currentSection);
    }

    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, [sectionName, threshold]);

  return sectionRef;
}

