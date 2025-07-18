import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    
    if (!isLogin) {
      if (!name.trim()) {
        setError('Name is required');
        return false;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Login with email/password
        const response = await authAPI.login({ email, password });
        
        if (response.data.user) {
          setUser(response.data.user);
          navigate('/chat');
        }
      } else {
        // Register new account
        const response = await authAPI.register({ email, password, name });
        
        if (response.data.user) {
          setUser(response.data.user);
          navigate('/chat');
        }
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(errorMessage || `${isLogin ? 'Login' : 'Registration'} failed. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Redirect to Google OAuth - this will handle the full OAuth flow
      window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
    } catch (error: any) {
      console.error('Google login failed:', error);
      setError('Google login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Welcome message and abstract design */}
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        <div className="max-w-md z-10 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start mb-8">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-gray-900">MCP Chat Bot</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            {isLogin ? 'Welcome Back!' : 'Join MCP Chat Bot'}
          </h1>
          <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
            {isLogin 
              ? 'Sign in to continue your AI-powered conversations with seamless Google Workspace integration.'
              : 'Create your account to get started with AI-powered conversations, file analysis, and Google Workspace integration.'
            }
          </p>
          
          {/* Feature highlights for signup */}
          {!isLogin && (
            <div className="mt-8 space-y-3 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                <span>AI-powered chat with GPT-4.1 models</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                <span>Google Workspace integration (Drive, Gmail, Calendar)</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                <span>File upload and analysis capabilities</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                <span>Project organization and chat history</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Abstract lines */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute -top-40 -right-40 w-96 h-96 text-gray-200" viewBox="0 0 400 400" fill="none">
            <path d="M50 200 Q 200 50 350 200 Q 200 350 50 200" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
            <path d="M80 200 Q 200 80 320 200 Q 200 320 80 200" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
            <path d="M110 200 Q 200 110 290 200 Q 200 290 110 200" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
          </svg>
          <svg className="absolute -bottom-40 -left-40 w-96 h-96 text-gray-200" viewBox="0 0 400 400" fill="none">
            <path d="M50 50 L 350 350" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
            <path d="M80 50 L 350 320" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <path d="M110 50 L 350 290" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
            <path d="M50 80 L 320 350" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <path d="M50 110 L 290 350" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? 'Sign in to continue to your account' 
                : 'Join thousands of users already using MCP Chat Bot'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-5 h-5 text-gray-400" />}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5 text-gray-400" />}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder={isLogin ? "Enter your password" : "Create a password (min. 6 characters)"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5 text-gray-400" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              size="lg"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLogin ? 'Continue with Google' : 'Sign up with Google'}
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              {isLogin 
                ? "Don't have an account? Create one now" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Terms and Privacy for signup */}
          {!isLogin && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-gray-700 hover:text-gray-900 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-gray-700 hover:text-gray-900 underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};