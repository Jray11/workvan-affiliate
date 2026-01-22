import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Referrals from './pages/Referrals';
import Commissions from './pages/Commissions';
import Team from './pages/Team';
import { LayoutDashboard, Users, DollarSign, UserPlus, LogOut, Menu, X } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // Check for impersonation token first
    const params = new URLSearchParams(window.location.search);
    const impersonateToken = params.get('impersonate');

    if (impersonateToken) {
      handleImpersonation(impersonateToken);
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
  ];

  if (affiliate.can_recruit) {
    navItems.push({ id: 'team', label: 'My Team', icon: UserPlus });
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'referrals':
        return <Referrals affiliate={affiliate} />;
      case 'commissions':
        return <Commissions affiliate={affiliate} />;
      case 'team':
        return affiliate.can_recruit ? <Team affiliate={affiliate} /> : <Dashboard affiliate={affiliate} />;
      default:
        return <Dashboard affiliate={affiliate} />;
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
            .main-content { padding-top: 60px !important; }
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
