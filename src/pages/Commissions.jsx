import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { DollarSign, CheckCircle, Clock, Calendar, ChevronDown, ChevronUp, Download, Send, Users, AlertCircle, Info, Building2, ArrowLeft } from 'lucide-react';
import { CommissionsSkeleton } from '../Skeleton';

const MINIMUM_PAYOUT = 50;
const EARLY_PAYOUT_FEE = 5; // $5 flat fee for early payout requests

export default function Commissions({ affiliate }) {
  const toast = useToast();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [requesting, setRequesting] = useState(false);

  // Team tab for managers/directors
  const isManager = affiliate.tier === 'recruiter' || affiliate.tier === 'director';
  const [activeTab, setActiveTab] = useState('my-commissions');
  const [teamCommissions, setTeamCommissions] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [drilldownAffiliate, setDrilldownAffiliate] = useState(null);
  const [drilldownCommissions, setDrilldownCommissions] = useState([]);

  useEffect(() => {
    loadCommissions();
    loadPayoutRequests();
  }, [affiliate.id]);

  useEffect(() => {
    if (activeTab === 'team' && teamCommissions.length === 0 && !teamLoading) {
      loadTeamCommissions();
    }
  }, [activeTab]);

  const loadCommissions = async () => {
    try {
      const { data } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          companies (id, name)
        `)
        .eq('affiliate_id', affiliate.id)
        .order('period_month', { ascending: false });

      setCommissions(data || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutRequests = async () => {
    try {
      const { data } = await supabase
        .from('affiliate_payout_requests')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('requested_at', { ascending: false });
      setPayoutRequests(data || []);
    } catch {}
  };

  const loadTeamCommissions = async () => {
    setTeamLoading(true);
    try {
      // Get direct team members
      const { data: members } = await supabase
        .from('affiliates')
        .select('id, name, code, tier, commission_model, commission_rate')
        .eq('parent_affiliate_id', affiliate.id)
        .order('name');

      if (!members || members.length === 0) {
        setTeamMembers([]);
        setTeamCommissions([]);
        setTeamLoading(false);
        return;
      }

      const memberIds = members.map(m => m.id);

      // For directors, also get sub-affiliates under team leaders
      let allIds = [...memberIds];
      if (affiliate.tier === 'director') {
        const recruiterIds = members.filter(m => m.tier === 'recruiter').map(m => m.id);
        if (recruiterIds.length > 0) {
          const { data: subs } = await supabase
            .from('affiliates')
            .select('id, name, code, tier, commission_model, commission_rate, parent_affiliate_id')
            .in('parent_affiliate_id', recruiterIds)
            .order('name');
          if (subs) {
            members.push(...subs);
            allIds.push(...subs.map(s => s.id));
          }
        }
      }

      // Get commissions for all team members
      const { data: comms } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          companies (id, name)
        `)
        .in('affiliate_id', allIds)
        .order('period_month', { ascending: false })
        .limit(200);

      setTeamMembers(members);
      setTeamCommissions(comms || []);
    } catch (error) {
      console.error('Error loading team commissions:', error);
      toast.error('Failed to load team data');
    } finally {
      setTeamLoading(false);
    }
  };

  const requestEarlyPayout = async () => {
    if (totalOwed < MINIMUM_PAYOUT) {
      toast.error(`Minimum payout is ${formatCurrency(MINIMUM_PAYOUT)}`);
      return;
    }

    // Check if there's already a pending request
    const hasPending = payoutRequests.some(r => r.status === 'pending');
    if (hasPending) {
      toast.error('You already have a pending payout request');
      return;
    }

    setRequesting(true);
    try {
      const netAmount = totalOwed - EARLY_PAYOUT_FEE;
      const { error } = await supabase.from('affiliate_payout_requests').insert({
        affiliate_id: affiliate.id,
        amount: totalOwed,
        fee: EARLY_PAYOUT_FEE,
        net_amount: netAmount,
        type: 'early',
        status: 'pending'
      });

      if (error) throw error;

      setShowPayoutModal(false);
      loadPayoutRequests();
      toast.success('Early payout request submitted');
    } catch (error) {
      toast.error('Failed to submit request: ' + error.message);
    } finally {
      setRequesting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatMonth = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const totalOwed = commissions.filter(c => c.status === 'owed').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
  const hasPendingRequest = payoutRequests.some(r => r.status === 'pending');

  // Determine next payout date (1st of next month)
  const now = new Date();
  const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextPayoutStr = nextPayout.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Group by month for display
  const groupedByMonth = {};
  filteredCommissions.forEach(comm => {
    const month = comm.period_month;
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(comm);
  });

  // Team data aggregation
  const teamMemberStats = teamMembers.map(member => {
    const memberComms = teamCommissions.filter(c => c.affiliate_id === member.id);
    const owed = memberComms.filter(c => c.status === 'owed').reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0);
    const paid = memberComms.filter(c => c.status === 'paid').reduce((s, c) => s + parseFloat(c.commission_amount || 0), 0);
    const parentName = member.parent_affiliate_id && member.parent_affiliate_id !== affiliate.id
      ? teamMembers.find(m => m.id === member.parent_affiliate_id)?.name
      : null;
    return { ...member, owed, paid, total: owed + paid, commissionCount: memberComms.length, parentName };
  });

  const teamTotalOwed = teamMemberStats.reduce((s, m) => s + m.owed, 0);
  const teamTotalPaid = teamMemberStats.reduce((s, m) => s + m.paid, 0);

  // Per-account grouping (for "Per Account" tab and drilldowns)
  const buildAccountStats = (comms) => {
    const byCompany = {};
    comms.forEach(c => {
      const compId = c.company_id || 'unknown';
      const compName = c.companies?.name || 'Account';
      if (!byCompany[compId]) {
        byCompany[compId] = { id: compId, name: compName, months: 0, totalEarned: 0, owed: 0, paid: 0, commissions: [] };
      }
      const amt = parseFloat(c.commission_amount || 0);
      byCompany[compId].totalEarned += amt;
      if (c.status === 'owed') byCompany[compId].owed += amt;
      else byCompany[compId].paid += amt;
      byCompany[compId].commissions.push(c);
    });
    // Count unique months per company
    Object.values(byCompany).forEach(acct => {
      const uniqueMonths = new Set(acct.commissions.filter(c => c.commission_type === 'recurring').map(c => c.period_month));
      acct.months = uniqueMonths.size;
    });
    return Object.values(byCompany).sort((a, b) => b.totalEarned - a.totalEarned);
  };

  const myAccountStats = buildAccountStats(commissions);

  const drilldownAccountStats = drilldownAffiliate ? buildAccountStats(drilldownCommissions) : [];

  const loadDrilldown = async (member) => {
    setDrilldownAffiliate(member);
    const { data } = await supabase
      .from('affiliate_commissions')
      .select('*, companies (id, name)')
      .eq('affiliate_id', member.id)
      .order('period_month', { ascending: false });
    setDrilldownCommissions(data || []);
  };

  const exportCSV = () => {
    if (filteredCommissions.length === 0) return;
    const rows = [['Period', 'Company', 'Type', 'Revenue', 'Commission', 'Status', 'Paid Date']];
    filteredCommissions.forEach(c => {
      rows.push([
        formatMonth(c.period_month),
        c.companies?.name || 'Account',
        c.commission_type || 'recurring',
        c.company_revenue || '',
        c.commission_amount,
        c.status === 'paid' ? 'Paid' : 'Pending',
        c.paid_at ? new Date(c.paid_at).toLocaleDateString() : ''
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${affiliate.code}-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderAccountTable = (accountStats) => {
    if (accountStats.length === 0) {
      return (
        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid #2a2a2a' }}>
          <Building2 size={48} style={{ color: '#444', marginBottom: '1rem' }} />
          <h3 style={{ color: '#888', marginBottom: '0.5rem' }}>No account data yet</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Earnings per account will appear here once commissions are recorded.</p>
        </div>
      );
    }

    const acctTotalEarned = accountStats.reduce((s, a) => s + a.totalEarned, 0);
    const acctTotalOwed = accountStats.reduce((s, a) => s + a.owed, 0);

    return (
      <>
        {/* Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem', marginBottom: '1.5rem'
        }}>
          <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', border: '1px solid #2a2a2a', borderLeft: '4px solid #3498db' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Active Accounts</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3498db' }}>{accountStats.length}</div>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', border: '1px solid #2a2a2a', borderLeft: '4px solid #4ecca3' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Total Earned</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(acctTotalEarned)}</div>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', border: '1px solid #2a2a2a', borderLeft: '4px solid #f39c12' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Pending</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f39c12', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(acctTotalOwed)}</div>
          </div>
        </div>

        {/* Account cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {accountStats.map(acct => (
            <div key={acct.id} style={{
              background: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a', padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ color: '#e0e0e0', fontWeight: '600', fontSize: '1rem' }}>{acct.name}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>{acct.months} month{acct.months !== 1 ? 's' : ''} of commissions</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#4ecca3', fontWeight: '700', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(acct.totalEarned)}
                  </div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>total earned</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#888' }}>Pending: </span>
                  <span style={{ color: '#f39c12', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(acct.owed)}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Paid: </span>
                  <span style={{ color: '#4ecca3', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(acct.paid)}</span>
                </div>
                {acct.commissions.some(c => c.commission_type === 'deal_bonus') && (
                  <span style={{ padding: '0.1rem 0.4rem', background: '#4ecca320', color: '#4ecca3', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                    DEAL BONUS
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  if (loading) {
    return <CommissionsSkeleton />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e0e0e0', marginBottom: '0.5rem' }}>
            Commissions & Payouts
          </h1>
          <p style={{ color: '#888' }}>
            Your earnings and payout history
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {commissions.length > 0 && (
            <button
              onClick={exportCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.25rem', background: '#2a2a2a', border: '1px solid #3a3a3a',
                borderRadius: '8px', color: '#e0e0e0', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <Download size={16} /> Export CSV
            </button>
          )}
          {totalOwed >= MINIMUM_PAYOUT && !hasPendingRequest && (
            <button
              onClick={() => setShowPayoutModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.25rem', background: '#ff6b35', border: 'none',
                borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
              }}
            >
              <Send size={16} /> Request Early Payout
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'my-commissions', label: 'By Month', icon: null },
          { id: 'per-account', label: 'Per Account', icon: Building2 },
          ...(isManager ? [{ id: 'team', label: 'Team Earnings', icon: Users }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setDrilldownAffiliate(null); }}
            style={{
              padding: '0.6rem 1.25rem',
              background: activeTab === tab.id ? '#ff6b35' : '#2a2a2a',
              border: 'none', borderRadius: '8px',
              color: activeTab === tab.id ? '#fff' : '#888',
              fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            {tab.icon && <tab.icon size={16} />} {tab.label}
          </button>
        ))}
      </div>

      {/* TEAM TAB */}
      {activeTab === 'team' && isManager && !drilldownAffiliate && (
        <div>
          {teamLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Loading team data...</div>
          ) : teamMembers.length === 0 ? (
            <div style={{
              background: '#1a1a1a', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid #2a2a2a'
            }}>
              <Users size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <h3 style={{ color: '#888' }}>No team members yet</h3>
            </div>
          ) : (
            <>
              {/* Team summary cards */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem', marginBottom: '2rem'
              }}>
                <div style={{
                  background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
                  border: '1px solid #2a2a2a', borderLeft: '4px solid #f39c12'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Clock size={18} color="#f39c12" />
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Team Pending</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f39c12', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(teamTotalOwed)}
                  </div>
                </div>
                <div style={{
                  background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
                  border: '1px solid #2a2a2a', borderLeft: '4px solid #4ecca3'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={18} color="#4ecca3" />
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Team Paid</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(teamTotalPaid)}
                  </div>
                </div>
                <div style={{
                  background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
                  border: '1px solid #2a2a2a', borderLeft: '4px solid #3498db'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Users size={18} color="#3498db" />
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>Team Members</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3498db' }}>
                    {teamMembers.length}
                  </div>
                </div>
              </div>

              {/* Team member earnings table — tap row to drill down */}
              <div style={{
                background: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a', overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1rem 1.25rem', borderBottom: '1px solid #2a2a2a', background: '#151515',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <Users size={18} color="#888" />
                  <span style={{ color: '#e0e0e0', fontWeight: '600' }}>Team Member Earnings</span>
                  <span style={{ color: '#666', fontSize: '0.75rem', marginLeft: 'auto' }}>Tap a row to see their accounts</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Role</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Pending</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Paid</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#888', fontWeight: '500', fontSize: '0.8rem' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMemberStats
                      .sort((a, b) => b.total - a.total)
                      .map(member => (
                      <tr key={member.id} onClick={() => loadDrilldown(member)} style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#242424'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ color: '#e0e0e0', fontWeight: '600', fontSize: '0.9rem' }}>{member.name}</div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>
                            {member.code}
                            {member.parentName && <span> &middot; under {member.parentName}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            background: member.tier === 'recruiter' ? '#9b59b620' : '#3498db20',
                            color: member.tier === 'recruiter' ? '#9b59b6' : '#3498db',
                            borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600'
                          }}>
                            {member.tier === 'recruiter' ? 'MGR' : 'AFF'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#ff6b35', fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace" }}>
                          {member.commission_model === 'percentage'
                            ? `${(member.commission_rate * 100).toFixed(0)}%`
                            : formatCurrency(member.commission_rate)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#f39c12', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                          {member.owed > 0 ? formatCurrency(member.owed) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                          {member.paid > 0 ? formatCurrency(member.paid) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#e0e0e0', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                          {formatCurrency(member.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#151515' }}>
                      <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#888', fontWeight: '600', fontSize: '0.85rem' }}>
                        Totals
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#f39c12', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {formatCurrency(teamTotalOwed)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#4ecca3', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {formatCurrency(teamTotalPaid)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#e0e0e0', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}>
                        {formatCurrency(teamTotalOwed + teamTotalPaid)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TEAM DRILLDOWN — per-account view for a specific team member */}
      {activeTab === 'team' && drilldownAffiliate && (
        <div>
          <button onClick={() => { setDrilldownAffiliate(null); setDrilldownCommissions([]); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#ff6b35', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', padding: 0 }}>
            <ArrowLeft size={18} /> Back to Team
          </button>
          <h2 style={{ color: '#e0e0e0', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            {drilldownAffiliate.name}'s Earnings Per Account
          </h2>
          {renderAccountTable(drilldownAccountStats)}
        </div>
      )}

      {/* PER ACCOUNT TAB */}
      {activeTab === 'per-account' && (
        <div>
          {renderAccountTable(myAccountStats)}
        </div>
      )}

      {activeTab === 'my-commissions' && (
        /* MY COMMISSIONS TAB */
        <>
          {/* Payout Schedule Info */}
          <div style={{
            background: '#1a1a1a', borderRadius: '10px', padding: '1rem 1.25rem',
            border: '1px solid #2a2a2a', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
          }}>
            <Info size={18} color="#3498db" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.5' }}>
              <strong style={{ color: '#e0e0e0' }}>Payout Schedule:</strong> Commissions are paid out once per month on the 1st.
              Minimum payout is {formatCurrency(MINIMUM_PAYOUT)} — balances below this roll over.
              {totalOwed >= MINIMUM_PAYOUT && !hasPendingRequest && (
                <span> You can request an early payout for a {formatCurrency(EARLY_PAYOUT_FEE)} processing fee.</span>
              )}
              {hasPendingRequest && (
                <span style={{ color: '#f39c12' }}> You have a pending early payout request.</span>
              )}
              <div style={{ color: '#666', marginTop: '0.25rem' }}>
                Next scheduled payout: <strong style={{ color: '#4ecca3' }}>{nextPayoutStr}</strong>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem', marginBottom: '2rem'
          }}>
            <div style={{
              background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
              border: '1px solid #2a2a2a', borderLeft: '4px solid #f39c12'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Clock size={18} color="#f39c12" />
                <span style={{ color: '#888', fontSize: '0.8rem' }}>Pending Payout</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f39c12', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(totalOwed)}
              </div>
              <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {totalOwed >= MINIMUM_PAYOUT
                  ? 'Ready for payout'
                  : `${formatCurrency(MINIMUM_PAYOUT)} minimum \u2014 rolls over`}
              </div>
            </div>

            <div style={{
              background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
              border: '1px solid #2a2a2a', borderLeft: '4px solid #4ecca3'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={18} color="#4ecca3" />
                <span style={{ color: '#888', fontSize: '0.8rem' }}>Total Paid</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#4ecca3', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(totalPaid)}
              </div>
            </div>

            <div style={{
              background: '#1a1a1a', borderRadius: '10px', padding: '1.25rem',
              border: '1px solid #2a2a2a', borderLeft: '4px solid #3498db'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <DollarSign size={18} color="#3498db" />
                <span style={{ color: '#888', fontSize: '0.8rem' }}>All Time</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3498db', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(totalOwed + totalPaid)}
              </div>
            </div>
          </div>

          {/* Payout Request History */}
          {payoutRequests.length > 0 && (
            <div style={{
              background: '#1a1a1a', borderRadius: '10px', padding: '1rem 1.25rem',
              border: '1px solid #2a2a2a', marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#e0e0e0', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Payout Requests</h3>
              {payoutRequests.map(req => (
                <div key={req.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0', borderBottom: '1px solid #2a2a2a', flexWrap: 'wrap', gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ color: '#e0e0e0', fontSize: '0.85rem' }}>
                      {formatCurrency(req.amount)} requested
                      <span style={{ color: '#666' }}> ({formatCurrency(req.fee)} fee → {formatCurrency(req.net_amount)} net)</span>
                    </div>
                    <div style={{ color: '#666', fontSize: '0.75rem' }}>{formatDate(req.requested_at)}</div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600',
                    background: req.status === 'pending' ? '#f39c1220' : req.status === 'approved' ? '#4ecca320' : '#e74c3c20',
                    color: req.status === 'pending' ? '#f39c12' : req.status === 'approved' ? '#4ecca3' : '#e74c3c'
                  }}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['all', 'owed', 'paid'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: filter === f ? '#ff6b35' : '#2a2a2a',
                  border: 'none', borderRadius: '8px',
                  color: filter === f ? '#fff' : '#888',
                  fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                {f === 'all' ? 'All' : f === 'owed' ? 'Pending' : 'Paid'}
              </button>
            ))}
          </div>

          {/* Commissions List */}
          {Object.keys(groupedByMonth).length === 0 ? (
            <div style={{
              background: '#1a1a1a', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid #2a2a2a'
            }}>
              <DollarSign size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <h3 style={{ color: '#888', marginBottom: '0.5rem' }}>No commissions yet</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Commissions will appear here when your referred accounts are billed.
              </p>
            </div>
          ) : (
            Object.entries(groupedByMonth).map(([month, monthCommissions]) => {
              const monthTotal = monthCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
              const allPaid = monthCommissions.every(c => c.status === 'paid');
              const allOwed = monthCommissions.every(c => c.status === 'owed');

              return (
                <div key={month} style={{
                  background: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a',
                  marginBottom: '1rem', overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1rem 1.25rem', borderBottom: '1px solid #2a2a2a',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#151515'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={18} color="#888" />
                      <span style={{ color: '#e0e0e0', fontWeight: '600' }}>{formatMonth(month)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        background: allPaid ? '#4ecca320' : allOwed ? '#f39c1220' : '#88888820',
                        color: allPaid ? '#4ecca3' : allOwed ? '#f39c12' : '#888',
                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600'
                      }}>
                        {allPaid ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {allPaid ? 'Paid' : allOwed ? 'Pending' : 'Mixed'}
                      </span>
                      <span style={{ color: '#4ecca3', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatCurrency(monthTotal)}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '0.5rem' }}>
                    {monthCommissions.map(comm => {
                      const isExpanded = expandedId === comm.id;
                      const rate = comm.company_revenue > 0
                        ? ((parseFloat(comm.commission_amount) / parseFloat(comm.company_revenue)) * 100).toFixed(1)
                        : null;

                      return (
                        <div key={comm.id}>
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.75rem', borderRadius: '8px', marginBottom: '0.25rem',
                              cursor: 'pointer', background: isExpanded ? '#0a0a0a' : 'transparent'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isExpanded ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />}
                              <div>
                                <div style={{ color: '#e0e0e0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {comm.companies?.name || 'Account'}
                                  {comm.commission_type === 'deal_bonus' && (
                                    <span style={{ padding: '0.1rem 0.4rem', background: '#4ecca320', color: '#4ecca3', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600' }}>
                                      DEAL BONUS
                                    </span>
                                  )}
                                  {comm.commission_type === 'spif' && (
                                    <span style={{ padding: '0.1rem 0.4rem', background: '#9b59b620', color: '#9b59b6', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600' }}>
                                      SPIF
                                    </span>
                                  )}
                                </div>
                                {comm.notes && <div style={{ color: '#666', fontSize: '0.8rem' }}>{comm.notes}</div>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: comm.status === 'paid' ? '#4ecca3' : '#f39c12' }} />
                              <span style={{ color: comm.status === 'paid' ? '#4ecca3' : '#f39c12', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>
                                {formatCurrency(comm.commission_amount)}
                              </span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{
                              margin: '0 0.75rem 0.5rem', padding: '0.75rem 1rem', background: '#0a0a0a',
                              borderRadius: '6px', fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem'
                            }}>
                              {comm.company_revenue > 0 && (
                                <>
                                  <div>
                                    <div style={{ color: '#666', marginBottom: '0.15rem' }}>Account Revenue</div>
                                    <div style={{ color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(comm.company_revenue)}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666', marginBottom: '0.15rem' }}>Commission Rate</div>
                                    <div style={{ color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace" }}>{rate}%</div>
                                  </div>
                                </>
                              )}
                              <div>
                                <div style={{ color: '#666', marginBottom: '0.15rem' }}>Status</div>
                                <div style={{ color: comm.status === 'paid' ? '#4ecca3' : '#f39c12', fontWeight: '600' }}>
                                  {comm.status === 'paid' ? 'Paid' : 'Pending'}
                                </div>
                              </div>
                              {comm.paid_at && (
                                <div>
                                  <div style={{ color: '#666', marginBottom: '0.15rem' }}>Paid On</div>
                                  <div style={{ color: '#e0e0e0' }}>{formatDate(comm.paid_at)}</div>
                                </div>
                              )}
                              {comm.payment_notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={{ color: '#666', marginBottom: '0.15rem' }}>Notes</div>
                                  <div style={{ color: '#e0e0e0' }}>{comm.payment_notes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* Early Payout Request Modal */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a', borderRadius: '12px', padding: '2rem',
            maxWidth: '420px', width: '100%', border: '1px solid #3a3a3a'
          }}>
            <h2 style={{ color: '#e0e0e0', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>
              Request Early Payout
            </h2>

            <div style={{
              background: '#242424', borderRadius: '8px', padding: '1rem', marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#888' }}>Available Balance</span>
                <span style={{ color: '#e0e0e0', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(totalOwed)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#888' }}>Processing Fee</span>
                <span style={{ color: '#e74c3c', fontFamily: "'JetBrains Mono', monospace" }}>
                  -{formatCurrency(EARLY_PAYOUT_FEE)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #3a3a3a', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#e0e0e0', fontWeight: '600' }}>You'll Receive</span>
                <span style={{ color: '#4ecca3', fontWeight: '700', fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(totalOwed - EARLY_PAYOUT_FEE)}
                </span>
              </div>
            </div>

            <div style={{
              background: '#f39c1210', border: '1px solid #f39c1230', borderRadius: '8px',
              padding: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
            }}>
              <AlertCircle size={16} color="#f39c12" style={{ marginTop: '1px', flexShrink: 0 }} />
              <div style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: '1.4' }}>
                Early payouts are processed within 2-3 business days. Your regular monthly payout on {nextPayoutStr} will reflect the remaining balance after this request.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{
                  flex: 1, padding: '0.875rem', background: '#2a2a2a', border: 'none',
                  borderRadius: '8px', color: '#e0e0e0', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={requestEarlyPayout}
                disabled={requesting}
                style={{
                  flex: 2, padding: '0.875rem', background: requesting ? '#666' : '#ff6b35', border: 'none',
                  borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: requesting ? 'wait' : 'pointer'
                }}
              >
                {requesting ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
