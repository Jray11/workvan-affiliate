// Equity (SEU) page — director-facing read-only view of their Synthetic
// Equity Unit grants.
//
// Hidden from the sidebar entirely if the director has no grants. RLS on
// the seu_* tables already scopes reads to the director's own affiliate_id.

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Award, AlertTriangle } from 'lucide-react';

export default function Equity({ affiliate }) {
  const [grants, setGrants] = useState([]);
  const [ladders, setLadders] = useState([]);
  const [tranches, setTranches] = useState([]);
  const [events, setEvents] = useState([]);
  const [qc, setQc] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [gRes, lRes, eRes, qcRes] = await Promise.all([
          supabase.from('seu_grants').select('*').eq('affiliate_id', affiliate.id).order('created_at', { ascending: false }),
          supabase.from('seu_milestone_ladders').select('*').eq('affiliate_id', affiliate.id).order('qualified_customer_threshold'),
          supabase.from('seu_vesting_events').select('*').eq('affiliate_id', affiliate.id).order('occurred_at', { ascending: false }).limit(30),
          supabase.rpc('qualified_customer_count', { p_affiliate_id: affiliate.id }),
        ]);
        if (cancelled) return;
        setGrants(gRes.data || []);
        setLadders(lRes.data || []);
        setEvents(eRes.data || []);
        setQc(typeof qcRes.data === 'number' ? qcRes.data : (qcRes.data?.[0] || 0));

        const signingGrants = (gRes.data || []).filter(g => g.grant_type === 'signing');
        if (signingGrants.length) {
          const tRes = await supabase.from('seu_signing_tranches').select('*').in('grant_id', signingGrants.map(g => g.id)).order('tranche_number');
          if (!cancelled) setTranches(tRes.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [affiliate.id]);

  // Totals — milestone grants are vested when ladder.achieved_at is set;
  // signing-grant tranches vest individually.
  let granted = 0, vested = 0, forfeited = 0;
  for (const g of grants) {
    if (g.status === 'forfeited') { forfeited += g.shares; continue; }
    granted += g.shares;
    if (g.grant_type === 'milestone') {
      const ladder = ladders.find(l => l.id === g.milestone_ladder_id);
      if (ladder?.achieved_at) vested += g.shares;
    } else {
      const ts = tranches.filter(t => t.grant_id === g.id);
      for (const t of ts) if (t.vested_at && !t.forfeited_at) vested += t.shares;
    }
  }
  const unvested = granted - vested;

  const signingGrant = grants.find(g => g.grant_type === 'signing' && g.status !== 'forfeited');
  const signingTranches = signingGrant ? tranches.filter(t => t.grant_id === signingGrant.id) : [];

  if (loading) {
    return <div style={{ padding: '2rem', color: '#888', textAlign: 'center' }}>Loading equity…</div>;
  }

  if (grants.length === 0 && ladders.length === 0) {
    // Defensive empty state — sidebar shouldn't surface this page when
    // no grants exist, but if someone reaches it via URL, show the same
    // gentle "nothing here yet" rather than an error.
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#888' }}>
        <Award size={36} style={{ color: '#444', marginBottom: 12 }} />
        <p>No equity grants on your account yet.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '1.25rem', color: '#e0e0e0' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={26} color="#f0a500" />
          Equity
        </h1>
        <div style={{ color: '#888', fontSize: '0.9rem', marginTop: 4 }}>
          Your Synthetic Equity Units (SEUs) — granted, vested, and progress to your next milestone.
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: '#1f1a14', border: '1px solid #f0a50040', borderRadius: 10,
        padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
      }}>
        <AlertTriangle size={18} color="#f0a500" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.82rem', color: '#d0c1a8', lineHeight: 1.55 }}>
          SEUs are a <strong style={{ color: '#f0a500' }}>contractual right to cash compensation</strong> tied to Work Van's success.
          They are <strong>not</strong> equity ownership, securities, or voting shares.
          Payments are made on Board-declared distributions, a liquidity event, or a discretionary good-leaver buyback, all subject to the WorkVan SEU Plan and your grant agreement.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
        <Stat label="Granted" value={granted.toLocaleString()} accent="#f0a500" />
        <Stat label="Vested" value={vested.toLocaleString()} accent="#10B981" />
        <Stat label="Unvested" value={unvested.toLocaleString()} accent="#888" />
        {forfeited > 0 && <Stat label="Forfeited" value={forfeited.toLocaleString()} accent="#666" />}
      </div>

      {/* Signing Grant */}
      {signingGrant && (
        <Section title="Signing Grant">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <KV label="Total" value={`${signingGrant.shares.toLocaleString()} SEUs`} />
            <KV label="Signed" value={signingGrant.signing_date || '—'} />
            <KV label="Vesting started" value={signingGrant.vesting_commencement_at || (
              <span style={{ color: '#f0a500' }}>Waiting on first Active Customer</span>
            )} />
          </div>

          {!signingGrant.vesting_commencement_at && (
            <div style={{ color: '#888', fontSize: '0.82rem', lineHeight: 1.5, background: '#0f0f0f', padding: '0.7rem 0.85rem', borderRadius: 8, border: '1px solid #2a2a2a' }}>
              The 3 / 4 / 5-month vesting clock begins once you have your first paying customer (Plan §5.2.1).
              You'll see the schedule here once the team confirms that milestone.
            </div>
          )}

          {signingGrant.vesting_commencement_at && (
            <div>
              {signingTranches.map(t => {
                const eligibleDate = addMonths(signingGrant.vesting_commencement_at, t.months_after_vcd);
                const isPast = new Date(eligibleDate) <= new Date();
                return (
                  <div key={t.id} style={trancheRow}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        Tranche {t.tranche_number}
                        <span style={{ color: '#888', fontWeight: 400 }}> · {t.shares.toLocaleString()} SEUs</span>
                      </div>
                      <div style={{ color: '#666', fontSize: '0.78rem' }}>
                        Eligible {eligibleDate} ({t.months_after_vcd}-month mark)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {t.vested_at ? (
                        <span style={{ color: '#10B981', fontWeight: 600, fontSize: '0.85rem' }}>✓ Vested {t.vested_at.slice(0, 10)}</span>
                      ) : t.forfeited_at ? (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>Forfeited</span>
                      ) : (
                        <span style={{ color: isPast ? '#f0a500' : '#888', fontSize: '0.82rem' }}>
                          {isPast ? 'Awaiting Board cert' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Milestone Ladder */}
      {ladders.length > 0 && (
        <Section title="Milestones">
          <div style={{ color: '#888', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
            Current qualified customers: <strong style={{ color: '#10B981' }}>{qc}</strong>
            <span style={{ color: '#666' }}> · paying customers across your team</span>
          </div>
          {ladders.map(l => {
            const pct = Math.min(100, Math.round((qc / l.qualified_customer_threshold) * 100));
            const ready = qc >= l.qualified_customer_threshold && !l.achieved_at;
            return (
              <div key={l.id} style={ladderRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{l.label}</span>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>
                      {l.qualified_customer_threshold} qualified · {l.shares.toLocaleString()} SEUs
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#0a0a0a', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: l.achieved_at ? '#10B981' : ready ? '#f0a500' : '#3a3a3a',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 3 }}>
                    {qc} / {l.qualified_customer_threshold} ({pct}%)
                  </div>
                </div>
                <div style={{ width: 140, textAlign: 'right' }}>
                  {l.achieved_at ? (
                    <span style={{ color: '#10B981', fontWeight: 600, fontSize: '0.82rem' }}>✓ Achieved {l.achieved_at.slice(0, 10)}</span>
                  ) : ready ? (
                    <span style={{ color: '#f0a500', fontSize: '0.78rem' }}>Ready — awaiting Board certification</span>
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>
                      {l.qualified_customer_threshold - qc} to go
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* Activity */}
      {events.length > 0 && (
        <Section title="Activity">
          {events.map(e => (
            <div key={e.id} style={{ padding: '0.55rem 0', borderBottom: '1px solid #1f1f1f' }}>
              <div style={{ fontSize: '0.87rem' }}>{e.description || e.event_type}</div>
              <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 2 }}>
                {new Date(e.occurred_at).toLocaleString()}
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '0.8rem 1rem' }}>
      <div style={{ color: '#666', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: accent || '#e0e0e0', fontWeight: 700, fontSize: '1.35rem', fontFamily: '"JetBrains Mono", monospace' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem 1.1rem' }}>
      <h2 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#aaa' }}>{title}</h2>
      {children}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ background: '#0f0f0f', padding: '0.5rem 0.7rem', borderRadius: 6, border: '1px solid #2a2a2a' }}>
      <div style={{ color: '#666', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{value}</div>
    </div>
  );
}

function addMonths(isoDate, months) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const trancheRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.7rem', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 6 };
const ladderRow = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.7rem', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 6 };
