import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { Users, UserPlus, TrendingUp, DollarSign, Building2, Plus, X, Edit2, UserX, UserCheck, ChevronDown, ChevronRight, Crown, CheckCircle, Mail } from 'lucide-react';
import { TeamSkeleton } from '../Skeleton';

export default function Team({ affiliate, readOnly }) {
  const toast = useToast();
  const isDirector = affiliate.tier === 'director';
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
    // Always percentage — fixed $/month doesn't model how affiliate comp works.
    // User types whole-number percent (e.g. 15), saved as decimal (0.15).
    commission_pct: '',
    // null/'' = perpetual; otherwise N months from customer's first payment.
    commission_duration_months: '6',
    // One-time signing & onboarding bonus, capped by director's own.
    bonus_amount: '',
    tier: isDirector ? 'recruiter' : 'affiliate'
  });
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [promotingMember, setPromotingMember] = useState(null);

  // Director-specific state
  const [teamLeaderSubs, setTeamLeaderSubs] = useState({}); // { leaderId: [subs] }
  const [expandedLeaders, setExpandedLeaders] = useState({});

  useEffect(() => {
    loadTeam();
  }, [affiliate.id]);

  const loadTeam = async () => {
    try {
      // Get direct children
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

      const subIds = subAffiliates.map(s => s.id);

      // Get stats for direct children
      const { data: companies } = await supabase
        .from('companies')
        .select('id, referred_by_affiliate_id, subscription_status')
        .in('referred_by_affiliate_id', subIds);

      const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('affiliate_id, commission_amount, status')
        .in('affiliate_id', subIds);

      // For directors, also load each team leader's sub-affiliates
      let leaderSubsMap = {};
      if (isDirector) {
        const { data: allSubs } = await supabase
          .from('affiliates')
          .select('*')
          .in('parent_affiliate_id', subIds)
          .order('name');

        if (allSubs && allSubs.length > 0) {
          // Get stats for all subs too
          const allSubIds = allSubs.map(s => s.id);
          const { data: subCompanies } = await supabase
            .from('companies')
            .select('id, referred_by_affiliate_id, subscription_status')
            .in('referred_by_affiliate_id', allSubIds);

          const { data: subCommissions } = await supabase
            .from('affiliate_commissions')
            .select('affiliate_id, commission_amount, status')
            .in('affiliate_id', allSubIds);

          // Group subs by parent with stats
          allSubs.forEach(sub => {
            const parentId = sub.parent_affiliate_id;
            if (!leaderSubsMap[parentId]) leaderSubsMap[parentId] = [];
            const subComps = subCompanies?.filter(c => c.referred_by_affiliate_id === sub.id) || [];
            const subComms = subCommissions?.filter(c => c.affiliate_id === sub.id) || [];
            leaderSubsMap[parentId].push({
              ...sub,
              accountCount: subComps.length,
              activeCount: subComps.filter(c => c.subscription_status === 'active').length,
              totalEarned: subComms.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0)
            });
          });
        }
        setTeamLeaderSubs(leaderSubsMap);
      }

      const membersWithStats = subAffiliates.map(member => {
        const memberCompanies = companies?.filter(c => c.referred_by_affiliate_id === member.id) || [];
        const memberCommissions = commissions?.filter(c => c.affiliate_id === member.id) || [];
        const subs = leaderSubsMap[member.id] || [];

        return {
          ...member,
          accountCount: memberCompanies.length,
          activeCount: memberCompanies.filter(c => c.subscription_status === 'active').length,
          totalEarned: memberCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0),
          totalOwed: memberCommissions.filter(c => c.status === 'owed').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0),
          // Director-specific: aggregate sub stats
          subCount: subs.length,
          downlineAccounts: subs.reduce((sum, s) => sum + s.accountCount, 0),
          downlineEarned: subs.reduce((sum, s) => sum + s.totalEarned, 0)
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
      // Cap rate at director's own allotment (their commission_rate, e.g., 0.20).
      const ownRate = parseFloat(affiliate.commission_rate) || 0;
      const ownBonus = (parseFloat(affiliate.close_bonus_amount) || 0) + (parseFloat(affiliate.enablement_bonus_amount) || 0);

      let commissionRate;
      if (!affiliate.can_set_sub_rates) {
        // Director hasn't been authorized to set rates — fall back to 5%.
        commissionRate = 0.05;
      } else {
        const pct = parseFloat(newMember.commission_pct);
        if (Number.isNaN(pct) || pct < 0) {
          toast.error('Enter a commission percentage');
          setSaving(false);
          return;
        }
        commissionRate = Math.min(pct / 100, ownRate);
      }

      const bonusInput = parseFloat(newMember.bonus_amount) || 0;
      const cappedBonus = ownBonus > 0 ? Math.min(bonusInput, ownBonus) : bonusInput;

      const durationRaw = (newMember.commission_duration_months || '').toString().trim();
      const commissionDuration = durationRaw === '' || durationRaw === '0' ? null : parseInt(durationRaw);

      const selectedTier = isDirector ? (newMember.tier || 'recruiter') : 'affiliate';
      const insertData = {
        name: newMember.name,
        email: newMember.email || null,
        phone: newMember.phone || null,
        code: newMember.code.toLowerCase().replace(/\s+/g, ''),
        commission_model: 'percentage',
        commission_rate: commissionRate,
        commission_duration_months: commissionDuration,
        close_bonus_amount: cappedBonus,
        enablement_bonus_amount: 0,
        parent_affiliate_id: affiliate.id,
        active: true,
        portal_enabled: true,
        can_recruit: selectedTier === 'recruiter',
        can_set_sub_rates: selectedTier === 'recruiter',
        tier: selectedTier
      };

      const { data: inserted, error } = await supabase
        .from('affiliates')
        .insert([insertData])
        .select('id, name, email')
        .single();

      if (error) throw error;

      // Fire the password-setup email so the new member can actually log in.
      // Non-fatal — if it fails, the row still exists and the director can
      // hit "Resend invite" from the team list.
      let emailSent = false;
      if (inserted?.email) {
        try {
          const resp = await fetch('https://workvanapp.com/api/send-affiliate-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'password_setup',
              affiliate: { id: inserted.id, name: inserted.name, email: inserted.email, portal_enabled: true },
            }),
          });
          emailSent = resp.ok;
        } catch (sendErr) {
          console.error('Failed to send setup email:', sendErr);
        }
      }

      setShowAddForm(false);
      setNewMember({
        name: '', email: '', phone: '', code: '',
        commission_pct: '', commission_duration_months: '6', bonus_amount: '',
        tier: isDirector ? 'recruiter' : 'affiliate',
      });
      loadTeam();
      const noun = selectedTier === 'recruiter' ? 'Team leader' : 'Affiliate';
      if (emailSent) {
        toast.success(`${noun} added — setup email sent to ${inserted.email}`);
      } else if (inserted?.email) {
        toast.success(`${noun} added — couldn't send setup email, use Resend Invite`);
      } else {
        toast.success(`${noun} added (no email on file)`);
      }
    } catch (error) {
      toast.error('Failed to add team member: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (member) => {
    if (!member.email) {
      toast.error('No email on file for this member');
      return;
    }
    try {
      const resp = await fetch('https://workvanapp.com/api/send-affiliate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password_setup',
          affiliate: { id: member.id, name: member.name, email: member.email, portal_enabled: true },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        toast.success(`Setup email sent to ${member.email}`);
      } else {
        toast.error(data.error || 'Failed to send invite');
      }
    } catch (err) {
      toast.error('Failed to send invite: ' + err.message);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const durationRaw = (editingMember.commission_duration_months ?? '').toString().trim();
      const updateData = {
        commission_model: 'percentage',
        commission_rate: parseFloat(editingMember.commission_rate),
        commission_duration_months: durationRaw === '' || durationRaw === '0' ? null : parseInt(durationRaw),
      };
      if (isDirector && affiliate.can_grant_deal_bonus) {
        if (editingMember.close_bonus_amount !== undefined) {
          updateData.close_bonus_amount = editingMember.close_bonus_amount ? parseFloat(editingMember.close_bonus_amount) : 0;
        }
        if (editingMember.enablement_bonus_amount !== undefined) {
          updateData.enablement_bonus_amount = editingMember.enablement_bonus_amount ? parseFloat(editingMember.enablement_bonus_amount) : 0;
        }
      }
      // Directors can change tier (promote/demote)
      if (isDirector && editingMember.tier) {
        updateData.tier = editingMember.tier;
        updateData.can_recruit = editingMember.tier === 'recruiter';
        updateData.can_set_sub_rates = editingMember.tier === 'recruiter';
      }
      const { error } = await supabase
        .from('affiliates')
        .update(updateData)
        .eq('id', editingMember.id);

      if (error) throw error;
      setEditingMember(null);
      loadTeam();
      toast.success('Team member updated');
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member) => {
    const action = member.active ? 'deactivate' : 'reactivate';
    if (!confirm(`${member.active ? 'Deactivate' : 'Reactivate'} ${member.name}? ${member.active ? 'They will lose portal access.' : ''}`)) return;

    try {
      const updates = { active: !member.active, portal_enabled: !member.active };
      if (member.active) {
        updates.terminated_at = new Date().toISOString();
        const expires = new Date();
        expires.setDate(expires.getDate() + 90);
        updates.access_expires_at = expires.toISOString();
      } else {
        updates.terminated_at = null;
        updates.access_expires_at = null;
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', member.id);

      if (error) throw error;
      loadTeam();
      toast.success(`${member.name} ${action}d`);
    } catch (error) {
      toast.error(`Failed to ${action}: ` + error.message);
    }
  };

  const toggleLeaderExpanded = (leaderId) => {
    setExpandedLeaders(prev => ({ ...prev, [leaderId]: !prev[leaderId] }));
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

  // Director downline totals
  const downlineTotals = isDirector ? teamMembers.reduce((acc, m) => ({
    accounts: acc.accounts + m.accountCount + m.downlineAccounts,
    earned: acc.earned + m.totalEarned + m.downlineEarned,
    teamLeaders: acc.teamLeaders + 1,
    totalSubs: acc.totalSubs + m.subCount
  }), { accounts: 0, earned: 0, teamLeaders: 0, totalSubs: 0 }) : null;

  const activeMembers = teamMembers.filter(m => m.active !== false);
  const inactiveMembers = teamMembers.filter(m => m.active === false);

  if (loading) {
    return <TeamSkeleton />;
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
            {isDirector
              ? 'Manage your team leaders and their sub-affiliates'
              : 'Manage your sub-affiliates and track their performance'}
          </p>
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: isDirector ? '#f0a500' : '#9b59b6',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <UserPlus size={18} />
            {isDirector ? 'Add Team Member' : 'Add Team Member'}
          </button>
        )}
      </div>

      {/* Recruit Link — anyone with recruit permission can share their link */}
      {affiliate.can_recruit && affiliate.code && (
        <RecruitLinkCard code={affiliate.code} />
      )}

      {/* Team Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {isDirector ? (
          <>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #2a2a2a',
              borderLeft: '4px solid #f0a500'
            }}>
              <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Direct Reports</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f0a500' }}>
                {downlineTotals.teamLeaders}
              </div>
            </div>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #2a2a2a',
              borderLeft: '4px solid #9b59b6'
            }}>
              <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Downline</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#9b59b6' }}>
                {downlineTotals.totalSubs}
              </div>
            </div>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #2a2a2a',
              borderLeft: '4px solid #3498db'
            }}>
              <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>All Accounts</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3498db' }}>
                {downlineTotals.accounts}
              </div>
            </div>
            <div style={{
              background: '#1a1a1a',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #2a2a2a',
              borderLeft: '4px solid #4ecca3'
            }}>
              <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>All Earnings</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(downlineTotals.earned)}
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Payout Info */}
      {isDirector ? (
        <div style={{
          background: 'linear-gradient(135deg, #f0a50020, #e6960020)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '2rem',
          border: '1px solid #f0a50040'
        }}>
          <div style={{ color: '#f0a500', fontWeight: '600', marginBottom: '0.25rem' }}>
            Your Payout Allotment
          </div>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            You receive {affiliate.commission_model === 'percentage' ? `${(affiliate.commission_rate * 100).toFixed(0)}%` : formatCurrency(affiliate.commission_rate)} of revenue per referred account.
            Set the commission rates for your managers and affiliates below — their rates come out of your allotment.
          </div>
          {affiliate.director_max_override > 0 && (
            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Monthly budget cap: {formatCurrency(affiliate.director_max_override)}
            </div>
          )}
        </div>
      ) : affiliate.override_rate > 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #9b59b620, #8e44ad20)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '2rem',
          border: '1px solid #9b59b640'
        }}>
          <div style={{ color: '#9b59b6', fontWeight: '600', marginBottom: '0.25rem' }}>
            Your Team Earnings
          </div>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>
            You earn {(affiliate.override_rate * 100).toFixed(0)}%{' '}
            {affiliate.override_model === 'fixed' ? 'of the sale' : "of your team member's commission"}{' '}
            when they sign up new accounts.
          </div>
        </div>
      ) : null}

      {/* Team Members / Team Leaders */}
      {teamMembers.length === 0 ? (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          border: '1px solid #2a2a2a'
        }}>
          <Users size={48} style={{ color: '#444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#888', marginBottom: '0.5rem' }}>
            No team members yet
          </h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {isDirector
              ? 'Add managers or affiliates to start building your sales organization.'
              : 'Add your first team member to start building your sales team!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeMembers.map(member => (
            <div key={member.id}>
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: expandedLeaders[member.id] ? '12px 12px 0 0' : '12px',
                  padding: '1.25rem',
                  border: '1px solid #2a2a2a',
                  borderBottom: expandedLeaders[member.id] ? '1px solid #333' : '1px solid #2a2a2a'
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
                    {isDirector && (teamLeaderSubs[member.id]?.length > 0) && (
                      <button
                        onClick={() => toggleLeaderExpanded(member.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        {expandedLeaders[member.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    )}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      background: isDirector
                        ? 'linear-gradient(135deg, #f0a500, #e69600)'
                        : 'linear-gradient(135deg, #3498db, #2980b9)',
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
                      <div style={{ color: '#e0e0e0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {member.name}
                        {isDirector && member.tier === 'recruiter' && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            background: '#9b59b620',
                            color: '#9b59b6',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '600'
                          }}>
                            MANAGER
                          </span>
                        )}
                        {isDirector && member.tier === 'affiliate' && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            background: '#3498db20',
                            color: '#3498db',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '600'
                          }}>
                            DIRECT AFFILIATE
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>
                        Code: <code style={{ color: '#4ecca3' }}>{member.code}</code>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    {!readOnly && (
                      <>
                        <button
                          onClick={() => setEditingMember({
                            id: member.id,
                            name: member.name,
                            commission_model: 'percentage',
                            commission_rate: member.commission_rate,
                            commission_duration_months: member.commission_duration_months?.toString() ?? '',
                            close_bonus_amount: member.close_bonus_amount?.toString() || '0',
                            enablement_bonus_amount: member.enablement_bonus_amount?.toString() || '0',
                            tier: member.tier || 'affiliate'
                          })}
                          title="Edit"
                          style={{
                            padding: '0.35rem',
                            background: '#2a2a2a',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#888',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        {member.email && (
                          <button
                            onClick={() => handleResendInvite(member)}
                            title="Resend invite"
                            style={{
                              padding: '0.35rem',
                              background: '#2a2a2a',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#4ecca3',
                              cursor: 'pointer'
                            }}
                          >
                            <Mail size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(member)}
                          title={member.active ? 'Deactivate' : 'Reactivate'}
                          style={{
                            padding: '0.35rem',
                            background: '#2a2a2a',
                            border: 'none',
                            borderRadius: '6px',
                            color: member.active ? '#e74c3c' : '#4ecca3',
                            cursor: 'pointer'
                          }}
                        >
                          {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isDirector
                    ? 'repeat(auto-fit, minmax(100px, 1fr))'
                    : 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.75rem'
                }}>
                  <div style={{ background: '#242424', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Accounts
                    </div>
                    <div style={{ color: '#3498db', fontWeight: '700', fontSize: '1.1rem' }}>
                      {member.accountCount}
                      <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '400' }}> ({member.activeCount} active)</span>
                    </div>
                  </div>
                  <div style={{ background: '#242424', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Commission
                    </div>
                    <div style={{ color: '#ff6b35', fontWeight: '700', fontSize: '1.1rem' }}>
                      {member.commission_model === 'percentage'
                        ? `${(member.commission_rate * 100).toFixed(0)}%`
                        : `${formatCurrency(member.commission_rate)}/mo`}
                    </div>
                  </div>
                  <div style={{ background: '#242424', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Earned
                    </div>
                    <div style={{ color: '#4ecca3', fontWeight: '700', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatCurrency(member.totalEarned)}
                    </div>
                  </div>
                  {isDirector && (
                    <div style={{ background: '#242424', borderRadius: '8px', padding: '0.75rem' }}>
                      <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Sub-Affiliates
                      </div>
                      <div style={{ color: '#9b59b6', fontWeight: '700', fontSize: '1.1rem' }}>
                        {member.subCount}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand button for directors with subs */}
                {isDirector && (teamLeaderSubs[member.id]?.length > 0) && (
                  <button
                    onClick={() => toggleLeaderExpanded(member.id)}
                    style={{
                      width: '100%',
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: 'none',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#888',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {expandedLeaders[member.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {expandedLeaders[member.id]
                      ? 'Hide sub-affiliates'
                      : `Show ${teamLeaderSubs[member.id].length} sub-affiliate${teamLeaderSubs[member.id].length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              {/* Expanded sub-affiliates for directors */}
              {isDirector && expandedLeaders[member.id] && teamLeaderSubs[member.id]?.length > 0 && (
                <div style={{
                  background: '#141414',
                  borderRadius: '0 0 12px 12px',
                  border: '1px solid #2a2a2a',
                  borderTop: 'none',
                  padding: '0.75rem'
                }}>
                  {teamLeaderSubs[member.id].map(sub => (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: '#1a1a1a',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: '#333',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: '#888'
                        }}>
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#ccc', fontWeight: '500', fontSize: '0.9rem' }}>{sub.name}</div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>
                            Code: <code style={{ color: '#4ecca380' }}>{sub.code}</code>
                            {!sub.active && <span style={{ color: '#e74c3c', marginLeft: '0.5rem' }}>(inactive)</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                        <span style={{ color: '#3498db' }}>
                          {sub.accountCount} acct{sub.accountCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatCurrency(sub.totalEarned)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Inactive Members */}
          {inactiveMembers.length > 0 && (
            <>
              <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600', marginTop: '1rem' }}>
                Inactive ({inactiveMembers.length})
              </div>
              {inactiveMembers.map(member => (
                <div
                  key={member.id}
                  style={{
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px solid #2a2a2a',
                    opacity: 0.6
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        background: '#444',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#888'
                      }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#888', fontWeight: '600' }}>{member.name}</div>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>
                          Code: <code style={{ color: '#666' }}>{member.code}</code>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        background: '#88888820',
                        color: '#888',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Inactive
                      </span>
                      {!readOnly && (
                        <button
                          onClick={() => handleToggleActive(member)}
                          title="Reactivate"
                          style={{
                            padding: '0.35rem',
                            background: '#2a2a2a',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#4ecca3',
                            cursor: 'pointer'
                          }}
                        >
                          <UserCheck size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddForm && !readOnly && (
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

            {isDirector && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Role
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewMember({ ...newMember, tier: 'recruiter' })}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: newMember.tier === 'recruiter' ? '#f0a500' : '#2a2a2a',
                      border: newMember.tier === 'recruiter' ? '2px solid #f0a500' : '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: newMember.tier === 'recruiter' ? '#fff' : '#888',
                      fontWeight: newMember.tier === 'recruiter' ? '600' : '400',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMember({ ...newMember, tier: 'affiliate' })}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: newMember.tier === 'affiliate' ? '#3498db' : '#2a2a2a',
                      border: newMember.tier === 'affiliate' ? '2px solid #3498db' : '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: newMember.tier === 'affiliate' ? '#fff' : '#888',
                      fontWeight: newMember.tier === 'affiliate' ? '600' : '400',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Affiliate
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.35rem' }}>
                  {newMember.tier === 'recruiter'
                    ? 'Managers can recruit and manage their own affiliates.'
                    : 'Affiliates report directly to you.'}
                </div>
              </div>
            )}

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

              {affiliate.can_set_sub_rates && (() => {
                const ownRatePct = (parseFloat(affiliate.commission_rate) || 0) * 100;
                const ownBonus = (parseFloat(affiliate.close_bonus_amount) || 0) + (parseFloat(affiliate.enablement_bonus_amount) || 0);
                const enteredPct = parseFloat(newMember.commission_pct) || 0;
                const enteredBonus = parseFloat(newMember.bonus_amount) || 0;
                const pctOver = ownRatePct > 0 && enteredPct > ownRatePct;
                const bonusOver = ownBonus > 0 && enteredBonus > ownBonus;
                const durationStandard = ['', '6', '12', '24'];
                const durationSelectValue = durationStandard.includes(newMember.commission_duration_months) ? newMember.commission_duration_months : 'custom';
                return (
                  <>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                        Recurring Commission (%)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={ownRatePct || undefined}
                          value={newMember.commission_pct}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const clamped = ownRatePct > 0 && v > ownRatePct ? ownRatePct.toString() : e.target.value;
                            setNewMember({ ...newMember, commission_pct: clamped });
                          }}
                          placeholder={ownRatePct ? String(Math.min(15, ownRatePct)) : '15'}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            paddingRight: '2rem',
                            background: '#2a2a2a',
                            border: `1px solid ${pctOver ? '#EF4444' : '#3a3a3a'}`,
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            fontSize: '1rem',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}>%</span>
                      </div>
                      <div style={{ color: pctOver ? '#EF4444' : '#666', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                        {ownRatePct > 0
                          ? `Max ${ownRatePct.toFixed(0)}% — your own allotment from Work Van. They earn this on each referred account's monthly revenue.`
                          : "They earn this on each referred account's monthly revenue."}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                        Payout Duration
                      </label>
                      <select
                        value={durationSelectValue}
                        onChange={(e) => setNewMember({
                          ...newMember,
                          commission_duration_months: e.target.value === 'custom' ? '6' : e.target.value,
                        })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#2a2a2a',
                          border: '1px solid #3a3a3a',
                          borderRadius: '8px',
                          color: '#e0e0e0',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="">Perpetual (pays as long as the account stays active)</option>
                        <option value="6">6 months per account</option>
                        <option value="12">12 months per account</option>
                        <option value="24">24 months per account</option>
                        <option value="custom">Custom...</option>
                      </select>
                      {durationSelectValue === 'custom' && (
                        <input
                          type="number"
                          min="1"
                          value={newMember.commission_duration_months}
                          onChange={(e) => setNewMember({ ...newMember, commission_duration_months: e.target.value })}
                          placeholder="Months"
                          style={{
                            width: '100%',
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: '#2a2a2a',
                            border: '1px solid #3a3a3a',
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            fontSize: '1rem',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                      <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                        After the duration ends, you keep the full {ownRatePct ? `${ownRatePct.toFixed(0)}%` : 'payout'}.
                      </div>
                    </div>

                    {affiliate.can_grant_deal_bonus && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                          One-time Signing &amp; Onboarding Bonus ($)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max={ownBonus > 0 ? ownBonus : undefined}
                          value={newMember.bonus_amount}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const clamped = ownBonus > 0 && v > ownBonus ? ownBonus.toString() : e.target.value;
                            setNewMember({ ...newMember, bonus_amount: clamped });
                          }}
                          placeholder={ownBonus ? String(ownBonus) : '50'}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#2a2a2a',
                            border: `1px solid ${bonusOver ? '#EF4444' : '#3a3a3a'}`,
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            fontSize: '1rem',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ color: bonusOver ? '#EF4444' : '#666', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                          {ownBonus > 0
                            ? `Max $${ownBonus.toFixed(0)} — your own bonus. Paid once when their first customer makes their first subscription payment.`
                            : 'Paid once when their first customer makes their first subscription payment.'}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

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
                    background: saving ? '#666' : (isDirector ? '#f0a500' : '#9b59b6'),
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
      {/* Edit Member Modal */}
      {editingMember && !readOnly && (
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
            maxWidth: '400px',
            border: '1px solid #3a3a3a'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: '#e0e0e0', fontSize: '1.25rem', fontWeight: '700' }}>
                Edit {editingMember.name}
              </h2>
              <button
                onClick={() => setEditingMember(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateMember}>
              {/* Tier selector for directors */}
              {isDirector && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                    Role
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, tier: 'recruiter' })}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        background: editingMember.tier === 'recruiter' ? '#f0a500' : '#2a2a2a',
                        border: editingMember.tier === 'recruiter' ? '2px solid #f0a500' : '1px solid #3a3a3a',
                        borderRadius: '8px',
                        color: editingMember.tier === 'recruiter' ? '#fff' : '#888',
                        fontWeight: editingMember.tier === 'recruiter' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, tier: 'affiliate' })}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        background: editingMember.tier === 'affiliate' ? '#3498db' : '#2a2a2a',
                        border: editingMember.tier === 'affiliate' ? '2px solid #3498db' : '1px solid #3a3a3a',
                        borderRadius: '8px',
                        color: editingMember.tier === 'affiliate' ? '#fff' : '#888',
                        fontWeight: editingMember.tier === 'affiliate' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Affiliate
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                // Always-percentage rate input. User types whole-number percent
                // (e.g. 15), stored as decimal (0.15). Capped at director's own
                // commission_rate allotment.
                const ownRatePct = (parseFloat(affiliate.commission_rate) || 0) * 100;
                // editingMember.commission_rate is stored as decimal in DB
                // but the input here works in percent for clarity.
                const currentDecimal = parseFloat(editingMember.commission_rate) || 0;
                // If commission_rate looks already in percent form (e.g. someone
                // entered "15"), respect that; otherwise convert decimal->percent.
                const displayPct = currentDecimal > 1 ? currentDecimal : currentDecimal * 100;
                const overMax = ownRatePct > 0 && displayPct > ownRatePct;
                const onChangePct = (raw) => {
                  const v = parseFloat(raw);
                  if (Number.isNaN(v)) {
                    setEditingMember({ ...editingMember, commission_rate: '', commission_model: 'percentage' });
                    return;
                  }
                  const clamped = ownRatePct > 0 && v > ownRatePct ? ownRatePct : v;
                  // Persist as DECIMAL — the rest of the app + webhook expect decimals.
                  setEditingMember({ ...editingMember, commission_rate: (clamped / 100).toString(), commission_model: 'percentage' });
                };
                return (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                      Recurring Commission (%)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={ownRatePct || undefined}
                        value={Number.isNaN(displayPct) ? '' : (Math.round(displayPct * 100) / 100)}
                        onChange={(e) => onChangePct(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          paddingRight: '2rem',
                          background: '#2a2a2a',
                          border: `1px solid ${overMax ? '#EF4444' : '#3a3a3a'}`,
                          borderRadius: '8px',
                          color: '#e0e0e0',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }}>%</span>
                    </div>
                    {ownRatePct > 0 && (
                      <div style={{ color: overMax ? '#EF4444' : '#666', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        Max {ownRatePct.toFixed(0)}% — this is your own allotment from Work Van.
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const durationStandard = ['', '6', '12', '24'];
                const raw = (editingMember.commission_duration_months ?? '').toString();
                const selectValue = durationStandard.includes(raw) ? raw : 'custom';
                return (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', color: '#aaa', fontSize: '0.85rem' }}>
                      Payout Duration
                    </label>
                    <select
                      value={selectValue}
                      onChange={(e) => setEditingMember({
                        ...editingMember,
                        commission_duration_months: e.target.value === 'custom' ? '6' : e.target.value,
                      })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2a2a2a',
                        border: '1px solid #3a3a3a',
                        borderRadius: '8px',
                        color: '#e0e0e0',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Perpetual (pays as long as the account stays active)</option>
                      <option value="6">6 months per account</option>
                      <option value="12">12 months per account</option>
                      <option value="24">24 months per account</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {selectValue === 'custom' && (
                      <input
                        type="number"
                        min="1"
                        value={editingMember.commission_duration_months}
                        onChange={(e) => setEditingMember({ ...editingMember, commission_duration_months: e.target.value })}
                        placeholder="Months"
                        style={{
                          width: '100%',
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: '#2a2a2a',
                          border: '1px solid #3a3a3a',
                          borderRadius: '8px',
                          color: '#e0e0e0',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>
                );
              })()}

              {isDirector && affiliate.can_grant_deal_bonus && (() => {
                const ownBonus = (parseFloat(affiliate.close_bonus_amount) || 0) + (parseFloat(affiliate.enablement_bonus_amount) || 0);
                const subBonus = (parseFloat(editingMember.close_bonus_amount) || 0) + (parseFloat(editingMember.enablement_bonus_amount) || 0);
                const overMax = ownBonus > 0 && subBonus > ownBonus;
                return (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Signing &amp; onboarding bonus
                    </div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', color: '#aaa', fontSize: '0.8rem' }}>
                      Bonus ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={ownBonus > 0 ? ownBonus : undefined}
                      value={subBonus || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        const clamped = ownBonus > 0 && v > ownBonus ? ownBonus.toString() : e.target.value;
                        setEditingMember({ ...editingMember, close_bonus_amount: clamped, enablement_bonus_amount: '0' });
                      }}
                      placeholder={String(ownBonus || 50)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#2a2a2a',
                        border: `1px solid ${overMax ? '#EF4444' : '#3a3a3a'}`,
                        borderRadius: '8px',
                        color: '#e0e0e0',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ color: overMax ? '#EF4444' : '#666', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                      {ownBonus > 0
                        ? `Max $${ownBonus.toFixed(0)} — your own bonus from Work Van. Paid once on first subscription payment.`
                        : `Paid once on the customer's first subscription payment.`}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Director's shareable recruit link. Recruits hit /join/:code, fill out the
// public form, and land in the director's team with their commission split
// blank for the director to set later.
function RecruitLinkCard({ code }) {
  const link = `https://affiliates.workvanapp.com/join/${code}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers / non-secure contexts block clipboard — fall back to select+copy
      const el = document.createElement('input');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0a50015, #f0a50005)',
      border: '1px solid #f0a50040',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ color: '#f0a500', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Your recruit link
          </div>
          <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
            Share this anywhere — text, email, social. Anyone who signs up through it lands on your team.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '0.7rem 0.9rem',
            background: '#0a0a0a',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            color: '#e0e0e0',
            fontFamily: '"SF Mono", Menlo, Consolas, monospace',
            fontSize: '0.85rem',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '0.7rem 1.1rem',
            background: copied ? '#10B981' : '#f0a500',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.15s',
          }}
        >
          {copied ? (
            <><CheckCircle size={14} /> Copied</>
          ) : (
            'Copy link'
          )}
        </button>
      </div>
    </div>
  );
}
