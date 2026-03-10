import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { Users, UserPlus, TrendingUp, DollarSign, Building2, Plus, X } from 'lucide-react';

export default function Team({ affiliate }) {
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    commission_model: 'fixed',
    commission_rate: affiliate.can_set_sub_rates ? '5.00' : ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [affiliate.id]);

  const loadTeam = async () => {
    try {
      // Get sub-affiliates
      const { data: subAffiliates } = await supabase
        .from('affiliates')
        .select('*')
        .eq('parent_affiliate_id', affiliate.id)
        .order('name');

      if (!subAffiliates || subAffiliates.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      // Get stats for each
      const subIds = subAffiliates.map(s => s.id);

      const { data: companies } = await supabase
        .from('companies')
        .select('id, referred_by_affiliate_id, subscription_status')
        .in('referred_by_affiliate_id', subIds);

      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('affiliate_id, commission_amount, status')
        .in('affiliate_id', subIds);

      const membersWithStats = subAffiliates.map(member => {
        const memberCompanies = companies?.filter(c => c.referred_by_affiliate_id === member.id) || [];
        const memberCommissions = commissions?.filter(c => c.affiliate_id === member.id) || [];

        return {
          ...member,
          accountCount: memberCompanies.length,
          activeCount: memberCompanies.filter(c => c.subscription_status === 'active').length,
          totalEarned: memberCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0),
          totalOwed: memberCommissions.filter(c => c.status === 'owed').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0)
        };
      });

      setTeamMembers(membersWithStats);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Determine commission rate
      let commissionRate = parseFloat(newMember.commission_rate);
      if (!affiliate.can_set_sub_rates) {
        // Use a default sub rate (company controlled)
        commissionRate = 5.00; // Default - this should come from company settings
      }

      const { error } = await supabase.from('affiliates').insert([{
        name: newMember.name,
        email: newMember.email || null,
        phone: newMember.phone || null,
        code: newMember.code.toLowerCase().replace(/\s+/g, ''),
        commission_model: newMember.commission_model,
        commission_rate: commissionRate,
        parent_affiliate_id: affiliate.id,
        active: true,
        portal_enabled: true,
        can_recruit: false
      }]);

      if (error) throw error;

      setShowAddForm(false);
      setNewMember({ name: '', email: '', phone: '', code: '', commission_model: 'fixed', commission_rate: '5.00' });
      loadTeam();
      toast.success('Team member added');
    } catch (error) {
      toast.error('Failed to add team member: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Team totals
  const teamTotals = teamMembers.reduce((acc, m) => ({
    accounts: acc.accounts + m.accountCount,
    active: acc.active + m.activeCount,
    earned: acc.earned + m.totalEarned
  }), { accounts: 0, active: 0, earned: 0 });

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading team...
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#e0e0e0',
            marginBottom: '0.5rem'
          }}>
            My Team
          </h1>
          <p style={{ color: '#888' }}>
            Manage your sub-affiliates and track their performance
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: '#9b59b6',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={18} />
          Add Team Member
        </button>
      </div>

      {/* Team Stats */}
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
          borderLeft: '4px solid #9b59b6'
        }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Team Size</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#9b59b6' }}>
            {teamMembers.length}
          </div>
        </div>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #3498db'
        }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Team Accounts</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3498db' }}>
            {teamTotals.accounts}
          </div>
        </div>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #4ecca3'
        }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Team Earnings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatCurrency(teamTotals.earned)}
          </div>
        </div>
      </div>

      {/* Override Info */}
      {affiliate.override_rate > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #9b59b620, #8e44ad20)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '2rem',
          border: '1px solid #9b59b640'
        }}>
          <div style={{ color: '#9b59b6', fontWeight: '600', marginBottom: '0.25rem' }}>
            Your Override Rate
          </div>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            You earn {(affiliate.override_rate * 100).toFixed(0)}%{' '}
            {affiliate.override_model === 'fixed' ? 'of the sale' : "of your team member's commission"}{' '}
            when they sign up new accounts.
          </div>
        </div>
      )}

      {/* Team Members */}
      {teamMembers.length === 0 ? (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          border: '1px solid #2a2a2a'
        }}>
          <Users size={48} style={{ color: '#444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#888', marginBottom: '0.5rem' }}>No team members yet</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Add your first team member to start building your sales team!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {teamMembers.map(member => (
            <div
              key={member.id}
              style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid #2a2a2a'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    background: 'linear-gradient(135deg, #3498db, #2980b9)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: '#e0e0e0', fontWeight: '600' }}>{member.name}</div>
                    <div style={{ color: '#888', fontSize: '0.8rem' }}>
                      Code: <code style={{ color: '#4ecca3' }}>{member.code}</code>
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '0.25rem 0.6rem',
                  background: member.active ? '#4ecca320' : '#88888820',
                  color: member.active ? '#4ecca3' : '#888',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {member.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: '#242424',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Accounts
                  </div>
                  <div style={{ color: '#3498db', fontWeight: '700', fontSize: '1.1rem' }}>
                    {member.accountCount}
                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '400' }}> ({member.activeCount} active)</span>
                  </div>
                </div>
                <div style={{
                  background: '#242424',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Commission
                  </div>
                  <div style={{ color: '#ff6b35', fontWeight: '700', fontSize: '1.1rem' }}>
                    {member.commission_model === 'percentage'
                      ? `${(member.commission_rate * 100).toFixed(0)}%`
                      : `${formatCurrency(member.commission_rate)}/mo`}
                  </div>
                </div>
                <div style={{
                  background: '#242424',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Earned
                  </div>
                  <div style={{ color: '#4ecca3', fontWeight: '700', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(member.totalEarned)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '450px',
            border: '1px solid #3a3a3a'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: '#e0e0e0', fontSize: '1.25rem', fontWeight: '700' }}>
                Add Team Member
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Referral Code *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.code}
                  onChange={(e) => setNewMember({ ...newMember, code: e.target.value })}
                  placeholder="e.g., john, sales1"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {affiliate.can_set_sub_rates && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                      Commission Type
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setNewMember({ ...newMember, commission_model: 'fixed', commission_rate: '5.00' })}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: newMember.commission_model === 'fixed' ? '#ff6b35' : '#2a2a2a',
                          border: newMember.commission_model === 'fixed' ? '2px solid #ff6b35' : '1px solid #3a3a3a',
                          borderRadius: '8px',
                          color: newMember.commission_model === 'fixed' ? '#fff' : '#888',
                          fontWeight: newMember.commission_model === 'fixed' ? '600' : '400',
                          cursor: 'pointer'
                        }}
                      >
                        $ per month
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMember({ ...newMember, commission_model: 'percentage', commission_rate: '0.10' })}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: newMember.commission_model === 'percentage' ? '#ff6b35' : '#2a2a2a',
                          border: newMember.commission_model === 'percentage' ? '2px solid #ff6b35' : '1px solid #3a3a3a',
                          borderRadius: '8px',
                          color: newMember.commission_model === 'percentage' ? '#fff' : '#888',
                          fontWeight: newMember.commission_model === 'percentage' ? '600' : '400',
                          cursor: 'pointer'
                        }}
                      >
                        % of revenue
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                      {newMember.commission_model === 'fixed' ? 'Amount ($ per month)' : 'Rate (e.g., 0.10 = 10%)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={newMember.commission_model === 'percentage' ? '1' : undefined}
                      value={newMember.commission_rate}
                      onChange={(e) => setNewMember({ ...newMember, commission_rate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2a2a2a',
                        border: '1px solid #3a3a3a',
                        borderRadius: '8px',
                        color: '#e0e0e0',
                        fontSize: '1rem'
                      }}
                    />
                    <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      {newMember.commission_model === 'fixed'
                        ? "This is what they'll earn per active account per month."
                        : "Enter as decimal (e.g., 0.10 for 10% of the account's monthly revenue)."}
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: '#2a2a2a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '0.875rem',
                    background: saving ? '#666' : '#9b59b6',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: saving ? 'wait' : 'pointer'
                  }}
                >
                  {saving ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
