import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import Referrals from './pages/Referrals';
import Commissions from './pages/Commissions';
import Team from './pages/Team';
import LeadTracker from './pages/LeadTracker';
import { LayoutDashboard, Users, DollarSign, UserPlus, LogOut, Menu, X, FileText, CheckCircle, Banknote, Building, Upload, TrendingUp } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [setupToken, setSetupToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check for password setup token first
    const token = params.get('token');
    if (token && window.location.pathname === '/setup') {
      setSetupToken(token);
      setLoading(false);
      return;
    }

    // Check for impersonation token
    const impersonateToken = params.get('impersonate');

    if (impersonateToken) {
      handleImpersonation(impersonateToken);
      return;
    }

    // Check if this is an auth callback (magic link redirect)
    // The hash contains access_token, refresh_token, etc.
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Process the auth callback - exchange tokens for session
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error setting session from magic link:', error);
          setLoading(false);
        } else if (session) {
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setSession(session);
          loadAffiliate(session.user.id);
        }
      });
      return;
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadAffiliate(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadAffiliate(session.user.id);
      } else {
        setAffiliate(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleImpersonation = async (token) => {
    try {
      // Decode the token: admin:affiliateId:timestamp
      const decoded = atob(token);
      console.log('Decoded token:', decoded);
      const [prefix, affiliateId, timestamp] = decoded.split(':');
      console.log('Token parts:', { prefix, affiliateId, timestamp });

      // Validate token (must be admin and less than 24 hours old)
      if (prefix !== 'admin') {
        throw new Error('Invalid token prefix');
      }

      const tokenAge = Date.now() - parseInt(timestamp);
      console.log('Token age (ms):', tokenAge);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new Error('Token expired');
      }

      // Load the affiliate directly
      console.log('Fetching affiliate:', affiliateId);
      const { data: affiliateData, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      console.log('Supabase response:', { affiliateData, error });

      if (error) {
        throw new Error('Supabase error: ' + error.message);
      }

      if (!affiliateData) {
        throw new Error('Affiliate not found');
      }

      setAffiliate(affiliateData);
      setIsImpersonating(true);
      setSession({ impersonating: true }); // Fake session for UI purposes

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Impersonation failed:', error);
      alert('Impersonation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliate = async (userId) => {
    try {
      // Get affiliate linked to this user
      const { data: affiliateUser, error: auError } = await supabase
        .from('affiliate_users')
        .select('affiliate_id')
        .eq('user_id', userId)
        .single();

      if (auError || !affiliateUser) {
        // Check if email matches an affiliate
        const { data: { user } } = await supabase.auth.getUser();
        const { data: affiliateByEmail } = await supabase
          .from('affiliates')
          .select('*')
          .eq('email', user.email)
          .eq('portal_enabled', true)
          .single();

        if (affiliateByEmail) {
          // Link this user to the affiliate
          await supabase.from('affiliate_users').insert([{
            user_id: userId,
            affiliate_id: affiliateByEmail.id
          }]);
          setAffiliate(affiliateByEmail);
        } else {
          // No affiliate found
          setAffiliate(null);
        }
      } else {
        // Load affiliate data
        const { data: affiliateData } = await supabase
          .from('affiliates')
          .select('*')
          .eq('id', affiliateUser.affiliate_id)
          .single();

        setAffiliate(affiliateData);
      }
    } catch (error) {
      console.error('Error loading affiliate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isImpersonating) {
      // Just close the window/tab for impersonation
      window.close();
      // Fallback if window.close doesn't work
      setSession(null);
      setAffiliate(null);
      setIsImpersonating(false);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setAffiliate(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a'
      }}>
        <div style={{ color: '#888', fontSize: '1.25rem' }}>Loading...</div>
      </div>
    );
  }

  // Password setup flow
  if (setupToken) {
    return (
      <SetPassword
        token={setupToken}
        onSuccess={() => {
          // Clear the token and refresh the page to check auth
          setSetupToken(null);
          window.history.replaceState({}, document.title, '/');
          window.location.reload();
        }}
      />
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!affiliate) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        padding: '2rem'
      }}>
        <div style={{
          background: '#1a1a1a',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#e0e0e0', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>
            Your account is not linked to an active affiliate profile.
            Please contact support if you believe this is an error.
          </p>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ff6b35',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Terms acceptance screen - show if affiliate hasn't agreed to terms yet
  // Skip for impersonation (admins viewing as affiliate)
  if (!isImpersonating && !affiliate.agreed_to_terms_at) {
    return <TermsAcceptance affiliate={affiliate} onAccept={async () => {
      const { error } = await supabase
        .from('affiliates')
        .update({ agreed_to_terms_at: new Date().toISOString() })
        .eq('id', affiliate.id);

      if (!error) {
        setAffiliate({ ...affiliate, agreed_to_terms_at: new Date().toISOString() });
      }
    }} onLogout={handleLogout} />;
  }

  // Direct Deposit setup screen - show after terms accepted but before payout is set up
  // Skip for impersonation (admins viewing as affiliate)
  if (!isImpersonating && !affiliate.payout_setup_complete) {
    return <DirectDepositSetup affiliate={affiliate} onComplete={async (payoutData) => {
      const { error } = await supabase
        .from('affiliates')
        .update({
          bank_name: payoutData.bankName,
          routing_number: payoutData.routingNumber,
          account_number: payoutData.accountNumber,
          account_type: payoutData.accountType,
          account_holder_name: payoutData.accountHolderName,
          tax_id_type: payoutData.taxIdType,
          tax_id_last4: payoutData.taxIdLast4,
          payout_setup_complete: true
        })
        .eq('id', affiliate.id);

      if (!error) {
        setAffiliate({ ...affiliate, payout_setup_complete: true });
      }
    }} onSkip={async () => {
      // Allow skipping for now, they can set it up later
      const { error } = await supabase
        .from('affiliates')
        .update({ payout_setup_complete: true })
        .eq('id', affiliate.id);

      if (!error) {
        setAffiliate({ ...affiliate, payout_setup_complete: true });
      }
    }} onLogout={handleLogout} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Lead Tracker', icon: TrendingUp },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
  ];

  if (affiliate.can_recruit) {
    navItems.push({ id: 'team', label: 'My Team', icon: UserPlus });
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'leads':
        return <LeadTracker affiliate={affiliate} />;
      case 'referrals':
        return <Referrals affiliate={affiliate} />;
      case 'commissions':
        return <Commissions affiliate={affiliate} />;
      case 'team':
        return affiliate.can_recruit ? <Team affiliate={affiliate} /> : <Dashboard affiliate={affiliate} onAffiliateUpdate={setAffiliate} />;
      default:
        return <Dashboard affiliate={affiliate} onAffiliateUpdate={setAffiliate} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - Desktop */}
      <aside style={{
        width: '240px',
        background: '#111',
        borderRight: '1px solid #222',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 100
      }} className="desktop-sidebar">
        <style>{`
          @media (max-width: 768px) {
            .desktop-sidebar { display: none !important; }
            .main-content { margin-left: 0 !important; }
          }
        `}</style>

        {/* Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Work Van
          </h1>
          <div style={{ color: '#666', fontSize: '0.8rem' }}>Affiliate Portal</div>
        </div>

        {/* User Info */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '0.75rem'
          }}>
            {affiliate.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ color: '#e0e0e0', fontWeight: '600' }}>{affiliate.name}</div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>{affiliate.email}</div>
          {affiliate.can_recruit && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.2rem 0.5rem',
              background: '#9b59b620',
              color: '#9b59b6',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '600',
              display: 'inline-block'
            }}>
              RECRUITER
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: currentPage === item.id ? '#ff6b3520' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentPage === item.id ? '#ff6b35' : '#888',
                fontSize: '0.9rem',
                fontWeight: currentPage === item.id ? '600' : '400',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                textAlign: 'left'
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#888',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Mobile Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#111',
        borderBottom: '1px solid #222',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        zIndex: 100
      }} className="mobile-header">
        <style>{`
          @media (max-width: 768px) {
            .mobile-header { display: flex !important; }
            .main-content { padding-top: 60px !important; padding-left: 1rem !important; padding-right: 1rem !important; overflow-x: hidden !important; width: 100vw !important; max-width: 100vw !important; box-sizing: border-box !important; }
            html, body, #root { max-width: 100vw !important; overflow-x: hidden !important; }
            #root > div { max-width: 100vw !important; overflow-x: hidden !important; }
          }
        `}</style>
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Work Van
        </h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#e0e0e0',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#111',
          zIndex: 99,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ color: '#e0e0e0', fontWeight: '600' }}>{affiliate.name}</div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>{affiliate.email}</div>
          </div>

          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: currentPage === item.id ? '#ff6b3520' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentPage === item.id ? '#ff6b35' : '#e0e0e0',
                fontSize: '1rem',
                fontWeight: currentPage === item.id ? '600' : '400',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                textAlign: 'left'
              }}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#888',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content" style={{
        flex: 1,
        marginLeft: '240px',
        padding: '2rem',
        minHeight: '100vh',
        background: '#0a0a0a'
      }}>
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div style={{
            background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
            color: '#fff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>👁️</span>
              <span style={{ fontWeight: '600' }}>Admin View</span>
              <span style={{ opacity: 0.9 }}>— Viewing as {affiliate?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.4rem 0.75rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Exit View
            </button>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
}

// Terms Acceptance Component
function TermsAcceptance({ affiliate, onAccept, onLogout }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    await onAccept();
    setLoading(false);
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
        maxWidth: '500px',
        border: '1px solid #222'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #9b59b620, #8e44ad20)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <FileText size={32} color="#9b59b6" />
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#e0e0e0',
            marginBottom: '0.5rem'
          }}>
            Welcome, {affiliate.name}!
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Before you get started, please review and accept our terms.
          </p>
        </div>

        {/* Terms Summary */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '1rem' }}>
            Partner Agreement Highlights
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.25rem',
            color: '#aaa',
            fontSize: '0.9rem',
            lineHeight: '1.7'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>Earn commissions on referred customers who subscribe</li>
            <li style={{ marginBottom: '0.5rem' }}>Commissions paid monthly for active accounts</li>
            <li style={{ marginBottom: '0.5rem' }}>No spam or misleading marketing practices</li>
            <li style={{ marginBottom: '0.5rem' }}>Maintain confidentiality of partner resources</li>
            <li>Work Van reserves the right to modify commission rates</li>
          </ul>
        </div>

        {/* Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              marginTop: '2px',
              accentColor: '#9b59b6',
              cursor: 'pointer'
            }}
          />
          <span style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>
            I have read and agree to the{' '}
            <a
              href="https://workvanapp.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#9b59b6', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              Terms & Conditions
            </a>
            {' '}and{' '}
            <a
              href="https://workvanapp.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#9b59b6', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Buttons */}
        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: agreed ? 'linear-gradient(135deg, #9b59b6, #8e44ad)' : '#333',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: agreed && !loading ? 'pointer' : 'not-allowed',
            opacity: agreed ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          {loading ? 'Please wait...' : (
            <>
              <CheckCircle size={18} />
              Accept & Continue
            </>
          )}
        </button>

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#888',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// Direct Deposit Setup Component (2-step: Bank Info -> Tax Info)
function DirectDepositSetup({ affiliate, onComplete, onSkip, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Bank Info, 2 = Tax Info
  const [formData, setFormData] = useState({
    accountHolderName: affiliate.name || '',
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'checking',
    taxIdType: 'ssn',
    taxId: ''
  });
  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!formData.routingNumber.match(/^\d{9}$/)) {
      newErrors.routingNumber = 'Routing number must be 9 digits';
    }
    if (!formData.accountNumber.match(/^\d{4,17}$/)) {
      newErrors.accountNumber = 'Account number must be 4-17 digits';
    }
    if (formData.accountNumber !== formData.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.taxId.match(/^\d{9}$/)) {
      newErrors.taxId = formData.taxIdType === 'ssn' ? 'SSN must be 9 digits' : 'EIN must be 9 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    await onComplete({
      accountHolderName: formData.accountHolderName,
      bankName: formData.bankName,
      routingNumber: formData.routingNumber,
      accountNumber: formData.accountNumber,
      accountType: formData.accountType,
      taxIdType: formData.taxIdType,
      taxIdLast4: formData.taxId.slice(-4)
    });
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '1rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#aaa',
    fontSize: '0.85rem',
    fontWeight: '500'
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
        maxWidth: '500px',
        border: '1px solid #222'
      }}>
        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: step >= 1 ? '#4ecca3' : '#333',
              color: step >= 1 ? '#000' : '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>1</div>
            <span style={{ color: step >= 1 ? '#e0e0e0' : '#666', fontSize: '0.85rem' }}>Bank Info</span>
          </div>
          <div style={{ width: '40px', height: '2px', background: step >= 2 ? '#4ecca3' : '#333', alignSelf: 'center' }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: step >= 2 ? '#4ecca3' : '#333',
              color: step >= 2 ? '#000' : '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>2</div>
            <span style={{ color: step >= 2 ? '#e0e0e0' : '#666', fontSize: '0.85rem' }}>Tax Info</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #4ecca320, #45b7aa20)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Banknote size={32} color="#4ecca3" />
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#e0e0e0',
            marginBottom: '0.5rem'
          }}>
            {step === 1 ? 'Direct Deposit Info' : 'Tax Information'}
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            {step === 1
              ? 'Set up your bank account for commission payouts.'
              : 'Required for 1099 tax reporting.'}
          </p>
        </div>

        {step === 1 ? (
        <form onSubmit={handleNext}>
          {/* Account Holder Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Account Holder Name</label>
            <input
              type="text"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
              placeholder="Full legal name"
              style={{
                ...inputStyle,
                borderColor: errors.accountHolderName ? '#e74c3c' : '#333'
              }}
            />
            {errors.accountHolderName && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.accountHolderName}</p>
            )}
          </div>

          {/* Bank Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Bank Name</label>
            <div style={{ position: 'relative' }}>
              <Building size={18} style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666'
              }} />
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="e.g. Chase, Bank of America"
                style={{
                  ...inputStyle,
                  paddingLeft: '2.75rem',
                  borderColor: errors.bankName ? '#e74c3c' : '#333'
                }}
              />
            </div>
            {errors.bankName && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.bankName}</p>
            )}
          </div>

          {/* Routing Number */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Routing Number</label>
            <input
              type="text"
              value={formData.routingNumber}
              onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder="9-digit routing number"
              maxLength={9}
              style={{
                ...inputStyle,
                borderColor: errors.routingNumber ? '#e74c3c' : '#333'
              }}
            />
            {errors.routingNumber && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.routingNumber}</p>
            )}
          </div>

          {/* Account Number */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Account Number</label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })}
              placeholder="Account number"
              style={{
                ...inputStyle,
                borderColor: errors.accountNumber ? '#e74c3c' : '#333'
              }}
            />
            {errors.accountNumber && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.accountNumber}</p>
            )}
          </div>

          {/* Confirm Account Number */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Confirm Account Number</label>
            <input
              type="text"
              value={formData.confirmAccountNumber}
              onChange={(e) => setFormData({ ...formData, confirmAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 17) })}
              placeholder="Re-enter account number"
              style={{
                ...inputStyle,
                borderColor: errors.confirmAccountNumber ? '#e74c3c' : '#333'
              }}
            />
            {errors.confirmAccountNumber && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.confirmAccountNumber}</p>
            )}
          </div>

          {/* Account Type */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Account Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
                background: formData.accountType === 'checking' ? '#4ecca320' : '#1a1a1a',
                border: `1px solid ${formData.accountType === 'checking' ? '#4ecca3' : '#333'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: formData.accountType === 'checking' ? '#4ecca3' : '#888'
              }}>
                <input
                  type="radio"
                  name="accountType"
                  value="checking"
                  checked={formData.accountType === 'checking'}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  style={{ display: 'none' }}
                />
                Checking
              </label>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
                background: formData.accountType === 'savings' ? '#4ecca320' : '#1a1a1a',
                border: `1px solid ${formData.accountType === 'savings' ? '#4ecca3' : '#333'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: formData.accountType === 'savings' ? '#4ecca3' : '#888'
              }}>
                <input
                  type="radio"
                  name="accountType"
                  value="savings"
                  checked={formData.accountType === 'savings'}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  style={{ display: 'none' }}
                />
                Savings
              </label>
            </div>
          </div>

          {/* Next Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #4ecca3, #45b7aa)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            Next: Tax Information
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={onSkip}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#888',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Skip for now
          </button>
        </form>
        ) : (
        <form onSubmit={handleSubmit}>
          {/* Tax ID Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Tax ID Type</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem',
                background: formData.taxIdType === 'ssn' ? '#ff6b3520' : '#1a1a1a',
                border: `1px solid ${formData.taxIdType === 'ssn' ? '#ff6b35' : '#333'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: formData.taxIdType === 'ssn' ? '#ff6b35' : '#888',
                fontSize: '0.9rem'
              }}>
                <input
                  type="radio"
                  name="taxIdType"
                  value="ssn"
                  checked={formData.taxIdType === 'ssn'}
                  onChange={(e) => setFormData({ ...formData, taxIdType: e.target.value })}
                  style={{ display: 'none' }}
                />
                SSN (Individual)
              </label>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.875rem',
                background: formData.taxIdType === 'ein' ? '#ff6b3520' : '#1a1a1a',
                border: `1px solid ${formData.taxIdType === 'ein' ? '#ff6b35' : '#333'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: formData.taxIdType === 'ein' ? '#ff6b35' : '#888',
                fontSize: '0.9rem'
              }}>
                <input
                  type="radio"
                  name="taxIdType"
                  value="ein"
                  checked={formData.taxIdType === 'ein'}
                  onChange={(e) => setFormData({ ...formData, taxIdType: e.target.value })}
                  style={{ display: 'none' }}
                />
                EIN (Business)
              </label>
            </div>
          </div>

          {/* Tax ID */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              {formData.taxIdType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'}
            </label>
            <input
              type="password"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              placeholder={formData.taxIdType === 'ssn' ? '9-digit SSN' : '9-digit EIN'}
              maxLength={9}
              style={{
                ...inputStyle,
                borderColor: errors.taxId ? '#e74c3c' : '#333'
              }}
            />
            {errors.taxId && (
              <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.taxId}</p>
            )}
            <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Required for tax reporting. We only store the last 4 digits.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#333' : 'linear-gradient(135deg, #4ecca3, #45b7aa)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Saving...' : (
              <>
                <CheckCircle size={18} />
                Save & Continue
              </>
            )}
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#888',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Back to Bank Info
          </button>
        </form>
        )}

        {/* Sign Out link */}
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
