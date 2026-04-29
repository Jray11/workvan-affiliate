import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader, UserPlus } from 'lucide-react';

/**
 * Public signup form rendered when someone hits /join/:directorCode.
 * Creates an affiliate row under the director and triggers the
 * password-setup email. Bonus/commission settings start at zero —
 * the director sets them later via their team page.
 */
export default function Recruit({ directorCode }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    agreedToTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [directorName, setDirectorName] = useState(null);

  // Best-effort: pull the director's name to personalize the page header.
  useEffect(() => {
    if (!directorCode) return;
    fetch(`https://workvanapp.com/api/affiliate-recruit-signup?lookup=${encodeURIComponent(directorCode)}`)
      .catch(() => {}); // optional, ignore failures
  }, [directorCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.agreedToTerms) {
      setError('Please agree to the terms before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch('https://workvanapp.com/api/affiliate-recruit-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directorCode, ...form }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setError(data.error || 'Could not complete signup. Please try again.');
        setSubmitting(false);
        return;
      }
      setDirectorName(data.directorName || null);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: '2rem',
    }}>
      <div style={{
        background: '#111',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '480px',
        border: '1px solid #222',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #F05A28, #F0895C)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <UserPlus size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e0e0e0', margin: '0 0 0.4rem' }}>
            {submitted ? 'You\'re in.' : 'Join the WorkVan affiliate team'}
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            {submitted
              ? `Check your email for a link to set up your password${directorName ? `. ${directorName} will be in touch with your commission setup.` : '.'}`
              : 'Create your affiliate account to start earning recurring commissions on every customer you bring to WorkVan.'
            }
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#888', fontSize: '0.85rem' }}>
              You can close this window.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Your name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="First and last"
                style={inputStyle}
              />
            </Field>

            <Field label="Email" required hint="Used to log in to your portal">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@example.com"
                style={inputStyle}
              />
            </Field>

            <Field label="Phone" hint="Optional">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 555-5555"
                style={inputStyle}
              />
            </Field>

            <Field label="Referral code" hint="Optional — pick a short handle people will type, or leave blank and we'll generate one">
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. johnsmith"
                maxLength={24}
                style={inputStyle}
              />
            </Field>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              marginTop: '0.5rem',
              marginBottom: '1.25rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#aaa',
              lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => setForm({ ...form, agreedToTerms: e.target.checked })}
                style={{ marginTop: '3px', accentColor: '#F05A28' }}
              />
              <span>
                I agree to the{' '}
                <a href="https://workvanapp.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#F05A28' }}>
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="https://workvanapp.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#F05A28' }}>
                  Privacy Policy
                </a>.
              </span>
            </label>

            {error && (
              <div style={{
                padding: '0.6rem 0.85rem',
                background: '#EF444420',
                border: '1px solid #EF444440',
                borderRadius: '6px',
                color: '#EF4444',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.95rem',
                background: submitting ? '#444' : 'linear-gradient(135deg, #F05A28, #F0895C)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {submitting ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating your account...
                </>
              ) : (
                'Sign up'
              )}
            </button>

            <p style={{
              color: '#666',
              fontSize: '0.75rem',
              textAlign: 'center',
              marginTop: '1.25rem',
              lineHeight: 1.5,
            }}>
              Your director sets your commission split after you're in. Once your password is set, you'll see everything in your portal.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.85rem 1rem',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#e0e0e0',
  fontSize: '1rem',
  boxSizing: 'border-box',
};

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        marginBottom: '0.4rem',
        color: '#aaa',
        fontSize: '0.85rem',
        fontWeight: 500,
      }}>
        {label}{required && <span style={{ color: '#F05A28', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.3rem' }}>{hint}</p>
      )}
    </div>
  );
}
