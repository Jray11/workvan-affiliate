import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2, Calendar, TrendingUp, X, MessageSquare, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { LeadsSkeleton } from '../Skeleton';

export default function LeadTracker({ affiliate, readOnly }) {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);
  const [contactHistory, setContactHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    title: '',
    phone: '',
    email: '',
    subscription_tier: 'pro',
    user_count: 1,
    status: 'new',
    priority: 'warm',
    next_follow_up: '',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    contact_type: 'call',
    notes: '',
    outcome: ''
  });

  const statuses = [
    { value: 'new', label: 'New', color: '#3498db' },
    { value: 'contacted', label: 'Contacted', color: '#f39c12' },
    { value: 'qualified', label: 'Qualified', color: '#9b59b6' },
    { value: 'demo', label: 'Demo Scheduled', color: '#1abc9c' },
    { value: 'negotiating', label: 'Negotiating', color: '#e67e22' },
    { value: 'stalled', label: 'Stalled', color: '#7f8c8d' },
    { value: 'closed_won', label: 'Closed/Won', color: '#4ecca3' },
    { value: 'closed_lost', label: 'Closed/Lost', color: '#e74c3c' }
  ];

  const priorities = [
    { value: 'hot', label: 'Hot', color: '#e74c3c' },
    { value: 'warm', label: 'Warm', color: '#f39c12' },
    { value: 'cold', label: 'Cold', color: '#3498db' }
  ];

  const contactTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text Message' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'demo', label: 'Demo' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchTiers();
    fetchLeads();
  }, [affiliate.id]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      // Fallback to empty array - form will still work
      setTiers([]);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliate_leads')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactHistory = async (leadId) => {
    try {
      const { data, error } = await supabase
        .from('affiliate_lead_contacts')
        .select('*')
        .eq('lead_id', leadId)
        .order('contacted_at', { ascending: false });

      if (error) throw error;
      setContactHistory(data || []);
    } catch (error) {
      console.error('Error fetching contact history:', error);
      setContactHistory([]);
    }
  };

  const addLead = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_leads')
        .insert([{
          affiliate_id: affiliate.id,
          company_name: formData.company_name,
          contact_name: formData.contact_name || null,
          title: formData.title || null,
          phone: formData.phone || null,
          email: formData.email || null,
          subscription_tier: formData.subscription_tier,
          user_count: parseInt(formData.user_count) || 1,
          status: 'new',
          priority: formData.priority,
          next_follow_up: formData.next_follow_up || null,
          notes: formData.notes || null
        }])
        .select()
        .single();

      if (error) throw error;

      setLeads([data, ...leads]);
      setShowAddModal(false);
      resetForm();
      toast.success('Lead added');
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateLead = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_leads')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name || null,
          title: formData.title || null,
          phone: formData.phone || null,
          email: formData.email || null,
          subscription_tier: formData.subscription_tier,
          user_count: parseInt(formData.user_count) || 1,
          status: formData.status,
          priority: formData.priority,
          next_follow_up: formData.next_follow_up || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id)
        .select()
        .single();

      if (error) throw error;

      setLeads(leads.map(l => l.id === data.id ? data : l));
      setShowEditModal(false);
      setSelectedLead(null);
      resetForm();
      toast.success('Lead updated');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLead = async (id) => {
    if (submitting) return;
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('affiliate_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLeads(leads.filter(l => l.id !== id));
      toast.success('Lead deleted');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const logContact = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_lead_contacts')
        .insert([{
          lead_id: selectedLead.id,
          affiliate_id: affiliate.id,
          contact_type: contactForm.contact_type,
          notes: contactForm.notes || null,
          outcome: contactForm.outcome || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Update lead's last_contacted_at (auto-update status from 'new' to 'contacted')
      const updates = {
        last_contacted_at: new Date().toISOString()
      };
      if (selectedLead.status === 'new') {
        updates.status = 'contacted';
      }
      await supabase
        .from('affiliate_leads')
        .update(updates)
        .eq('id', selectedLead.id);

      // Refresh leads and contact history
      await fetchLeads();
      await fetchContactHistory(selectedLead.id);

      setShowContactModal(false);
      setContactForm({ contact_type: 'call', notes: '', outcome: '' });
      toast.success('Contact logged');
    } catch (error) {
      console.error('Error logging contact:', error);
      toast.error('Failed to log contact: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      company_name: lead.company_name,
      contact_name: lead.contact_name || '',
      title: lead.title || '',
      phone: lead.phone || '',
      email: lead.email || '',
      subscription_tier: lead.subscription_tier || 'pro',
      user_count: lead.user_count || 1,
      status: lead.status,
      priority: lead.priority || 'warm',
      next_follow_up: lead.next_follow_up || '',
      notes: lead.notes || ''
    });
    setShowEditModal(true);
  };

  const openContactModal = (lead) => {
    setSelectedLead(lead);
    fetchContactHistory(lead.id);
    setShowContactModal(true);
  };

  const toggleExpandLead = (leadId) => {
    if (expandedLead === leadId) {
      setExpandedLead(null);
    } else {
      setExpandedLead(leadId);
      fetchContactHistory(leadId);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      title: '',
      phone: '',
      email: '',
      subscription_tier: 'pro',
      user_count: 1,
      status: 'new',
      priority: 'warm',
      next_follow_up: '',
      notes: ''
    });
  };

  const getStatusColor = (status) => statuses.find(s => s.value === status)?.color || '#888';
  const getStatusLabel = (status) => statuses.find(s => s.value === status)?.label || status;
  const getPriorityColor = (priority) => priorities.find(p => p.value === priority)?.color || '#888';
  const getPriorityLabel = (priority) => priorities.find(p => p.value === priority)?.label || priority;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate pipeline value based on affiliate's commission rate and tier pricing
  const calculatePipelineValue = () => {
    const activeLeads = leads.filter(l => !['closed_won', 'closed_lost'].includes(l.status));
    const commissionRate = (affiliate.commission_rate || 15) / 100;

    let monthlyTotal = 0;
    activeLeads.forEach(lead => {
      const tier = tiers.find(t => t.slug === lead.subscription_tier);
      if (tier) {
        monthlyTotal += (tier.price_monthly || 0);
      }
    });

    return Math.round(monthlyTotal * commissionRate);
  };

  const pipelineValue = calculatePipelineValue();

  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.priority === 'hot').length,
    won: leads.filter(l => l.status === 'closed_won').length,
    active: leads.filter(l => !['closed_won', 'closed_lost'].includes(l.status)).length
  };

  const getTierName = (slug) => {
    const tier = tiers.find(t => t.slug === slug);
    return tier?.name || slug;
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '0.95rem'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#888',
    fontSize: '0.85rem'
  };

  if (loading) {
    return <LeadsSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#ff6b35',
            marginBottom: '0.25rem'
          }}>
            Lead Tracker
          </h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Track your sales pipeline
          </p>
        </div>
        {!readOnly && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.875rem 1.5rem',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          Add Lead
        </button>
        )}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#1a1a1a',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #222'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Total Leads</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ff6b35' }}>{stats.total}</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #222'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Hot Leads</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#e74c3c' }}>{stats.hot}</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #222'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Won</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#4ecca3' }}>{stats.won}</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #222'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Active</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3498db' }}>{stats.active}</div>
        </div>
        <div style={{
          background: '#1a1a1a',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #222'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Pipeline Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4ecca3' }}>
            ${pipelineValue.toLocaleString()}/mo
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#1a1a1a',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #222',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: '2.25rem'
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="all">All Priorities</option>
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div style={{
          background: '#1a1a1a',
          padding: '4rem 2rem',
          borderRadius: '12px',
          border: '2px dashed #333',
          textAlign: 'center'
        }}>
          <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} color="#888" />
          <h3 style={{ color: '#e0e0e0', fontSize: '1.25rem', marginBottom: '0.5rem' }}>No leads yet</h3>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>Start tracking your sales pipeline</p>
          {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
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
            Add Your First Lead
          </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                border: '1px solid #222',
                overflow: 'hidden'
              }}
            >
              {/* Lead Header */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <h3 style={{
                        fontSize: '1.15rem',
                        color: '#e0e0e0',
                        margin: 0
                      }}>
                        {lead.company_name}
                      </h3>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        background: getStatusColor(lead.status),
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: '#fff'
                      }}>
                        {getStatusLabel(lead.status)}
                      </span>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        background: getPriorityColor(lead.priority) + '30',
                        border: `1px solid ${getPriorityColor(lead.priority)}`,
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: getPriorityColor(lead.priority)
                      }}>
                        {getPriorityLabel(lead.priority)}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      fontSize: '0.85rem',
                      color: '#888'
                    }}>
                      {lead.contact_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building2 size={14} />
                          {lead.contact_name}{lead.title && ` - ${lead.title}`}
                        </span>
                      )}
                      {lead.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={14} />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Mail size={14} />
                          {lead.email}
                        </span>
                      )}
                    </div>

                    {lead.next_follow_up && (
                      <div style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        color: new Date(lead.next_follow_up) < new Date() ? '#e74c3c' : '#f39c12'
                      }}>
                        <Clock size={14} />
                        Follow up: {new Date(lead.next_follow_up).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      background: '#0a0a0a',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      color: '#aaa'
                    }}>
                      {getTierName(lead.subscription_tier)} • {lead.user_count} {lead.user_count === 1 ? 'user' : 'users'}
                    </div>

                    {!readOnly && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openContactModal(lead)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#333',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#e0e0e0',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <MessageSquare size={14} />
                        Log Contact
                      </button>
                      <button
                        onClick={() => openEditModal(lead)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#333',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#e0e0e0',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        disabled={submitting}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#333',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#e74c3c',
                          fontSize: '0.8rem',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.5 : 1
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    )}
                  </div>
                </div>

                {lead.notes && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#0a0a0a',
                    borderRadius: '6px',
                    borderLeft: '3px solid #ff6b35',
                    fontSize: '0.85rem',
                    color: '#aaa',
                    fontStyle: 'italic'
                  }}>
                    {lead.notes}
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleExpandLead(lead.id)}
                  style={{
                    marginTop: '1rem',
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#888',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {expandedLead === lead.id ? (
                    <>
                      <ChevronUp size={14} />
                      Hide Contact History
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Show Contact History
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Contact History */}
              {expandedLead === lead.id && (
                <div style={{
                  borderTop: '1px solid #222',
                  padding: '1.25rem',
                  background: '#0f0f0f'
                }}>
                  <h4 style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>Contact History</h4>
                  {contactHistory.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No contacts logged yet
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {contactHistory.map(contact => (
                        <div
                          key={contact.id}
                          style={{
                            padding: '0.75rem',
                            background: '#1a1a1a',
                            borderRadius: '6px',
                            borderLeft: '3px solid #3498db'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem'
                          }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#e0e0e0',
                              textTransform: 'capitalize'
                            }}>
                              {contact.contact_type}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                              {new Date(contact.contacted_at).toLocaleString()}
                            </span>
                          </div>
                          {contact.notes && (
                            <p style={{ fontSize: '0.85rem', color: '#aaa', margin: 0 }}>
                              {contact.notes}
                            </p>
                          )}
                          {contact.outcome && (
                            <p style={{ fontSize: '0.8rem', color: '#4ecca3', margin: '0.5rem 0 0' }}>
                              Outcome: {contact.outcome}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', color: '#e0e0e0', margin: 0 }}>Add New Lead</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addLead}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. ABC Garage Doors"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={inputStyle}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={inputStyle}
                    placeholder="Owner"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={inputStyle}
                    placeholder="555-123-4567"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Expected Tier</label>
                  <select
                    value={formData.subscription_tier}
                    onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {tiers.map(t => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>User Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.user_count}
                    onChange={(e) => setFormData({ ...formData, user_count: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Next Follow-up</label>
                  <input
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="How did you find them? Key info..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: submitting ? '#555' : 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', color: '#e0e0e0', margin: 0 }}>Edit Lead</h3>
              <button
                onClick={() => { setShowEditModal(false); setSelectedLead(null); resetForm(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={updateLead}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Expected Tier</label>
                  <select
                    value={formData.subscription_tier}
                    onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {tiers.map(t => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>User Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.user_count}
                    onChange={(e) => setFormData({ ...formData, user_count: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Next Follow-up</label>
                  <input
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedLead(null); resetForm(); }}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: submitting ? '#555' : 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Contact Modal */}
      {showContactModal && selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '450px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#e0e0e0', margin: 0 }}>Log Contact</h3>
                <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  {selectedLead.company_name}
                </p>
              </div>
              <button
                onClick={() => { setShowContactModal(false); setContactForm({ contact_type: 'call', notes: '', outcome: '' }); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={logContact}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Contact Type</label>
                <select
                  value={contactForm.contact_type}
                  onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {contactTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows="3"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="What did you discuss?"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Outcome</label>
                <input
                  type="text"
                  value={contactForm.outcome}
                  onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Scheduled demo for next week"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowContactModal(false); setContactForm({ contact_type: 'call', notes: '', outcome: '' }); }}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: submitting ? '#555' : 'linear-gradient(135deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : 'Log Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
