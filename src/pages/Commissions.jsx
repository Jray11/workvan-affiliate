import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { DollarSign, CheckCircle, Clock, Calendar, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { CommissionsSkeleton } from '../Skeleton';

export default function Commissions({ affiliate }) {
  const toast = useToast();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'owed', 'paid'
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadCommissions();
  }, [affiliate.id]);

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

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const MINIMUM_PAYOUT = 50;
  const totalOwed = commissions.filter(c => c.status === 'owed').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);

  // Group by month for display
  const groupedByMonth = {};
  filteredCommissions.forEach(comm => {
    const month = comm.period_month;
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = [];
    }
    groupedByMonth[month].push(comm);
  });

  const exportCSV = () => {
    if (filteredCommissions.length === 0) return;
    const rows = [['Period', 'Company', 'Revenue', 'Commission', 'Status', 'Paid Date']];
    filteredCommissions.forEach(c => {
      rows.push([
        formatMonth(c.period_month),
        c.companies?.name || 'Account',
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

  if (loading) {
    return <CommissionsSkeleton />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#e0e0e0',
            marginBottom: '0.5rem'
          }}>
            Commission History
          </h1>
          <p style={{ color: '#888' }}>
            Your earnings from referred accounts
          </p>
        </div>
        {commissions.length > 0 && (
          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              background: '#2a2a2a',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #f39c12'
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
              : `$${MINIMUM_PAYOUT} minimum \u2014 rolls over to next period`}
          </div>
        </div>

        <div style={{
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #4ecca3'
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
          background: '#1a1a1a',
          borderRadius: '10px',
          padding: '1.25rem',
          border: '1px solid #2a2a2a',
          borderLeft: '4px solid #3498db'
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

      {/* Filter */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {['all', 'owed', 'paid'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.6rem 1.25rem',
              background: filter === f ? '#ff6b35' : '#2a2a2a',
              border: 'none',
              borderRadius: '8px',
              color: filter === f ? '#fff' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textTransform: 'capitalize'
            }}
          >
            {f === 'all' ? 'All' : f === 'owed' ? 'Pending' : 'Paid'}
          </button>
        ))}
      </div>

      {/* Commissions List */}
      {Object.keys(groupedByMonth).length === 0 ? (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          border: '1px solid #2a2a2a'
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
            <div
              key={month}
              style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                border: '1px solid #2a2a2a',
                marginBottom: '1rem',
                overflow: 'hidden'
              }}
            >
              {/* Month Header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #2a2a2a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#151515'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={18} color="#888" />
                  <span style={{ color: '#e0e0e0', fontWeight: '600' }}>{formatMonth(month)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    background: allPaid ? '#4ecca320' : allOwed ? '#f39c1220' : '#88888820',
                    color: allPaid ? '#4ecca3' : allOwed ? '#f39c12' : '#888',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {allPaid ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {allPaid ? 'Paid' : allOwed ? 'Pending' : 'Mixed'}
                  </span>
                  <span style={{
                    color: '#4ecca3',
                    fontWeight: '700',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {formatCurrency(monthTotal)}
                  </span>
                </div>
              </div>

              {/* Commission Items */}
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
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          marginBottom: '0.25rem',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          background: isExpanded ? '#0a0a0a' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isExpanded ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />}
                          <div>
                            <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                              {comm.companies?.name || 'Account'}
                            </div>
                            {comm.notes && (
                              <div style={{ color: '#666', fontSize: '0.8rem' }}>{comm.notes}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: comm.status === 'paid' ? '#4ecca3' : '#f39c12'
                          }} />
                          <span style={{
                            color: comm.status === 'paid' ? '#4ecca3' : '#f39c12',
                            fontWeight: '600',
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            {formatCurrency(comm.commission_amount)}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{
                          margin: '0 0.75rem 0.5rem',
                          padding: '0.75rem 1rem',
                          background: '#0a0a0a',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem 1.5rem'
                        }}>
                          {comm.company_revenue > 0 && (
                            <>
                              <div>
                                <div style={{ color: '#666', marginBottom: '0.15rem' }}>Account Revenue</div>
                                <div style={{ color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace" }}>
                                  {formatCurrency(comm.company_revenue)}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#666', marginBottom: '0.15rem' }}>Commission Rate</div>
                                <div style={{ color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace" }}>
                                  {rate}%
                                </div>
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
                              <div style={{ color: '#e0e0e0' }}>
                                {new Date(comm.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
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
    </div>
  );
}
