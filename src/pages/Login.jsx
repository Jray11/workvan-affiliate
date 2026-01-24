import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First check if this email is an affiliate
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, name, email, portal_enabled')
        .eq('email', email)
        .single();

      if (!affiliate) {
        throw new Error('No affiliate account found with this email.');
      }

      if (!affiliate.portal_enabled) {
        throw new Error('Portal access is not enabled for this account. Contact your administrator.');
      }

      // Send password reset via API (generates new setup token)
      const response = await fetch('https://workvanapp.com/api/send-affiliate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password_setup',
          affiliate: {
            id: affiliate.id,
            name: affiliate.name,
            email: affiliate.email
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    if (resetSent) {
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
            border: '1px solid #222',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#4ecca320',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <CheckCircle size={32} color="#4ecca3" />
            </div>
            <h2 style={{
              color: '#e0e0e0',
              fontSize: '1.25rem',
              marginBottom: '1rem'
            }}>
              Check Your Email
            </h2>
            <p style={{
              color: '#888',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              We've sent a password reset link to <strong style={{ color: '#e0e0e0' }}>{email}</strong>.
              Click the link in the email to set a new password.
            </p>
            <button
              onClick={() => {
                setMode('login');
                setResetSent(false);
                setError('');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#333',
                border: 'none',
                borderRadius: '8px',
                color: '#e0e0e0',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>
        </div>
      );
    }

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
            <p style={{ color: '#888', fontSize: '0.9rem' }}>Reset Your Password</p>
          </div>

          <p style={{
            color: '#888',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          {/* Form */}
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '1.5rem' }}>
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

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

        {/* Form */}
        <form onSubmit={handlePasswordLogin}>
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

          <div style={{ marginBottom: '0.5rem' }}>
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

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b35',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: 0
              }}
            >
              Forgot password?
            </button>
          </div>

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
            {loading ? 'Signing in...' : (
              <>
                Sign In
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
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}
