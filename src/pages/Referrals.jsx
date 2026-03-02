import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Building2, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function Referrals({ affiliate }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
  }, [affiliate.id]);

  const loadReferrals = async () => {
    try {
      // Use RPC to bypass RLS (needed for impersonation mode)
      const { data: stats } = await supabase
        .rpc('get_affiliate_referral_stats', { p_affiliate_id: affiliate.id });

      setReferrals(stats?.companies || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: '#4ecca3',
          bg: '#4ecca320',
          label: 'Active'
        };
      case 'trialing':
        return {
          icon: Clock,
          color: '#f39c12',
          bg: '#f39c1220',
          label: 'Trial'
        };
      case 'canceled':
      case 'inactive':
        return {
          icon: XCircle,
          color: '#e74c3c',
          bg: '#e74c3c20',
          label: 'Inactive'
        };
      default:
        return {
          icon: Clock,
          color: '#888',
          bg: '#88888820',
          label: status || 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading referrals...
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
        Your Referrals
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Accounts that signed up using your referral link
      </p>

      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #2a2a2a',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3498db' }}>
            {referrals.length}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>Total Referrals</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #2a2a2a',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ecca3' }}>
            {referrals.filter(r => r.subscription_status === 'active').length}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>Active</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #2a2a2a',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f39c12' }}>
            {referrals.filter(r => r.subscription_status === 'trialing').length}
          </div>
          <div style={{ color: '#888', fontSize: '0.8rem' }}>In Trial</div>
        </div>
      </div>

      {/* Referrals List */}
      {referrals.length === 0 ? (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          border: '1px solid #2a2a2a'
        }}>
          <Building2 size={48} style={{ color: '#444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#888', marginBottom: '0.5rem' }}>No referrals yet</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Share your referral link to start earning commissions!
          </p>
        </div>
      ) : (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #2a2a2a',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#888', fontWeight: '500', fontSize: '0.85rem' }}>
                    Company
                  </th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: '#888', fontWeight: '500', fontSize: '0.85rem' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: '1rem', color: '#888', fontWeight: '500', fontSize: '0.85rem' }}>
                    Signed Up
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(referral => {
                  const status = getStatusBadge(referral.subscription_status);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={referral.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            background: '#2a2a2a',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Building2 size={18} color="#888" />
                          </div>
                          <div>
                            <div style={{ color: '#e0e0e0', fontWeight: '600' }}>
                              {referral.name || 'Unnamed Company'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          background: status.bg,
                          color: status.color,
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '0.85rem' }}>
                        {new Date(referral.referral_captured_at || referral.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
