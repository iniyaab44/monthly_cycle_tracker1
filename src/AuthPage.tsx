import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import SunflowerLogo from './components/SunflowerLogo';

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { identifier, password } 
      : { email: identifier, password, name, username };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: ${res.status} ${res.statusText}. Please check if the API routes are correctly configured.`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isLogin) {
        login(data.token, data.user);
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (isLoginMode: boolean) => {
    setIsLogin(isLoginMode);
    setError('');
    setName('');
    setUsername('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-lightyellow">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="auth-card w-full max-w-md md:max-w-[750px]"
      >
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            Monthly 
            <SunflowerLogo className="w-10 h-10 md:w-16 md:h-16" />
            cycle
          </h1>
          <p className="text-sm md:text-base font-bold opacity-60">Track your rhythm with style.</p>
        </div>

        <div className="flex mb-8 border-4 border-black overflow-hidden">
          <button 
            onClick={() => toggleAuthMode(true)}
            className={`flex-1 py-3 font-black uppercase transition-colors ${isLogin ? 'bg-sandel text-black' : 'bg-white text-black'}`}
          >
            Login
          </button>
          <button 
            onClick={() => toggleAuthMode(false)}
            className={`flex-1 py-3 font-black uppercase transition-colors ${!isLogin ? 'bg-sandel text-black' : 'bg-white text-black'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-4 border-black p-3 font-bold text-sm text-red-600">
              {error}
            </div>
          )}

          {!isLogin && (
            <>
              <div>
                <label className="block font-black uppercase text-sm mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="neubrutalism-input w-full"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-black uppercase text-sm mb-2">Username</label>
                <input 
                  type="text" 
                  required
                  className="neubrutalism-input w-full"
                  placeholder="janedoe123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block font-black uppercase text-sm mb-2">
              {isLogin ? 'Username or Email' : 'Email Address'}
            </label>
            <input 
              type={isLogin ? 'text' : 'email'} 
              required
              className="neubrutalism-input w-full"
              placeholder={isLogin ? "janedoe or you@example.com" : "you@example.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-black uppercase text-sm mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                className="neubrutalism-input w-full pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-60 hover:opacity-100 transition-opacity"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button 
                type="button" 
                onClick={() => alert('Please contact support at sandramleotwe@gmail.com to reset your password.')}
                className="text-xs font-bold uppercase hover:underline opacity-60"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="neubrutalism-button w-full bg-sandel text-black flex items-center justify-center gap-2 py-4 text-xl disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : isLogin ? <><LogIn /> Login</> : <><UserPlus /> Register</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
