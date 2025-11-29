import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import TimetableList from "@/components/TimetableList";
import OnboardingWizard from "@/components/OnboardingWizard";
import GuidedOnboarding from "@/components/tours/GuidedOnboarding";
import PageTransition from "@/components/PageTransition";

const Timetables = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Guided Onboarding Tour */}
      <GuidedOnboarding />
      
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-blob top-20 -left-32 w-96 h-96 bg-primary/10 animate-float"></div>
        <div className="floating-blob top-40 right-10 w-[500px] h-[500px] bg-secondary/15 animate-float-delayed"></div>
        <div className="floating-blob bottom-20 left-1/3 w-80 h-80 bg-accent/10 animate-float-slow"></div>
      </div>

      <Header onNewTimetable={() => setShowOnboarding(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex items-center justify-between mb-8" data-tour="timetables-page">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero rounded-xl blur-md opacity-60"></div>
              <div className="relative bg-gradient-hero p-3 rounded-xl shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">
                My Timetables
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage all your study schedules
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setShowOnboarding(true)}
            className="gap-2 bg-gradient-hero hover:opacity-90 shadow-lg"
            size="lg"
            data-tour="new-timetable"
          >
            <Plus className="h-5 w-5" />
            New Timetable
          </Button>
        </div>

        {user && <TimetableList userId={user.id} />}
      </main>

      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onCancel={() => setShowOnboarding(false)}
        />
      )}
    </div>
    </PageTransition>
  );
};

export default Timetables;
