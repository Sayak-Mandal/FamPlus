import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Shield, Users, Activity, Sparkles, Heart, ArrowRight, CheckCircle2 } from "lucide-react"
import { DashboardMockup } from "@/components/landing/dashboard-mockup"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-primary/20">
      {/* Navbar with Glassmorphism Lite */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Famplus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-600 font-medium">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-bold shadow-lg shadow-slate-200">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 space-y-8 text-center lg:text-left flex flex-col items-center lg:items-start"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >

            
            <motion.h1 
              variants={fadeInUp}
              className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.05]"
            >
              Advanced <span className="text-primary tracking-tighter">AI Protection</span> for your family.
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg text-slate-500 max-w-xl leading-relaxed"
            >
              The unified health dashboard that monitors vitals, detects patterns, and alerts you to what matters most. Data-secured, family-linked, and community-focused.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="h-14 w-full sm:w-auto px-8 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-black shadow-xl shadow-primary/20 gap-2">
                  Join Your Family Circle <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex -space-x-3 items-center ml-4">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i} 
                      src={`/landing/p${i}.png`} 
                      alt={`User ${i}`}
                      className="w-10 h-10 rounded-full border-4 border-white object-cover" 
                    />
                  ))}
                  <p className="pl-6 text-sm text-slate-400 font-medium italic underline decoration-slate-200">Used by 500+ households</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex-1 relative w-full h-[400px] md:h-[500px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">The Guardian Technology</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We combine advanced clinical modeling with intuitive family management.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Sparkles className="w-6 h-6 text-white" />}
              title="AI Symptom Engine"
              desc="Our Bernoulli Naive Bayes model detects red-flag conditions like Angina with high precision."
              highlight={true}
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-indigo-500" />}
              title="Family Circles"
              desc="Independent accounts linked by trust. Every user keeps their own email while sharing data."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-green-600" />}
              title="Hashed & Verified"
              desc="All session data is secured via signed JWT tokens. Your privacy is our highest priority."
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden">
                <div className="relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black leading-tight">Peace of mind, <br/>available 24/7.</h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Whether it’s a sudden symptom or managing chronic vitals, <br className="hidden md:block" /> Famplus provides the context your family needs to act fast.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <CheckItem text="Real-time cardiac trend alerts" />
                        <CheckItem text="Shared profile management" />
                        <CheckItem text="7-day automated vitals history" />
                        <CheckItem text="Privacy-compliant architecture" />
                    </div>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />
            </div>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-400 font-medium">© 2026 Famplus. Advanced AI Health Companion.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc, highlight = false }: any) {
  return (
    <div className={`p-8 rounded-[2rem] border transition-all duration-300 ${highlight ? 'bg-primary/5 border-primary/20 shadow-xl shadow-primary/5 relative overflow-hidden' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg'}`}>
      {highlight && (
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" />
      )}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${highlight ? 'bg-primary text-white' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  )
}

function CheckItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-slate-300">{text}</span>
        </div>
    )
}

function Badge({ children, className }: any) {
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
            {children}
        </span>
    )
}
