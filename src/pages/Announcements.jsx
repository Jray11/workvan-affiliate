import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Bell, BellOff, Clock, AlertTriangle, CheckCheck, Inbox } from 'lucide-react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';

export default function Announcements({ affiliate, onRead }) {
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const toast = useToast();

  const fetchAnnouncements = useCallback(async () => {
    if (!affiliate?.id) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // Fetch active announcements
      const { data: allAnnouncements, error: annError } = await supabase
        .from('affiliate_announcements')
        .select('*')
        .eq('active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('published_at', { ascending: false });

      if (annError) throw annError;

      // Filter by targeting: affiliate's tier in target_tiers, or affiliate's id in target_affiliate_ids, or both empty (broadcast)
      const filtered = (allAnnouncements || []).filter(a => {
        const tiersEmpty = !a.target_tiers || a.target_tiers.length === 0;
        const idsEmpty = !a.target_affiliate_ids || a.target_affiliate_ids.length === 0;
        if (tiersEmpty && idsEmpty) return true; // broadcast
        const tierMatch = !tiersEmpty && affiliate.tier && a.target_tiers.includes(affiliate.tier);
        const idMatch = !idsEmpty && a.target_affiliate_ids.includes(affiliate.id);
        return tierMatch || idMatch;
      });

      // Fetch reads for this affiliate
      const { data: reads, error: readErr } = await supabase
        .from('affiliate_announcement_reads')
        .select('announcement_id')
        .eq('affiliate_id', affiliate.id);

      if (readErr) throw readErr;

      const readSet = new Set((reads || []).map(r => r.announcement_id));
      setReadIds(readSet);
      setAnnouncements(filtered);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      toast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [affiliate?.id, affiliate?.tier, toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = useCallback(async (announcementId) => {
    if (!affiliate?.id || readIds.has(announcementId)) return;

    // Optimistic update
    setReadIds(prev => new Set([...prev, announcementId]));

    try {
      const { error } = await supabase
        .from('affiliate_announcement_reads')
        .upsert(
          {
            announcement_id: announcementId,
            affiliate_id: affiliate.id,
            read_at: new Date().toISOString(),
          },
          { onConflict: 'announcement_id,affiliate_id' }
        );

      if (error) throw error;
      if (onRead) onRead();
    } catch (err) {
      console.error('Failed to mark as read:', err);
      // Revert optimistic update
      setReadIds(prev => {
        const next = new Set(prev);
        next.delete(announcementId);
        return next;
      });
    }
  }, [affiliate?.id, readIds]);

  const handleToggle = (id) => {
    setExpandedId(prev => prev === id ? null : id);
    markAsRead(id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Sort: unread first, then by published_at descending
  const sorted = [...announcements].sort((a, b) => {
    const aRead = readIds.has(a.id) ? 1 : 0;
    const bRead = readIds.has(b.id) ? 1 : 0;
    if (aRead !== bRead) return aRead - bRead;
    return new Date(b.published_at) - new Date(a.published_at);
  });

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
        Loading announcements...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Megaphone size={24} color="#ff6b35" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Announcements</h1>
          {unreadCount > 0 && (
            <span style={{
              background: '#ff6b35',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              minWidth: 20,
              textAlign: 'center',
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <Inbox size={40} color="#555" style={{ marginBottom: 12 }} />
          <p style={{ color: '#888', fontSize: 15, margin: 0 }}>No announcements</p>
          <p style={{ color: '#555', fontSize: 13, margin: '6px 0 0' }}>Check back later for updates from the Work Van team.</p>
        </div>
      )}

      {/* Announcement cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(a => {
          const isRead = readIds.has(a.id);
          const isUrgent = a.priority === 'urgent';
          const isExpanded = expandedId === a.id;

          return (
            <div
              key={a.id}
              onClick={() => handleToggle(a.id)}
              style={{
                background: isRead ? '#1a1a1a' : '#1e1e1e',
                border: '1px solid #2a2a2a',
                borderLeft: isUrgent ? '4px solid #ff6b35' : '4px solid transparent',
                borderRadius: 10,
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'background 0.15s',
                ...((!isRead) ? { boxShadow: '0 0 0 1px rgba(255,107,53,0.15)' } : {}),
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {isUrgent && <AlertTriangle size={14} color="#ff6b35" />}
                    <span style={{
                      fontSize: 15,
                      fontWeight: isRead ? 500 : 700,
                      color: isRead ? '#ccc' : '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isExpanded ? 'normal' : 'nowrap',
                    }}>
                      {a.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
                      <Clock size={11} />
                      {formatDate(a.published_at)}
                    </span>
                    {isUrgent && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#ff6b35',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {isRead
                    ? <CheckCheck size={16} color="#555" />
                    : <Bell size={16} color="#ff6b35" />
                  }
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && a.body && (
                <div style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid #2a2a2a',
                  color: '#bbb',
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                }}>
                  {a.body}
                </div>
              )}

              {/* Preview of body when collapsed */}
              {!isExpanded && a.body && (
                <p style={{
                  margin: '8px 0 0',
                  color: '#777',
                  fontSize: 13,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {a.body}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
