import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import sfhLogo from '@/assets/sfh-logo.png';
import loginHero from '@/assets/login-hero.jpg';

const SignupPage: React.FC = () => {
  const { register, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    const result = await register(fullName, email, password);
    if (result.success) {
      setSuccessMessage('Registration submitted. Await admin approval.');
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '48px',
    padding: '0 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(57,255,20,0.7)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.15)';
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" data-theme="light">
      {/* Full Background */}
      <div className="absolute inset-0">
        <img src={loginHero} alt="Community Health" className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(0, 0, 139, 0.95) 0%, rgba(0, 0, 139, 0.85) 50%, rgba(57, 255, 20, 0.75) 100%)' }}
        />
        <svg className="absolute right-0 top-0 h-full w-1/2 hidden lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M30 0 Q0 50 30 100 L100 100 L100 0 Z" fill="rgba(57, 255, 20, 0.85)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel */}
        <div className="w-full lg:w-3/5 flex flex-col justify-center p-8 lg:p-16 xl:p-24">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 lg:mb-12">
            <div className="w-52 h-52 sm:w-60 sm:h-60 lg:w-72 lg:h-72">
              <img src={sfhLogo} alt="SFH Rwanda Logo" className="w-full h-full object-contain" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-white leading-tight mb-4">
              Join Our<br />Mission.
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-secondary italic">
              Make a Difference
            </h2>
          </motion.div>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="text-lg lg:text-xl text-white/80 max-w-xl leading-relaxed mb-8 lg:mb-12">
            Create your account to join the SFH Rwanda team and help us empower communities
            to live healthier, more fulfilled lives across Rwanda.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="hidden lg:flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-white/60">Volunteers</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">30</p>
              <p className="text-sm text-white/60">Districts</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100K+</p>
              <p className="text-sm text-white/60">Lives Impacted</p>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Signup Form */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="w-full max-w-md">
            <div
              className="rounded-2xl shadow-2xl p-8 lg:p-10"
              style={{
                background: 'rgba(0, 10, 40, 0.72)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 8px 40px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-center mb-6">
                <div className="w-32 h-32 mx-auto mb-3">
                  <img src={sfhLogo} alt="SFH Rwanda Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Create Account</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Join the SFH Rwanda team
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

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
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ ...inputStyle, paddingRight: '48px' }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ ...inputStyle, paddingRight: '48px' }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg text-sm"
                      style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg text-sm"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' }}
                    >
                      {successMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: 'linear-gradient(135deg, rgba(57,255,20,0.85) 0%, rgba(0,180,0,0.9) 100%)', color: '#001a00', border: 'none' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 rounded-full"
                      style={{ borderColor: 'rgba(0,80,0,0.3)', borderTopColor: '#001a00' }}
                    />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold hover:underline" style={{ color: 'rgba(57,255,20,0.85)' }}>
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-white/60 mt-6">
              © 2024 Society for Family Health Rwanda. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
