import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Copy, Check, DollarSign, MessageSquare, HelpCircle, FileText, Zap, Shield, Users, BarChart3, Smartphone, Star } from 'lucide-react';

const SECTIONS = [
  {
    id: 'elevator-pitch',
    title: 'Elevator Pitch',
    icon: Zap,
    content: [
      {
        type: 'pitch',
        label: '15-Second Pitch',
        text: 'Work Van is an all-in-one app for field service businesses — scheduling, invoicing, payments, and customer communication in one place. It replaces 3-4 separate tools and pays for itself in the first week.'
      },
      {
        type: 'pitch',
        label: '30-Second Pitch',
        text: 'If you run a field service business — garage doors, HVAC, pest control, plumbing — you know how much time gets wasted on paperwork, missed calls, and chasing payments. Work Van puts everything in one app: scheduling, quotes, invoices, customer texting, and card payments. Your techs get a mobile app, your office gets a dashboard, and you get paid faster. Most owners save 5-10 hours a week and see ROI in the first month.'
      },
      {
        type: 'pitch',
        label: 'One-Liner',
        text: 'Work Van is like having an office manager, dispatcher, and bookkeeper in your pocket — for less than a tank of gas per week.'
      }
    ]
  },
  {
    id: 'selling-points',
    title: 'Key Selling Points',
    icon: Star,
    content: [
      {
        type: 'points',
        items: [
          { title: 'All-in-One Platform', desc: 'Replaces separate apps for scheduling, invoicing, payments, customer communication, and inventory. One login, one bill.' },
          { title: 'Get Paid Faster', desc: 'Send invoices with a tap, accept credit cards on-site or via text link. Most businesses see payment times drop from weeks to days.' },
          { title: 'Professional Customer Experience', desc: 'Automated appointment reminders via text, professional quotes with e-signatures, and branded invoices make even solo operators look like big companies.' },
          { title: 'Built for the Field', desc: 'Mobile-first design means techs can manage their day from their phone. Before/after photos, job notes, inventory tracking — all without calling the office.' },
          { title: 'Team Management', desc: 'Multi-user support with role-based access. Office staff see everything, techs see their jobs. Real-time schedule updates.' },
          { title: 'No Contracts', desc: 'Weekly, monthly, or annual billing. Cancel anytime. Free trial to start.' },
          { title: 'Inventory Tracking', desc: 'Know what\'s on every truck, auto-deduct parts when jobs are completed, get low-stock alerts before you run out.' },
          { title: 'SMS Built In', desc: 'Text customers directly from the app — appointment reminders, quote follow-ups, payment requests. No personal phone number needed.' }
        ]
      }
    ]
  },
  {
    id: 'pricing',
    title: 'Pricing Guide',
    icon: DollarSign,
    content: [
      {
        type: 'pricing',
        tiers: [
          {
            name: 'Pro',
            price: '$50/mo',
            altPrice: '$12.50/wk or $500/yr',
            users: '1 user + 2 additional @ $5/ea',
            best: 'Solo operators and small crews',
            includes: 'Scheduling, invoicing, payments, customer management, quotes, SMS'
          },
          {
            name: 'Team',
            price: '$100/mo',
            altPrice: '$25/wk or $1,000/yr',
            users: '3 users + 2 additional @ $5/ea',
            best: 'Growing businesses with office + field staff',
            includes: 'Everything in Pro + team management, financial dashboard, commissions'
          },
          {
            name: 'Growth',
            price: '$200/mo',
            altPrice: '$50/wk or $2,000/yr',
            users: '10 users + 10 additional @ $5/ea',
            best: 'Multi-crew operations',
            includes: 'Everything in Team + 30 flex-worker days, priority support'
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            altPrice: 'Contact us',
            users: 'Unlimited',
            best: 'Large operations, franchises',
            includes: 'Custom pricing, dedicated support, custom integrations'
          }
        ]
      }
    ]
  },
  {
    id: 'objections',
    title: 'Handling Objections',
    icon: Shield,
    content: [
      {
        type: 'objections',
        items: [
          {
            objection: '"We already use ServiceTitan"',
            response: 'ServiceTitan is solid for big companies, but it starts around $300/month per tech — so a 3-person crew is paying $900+/month before add-ons. Work Van gives you scheduling, invoicing, payments, SMS, and inventory for $50/month total. Most ServiceTitan users are paying 10-20x more and only using a fraction of the features.'
          },
          {
            objection: '"We already use Jobber"',
            response: 'Jobber\'s cheapest plan is $40/month but it only covers one user with no quotes, no invoicing follow-ups, and limited features. Their "Connect" plan is $130/month and "Grow" is $260/month to get what Work Van includes at $50/month. Plus Work Van has built-in SMS texting, inventory tracking, and card payments — things Jobber charges extra for or doesn\'t offer.'
          },
          {
            objection: '"We already use Workiz"',
            response: 'Workiz starts at $225/month for their Standard plan — and their Lite plan at $65/month is very limited. Work Van is $50/month with scheduling, invoicing, quotes, SMS, inventory, and payments all included. Same core features at a fraction of the cost, and you\'re not locked into annual contracts.'
          },
          {
            objection: '"It\'s too expensive"',
            response: 'At $12.50/week, it\'s less than a tank of gas. For comparison, ServiceTitan runs $300+/month per tech, Workiz is $225/month, and even Jobber\'s mid-tier is $130/month. Work Van is $50/month for everything. If it saves you even one hour of admin time per week, it\'s already paid for itself. Plus there\'s a free trial — zero risk.'
          },
          {
            objection: '"I\'m not tech savvy"',
            response: 'That\'s actually who this is built for. Tools like ServiceTitan require weeks of training and onboarding specialists. Work Van is designed so if you can send a text message, you can run your business from it. No training needed, and there\'s support if you get stuck.'
          },
          {
            objection: '"We\'re too small / it\'s just me"',
            response: 'Solo operators actually get the most value. The big platforms like ServiceTitan won\'t even talk to you unless you have 3+ techs. Jobber\'s cheapest plan is bare-bones. Work Van\'s Pro plan is built exactly for one-person shops — full scheduling, invoicing, payments, and SMS for $12.50/week.'
          },
          {
            objection: '"I need to think about it"',
            response: 'Totally understand. The trial is free and takes about 5 minutes to set up — no credit card needed. You can kick the tires with zero commitment and see if it fits. Want me to send you the link?'
          },
          {
            objection: '"Can it do [specific feature]?"',
            response: 'Great question — let me check. Work Van covers scheduling, invoicing, payments, quotes, SMS, inventory, and team management. If it\'s not built in yet, the team ships updates constantly and takes feature requests seriously. Unlike the big players, you can actually talk to the dev team.'
          }
        ]
      }
    ]
  },
  {
    id: 'industries',
    title: 'Target Industries',
    icon: Users,
    content: [
      {
        type: 'industries',
        items: [
          { name: 'Garage Door', hook: 'Track spring/opener inventory per truck, send before/after photos to customers' },
          { name: 'HVAC', hook: 'Seasonal scheduling, maintenance contracts, parts inventory management' },
          { name: 'Pest Control', hook: 'Recurring service routes, customer SMS reminders, treatment documentation' },
          { name: 'Plumbing', hook: 'Emergency dispatch, on-site estimates with instant invoicing, payment collection' },
          { name: 'Electrical', hook: 'Multi-tech scheduling, inspection checklists, permit tracking' },
          { name: 'Landscaping', hook: 'Recurring schedules, crew management, seasonal pricing' },
          { name: 'Pressure Washing', hook: 'Quote builder with square footage pricing, before/after photos' },
          { name: 'Cleaning Services', hook: 'Recurring bookings, team schedules, customer communication' },
          { name: 'Appliance Repair', hook: 'Parts inventory, warranty tracking, diagnostic notes' },
          { name: 'Roofing', hook: 'Job photos, material tracking, insurance documentation' },
          { name: 'Handyman', hook: 'Multi-service quoting, flexible scheduling, quick invoicing' },
          { name: 'Pool Service', hook: 'Route optimization, chemical inventory, recurring maintenance' }
        ]
      }
    ]
  },
  {
    id: 'conversation',
    title: 'Conversation Starters',
    icon: MessageSquare,
    content: [
      {
        type: 'starters',
        items: [
          { scenario: 'At a trade show or networking event', line: '"What do you use to manage your schedule and billing? Most guys I talk to are juggling 3 different apps or still using paper."' },
          { scenario: 'Talking to a business owner you know', line: '"Hey, how\'s business? I wanted to show you something — there\'s this app that a lot of [their trade] guys are switching to. Takes like 5 minutes to set up."' },
          { scenario: 'Cold outreach (text/email)', line: '"Hi [Name], I work with field service businesses and wanted to share a tool that\'s helping [trade] companies save 5-10 hours a week on admin. Free trial, no commitment. Worth a look?"' },
          { scenario: 'After they complain about admin work', line: '"Yeah, that\'s exactly what Work Van solves. It handles scheduling, invoicing, and customer texts all in one app. Want me to send you the sign-up link?"' },
          { scenario: 'Referral from existing user', line: '"[Mutual contact] mentioned you run a [trade] business. They\'ve been using this app called Work Van and said I should connect you — it\'s helped them cut their paperwork in half."' }
        ]
      }
    ]
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    icon: HelpCircle,
    content: [
      {
        type: 'faq',
        items: [
          { q: 'Is there a free trial?', a: 'Yes — new users get a free trial period. No credit card required to start.' },
          { q: 'Does it work on iPhone and Android?', a: 'Yes. Work Van is a web app that works on any device — phone, tablet, or desktop. It can be installed as an app on both iPhone and Android.' },
          { q: 'Can multiple people use it?', a: 'Yes. Pro supports up to 3 users, Team up to 5, and Growth up to 20. Each plan includes a base number of users with the option to add more.' },
          { q: 'How do payments work?', a: 'Work Van integrates with Stripe for card payments. Customers can pay via a link texted to them or in person. Funds go directly to the business owner\'s bank account.' },
          { q: 'Is there a contract?', a: 'No contracts. Choose weekly, monthly, or annual billing. Cancel anytime from settings.' },
          { q: 'Can I import my existing customers?', a: 'Customer data can be added manually or the support team can help with bulk imports.' },
          { q: 'How does the SMS/texting work?', a: 'Businesses can text customers directly from the app — appointment reminders, quote follow-ups, payment requests. It\'s an add-on starting at $4/week.' },
          { q: 'What about inventory?', a: 'Built-in inventory tracking per truck/location. Auto-deducts parts when jobs are completed. Low stock alerts and reorder lists included.' }
        ]
      }
    ]
  }
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
      color: copied ? '#4ecca3' : '#666', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
    }}>
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  );
}

function Section({ section, isOpen, onToggle }) {
  const Icon = section.icon;

  return (
    <div style={{
      background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px',
      overflow: 'hidden', marginBottom: '12px'
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#e0e0e0'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: '#ff6b3520', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={18} color="#ff6b35" />
        </div>
        <span style={{ flex: 1, textAlign: 'left', fontSize: '1rem', fontWeight: '600' }}>{section.title}</span>
        {isOpen ? <ChevronUp size={18} color="#888" /> : <ChevronDown size={18} color="#888" />}
      </button>

      {isOpen && (
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {section.content.map((block, i) => (
            <div key={i}>
              {block.type === 'pitch' && (
                <div style={{
                  background: '#1a1a1a', borderRadius: '8px', padding: '1rem', marginBottom: '10px',
                  border: '1px solid #2a2a2a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#ff6b35', fontSize: '0.85rem', fontWeight: '600' }}>{block.label}</span>
                    <CopyButton text={block.text} />
                  </div>
                  <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{block.text}</p>
                </div>
              )}

              {block.type === 'points' && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {block.items.map((point, j) => (
                    <div key={j} style={{
                      background: '#1a1a1a', borderRadius: '8px', padding: '1rem',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{ color: '#e0e0e0', fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {point.title}
                      </div>
                      <div style={{ color: '#999', fontSize: '0.85rem', lineHeight: '1.5' }}>{point.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'pricing' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                    borderRadius: '12px', overflow: 'hidden', minWidth: '600px',
                    border: '1px solid #2a2a2a'
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          background: '#1a1a1a', padding: '14px 16px', textAlign: 'left',
                          color: '#888', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase',
                          letterSpacing: '0.5px', borderBottom: '2px solid #ff6b35'
                        }}></th>
                        {block.tiers.map((tier, j) => (
                          <th key={j} style={{
                            background: tier.name === 'Team' ? '#ff6b3512' : '#1a1a1a',
                            padding: '14px 16px', textAlign: 'center',
                            borderBottom: '2px solid #ff6b35',
                            borderLeft: '1px solid #2a2a2a',
                            position: 'relative'
                          }}>
                            {tier.name === 'Team' && (
                              <div style={{
                                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                                background: '#ff6b35', color: '#fff', fontSize: '0.65rem', fontWeight: '700',
                                padding: '2px 10px', borderRadius: '0 0 6px 6px', textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Most Popular</div>
                            )}
                            <div style={{
                              color: '#ff6b35', fontWeight: '700', fontSize: '1.1rem',
                              marginTop: tier.name === 'Team' ? '8px' : 0
                            }}>{tier.name}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Monthly', key: 'price', highlight: true },
                        { label: 'Weekly', key: 'weekly' },
                        { label: 'Annual', key: 'annual' },
                        { label: 'Users', key: 'users' },
                        { label: 'Best For', key: 'best' },
                        { label: 'Includes', key: 'includes' },
                      ].map((row, ri) => (
                        <tr key={ri}>
                          <td style={{
                            padding: '12px 16px', color: '#888', fontSize: '0.85rem', fontWeight: '600',
                            background: ri % 2 === 0 ? '#0f0f0f' : '#141414',
                            borderBottom: '1px solid #222', whiteSpace: 'nowrap'
                          }}>{row.label}</td>
                          {block.tiers.map((tier, j) => {
                            let value = '';
                            if (row.key === 'price') {
                              value = tier.price;
                            } else if (row.key === 'weekly') {
                              value = tier.altPrice.split(' or ')[0] || '—';
                            } else if (row.key === 'annual') {
                              value = (tier.altPrice.split(' or ')[1]) || '—';
                            } else {
                              value = tier[row.key];
                            }
                            return (
                              <td key={j} style={{
                                padding: '12px 16px', textAlign: 'center',
                                color: row.highlight ? '#e0e0e0' : '#bbb',
                                fontSize: row.highlight ? '1.15rem' : '0.85rem',
                                fontWeight: row.highlight ? '700' : '400',
                                background: tier.name === 'Team'
                                  ? (ri % 2 === 0 ? '#ff6b350a' : '#ff6b3510')
                                  : (ri % 2 === 0 ? '#0f0f0f' : '#141414'),
                                borderBottom: '1px solid #222',
                                borderLeft: '1px solid #222',
                                lineHeight: '1.4'
                              }}>
                                {value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{
                    display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px',
                    color: '#666', fontSize: '0.8rem'
                  }}>
                    <DollarSign size={14} />
                    <span>All plans include a free trial. No contracts — cancel anytime.</span>
                  </div>
                </div>
              )}

              {block.type === 'objections' && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{
                      background: '#1a1a1a', borderRadius: '8px', padding: '1rem',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ color: '#ff6b6b', fontWeight: '600', fontSize: '0.9rem' }}>{item.objection}</div>
                        <CopyButton text={item.response} />
                      </div>
                      <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.6' }}>{item.response}</div>
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'industries' && (
                <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  {block.items.map((ind, j) => (
                    <div key={j} style={{
                      background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem 1rem',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{ color: '#e0e0e0', fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>{ind.name}</div>
                      <div style={{ color: '#888', fontSize: '0.8rem', lineHeight: '1.4' }}>{ind.hook}</div>
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'starters' && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{
                      background: '#1a1a1a', borderRadius: '8px', padding: '1rem',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.scenario}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5', fontStyle: 'italic' }}>{item.line}</div>
                        <CopyButton text={item.line} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'faq' && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{
                      background: '#1a1a1a', borderRadius: '8px', padding: '1rem',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{ color: '#e0e0e0', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>{item.q}</div>
                      <div style={{ color: '#999', fontSize: '0.85rem', lineHeight: '1.5' }}>{item.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Resources() {
  const [openSections, setOpenSections] = useState(['elevator-pitch']);

  const toggleSection = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#e0e0e0', fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
          Sales Resources
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>
          Everything you need to pitch Work Van effectively
        </p>
      </div>

      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem'
      }}>
        <button
          onClick={() => setOpenSections(SECTIONS.map(s => s.id))}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid #333',
            background: '#1a1a1a', color: '#ccc', cursor: 'pointer', fontSize: '0.8rem'
          }}
        >
          Expand All
        </button>
        <button
          onClick={() => setOpenSections([])}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid #333',
            background: '#1a1a1a', color: '#ccc', cursor: 'pointer', fontSize: '0.8rem'
          }}
        >
          Collapse All
        </button>
      </div>

      {SECTIONS.map(section => (
        <Section
          key={section.id}
          section={section}
          isOpen={openSections.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
        />
      ))}
    </div>
  );
}
