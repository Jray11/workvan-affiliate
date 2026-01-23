import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('password'); // 'magic' or 'password'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'https://affiliates.workvanapp.com'
        }
      });

      if (error) throw error;

      setMessage('Check your email for a login link!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: '#111',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #222'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Work Van
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>Affiliate Portal</p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => setMode('magic')}
            style={{
              flex: 1,
              padding: '0.6rem',
              background: mode === 'magic' ? '#ff6b35' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: mode === 'magic' ? '#fff' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Magic Link
          </button>
          <button
            onClick={() => setMode('password')}
            style={{
              flex: 1,
              padding: '0.6rem',
              background: mode === 'password' ? '#ff6b35' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: mode === 'password' ? '#fff' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Password
          </button>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'magic' ? handleMagicLink : handlePasswordLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#888',
              fontSize: '0.85rem'
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666'
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {mode === 'password' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#888',
                fontSize: '0.85rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem 0.875rem 2.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#ff6b6b20',
              border: '1px solid #ff6b6b40',
              borderRadius: '8px',
              color: '#ff6b6b',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '0.75rem',
              background: '#4ecca320',
              border: '1px solid #4ecca340',
              borderRadius: '8px',
              color: '#4ecca3',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#666' : 'linear-gradient(135deg, #ff6b35, #f7931e)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? 'Please wait...' : (
              <>
                {mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          color: '#666',
          fontSize: '0.8rem'
        }}>
          {mode === 'magic'
            ? "We'll send you a secure link to sign in"
            : "Enter your affiliate portal credentials"
          }
        </p>
      </div>
    </div>
  );
}
