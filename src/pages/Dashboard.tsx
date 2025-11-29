import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Target, Trophy, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import OnboardingWizard from "@/components/OnboardingWizard";
import TimetableList from "@/components/TimetableList";
import { HomeworkList } from "@/components/HomeworkList";
import { WeeklyGoalsWidget } from "@/components/WeeklyGoalsWidget";
import { UpcomingDeadlines } from "@/components/UpcomingDeadlines";
import { ProgressSection } from "@/components/dashboard/ProgressSection";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { EventsWidget } from "@/components/EventsWidget";
import { DashboardAnalytics } from "@/components/DashboardAnalytics";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import WelcomeModal from "@/components/WelcomeModal";
import GuidedOnboarding from "@/components/tours/GuidedOnboarding";
import PageTransition from "@/components/PageTransition";


const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardSections, setDashboardSections] = useState<Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    order: number;
  }>>([]);
  const { data: userRole } = useUserRole();


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkSubjects(session.user.id);
      } else {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkSubjects(session.user.id);
      } else {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkSubjects = async (userId: string) => {
    // Check for both subjects and timetables
    const [subjectsResult, timetablesResult, profileResult] = await Promise.all([
      supabase.from("subjects").select("id").eq("user_id", userId).limit(1),
      supabase.from("timetables").select("id").eq("user_id", userId).limit(1),
      supabase.from("profiles").select("full_name").eq("id", userId).single()
    ]);
    
    const hasSubjects = subjectsResult.data && subjectsResult.data.length > 0;
    const hasTimetables = timetablesResult.data && timetablesResult.data.length > 0;
    
    // User has set up if they have either subjects or timetables
    setHasData(hasSubjects || hasTimetables);
    setProfile(profileResult.data);
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getFirstName = () => {
    if (!profile?.full_name) return "there";
    return profile.full_name.split(" ")[0];
  };


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
      {/* Welcome Modal for first-time users */}
      <WelcomeModal />
      
      {/* Guided Onboarding Tour */}
      <GuidedOnboarding />
      
      {/* Floating background elements - just like landing page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-blob top-20 -left-32 w-96 h-96 bg-primary/10 animate-float"></div>
        <div className="floating-blob top-40 right-10 w-[500px] h-[500px] bg-secondary/15 animate-float-delayed"></div>
        <div className="floating-blob bottom-20 left-1/3 w-80 h-80 bg-accent/10 animate-float-slow"></div>
      </div>

      <Header onNewTimetable={() => setShowOnboarding(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!hasData && !showOnboarding ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/20 border border-secondary/30 shadow-sm">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium text-secondary-foreground">Welcome to Study Planner</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold gradient-text">
                Let's Get Started!
              </h2>
              <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
                Create your personalized study timetable. We'll ask about your GCSE subjects,
                topics, and test dates to generate the perfect revision schedule.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowOnboarding(true)}
              className="gap-2 text-lg px-10 py-7 rounded-full"
            >
              <Plus className="h-5 w-5" />
              Get Started
            </Button>
          </div>
        ) : showOnboarding ? (
          <OnboardingWizard
            onComplete={() => {
              setShowOnboarding(false);
              setHasData(true);
              toast.success("Setup complete! You can now generate timetables.");
            }}
            onCancel={() => setShowOnboarding(false)}
          />
        ) : (
          <div className="space-y-10 animate-fade-in">
            {/* Welcome Section - More prominent and personal */}
            <div className="dashboard-greeting relative overflow-hidden rounded-2xl bg-gradient-warm border border-primary/20 p-8 md:p-10 shadow-lg">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-xs font-medium text-primary">🔥 You're crushing it!</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold">
                      {getGreeting()}, {getFirstName()}!
                    </h1>
                    <p className="text-foreground/70 text-lg leading-relaxed max-w-xl">
                      Ready to make today count? Let's tackle your study goals together 💪
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="dashboard-customizer">
                      <DashboardCustomizer onSettingsChange={setDashboardSections} />
                    </div>
                    <div className="hidden lg:flex items-center gap-3">
                      <div className="flex flex-col items-center p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border/60 shadow-sm hover:-translate-y-1 transition-all duration-300">
                        <Target className="h-7 w-7 text-primary mb-2" />
                        <span className="text-xs text-muted-foreground font-medium">Goals</span>
                      </div>
                      <div className="flex flex-col items-center p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border/60 shadow-sm hover:-translate-y-1 transition-all duration-300">
                        <Trophy className="h-7 w-7 text-accent mb-2" />
                        <span className="text-xs text-muted-foreground font-medium">Achievements</span>
                      </div>
                      <div className="flex flex-col items-center p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-border/60 shadow-sm hover:-translate-y-1 transition-all duration-300">
                        <Calendar className="h-7 w-7 text-secondary mb-2" />
                        <span className="text-xs text-muted-foreground font-medium">Schedule</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative gradient blobs */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/15 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/15 rounded-full blur-3xl"></div>
            </div>

            {/* Render sections in order */}
            {dashboardSections
              .filter((section) => section.enabled)
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                if (section.id === "progress") {
                  return (
                    <div key="progress" className="progress-section space-y-6">
                      <div className="section-header">
                        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="section-title">📊 Your Progress</h2>
                          <p className="text-sm text-muted-foreground">Track your study journey</p>
                        </div>
                      </div>
                      <ProgressSection userId={user?.id || ""} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <WeeklyGoalsWidget userId={user?.id || ""} />
                        <RecentActivityWidget userId={user?.id || ""} />
                      </div>
                      <div className="upcoming-deadlines">
                        <UpcomingDeadlines userId={user?.id || ""} />
                      </div>
                    </div>
                  );
                }
                
                if (section.id === "events") {
                  return (
                    <div key="events" className="space-y-6">
                      <div className="section-header">
                        <div className="w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center shadow-md">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="section-title">📅 Events & Commitments</h2>
                          <p className="text-sm text-muted-foreground">Your schedule at a glance</p>
                        </div>
                      </div>
                      <EventsWidget />
                    </div>
                  );
                }
                
                if (section.id === "analytics") {
                  return (
                    <div key="analytics" className="daily-insights space-y-6">
                      <DashboardAnalytics userId={user?.id || ""} />
                    </div>
                  );
                }
                
                if (section.id === "timetables") {
                  return (
                    <div key="timetables" className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="section-header mb-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-md">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="section-title">📘 Your Timetables</h2>
                            <p className="text-sm text-muted-foreground">Manage your study plans</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowOnboarding(true)}
                          className="gap-2 rounded-full shadow-md hover:-translate-y-0.5 transition-all"
                          size="lg"
                        >
                          <Plus className="h-4 w-4" />
                          New Timetable
                        </Button>
                      </div>
                      <TimetableList userId={user?.id || ""} />
                    </div>
                  );
                }
                
                if (section.id === "homework") {
                  return (
                    <div key="homework" className="space-y-6">
                      <HomeworkList userId={user?.id || ""} />
                    </div>
                  );
                }
                
                return null;
              })}


            {/* Pricing Cards Section */}
            <div className="py-16 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
              </div>

              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-4 mb-12"
                >
                  <h2 className="text-3xl sm:text-4xl font-display font-bold gradient-text">
                    {userRole === "paid" ? "Your Current Plan" : "Upgrade Your Experience"}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {userRole === "paid" 
                      ? "You're on the Premium plan with unlimited access to all features"
                      : "Unlock unlimited AI-powered study planning"}
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  {/* Free Plan Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 50, rotateX: 10 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                    className="relative"
                    style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                  >
                    {userRole === "free" && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-muted text-muted-foreground px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                          Current Plan
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/10 rounded-3xl blur-xl opacity-50" />
                    <Card className={`relative border-2 ${userRole === "free" ? "border-primary" : ""} bg-card/95 backdrop-blur-sm shadow-xl transition-all duration-500 h-full`}>
                      <CardHeader className="space-y-6 pb-6">
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            <Sparkles className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <CardTitle className="text-2xl font-display">Free</CardTitle>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold">£0</span>
                            <span className="text-lg text-muted-foreground">/month</span>
                          </div>
                          <CardDescription className="text-base">
                            Try out AI-powered study planning
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">1 timetable creation</p>
                              <p className="text-xs text-muted-foreground">Generate your first schedule</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">1 regeneration per day</p>
                              <p className="text-xs text-muted-foreground">Daily schedule adjustments</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Basic AI insights</p>
                              <p className="text-xs text-muted-foreground">1 analysis per day</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Study tracking</p>
                              <p className="text-xs text-muted-foreground">Session & progress tracking</p>
                            </div>
                          </li>
                        </ul>
                        {userRole !== "free" && (
                          <Button
                            variant="outline"
                            size="lg"
                            disabled
                            className="w-full text-base py-6"
                          >
                            Current Plan
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Premium Plan Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 50, rotateX: 10 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    whileHover={{ y: -15, transition: { duration: 0.3 } }}
                    className="relative"
                    style={{ transformStyle: "preserve-3d", perspective: 1000 }}
                  >
                    {userRole === "paid" ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-gradient-to-r from-accent via-primary to-secondary text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                          Current Plan
                        </div>
                      </div>
                    ) : (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="bg-gradient-to-r from-accent via-primary to-secondary text-white px-8 py-2 rounded-full text-sm font-bold shadow-2xl"
                        >
                          ⚡ Most Popular
                        </motion.div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-3xl blur-2xl opacity-60 animate-pulse" />
                    <Card className="relative border-2 border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm shadow-2xl transition-all duration-500 h-full overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />

                      <CardHeader className="space-y-6 pb-6 relative z-10">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <CardTitle className="text-2xl font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Premium
                          </CardTitle>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                              £5
                            </span>
                            <span className="text-lg text-muted-foreground">/month</span>
                          </div>
                          <CardDescription className="text-base">
                            Unlimited AI for serious students
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6 relative z-10">
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Unlimited timetables</p>
                              <p className="text-xs text-muted-foreground">Create as many as you need</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Unlimited regenerations</p>
                              <p className="text-xs text-muted-foreground">Adjust anytime, instantly</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Unlimited AI insights</p>
                              <p className="text-xs text-muted-foreground">Deep performance analysis</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Priority support</p>
                              <p className="text-xs text-muted-foreground">Get help when needed</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Early access</p>
                              <p className="text-xs text-muted-foreground">New features first</p>
                            </div>
                          </li>
                        </ul>
                        {userRole === "paid" ? (
                          <Button
                            size="lg"
                            disabled
                            className="w-full text-base py-6 bg-gradient-to-r from-primary via-secondary to-accent"
                          >
                            Current Plan
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              window.open("mailto:support@example.com?subject=Upgrade%20to%20Premium", "_blank");
                            }}
                            size="lg"
                            className="w-full text-base py-6 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 hover:scale-105 transition-all shadow-xl text-white font-bold"
                          >
                            Upgrade to Premium
                          </Button>
                        )}
                        <p className="text-xs text-center text-muted-foreground">
                          Cancel anytime • No hidden fees
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </PageTransition>
  );
};

export default Dashboard;
