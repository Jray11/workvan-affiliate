import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function SetPassword({ token, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [affiliate, setAffiliate] = useState(null);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      // Look up the affiliate by token
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, name, email, password_setup_token_expires_at')
        .eq('password_setup_token', token)
        .single();

      if (error || !data) {
        setTokenError('This setup link is invalid or has already been used.');
        return;
      }

      // Check if token has expired
      if (new Date(data.password_setup_token_expires_at) < new Date()) {
        setTokenError('This setup link has expired. Please contact your administrator for a new link.');
        return;
      }

      setAffiliate(data);
    } catch (err) {
      console.error('Token validation error:', err);
      setTokenError('An error occurred. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Use the API to set the password (handles both new and existing users)
      const response = await fetch('https://workvanapp.com/api/affiliate-set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          password: password
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to set password');
      }

      // Sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: password
      });

      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        // Not a critical error - they can still log in manually
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Password setup error:', err);
      setError(err.message || 'Failed to set up your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '#666' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, label: 'Weak', color: '#e74c3c' };
    if (strength <= 4) return { level: 2, label: 'Medium', color: '#f39c12' };
    return { level: 3, label: 'Strong', color: '#4ecca3' };
  };

  const passwordStrength = getPasswordStrength();

  if (validating) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        padding: '2rem'
      }}>
        <div style={{ color: '#888', fontSize: '1.25rem' }}>Validating setup link...</div>
      </div>
    );
  }

  if (tokenError) {
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
            background: '#e74c3c20',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <AlertCircle size={32} color="#e74c3c" />
          </div>
          <h2 style={{
            color: '#e0e0e0',
            fontSize: '1.25rem',
            marginBottom: '1rem'
          }}>
            Link Invalid
          </h2>
          <p style={{
            color: '#888',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            marginBottom: '1.5rem'
          }}>
            {tokenError}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#e0e0e0',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Go to Login
          </a>
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

        {/* Welcome message */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#e0e0e0', margin: 0 }}>
            Welcome, <strong>{affiliate?.name}</strong>!
          </p>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
            Create a password to access your affiliate portal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#888',
              fontSize: '0.85rem'
            }}>
              Create Password
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Password strength bar */}
            {password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '0.25rem'
                }}>
                  {[1, 2, 3].map(level => (
                    <div
                      key={level}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: level <= passwordStrength.level ? passwordStrength.color : '#333'
                      }}
                    />
                  ))}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: passwordStrength.color,
                  margin: 0
                }}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#888',
              fontSize: '0.85rem'
            }}>
              Confirm Password
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
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter password"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  background: '#1a1a1a',
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? '#e74c3c' : '#333'}`,
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword === password && (
              <p style={{
                fontSize: '0.75rem',
                color: '#4ecca3',
                margin: '0.25rem 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <CheckCircle size={12} /> Passwords match
              </p>
            )}
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
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading || !password || !confirmPassword || password !== confirmPassword
                ? '#666'
                : 'linear-gradient(135deg, #ff6b35, #f7931e)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading || !password || !confirmPassword || password !== confirmPassword ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? 'Setting up your account...' : (
              <>
                Create Account
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
          Already have an account?{' '}
          <a href="/" style={{ color: '#ff6b35', textDecoration: 'none' }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
