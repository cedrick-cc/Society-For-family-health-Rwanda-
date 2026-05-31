import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import sfhLogo from '@/assets/sfh-logo.png';
import loginHero from '@/assets/login-hero.jpg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      if (result.mustChangePassword) {
        setError('Temporary password detected. Please change your password from your profile settings.');
      }
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex relative overflow-y-auto lg:overflow-hidden" data-theme="light">
      
      {/* Full Background with Image and Overlay */}
      <div className="absolute inset-0">
        <img 
          src={loginHero} 
          alt="Community Health" 
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay - Dark Blue (#00008b) to Neon Green */}
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0, 0, 139, 0.95) 0%, rgba(0, 0, 139, 0.85) 50%, rgba(57, 255, 20, 0.75) 100%)' }}
        />
        
        {/* Curved Shape Overlay - Neon Green */}
        <svg 
          className="absolute right-0 top-0 h-full w-1/2 hidden lg:block" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <path 
            d="M30 0 Q0 50 30 100 L100 100 L100 0 Z" 
            fill="rgba(57, 255, 20, 0.85)"
          />
        </svg>
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row min-h-screen lg:h-full">
        {/* Left Panel - Branding & Message */}
        <div className="w-full lg:w-3/5 flex flex-col justify-start p-4 sm:p-6 lg:p-10 xl:p-14 lg:justify-center">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-3 sm:mb-5 lg:mb-6"
          >
            <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-48 lg:h-48 xl:w-56 xl:h-56">
              <img src={sfhLogo} alt="SFH Rwanda Logo" className="w-full h-full object-contain" />
            </div>
          </motion.div>
          
          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-3 sm:mb-5 lg:mb-4"
          >
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white leading-tight mb-2 sm:mb-3">
              Empowering<br />
              Community Health.
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-secondary italic">
              Inspiring Change
            </h2>
          </motion.div>
          
          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xs sm:text-sm lg:text-base xl:text-lg text-white/80 max-w-xl leading-relaxed mb-2 sm:mb-4 lg:mb-6"
          >
            At SFH, we are driven by a single purpose: empowering communities to live healthier, 
            more fulfilled lives through innovative health solutions, impactful programs, and 
            dedicated outreach across Rwanda.
          </motion.p>
          
          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="hidden lg:flex items-center gap-5"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-white/60">Volunteers</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">30</p>
              <p className="text-xs text-white/60">Districts</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">100K+</p>
              <p className="text-xs text-white/60">Lives Impacted</p>
            </div>
          </motion.div>
        </div>
        
        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-2/5 flex items-center justify-start p-3 sm:p-6 lg:p-8 xl:p-10 lg:justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-md flex flex-col"
          >
            {/* Form Card - Dark Glass */}
            <div
              className="rounded-2xl shadow-2xl p-5 sm:p-6 lg:p-10"
              style={{
                background: 'rgba(0, 10, 40, 0.72)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 8px 40px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3">
                  <img src={sfhLogo} alt="SFH Rwanda Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  Welcome Back
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Sign in to access your dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="your.email@sfh.org.rw"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(57,255,20,0.7)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        display: 'flex',
                        width: '100%',
                        height: '44px',
                        padding: '0 48px 0 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(57,255,20,0.7)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg text-sm"
                      style={{
                        background: 'rgba(220,38,38,0.15)',
                        border: '1px solid rgba(220,38,38,0.35)',
                        color: '#fca5a5',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(57,255,20,0.85) 0%, rgba(0,180,0,0.9) 100%)',
                    color: '#001a00',
                    border: 'none',
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 rounded-full"
                      style={{ borderColor: 'rgba(0,80,0,0.3)', borderTopColor: '#001a00' }}
                    />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Signup Link */}
              <div className="mt-4 sm:mt-6 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'rgba(57,255,20,0.85)' }}>
                    Create one here
                  </Link>
                </p>
              </div>

            </div>
            
            {/* Footer */}
            <p className="text-center text-[11px] leading-tight text-white/60 mt-2 sm:mt-6">
              © 2026 Society for Family Health Rwanda. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
