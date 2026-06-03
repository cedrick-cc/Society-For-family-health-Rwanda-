import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  LogIn,
  UserPlus,
  ArrowRight,
  LayoutDashboard,
  UserRoundCheck,
  MapPinned,
  Globe2,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Apple,
  Syringe,
  Droplets,
  ShieldCheck,
  TrendingUp,
  Handshake,
  Map,
  CheckCircle2,
  ChevronRight,
  Activity,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import sfhLogo from '@/assets/sfh-logo.png';
import heroImage from '@/assets/landing-hero.png';
import showcaseImage1 from '@/assets/landing-showcase-1.png';
import showcaseImage2 from '@/assets/landing-showcase-2.png';
import volunteerImage from '@/assets/landing-volunteer.png';

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Impact', href: '#impact' },
  { label: 'Volunteer', href: '#volunteer' },
] as const;

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Program Management',
    description: 'Manage and monitor outreach programs across districts.',
    accent: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: UserRoundCheck,
    title: 'Volunteer Coordination',
    description: 'Assign, track, and support volunteers in the field.',
    accent: 'from-secondary/25 to-secondary/5',
    iconColor: 'text-secondary',
  },
  {
    icon: MapPinned,
    title: 'Field Reporting',
    description: 'Capture field activities, GPS locations, images, and outcomes.',
    accent: 'from-accent/25 to-accent/5',
    iconColor: 'text-accent',
  },
  {
    icon: Globe2,
    title: 'Geographic Tracking',
    description: 'Visualize outreach activities and program coverage across Rwanda.',
    accent: 'from-info/25 to-info/5',
    iconColor: 'text-info',
  },
] as const;

const HEALTH_AREAS = [
  { icon: ShieldCheck, title: 'HIV Prevention', chip: 'bg-primary/15 text-primary' },
  { icon: HeartPulse, title: 'Family Planning', chip: 'bg-rose-500/15 text-rose-600' },
  { icon: Stethoscope, title: 'Maternal Health', chip: 'bg-secondary/15 text-secondary' },
  { icon: Apple, title: 'Child Nutrition', chip: 'bg-orange-500/15 text-orange-600' },
  { icon: Syringe, title: 'Vaccination Campaigns', chip: 'bg-sky-500/15 text-sky-600' },
  { icon: Activity, title: 'Malaria Prevention', chip: 'bg-emerald-600/15 text-emerald-700' },
  { icon: Droplets, title: 'Safe Water Initiatives', chip: 'bg-cyan-500/15 text-cyan-600' },
  { icon: Sparkles, title: 'Rural Sanitation', chip: 'bg-violet-500/15 text-violet-600' },
] as const;

const IMPACT_STATS = [
  { value: '5M+', label: 'People Reached', icon: UsersRound, tint: 'text-primary' },
  { value: '300+', label: 'Communities Served', icon: Map, tint: 'text-secondary' },
  { value: '20+', label: 'Partnerships', icon: Handshake, tint: 'text-accent' },
  { value: 'Nationwide', label: 'Coverage', icon: TrendingUp, tint: 'text-info' },
] as const;

const VOLUNTEER_BENEFITS = [
  'Make a positive impact',
  'Support vulnerable communities',
  'Participate in health outreach activities',
  'Contribute to meaningful change',
] as const;

const scrollToSection = (href: string) => {
  const id = href.replace('#', '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (href === '#home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

type LoginButtonProps = {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  showArrow?: boolean;
};

const LoginButton: React.FC<LoginButtonProps> = ({
  to = '/login',
  size = 'md',
  className,
  children = 'Login',
  showArrow = true,
}) => {
  const sizeClasses = {
    sm: 'h-9 px-4 text-sm gap-2',
    md: 'h-11 px-5 text-sm gap-2.5',
    lg: 'h-12 px-7 text-base gap-3',
  };

  const ringSizes = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Link
      to={to}
      className={cn('landing-login-btn group', sizeClasses[size], className)}
    >
      <span className={cn('login-icon-ring shrink-0', ringSizes[size])}>
        <LogIn className={iconSizes[size]} />
      </span>
      <span>{children}</span>
      {showArrow && (
        <ArrowRight
          className={cn(
            'shrink-0 transition-transform duration-300 group-hover:translate-x-1',
            iconSizes[size]
          )}
        />
      )}
    </Link>
  );
};

type VolunteerButtonProps = {
  size?: 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
};

const VolunteerSignupButton: React.FC<VolunteerButtonProps> = ({
  size = 'md',
  className,
  children = 'Create Volunteer Account',
}) => (
  <Link
    to="/signup"
    className={cn(
      'landing-outline-btn group',
      size === 'lg' ? 'h-12 px-7 text-base' : 'h-11 px-5 text-sm',
      className
    )}
  >
    <UserPlus className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
    <span>{children}</span>
    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
  </Link>
);

const SectionTag: React.FC<{ children: React.ReactNode; variant?: 'blue' | 'green' | 'orange' }> = ({
  children,
  variant = 'blue',
}) => {
  const variants = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-secondary/15 text-secondary',
    orange: 'bg-accent/15 text-accent',
  };
  return <span className={cn('landing-section-tag', variants[variant])}>{children}</span>;
};

const LandingNavbar: React.FC<{
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}> = ({ mobileOpen, setMobileOpen }) => {
  const handleNavClick = useCallback(
    (href: string) => {
      setMobileOpen(false);
      scrollToSection(href);
    },
    [setMobileOpen]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#002147]/80 backdrop-blur-md shadow-lg shadow-black/10">
      <div className="container flex h-[4.25rem] items-center justify-between gap-4">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('#home');
          }}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="relative">
            <img
              src={sfhLogo}
              alt="SFH Rwanda"
              className="h-[5.25rem] w-[5.25rem] object-contain transition-transform group-hover:scale-105"
            />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="block font-display font-bold text-white text-[15px]">SFH-OMS</span>
            <span className="block text-[10px] font-medium text-blue-200/80 tracking-wide uppercase">
              Outreach Monitoring System
            </span>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavClick(item.href)}
              className="px-4 py-2 rounded-full text-sm font-medium text-blue-100/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="ml-3 pl-3 border-l border-white/15">
            <LoginButton size="sm" showArrow={false}>
              Login
            </LoginButton>
          </div>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <LoginButton size="sm" showArrow={false}>
            Login
          </LoginButton>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="lg:hidden border-t border-white/10 bg-[#002147]/95 backdrop-blur-lg px-4 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => handleNavClick(item.href)}
              className="text-left py-3 px-4 rounded-xl text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};

const LandingFooter: React.FC = () => (
  <footer>
    <div className="landing-footer-main">
      <div className="container py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-muted/60 p-4 ring-1 ring-border/80">
                <img src={sfhLogo} alt="SFH Rwanda" className="h-14 w-18 object-contain" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground leading-snug">
                  Society for Family Health Rwanda
                </p>
                <p className="mt-1 text-sm font-medium text-primary">Outreach Monitoring System</p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Built for teams running community health programs — from field volunteers to
                  coordinators tracking impact nationwide.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Navigate
            </p>
            <ul className="space-y-2.5">
              {[
                { label: 'Back to top', href: '#home', onClick: true },
                { label: 'Login to system', to: '/login' },
                { label: 'Volunteer registration', to: '/signup' },
              ].map((link) => (
                <li key={link.label}>
                  {'onClick' in link && link.onClick ? (
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('#home');
                      }}
                      className="group inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.to!}
                      className="group inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Ready to get started?
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Staff and volunteers use SFH-OMS to coordinate outreach, log field work, and measure
              program reach across Rwanda.
            </p>
            <div className="flex flex-wrap gap-3">
              <LoginButton size="sm">Login</LoginButton>
              <VolunteerSignupButton size="md" className="h-9 px-4 text-sm">
                Join as volunteer
              </VolunteerSignupButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="landing-footer-bar py-4">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <p className="text-xs text-white/70">
          © {new Date().getFullYear()} SFH Rwanda · SFH-OMS — Not the official SFH public website.
        </p>
        <p className="text-xs text-white/50 font-medium">Monitoring · Outreach · Impact</p>
      </div>
    </div>
  </footer>
);

const LandingPage: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="landing-page min-h-screen flex flex-col bg-background" data-theme="light">
      <LandingNavbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="flex-1">
        {/* Hero */}
        <section id="home" className="relative overflow-hidden scroll-mt-[4.25rem] landing-hero-mesh">
          <div className="container relative py-14 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <SectionTag variant="green">Rwanda · Community Health</SectionTag>
                <h1 className="mt-5 font-display text-[2rem] sm:text-4xl lg:text-[2.75rem] font-extrabold text-foreground leading-[1.1]">
                  Society for Family Health Rwanda
                </h1>
                <p className="mt-2 font-display text-xl sm:text-2xl font-bold text-primary">
                  Outreach Monitoring System
                  <span className="text-muted-foreground font-semibold"> (SFH-OMS)</span>
                </p>
                <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  A centralized platform supporting community outreach programs through volunteer
                  coordination, beneficiary management, field reporting, geographic monitoring, and
                  program performance tracking across Rwanda.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
                  <LoginButton size="lg">Login to System</LoginButton>
                  <VolunteerSignupButton size="lg" />
                </div>
              </div>

              <div className="order-1 lg:order-2 relative">
                <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/15 blur-sm" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                  <img
                    src={heroImage}
                    alt="Community health outreach — caregiver and child"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white/90 backdrop-blur-md px-4 py-3 shadow-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Community-first outreach</p>
                      <p className="text-[11px] text-muted-foreground">Real families, real programs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="about" className="py-20 lg:py-24 scroll-mt-[4.25rem] border-y border-border/60 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mb-14">
              <SectionTag variant="blue">Platform</SectionTag>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">
                What SFH-OMS does
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Everything your outreach team needs — managed through a single digital workspace that keeps everything in view.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {FEATURES.map(({ icon: Icon, title, description, accent, iconColor }) => (
                <div key={title} className="landing-feature-card">
                  <div
                    className={cn(
                      'mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br',
                      accent
                    )}
                  >
                    <Icon className={cn('h-7 w-7', iconColor)} strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Health Impact */}
        <section className="py-20 lg:py-24">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <SectionTag variant="orange">Mission</SectionTag>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">
                Areas of health impact
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Programs tracked in SFH-OMS connect directly to SFH Rwanda&apos;s community health
                priorities.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
              {HEALTH_AREAS.map(({ icon: Icon, title, chip }) => (
                <div key={title} className="landing-health-tile group">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                      chip
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display font-bold text-sm sm:text-[15px] leading-snug">{title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Impact Stats */}
        <section id="impact" className="py-20 lg:py-24 scroll-mt-[4.25rem] bg-primary/[0.03]">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <SectionTag variant="blue">By the numbers</SectionTag>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">
                Our impact
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Scale and reach that community programs aspire to — measured and monitored in one
                place.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {IMPACT_STATS.map(({ value, label, icon: Icon, tint }) => (
                <div key={label} className="landing-stat-card">
                  <div
                    className={cn(
                      'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted',
                      tint
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <p className={cn('font-display text-4xl font-extrabold mb-1', tint)}>{value}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Volunteer — dark green */}
        <section
          id="volunteer"
          className="landing-volunteer-bg relative py-20 lg:py-24 scroll-mt-[4.25rem] overflow-hidden"
        >
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <span className="landing-section-tag bg-white/15 text-white/95 mb-5">
                  Volunteer with us
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.5rem] font-extrabold text-white leading-tight">
                  Join our volunteer community
                </h2>
                <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-lg">
                  Help improve health outcomes across Rwanda by participating in outreach programs,
                  community engagement, beneficiary support, and public health initiatives.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {VOLUNTEER_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-white/95">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" strokeWidth={2} />
                      <span className="font-medium">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="landing-volunteer-cta mt-10 h-12 px-8 text-base">
                  <UserPlus className="h-5 w-5" />
                  Create Volunteer Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/25 rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img
                    src={volunteerImage}
                    alt="SFH community volunteers and health workers"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
                <div
                  className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-xl"
                  aria-hidden
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs font-bold text-foreground">Open registrations</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="py-20 lg:py-24">
          <div className="container">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
              <div className="max-w-xl">
                <SectionTag variant="green">On the ground</SectionTag>
                <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold text-foreground">
                  Community health in action
                </h2>
              </div>
              <p className="text-muted-foreground max-w-md lg:text-right">
                Outreach isn&apos;t abstract data — it&apos;s people showing up where care is needed
                most.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
              <article className="group">
                <div className="relative rounded-2xl overflow-hidden shadow-md max-h-[17rem] sm:max-h-[19rem]">
                  <img
                    src={showcaseImage1}
                    alt="Community members and outreach volunteers together"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute top-4 left-4 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white">
                    01
                  </div>
                </div>
                <h3 className="mt-5 font-display font-bold text-lg">Reaching communities together</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Volunteers, partners, and local leaders united to deliver health services where
                  they&apos;re needed most.
                </p>
              </article>

              <article className="group md:mt-10">
                <div className="relative rounded-2xl overflow-hidden shadow-md max-h-[17rem] sm:max-h-[19rem]">
                  <img
                    src={showcaseImage2}
                    alt="Mother and child — maternal and child health"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute top-4 left-4 rounded-lg bg-secondary px-3 py-1 text-xs font-bold text-white">
                    02
                  </div>
                </div>
                <h3 className="mt-5 font-display font-bold text-lg">Healthier families, stronger futures</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Maternal health, nutrition, and prevention programs creating lasting impact across
                  Rwanda.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
