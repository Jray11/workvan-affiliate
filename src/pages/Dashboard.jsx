import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, DollarSign, TrendingUp, Copy, Check, ExternalLink } from 'lucide-react';

export default function Dashboard({ affiliate }) {
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: 0,
    totalOwed: 0,
    thisMonthEarned: 0,
    teamSize: 0
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const REFERRAL_URL = `https://workvanapp.com?ref=${affiliate.code}`;

  useEffect(() => {
    loadStats();
  }, [affiliate.id]);

  const loadStats = async () => {
    try {
      // Get referred companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, subscription_status')
        .eq('referred_by_affiliate_id', affiliate.id);

      // Get commissions
      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('commission_amount, status, period_month')
        .eq('affiliate_id', affiliate.id);

      // Get team size if recruiter
      let teamSize = 0;
      if (affiliate.can_recruit) {
        const { count } = await supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .eq('parent_affiliate_id', affiliate.id);
        teamSize = count || 0;
      }

      const totalReferrals = companies?.length || 0;
      const activeReferrals = companies?.filter(c => c.subscription_status === 'active').length || 0;
      const totalEarned = commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;
      const totalOwed = commissions?.filter(c => c.status === 'owed').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;

      // This month
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const thisMonthEarned = commissions?.filter(c => c.period_month === thisMonth).reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0) || 0;

      setStats({
        totalReferrals,
        activeReferrals,
        totalEarned,
        totalOwed,
        thisMonthEarned,
        teamSize
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(REFERRAL_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#e0e0e0',
        marginBottom: '0.5rem'
      }}>
        Welcome back, {affiliate.name}!
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Here's your affiliate performance overview
      </p>

      {/* Referral Link Card */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Your Referral Link
        </div>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <code style={{
            flex: 1,
            background: 'rgba(0,0,0,0.2)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: '200px'
          }}>
            {REFERRAL_URL}
          </code>
          <button
            onClick={copyReferralLink}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>
            Code: <strong style={{ color: '#fff' }}>{affiliate.code}</strong>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>
            Commission: <strong style={{ color: '#fff' }}>
              {affiliate.commission_model === 'fixed'
                ? `${formatCurrency(affiliate.commission_rate)}/mo`
                : `${(affiliate.commission_rate * 100).toFixed(0)}%`
              }
            </strong>
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #3498db'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={18} color="#3498db" />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Total Referrals</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3498db' }}>
            {stats.totalReferrals}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>
            {stats.activeReferrals} active
          </div>
        </div>

        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #4ecca3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={18} color="#4ecca3" />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Total Earned</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatCurrency(stats.totalEarned)}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>
            all time
          </div>
        </div>

        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #f39c12'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={18} color="#f39c12" />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Pending Payout</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f39c12', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatCurrency(stats.totalOwed)}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>
            awaiting payment
          </div>
        </div>

        {affiliate.can_recruit && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #2a2a2a',
            borderLeft: '4px solid #9b59b6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={18} color="#9b59b6" />
              <span style={{ color: '#888', fontSize: '0.8rem' }}>Team Size</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#9b59b6' }}>
              {stats.teamSize}
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>
              sub-affiliates
            </div>
          </div>
        )}
      </div>

      {/* This Month */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid #2a2a2a'
      }}>
        <h3 style={{ color: '#e0e0e0', marginBottom: '1rem', fontSize: '1rem' }}>
          This Month's Earnings
        </h3>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#4ecca3',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          {formatCurrency(stats.thisMonthEarned)}
        </div>
        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Based on active accounts this billing cycle
        </p>
      </div>

      {/* Commission Info */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid #2a2a2a',
        marginTop: '1rem'
      }}>
        <h3 style={{ color: '#e0e0e0', marginBottom: '1rem', fontSize: '1rem' }}>
          Your Commission Structure
        </h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Type</div>
            <div style={{ color: '#e0e0e0', fontWeight: '600' }}>
              {affiliate.commission_model === 'fixed' ? 'Fixed Amount' : 'Percentage'}
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Rate</div>
            <div style={{ color: '#ff6b35', fontWeight: '700', fontSize: '1.25rem' }}>
              {affiliate.commission_model === 'fixed'
                ? `${formatCurrency(affiliate.commission_rate)}/mo per account`
                : `${(affiliate.commission_rate * 100).toFixed(0)}% of revenue`
              }
            </div>
          </div>
        </div>
        {affiliate.can_recruit && affiliate.override_rate > 0 && (
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #2a2a2a'
          }}>
            <div style={{ color: '#9b59b6', fontSize: '0.85rem', fontWeight: '600' }}>
              Recruiter Override
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              You earn an additional {(affiliate.override_rate * 100).toFixed(0)}%{' '}
              {affiliate.override_model === 'fixed' ? 'of sale' : "of your sub's commission"}{' '}
              when your team members make sales.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
