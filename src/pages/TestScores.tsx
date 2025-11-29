import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { TestScoreEntry } from "@/components/TestScoreEntry";
import { TestScoresList } from "@/components/TestScoresList";
import { supabase } from "@/integrations/supabase/client";
import { useSectionTour } from "@/hooks/useSectionTour";
import SectionSpotlight from "@/components/tours/SectionSpotlight";
import { testScoresPageSteps } from "@/components/tours/testScoresSectionSteps";
import PageTransition from "@/components/PageTransition";

const TestScores = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [refresh, setRefresh] = useState(0);
  const { activeTourSection, markSectionViewed, handleSectionClick, viewedSections } = useSectionTour("test-scores");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Auto-trigger spotlight for first-time visitors
  useEffect(() => {
    if (userId && !viewedSections.has("add-score")) {
      handleSectionClick("add-score");
    }
  }, [userId, viewedSections]);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Spotlight Tour */}
      <SectionSpotlight
        sectionKey={activeTourSection}
        onComplete={markSectionViewed}
        sectionSteps={testScoresPageSteps}
      />

      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-blob top-20 -left-32 w-96 h-96 bg-primary/10 animate-float"></div>
        <div className="floating-blob top-40 right-10 w-[500px] h-[500px] bg-secondary/15 animate-float-delayed"></div>
        <div className="floating-blob bottom-20 left-1/3 w-80 h-80 bg-accent/10 animate-float-slow"></div>
      </div>

      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2 hover-lift"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold gradient-text mb-3">Test Scores & Analysis</h1>
            <p className="text-muted-foreground text-lg">
              Track your test results and get AI-powered insights to improve your performance
            </p>
          </div>
          <div data-tour="add-test-score">
            {userId && <TestScoreEntry userId={userId} onScoreAdded={() => setRefresh(r => r + 1)} />}
          </div>
        </div>

        <div data-tour="scores-list">
          {userId && <TestScoresList userId={userId} refresh={refresh} />}
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default TestScores;
