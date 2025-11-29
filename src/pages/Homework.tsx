import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { HomeworkList } from "@/components/HomeworkList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GuidedOnboarding from "@/components/tours/GuidedOnboarding";
import PageTransition from "@/components/PageTransition";

const Homework = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    } else {
      navigate("/auth");
    }
  };

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

      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10" data-tour="homework-page">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 gap-2 hover-lift"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold gradient-text mb-3">Homework & Assignments</h1>
          <p className="text-muted-foreground text-lg">
            Track your homework assignments and deadlines. These will be included in your study timetables.
          </p>
        </div>

        {userId && <HomeworkList userId={userId} />}
      </div>
    </div>
    </PageTransition>
  );
};

export default Homework;
