import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, DollarSign, TrendingUp, Copy, Check, ExternalLink, FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard({ affiliate, onAffiliateUpdate }) {
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
  const [w9Uploading, setW9Uploading] = useState(false);
  const [w9Error, setW9Error] = useState(null);

  const REFERRAL_URL = `https://workvanapp.com?ref=${affiliate.code}`;

  useEffect(() => {
    loadStats();
  }, [affiliate.id]);

  const loadStats = async () => {
    try {
      // Get referred companies via RPC (bypasses RLS for impersonation)
      const { data: referralStats } = await supabase
        .rpc('get_affiliate_referral_stats', { p_affiliate_id: affiliate.id });

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

      const totalReferrals = referralStats?.total_referrals || 0;
      const activeReferrals = referralStats?.active_referrals || 0;
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

  const handleW9Upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setW9Error('Please upload a PDF or image file (JPG, PNG)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setW9Error('File size must be less than 10MB');
      return;
    }

    setW9Uploading(true);
    setW9Error(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${affiliate.id}/w9.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('affiliate-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update affiliate record
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({
          w9_file_path: fileName,
          w9_uploaded_at: new Date().toISOString()
        })
        .eq('id', affiliate.id);

      if (updateError) throw updateError;

      // Notify parent to refresh affiliate data
      if (onAffiliateUpdate) {
        onAffiliateUpdate({
          ...affiliate,
          w9_file_path: fileName,
          w9_uploaded_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('W-9 upload error:', error);
      setW9Error('Failed to upload W-9. Please try again.');
    } finally {
      setW9Uploading(false);
    }
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

      {/* W-9 Tax Form Section - Only show if not uploaded */}
      {!affiliate.w9_uploaded_at && (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #2a2a2a',
          marginTop: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ff6b3520',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={24} color="#ff6b35" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                color: '#e0e0e0',
                fontSize: '1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                W-9 Tax Form
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  background: '#ff6b3530',
                  color: '#ff6b35',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  REQUIRED FOR PAYOUTS
                </span>
              </h3>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Please upload your completed W-9 form to receive commission payouts.
              </p>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Need a blank form?{' '}
                <a
                  href="https://www.irs.gov/pub/irs-pdf/fw9.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#ff6b35', textDecoration: 'none' }}
                >
                  Download W-9 from IRS.gov
                </a>
              </p>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: w9Uploading ? 'wait' : 'pointer',
                  opacity: w9Uploading ? 0.7 : 1
                }}>
                  <Upload size={18} />
                  {w9Uploading ? 'Uploading...' : 'Upload Completed W-9'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleW9Upload}
                    disabled={w9Uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              {w9Error && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: '#2a1a1a',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#e74c3c',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} />
                  {w9Error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
