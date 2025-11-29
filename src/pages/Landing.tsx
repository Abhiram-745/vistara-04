import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import { Calendar, Brain, Target, TrendingUp, Users, BookOpen, Clock, Sparkles, ArrowRight, CheckCircle2, Star, Heart, Zap, Coffee, Laptop, CalendarDays, PenTool } from "lucide-react";
import sessionLegend from "@/assets/session-legend.png";
import aiTopicParse from "@/assets/ai-topic-parse.png";
import topicPriorityOrder from "@/assets/topic-priority-order.png";
import topicDetailsCard from "@/assets/topic-details-card.png";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";

const Landing = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);
  const heroRef = useRef(null);
  const {
    scrollYProgress
  } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  return <PageTransition><div className="min-h-screen bg-background overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{
        y: [0, -30, 0],
        rotate: [0, 5, 0],
        scale: [1, 1.1, 1]
      }} transition={{
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut"
      }} className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <motion.div animate={{
        y: [0, 40, 0],
        rotate: [0, -5, 0],
        scale: [1, 1.15, 1]
      }} transition={{
        duration: 25,
        repeat: Infinity,
        ease: "easeInOut"
      }} className="absolute top-40 right-10 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl" />
        <motion.div animate={{
        y: [0, -20, 0],
        x: [0, 30, 0]
      }} transition={{
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut"
      }} className="absolute bottom-20 left-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section - Problem First */}
      <motion.section ref={heroRef} style={{
      y: heroY,
      opacity: heroOpacity
    }} className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-32">
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1]
        }} className="space-y-12 text-center">
            {/* Problem statement */}
            <div className="space-y-6">
              <motion.div initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8,
              delay: 0.2
            }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/20 border border-secondary/30">
                <Coffee className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-secondary-foreground">Built by students, for students</span>
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1]">
                Feeling overwhelmed
                <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  by revision?
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Vistari creates personalized study timetables that actually fit your life—around homework, football practice, family dinners, and those days you just need a break.
              </p>
            </div>

            {/* CTA */}
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.6
          }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-secondary hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg group rounded-full">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg px-10 py-7 hover:scale-105 transition-all duration-300 rounded-full">
                <Laptop className="mr-2 w-5 h-5" />
                See How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">✓ No credit card required  ✓ Setup in 2 minutes  ✓ Actually works</p>
            
            {/* Student testimonial */}
            <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.8
          }} className="mt-8 p-4 bg-card/50 border border-border/50 rounded-2xl max-w-md mx-auto backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  A
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Abhiram, Year 11</p>
                  <p className="text-xs text-muted-foreground">GCSE Student</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-left italic">
                "Finally, a revision planner that doesn't expect me to study 24/7. It actually works around my football practice!"
              </p>
            </motion.div>
            </motion.div>

            {/* Floating cards with animations - Dashboard Preview with Flow */}
            <div className="relative h-auto md:h-[900px] mt-12 md:mt-20 space-y-12 md:space-y-0">
              {/* Step 1: Dashboard Header Card */}
              <motion.div initial={{
              opacity: 0,
              y: 40
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.8,
              delay: 0.8
            }} whileHover={{
              scale: 1.02,
              y: -5
            }} className="relative md:absolute left-0 md:left-1/2 md:-translate-x-1/2 top-0 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-4 md:p-6 shadow-lg backdrop-blur-sm max-w-2xl w-full z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-1">Good afternoon, Dhrishiv! 👋</h3>
                    <p className="text-muted-foreground">Ready to crush your study goals today?</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <Target className="w-6 h-6 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Goals</p>
                    </div>
                    <div className="text-center">
                      <Zap className="w-6 h-6 text-accent mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                    <div className="text-center">
                      <Calendar className="w-6 h-6 text-secondary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Schedule</p>
                    </div>
                  </div>
                </div>
                
                {/* Step indicator */}
                <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 1.5
              }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  Step 1: Your Dashboard
                </motion.div>
              </motion.div>

              {/* Connecting Arrow 1 */}
              <motion.div initial={{
              opacity: 0,
              pathLength: 0
            }} animate={{
              opacity: 1,
              pathLength: 1
            }} transition={{
              duration: 0.8,
              delay: 1.6
            }} className="hidden md:block absolute left-1/4 top-32 z-5">
                <svg width="120" height="120" viewBox="0 0 120 120" className="text-primary/40">
                  <motion.path d="M 60 10 Q 30 60 40 110" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 8" initial={{
                  pathLength: 0
                }} animate={{
                  pathLength: 1
                }} transition={{
                  duration: 1,
                  delay: 1.6
                }} />
                  <motion.polygon points="40,110 35,100 45,100" fill="currentColor" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} transition={{
                  delay: 2.4
                }} />
                </svg>
              </motion.div>

              {/* Step 2: Study Session Card */}
              <motion.div initial={{
              opacity: 0,
              x: -40,
              scale: 0.9
            }} animate={{
              opacity: 1,
              x: 0,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 1.8
            }} whileHover={{
              scale: 1.05,
              y: -10
            }} className="relative md:absolute left-0 md:left-8 top-0 md:top-[200px] bg-card border-l-4 border-l-primary border-y border-r border-border/50 rounded-2xl p-4 md:p-5 shadow-lg max-w-sm backdrop-blur-sm z-10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-foreground">16:30</span>
                      <span className="text-sm text-muted-foreground">(90 min)</span>
                      <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">study</span>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-1">Mathematics</h4>
                    <p className="text-sm text-muted-foreground mb-2">Recognise, draw and sketch quadratic functions</p>
                    <div className="flex items-center gap-2 text-xs text-orange-600">
                      <span>📝</span>
                      <span className="font-medium">Test: 28/11/2025</span>
                    </div>
                  </div>
                </div>
                
                {/* Step indicator */}
                <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 2.5
              }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  Step 2: Study Session
                </motion.div>
              </motion.div>

              {/* Connecting Arrow 2 */}
              <motion.div initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} transition={{
              duration: 0.8,
              delay: 2.6
            }} className="hidden md:block absolute left-1/2 top-[280px] -translate-x-1/2 z-5">
                <svg width="200" height="100" viewBox="0 0 200 100" className="text-secondary/40">
                  <motion.path d="M 10 20 Q 100 10 190 40" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 8" initial={{
                  pathLength: 0
                }} animate={{
                  pathLength: 1
                }} transition={{
                  duration: 1,
                  delay: 2.6
                }} />
                  <motion.polygon points="190,40 180,35 185,45" fill="currentColor" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} transition={{
                  delay: 3.4
                }} />
                </svg>
              </motion.div>

              {/* Step 3: Reflection Card */}
              <motion.div initial={{
              opacity: 0,
              y: 40,
              scale: 0.9
            }} animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 2.8
            }} whileHover={{
              scale: 1.05,
              y: -10
            }} className="relative md:absolute left-0 md:left-auto right-0 md:right-8 top-0 md:top-[380px] bg-card border border-border/50 rounded-2xl p-4 md:p-5 shadow-lg max-w-xs backdrop-blur-sm z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-secondary" />
                    <h4 className="font-bold text-sm">Session Reflection</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">What went well:</span>
                      <div className="mt-1 bg-secondary/10 rounded p-2 text-xs">
                        "Examples were clear..."
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Challenging:</span>
                      <div className="mt-1 bg-destructive/10 rounded p-2 text-xs">
                        "Struggled with proofs"
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Feeling:</span>
                      <div className="mt-1 bg-primary/10 rounded p-2 text-xs text-primary font-medium">
                        Need more practice ✍️
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Step indicator */}
                <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 3.5
              }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  Step 3: Reflection
                </motion.div>
              </motion.div>

              {/* Connecting Arrow 3 */}
              <motion.div initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} transition={{
              duration: 0.8,
              delay: 3.6
            }} className="hidden md:block absolute right-1/4 top-[420px] z-5">
                <svg width="120" height="100" viewBox="0 0 120 100" className="text-accent/40">
                  <motion.path d="M 80 10 Q 60 50 70 90" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 8" initial={{
                  pathLength: 0
                }} animate={{
                  pathLength: 1
                }} transition={{
                  duration: 1,
                  delay: 3.6
                }} />
                  <motion.polygon points="70,90 65,80 75,80" fill="currentColor" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} transition={{
                  delay: 4.4
                }} />
                </svg>
              </motion.div>

              {/* Step 4: Insights Card */}
              <motion.div initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              duration: 0.8,
              delay: 3.8
            }} whileHover={{
              scale: 1.05
            }} className="relative md:absolute left-0 md:left-[25%] top-0 md:top-[620px] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/30 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-sm max-w-md w-full z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h4 className="font-bold">AI Generated Insights</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Mathematics</div>
                      <div className="text-lg font-bold text-primary">85%</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <motion.div className="h-full bg-primary rounded-full" initial={{
                        width: 0
                      }} animate={{
                        width: "85%"
                      }} transition={{
                        duration: 1,
                        delay: 4.5
                      }} />
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Biology</div>
                      <div className="text-lg font-bold text-secondary">72%</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <motion.div className="h-full bg-secondary rounded-full" initial={{
                        width: 0
                      }} animate={{
                        width: "72%"
                      }} transition={{
                        duration: 1,
                        delay: 4.6
                      }} />
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Physics</div>
                      <div className="text-lg font-bold text-accent">91%</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <motion.div className="h-full bg-accent rounded-full" initial={{
                        width: 0
                      }} animate={{
                        width: "91%"
                      }} transition={{
                        duration: 1,
                        delay: 4.7
                      }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Step indicator */}
                <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 4.5
              }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  Step 4: AI Insights ✨
                </motion.div>
              </motion.div>

              {/* Pulsing connection indicators */}
              <motion.div animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }} transition={{
              duration: 2,
              repeat: Infinity,
              delay: 5
            }} className="absolute left-1/2 top-24 w-3 h-3 bg-primary rounded-full -translate-x-1/2 z-20" />
              <motion.div animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }} transition={{
              duration: 2,
              repeat: Infinity,
              delay: 5.5
            }} className="absolute left-1/4 top-60 w-3 h-3 bg-primary rounded-full z-20" />
              <motion.div animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }} transition={{
              duration: 2,
              repeat: Infinity,
              delay: 6
            }} className="absolute right-1/4 top-80 w-3 h-3 bg-secondary rounded-full z-20" />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Testimonial Highlight */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="relative bg-gradient-to-br from-card to-primary/5 border border-border rounded-[2rem] p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-accent text-accent" />)}
              </div>
              <blockquote className="text-2xl sm:text-3xl font-display font-semibold leading-relaxed mb-8">
                "This site helped me stop procrastinating and actually revise on time. I had 6 ES tests in 3 weeks, back in December and honestly felt lost. Now I have a plan and I'm sticking to it!"
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                  A
                </div>
                <div>
                  <p className="font-semibold text-lg">Abhiram Kakarla



                </p>
                  <p className="text-muted-foreground">Year 10 Student            </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* User Story Section */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6">
              How real learners use it
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Meet Abhiram — a Year 10 student who had 6 exams in 3 weeks. Here's how he used it.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[{
            step: "1",
            title: "List everything",
            description: "Sarah added all 6 subjects, marked difficult topics, and set her exam dates. Took 3 minutes.",
            icon: <BookOpen className="w-6 h-6" />,
            color: "from-primary to-primary-light"
          }, {
            step: "2",
            title: "Get a smart plan",
            description: "The app created a personalized schedule for Abhiram — extra time on tricky topics, breaks between sessions, and no cramming the day before exams.",
            icon: <Brain className="w-6 h-6" />,
            color: "from-secondary to-accent"
          }, {
            step: "3",
            title: "Actually stick to it",
            description: "Push notifications, progress tracking, and visual rewards kept Abhiram motivated. He completed 95% of sessions and aced his exams.",
            icon: <Target className="w-6 h-6" />,
            color: "from-accent to-primary"
          }].map((item, index) => <StoryCard key={index} item={item} index={index} />)}
          </div>
        </div>
      </section>

      {/* Adaptive Scheduling Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-muted/30 to-background">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6">
              Missed a session? <span className="text-primary">No problem.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Life happens. We get it. That's why your plan adapts every single day based on what you actually did.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Daily feedback that matters</h3>
                  <p className="text-muted-foreground">
                    After each session, tell us how it went. What clicked? What was tough? These insights help the AI understand your learning style.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Automatically reschedules</h3>
                  <p className="text-muted-foreground">
                    Missed your Biology session? The AI notices and reschedules it for tomorrow, fitting it perfectly around your existing commitments.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Stays on track for exams</h3>
                  <p className="text-muted-foreground">
                    The system ensures you still cover everything before test day, even if you miss sessions. It's always optimizing to keep you prepared.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 30
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="relative">
              <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h4 className="font-bold text-lg">Today's Reflection</h4>
                    <span className="text-sm text-muted-foreground">5:30 PM</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">What did you find easy? 💡</label>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        The examples were clear...
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">What was challenging? 🤔</label>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        I struggled with the proofs...
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">Overall feeling</label>
                      <div className="bg-primary/10 rounded-lg p-3 text-sm text-primary font-medium">
                        Confident, need more practice
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl px-6 py-3 shadow-lg">
                <p className="text-sm font-semibold">✨ Tomorrow's plan updated!</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Insights & Analytics Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6">
              Personalized insights that
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                help you improve
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              After each session, our AI analyzes your feedback and generates detailed insights into your progress across all subjects.
            </p>
          </motion.div>

          <div className="space-y-16">
            {/* Feature showcase */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              x: -30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="order-2 md:order-1">
                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
                  <h4 className="font-bold text-lg mb-6">Your Progress Dashboard</h4>
                  <div className="space-y-6">
                    {[{
                    subject: "Mathematics",
                    confidence: 85,
                    color: "primary"
                  }, {
                    subject: "Biology",
                    confidence: 72,
                    color: "secondary"
                  }, {
                    subject: "Chemistry",
                    confidence: 68,
                    color: "accent"
                  }, {
                    subject: "Physics",
                    confidence: 91,
                    color: "primary"
                  }].map((item, i) => <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.subject}</span>
                          <span className="text-sm text-muted-foreground">{item.confidence}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div initial={{
                        width: 0
                      }} whileInView={{
                        width: `${item.confidence}%`
                      }} viewport={{
                        once: true
                      }} transition={{
                        duration: 1,
                        delay: i * 0.1
                      }} className={`h-full bg-${item.color} rounded-full`} style={{
                        background: `hsl(var(--${item.color}))`
                      }} />
                        </div>
                      </div>)}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              x: 30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="space-y-6 order-1 md:order-2">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">AI-powered analysis</h3>
                    <p className="text-muted-foreground">
                      Every reflection you submit gets analyzed to identify patterns, strengths, and areas needing focus.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Track confidence over time</h3>
                    <p className="text-muted-foreground">
                      See how your confidence grows for each topic as you practice. Visual graphs show your improvement journey.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Personalized recommendations</h3>
                    <p className="text-muted-foreground">
                      Get specific suggestions on which topics to prioritize, when to take breaks, and how to optimize your study approach.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Less card-heavy */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center mb-20 space-y-6">
            <h2 className="text-4xl sm:text-5xl font-display font-bold">
              And there's more...
            </h2>
          </motion.div>

          <div className="space-y-32">
            {/* Feature 0: AI Topic Analysis and Prioritization */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              x: -30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="space-y-6 order-2 md:order-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white shadow-lg">
                  <Brain className="w-12 h-12" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-display font-bold leading-tight">AI analyzes your topics & tailors your plan</h3>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Just upload your notes or paste a checklist. Our AI instantly extracts topics, analyzes difficulty based on your current progress, and helps you prioritize what matters most.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Smart extraction:</span> Upload images of your notes or paste text—AI automatically identifies all topics</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Difficulty ranking:</span> Topics arranged from easiest to hardest based on your timetable history and performance data</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Priority ordering:</span> Drag and drop to set your own priority—higher priority topics get more study time</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Personalized notes:</span> Add difficulty notes for each topic so AI can tailor session durations and timing</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Cards showing AI Parse and Priority Order */}
              <div className="relative h-[600px] order-1 md:order-2">
                {/* AI Parse Card */}
                <motion.div initial={{
                opacity: 0,
                x: -40,
                rotate: -3
              }} whileInView={{
                opacity: 1,
                x: 0,
                rotate: -3
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.2
              }} whileHover={{
                rotate: 0,
                scale: 1.03,
                y: -10
              }} className="absolute left-0 top-0 bg-background/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border overflow-hidden z-10 w-full max-w-[400px]">
                  <img src={aiTopicParse} alt="AI Topic Parsing - Upload notes and AI extracts topics" className="w-full h-auto" />
                </motion.div>

                {/* Priority Order Card */}
                <motion.div initial={{
                opacity: 0,
                x: 40,
                rotate: 3
              }} whileInView={{
                opacity: 1,
                x: 0,
                rotate: 3
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.4
              }} whileHover={{
                rotate: 0,
                scale: 1.05,
                y: -10
              }} className="absolute right-0 top-32 bg-background/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border overflow-hidden z-20 w-full max-w-[420px]">
                  <img src={topicPriorityOrder} alt="Priority Ordering - Drag topics to set priority for AI scheduling" className="w-full h-auto" />
                </motion.div>

                {/* Info Badge */}
                <motion.div initial={{
                opacity: 0,
                y: 20
              }} whileInView={{
                opacity: 1,
                y: 0
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.6
              }} className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-secondary to-accent text-white px-6 py-3 rounded-full shadow-xl z-30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold text-sm">AI-Powered Analysis</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature 1: Plans that adapt - Enhanced with floating cards */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              x: -30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white shadow-lg">
                  <Calendar className="w-12 h-12" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-display font-bold leading-tight">Plans that adapt to your life</h3>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Got football practice? Family dinner? Friend's birthday? Your study plan automatically works around your schedule. No conflicts. No stress.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Flexible scheduling:</span> Set your available time slots and the AI builds sessions around your events and commitments</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Session types:</span> Mix revision, homework, test prep, and blocked times for a balanced study plan</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Smart breaks:</span> Automatically schedules breaks and adjusts session lengths based on your preferences</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Color-coded clarity:</span> Instantly see what's planned with intuitive session type indicators</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Session Legend Card - Centered */}
              <div className="relative h-[500px] flex items-center justify-center">
                <motion.div initial={{
                opacity: 0,
                y: 30,
                scale: 0.95
              }} whileInView={{
                opacity: 1,
                y: 0,
                scale: 1
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.2
              }} whileHover={{
                scale: 1.02,
                y: -10
              }} className="bg-background/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border overflow-hidden w-full max-w-[600px]">
                  <img src={sessionLegend} alt="Session Types & Time Slot Legend" className="w-full h-auto" />
                </motion.div>

                {/* Info Badge */}
                <motion.div initial={{
                opacity: 0,
                y: 20
              }} whileInView={{
                opacity: 1,
                y: 0
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.6
              }} className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-primary/10 border border-primary/30 text-primary rounded-xl px-4 py-3 shadow-md backdrop-blur-sm max-w-xs">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <p className="font-semibold">10 sessions perfectly planned!</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature 2: Focus on what you struggle with - Enhanced with floating card */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              x: 30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="space-y-6 order-2 md:order-1">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white shadow-lg">
                  <Target className="w-12 h-12" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-display font-bold leading-tight">Focus on what you struggle with</h3>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Mark topics as difficult and get extra practice time. The smart algorithm ensures you master tough concepts before exam day.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Confidence scoring:</span> Rate your confidence for each topic on a 1-10 scale</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Difficulty notes:</span> Add specific notes about what you find challenging</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Smart time allocation:</span> AI allocates more study time to topics marked as difficult</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Personalized resources:</span> Get targeted resources and practice materials for your weak areas</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Card showing Topic Details */}
              <div className="relative h-[500px] order-1 md:order-2">
                <motion.div initial={{
                opacity: 0,
                y: 40,
                rotate: 2
              }} whileInView={{
                opacity: 1,
                y: 0,
                rotate: 2
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.2
              }} whileHover={{
                rotate: 0,
                scale: 1.03,
                y: -10
              }} className="absolute left-1/2 -translate-x-1/2 top-0 bg-background/95 backdrop-blur-sm rounded-xl shadow-2xl border border-border overflow-hidden z-10 w-full max-w-[450px]">
                  <img src={topicDetailsCard} alt="Topic Details - Set confidence level and difficulty notes" className="w-full h-auto" />
                </motion.div>
              </div>
            </motion.div>

            {/* Feature 3: Study with Friends - Enhanced with floating cards */}
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8
          }} className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{
              opacity: 0,
              x: -30
            }} whileInView={{
              opacity: 1,
              x: 0
            }} viewport={{
              once: true
            }} transition={{
              duration: 0.8
            }} className="space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white shadow-lg">
                  <Users className="w-12 h-12" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-display font-bold leading-tight">Study with friends</h3>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Learning doesn't have to be lonely. Create private or public study groups, share your perfectly crafted timetables with friends, and keep each other motivated.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Share timetables:</span> Share your plan with friends who can customize it for their own schedule while keeping your topics and resources</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Study groups:</span> Create private groups with join codes or discover public groups studying the same subjects</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Leaderboards:</span> Compete with friends on study time, streak days, and completed sessions</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p><span className="font-semibold text-foreground">Group chat & resources:</span> Share notes, links, and tips in your group's dedicated space</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Cards showing Study Groups UI */}
              <div className="relative h-[500px]">
                {/* Study Group Card */}
                <motion.div initial={{
                opacity: 0,
                y: 40,
                rotate: -2
              }} whileInView={{
                opacity: 1,
                y: 0,
                rotate: -2
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.2
              }} whileHover={{
                rotate: 0,
                scale: 1.03,
                y: -10
              }} className="absolute left-0 top-0 bg-card border border-border rounded-3xl p-6 shadow-xl max-w-md w-full backdrop-blur-sm z-10">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-foreground mb-2">Dhrishiv and Abhiram</h4>
                        <p className="text-sm text-muted-foreground mb-3">December maths test revision week</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          Maths
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          Settings
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs">
                          Leave Group
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>2 members</span>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Private Group Join Code:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-bold text-foreground tracking-wider">2KUMPS</code>
                        <Button size="sm" variant="ghost" className="text-xs">
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this code with people you want to invite to the group</p>
                    </div>
                  </div>
                </motion.div>

                {/* Shared Timetable Card */}
                <motion.div initial={{
                opacity: 0,
                y: 40,
                rotate: 3
              }} whileInView={{
                opacity: 1,
                y: 0,
                rotate: 3
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.4
              }} whileHover={{
                rotate: 0,
                scale: 1.03,
                y: -10
              }} className="absolute right-0 top-48 bg-card border border-border rounded-2xl p-5 shadow-xl max-w-sm backdrop-blur-sm z-10">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-foreground mb-1">December maths test</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Users className="w-4 h-4" />
                      <span>Shared by Abhiram (Year 10)</span>
                    </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <Calendar className="w-4 h-4" />
                          <span>22/11/2025 - 27/11/2025</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                          Mathematics
                        </div>
                      </div>
                      <div className="shrink-0 bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">about 2 hours ago</div>

                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <span className="mr-2">⬇</span>
                      Implement
                    </Button>
                  </div>
                </motion.div>

                {/* Leaderboard Badge */}
                <motion.div initial={{
                opacity: 0,
                scale: 0.8
              }} whileInView={{
                opacity: 1,
                scale: 1
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.6
              }} className="absolute bottom-8 left-1/4 bg-gradient-to-r from-accent to-primary text-white rounded-2xl px-6 py-4 shadow-xl backdrop-blur-sm z-20">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🏆</div>
                    <div>
                      <p className="text-xs opacity-90">Week's Top Studier</p>
                      <p className="text-lg font-bold">Abhiram (Year 10) - 18.5 hrs</p>
                    </div>
                  </div>
                </motion.div>

                {/* Customize Badge */}
                <motion.div initial={{
                opacity: 0,
                x: 30
              }} whileInView={{
                opacity: 1,
                x: 0
              }} viewport={{
                once: true
              }} transition={{
                duration: 0.8,
                delay: 0.8
              }} className="absolute bottom-0 right-0 bg-secondary/10 border border-secondary/30 text-secondary rounded-xl px-4 py-3 shadow-md backdrop-blur-sm max-w-xs">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <p className="font-semibold">Auto-customizes to your schedule!</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* More Testimonials */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6">
              Students love it
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[{
            quote: "I went from getting 60% in school to a 90% average - this helped me a ton!",
            author: "Michael Thompson",
            role: "GCSE Student",
            initial: "M"
          }, {
            quote: "The smart scheduling is incredible. It knows exactly when I need breaks and when to push harder.",
            author: "Emma Rodriguez",
            role: "A-Level Student",
            initial: "E"
          }, {
            quote: "Love how it blocks out my events automatically. No more double-booking study sessions with my part-time job!",
            author: "James Wilson",
            role: "Year 11 Student",
            initial: "J"
          }, {
            quote: "Study groups feature is brilliant. We all share our plans and keep each other accountable.",
            author: "Priya Patel",
            role: "University Student",
            initial: "P"
          }].map((testimonial, index) => <TestimonialCard key={index} testimonial={testimonial} index={index} />)}
          </div>
        </div>
      </section>


      {/* Floating Pricing Cards */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.8
        }} className="text-center space-y-4 mb-20">
            <h2 className="text-4xl sm:text-5xl font-display font-bold">
              Choose Your Plan
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade anytime for unlimited access
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Free Plan Card */}
            <motion.div initial={{
            opacity: 0,
            y: 50,
            rotateX: 10
          }} whileInView={{
            opacity: 1,
            y: 0,
            rotateX: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.1
          }} whileHover={{
            y: -10,
            transition: {
              duration: 0.3
            }
          }} className="relative" style={{
            transformStyle: "preserve-3d",
            perspective: 1000
          }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-xl opacity-50" />
              <Card className="relative border-2 bg-card/95 backdrop-blur-sm shadow-2xl hover:shadow-primary/20 transition-all duration-500 h-full">
                <CardHeader className="space-y-6 pb-8">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <CardTitle className="text-3xl font-display">Free</CardTitle>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold">£0</span>
                      <span className="text-xl text-muted-foreground">/month</span>
                    </div>
                    <CardDescription className="text-base">
                      Try out our AI-powered study planning
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">1 timetable creation</p>
                        <p className="text-sm text-muted-foreground">Generate your first AI schedule</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">1 regeneration per day</p>
                        <p className="text-sm text-muted-foreground">Adjust your schedule once daily</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Basic AI insights</p>
                        <p className="text-sm text-muted-foreground">1 analysis per day</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Study tracking</p>
                        <p className="text-sm text-muted-foreground">Track sessions & progress</p>
                      </div>
                    </li>
                  </ul>
                  <Button onClick={() => navigate("/auth")} variant="outline" size="lg" className="w-full text-base py-6 hover:bg-primary/5 hover:border-primary/50 transition-all">
                    Get Started Free
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Plan Card */}
            <motion.div initial={{
            opacity: 0,
            y: 50,
            rotateX: 10
          }} whileInView={{
            opacity: 1,
            y: 0,
            rotateX: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.8,
            delay: 0.2
          }} whileHover={{
            y: -15,
            transition: {
              duration: 0.3
            }
          }} className="relative" style={{
            transformStyle: "preserve-3d",
            perspective: 1000
          }}>
              {/* Popular Badge */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                <motion.div animate={{
                y: [0, -5, 0]
              }} transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }} className="bg-gradient-to-r from-accent via-primary to-secondary text-white px-8 py-3 rounded-full text-sm font-bold shadow-2xl">
                  ⚡ Most Popular
                </motion.div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-3xl blur-2xl opacity-60 animate-pulse" />
              <Card className="relative border-2 border-primary/50 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm shadow-2xl hover:shadow-primary/30 transition-all duration-500 h-full overflow-hidden">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />

                <CardHeader className="space-y-6 pb-8 relative z-10">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <CardTitle className="text-3xl font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Premium
                    </CardTitle>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                        £5
                      </span>
                      <span className="text-xl text-muted-foreground">/month</span>
                    </div>
                    <CardDescription className="text-base">
                      Unlimited AI power for serious students
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 relative z-10">
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Unlimited timetables</p>
                        <p className="text-sm text-muted-foreground">Create as many as you need</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Unlimited regenerations</p>
                        <p className="text-sm text-muted-foreground">Adjust anytime, instantly</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Unlimited AI insights</p>
                        <p className="text-sm text-muted-foreground">Deep performance analysis</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Priority support</p>
                        <p className="text-sm text-muted-foreground">Get help when you need it</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">Early access</p>
                        <p className="text-sm text-muted-foreground">Try new features first</p>
                      </div>
                    </li>
                  </ul>
                  <Button onClick={() => navigate("/auth")} size="lg" className="w-full text-base py-6 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 hover:scale-105 transition-all shadow-xl text-white font-bold">
                    Upgrade to Premium
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Cancel anytime • No hidden fees • Money-back guarantee
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} whileInView={{
        opacity: 1,
        scale: 1
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.8
      }} className="max-w-5xl mx-auto text-center space-y-10 p-16 rounded-[3rem] bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold">
              Ready to stop stressing?
            </h2>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of students who are studying smarter, not harder.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-12 py-8 bg-gradient-to-r from-primary to-secondary hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-xl group rounded-full">
              Create your plan — it's free
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Setup in 2 minutes</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg">StudyPlanAI</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Help</a>
            </div>
            
            <p className="text-sm text-muted-foreground">© 2025 StudyPlanAI. Made with <Heart className="w-4 h-4 inline text-secondary" /> for students</p>
          </div>
        </div>
      </footer>
    </div></PageTransition>;
};
const StoryCard = ({
  item,
  index
}: {
  item: any;
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    y: 50
  }} animate={isInView ? {
    opacity: 1,
    y: 0
  } : {}} transition={{
    duration: 0.8,
    delay: index * 0.2
  }} className="relative">
      <div className="absolute -top-6 -left-6 w-16 h-16 rounded-2xl bg-gradient-to-br shadow-lg flex items-center justify-center text-white font-display font-bold text-2xl z-10" style={{
      backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`
    }}>
        <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
          {item.step}
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-3xl p-8 pt-12 hover:shadow-lg transition-all duration-300 h-full">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-6`}>
          {item.icon}
        </div>
        <h3 className="text-2xl font-display font-bold mb-4">{item.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{item.description}</p>
      </div>
    </motion.div>;
};
const FeatureRow = ({
  title,
  description,
  icon,
  gradient,
  direction
}: any) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    x: direction === "left" ? -50 : 50
  }} animate={isInView ? {
    opacity: 1,
    x: 0
  } : {}} transition={{
    duration: 0.8
  }} className={`flex flex-col ${direction === "right" ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-16`}>
      <div className="flex-1 space-y-6">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-3xl sm:text-4xl font-display font-bold leading-tight">{title}</h3>
        <p className="text-xl text-muted-foreground leading-relaxed">{description}</p>
      </div>
      
      <div className="flex-1">
        <motion.div whileHover={{
        scale: 1.02
      }} className={`aspect-video rounded-3xl bg-gradient-to-br ${gradient} opacity-20 shadow-2xl`} />
      </div>
    </motion.div>;
};
const TestimonialCard = ({
  testimonial,
  index
}: {
  testimonial: any;
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    y: 30
  }} animate={isInView ? {
    opacity: 1,
    y: 0
  } : {}} transition={{
    duration: 0.8,
    delay: index * 0.1
  }} className="bg-card border border-border rounded-3xl p-8 hover:shadow-lg transition-all duration-300">
      <div className="flex gap-1 mb-6">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-accent text-accent" />)}
      </div>
      <p className="text-lg text-foreground leading-relaxed mb-6">"{testimonial.quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
          {testimonial.initial}
        </div>
        <div>
          <p className="font-semibold">{testimonial.author}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>;
};
export default Landing;