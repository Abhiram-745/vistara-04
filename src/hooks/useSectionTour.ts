import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSectionTour = (pageKey: string) => {
  const [viewedSections, setViewedSections] = useState<Set<string>>(new Set());
  const [activeTourSection, setActiveTourSection] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadViewedSections = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      const storageKey = `section_tours_${pageKey}_${user.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setViewedSections(new Set(JSON.parse(stored)));
      }
    };
    
    loadViewedSections();
  }, [pageKey]);

  const markSectionViewed = useCallback((sectionKey: string) => {
    if (!userId) return;
    
    setViewedSections(prev => {
      const updated = new Set(prev);
      updated.add(sectionKey);
      const storageKey = `section_tours_${pageKey}_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify([...updated]));
      return updated;
    });
    setActiveTourSection(null);
  }, [pageKey, userId]);

  const handleSectionClick = useCallback((sectionKey: string) => {
    if (!viewedSections.has(sectionKey)) {
      setActiveTourSection(sectionKey);
      return true; // Tour will be shown
    }
    return false; // Section already viewed
  }, [viewedSections]);

  return {
    viewedSections,
    activeTourSection,
    markSectionViewed,
    handleSectionClick,
  };
};
