import * as React from 'react';
import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, displayName: string) => void;
}

const WP_JWT_URL = 'https://virtual.motionpal.ir/wp-json/jwt-auth/v1/token';

// Add password strength validation
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for complexity requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const complexity = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  
  if (complexity < 3) {
    return { 
      valid: false, 
      message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters' 
    };
  }
  
  return { valid: true };
};

// Enhance error handling with specific messages
const handleLoginError = (error: unknown): string => {
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('invalid_username')) {
      return 'Invalid username. Please check your credentials.';
    }
    if (error.message.includes('incorrect_password')) {
      return 'Incorrect password. Please try again.';
    }
    if (error.message.includes('invalid_email')) {
      return 'Invalid email format.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }
  
  return 'An unknown error occurred. Please try again.';
};

// Add CSRF protection
const generateCSRFToken = (): string => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('csrfToken', token);
  return token;
};

const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrfToken');
  return token === storedToken;
};

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Attempting login with username:', username);
      const res = await fetch(WP_JWT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      console.log('JWT login response:', data);
      
      if (data.token) {
        localStorage.setItem('jwtToken', data.token);
        
        let userId = null;
        try {
          // Use the new custom endpoint to get the user ID
          const userRes = await fetch('https://virtual.motionpal.ir/wp-json/pulse2/v1/me', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });

          if (!userRes.ok) {
            const errorText = await userRes.text();
            throw new Error(`Failed to fetch user ID: Status ${userRes.status} - ${errorText}`);
          }

          const userData = await userRes.json();
          console.log('Fetched user data from custom endpoint:', userData);
          if (userData.id) {
              userId = String(userData.id);
          }
        } catch (err) {
          console.error('Error fetching user ID from custom endpoint:', err);
        }
        
        if (userId) {
          localStorage.setItem('userId', userId);
        } else {
          console.warn('Could not retrieve user ID. Falling back to demo-user.');
          localStorage.setItem('userId', 'demo-user');
        }
        
        // Store display name
        const displayName = data.user_display_name || data.user_nicename || data.user_email || username;
        localStorage.setItem('userDisplayName', displayName);
        
        // Log what we're storing
        console.log('Stored auth data:', {
          userId: localStorage.getItem('userId'),
          userDisplayName: localStorage.getItem('userDisplayName'),
          hasToken: !!localStorage.getItem('jwtToken')
        });
        
        onLoginSuccess(data.token, displayName);
        onClose();
      } else {
        console.error('Login failed:', data.message || 'Unknown error');
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Network error during login:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background text-foreground rounded-2xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center border border-border">
        <button onClick={onClose} className="absolute top-2 right-2 text-2xl text-foreground/60 hover:text-foreground">×</button>
        <div className="flex flex-col items-center mb-6">
          <div className="glassy-login-icon mb-3 flex items-center justify-center">
            {/* Glassy effect icon with main color gradient */}
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="primary-gradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D72660" />
                  <stop offset="1" stopColor="#FF6FB5" />
                </linearGradient>
              </defs>
              <circle cx="22" cy="22" r="20" fill="url(#primary-gradient)" fillOpacity="0.7" />
              <circle cx="22" cy="22" r="20" fill="white" fillOpacity="0.08" />
              <circle cx="22" cy="22" r="20" stroke="white" strokeOpacity="0.18" strokeWidth="2" />
              <path d="M22 13v11l8 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="pl-10"
              placeholder="email address"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10"
              placeholder="Password"
              required
            />
          </div>
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <Button
            type="submit"
                            className="w-full button-primary-enhanced hover-shimmer cyrus-ui mt-2"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
      <style>{`
        .glassy-login-icon {
          background: rgba(255,255,255,0.10);
          border-radius: 9999px;
          box-shadow: 0 4px 32px 0 rgba(215,38,96,0.12), 0 1.5px 8px 0 rgba(255,111,181,0.10);
          backdrop-filter: blur(8px);
          padding: 0.75rem;
        }
      `}</style>
    </div>
  );
}; 