import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { MessageSquare, Send, Plus, ArrowLeft, Users, Shield, ChevronRight, Search, X as XIcon } from 'lucide-react';

export default function Messages({ affiliate }) {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState({ parent: null, team: [], supportOption: true });
  const [contactsLoading, setContactsLoading] = useState(false);
  const [participantMap, setParticipantMap] = useState({});
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [affiliate.id]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
      markAsRead(selectedConvo.id);
    }
  }, [selectedConvo?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Subscribe to new messages in selected conversation
  useEffect(() => {
    if (!selectedConvo) return;
    const channel = supabase
      .channel(`messages-${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'affiliate_messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        markAsRead(selectedConvo.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo?.id]);

  // Subscribe to conversation updates (for unread indicators in list)
  useEffect(() => {
    const channel = supabase
      .channel('convo-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'affiliate_messages',
      }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [affiliate.id]);

  const loadConversations = async () => {
    try {
      // Get conversations where this affiliate is a participant
      const { data: convos, error } = await supabase
        .from('affiliate_conversations')
        .select('*')
        .contains('participant_ids', [affiliate.id])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!convos || convos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Collect all participant IDs for name lookup
      const allIds = new Set();
      convos.forEach(c => (c.participant_ids || []).forEach(id => allIds.add(id)));
      allIds.delete(affiliate.id);

      let pMap = { [affiliate.id]: affiliate.name };
      if (allIds.size > 0) {
        const { data: affiliates } = await supabase
          .from('affiliates')
          .select('id, name, tier')
          .in('id', Array.from(allIds));
        if (affiliates) {
          affiliates.forEach(a => { pMap[a.id] = a.name; });
        }
      }
      setParticipantMap(pMap);

      // Get last message + read status for each conversation
      const convoIds = convos.map(c => c.id);

      const { data: lastMessages } = await supabase
        .from('affiliate_messages')
        .select('conversation_id, body, created_at, sender_affiliate_id, sender_admin_email')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      const { data: readRecords } = await supabase
        .from('affiliate_message_reads')
        .select('conversation_id, last_read_at')
        .eq('affiliate_id', affiliate.id)
        .in('conversation_id', convoIds);

      const readMap = {};
      (readRecords || []).forEach(r => { readMap[r.conversation_id] = r.last_read_at; });

      // Deduplicate to get only the latest message per conversation
      const lastMsgMap = {};
      (lastMessages || []).forEach(m => {
        if (!lastMsgMap[m.conversation_id]) {
          lastMsgMap[m.conversation_id] = m;
        }
      });

      const enriched = convos.map(c => {
        const lastMsg = lastMsgMap[c.id];
        const lastRead = readMap[c.id];
        const hasUnread = lastMsg && (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead));

        // Determine display name
        let displayName = c.group_name || '';
        if (!displayName && !c.is_group) {
          const otherId = (c.participant_ids || []).find(id => id !== affiliate.id);
          if (otherId && pMap[otherId]) {
            displayName = pMap[otherId];
          } else if (c.participant_ids?.length === 1 && c.created_by_admin) {
            displayName = 'Work Van Support';
          } else {
            displayName = 'Unknown';
          }
        }

        // Preview text
        let preview = '';
        if (lastMsg) {
          const senderLabel = lastMsg.sender_admin_email
            ? 'Work Van Team'
            : lastMsg.sender_affiliate_id === affiliate.id
              ? 'You'
              : (pMap[lastMsg.sender_affiliate_id] || '').split(' ')[0];
          preview = senderLabel ? `${senderLabel}: ${lastMsg.body}` : lastMsg.body;
        }

        return { ...c, displayName, lastMsg, hasUnread, preview };
      });

      setConversations(enriched);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    const { data, error } = await supabase
      .from('affiliate_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      return;
    }
    setMessages(data || []);
  };

  const markAsRead = async (conversationId) => {
    await supabase
      .from('affiliate_message_reads')
      .upsert({
        conversation_id: conversationId,
        affiliate_id: affiliate.id,
        last_read_at: new Date().toISOString(),
      }, { onConflict: 'conversation_id,affiliate_id' });
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !selectedConvo || sending) return;

    setSending(true);
    try {
      const { error: msgError } = await supabase
        .from('affiliate_messages')
        .insert({
          conversation_id: selectedConvo.id,
          sender_affiliate_id: affiliate.id,
          body: text,
        });
      if (msgError) throw msgError;

      await supabase
        .from('affiliate_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConvo.id);

      setMessageText('');
      // Realtime subscription will add the message
    } catch (err) {
      console.error('Failed to send:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // New message modal: load contacts
  const openNewModal = async () => {
    setShowNewModal(true);
    setContactsLoading(true);
    try {
      let parent = null;
      if (affiliate.parent_affiliate_id) {
        const { data } = await supabase
          .from('affiliates')
          .select('id, name, tier, email')
          .eq('id', affiliate.parent_affiliate_id)
          .single();
        parent = data;
      }

      const { data: team } = await supabase
        .from('affiliates')
        .select('id, name, tier, email')
        .eq('parent_affiliate_id', affiliate.id)
        .order('name');

      setContacts({ parent, team: team || [], supportOption: true });
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const startOrOpenConversation = async (targetId, targetName) => {
    // Check if 1:1 conversation already exists
    const existing = conversations.find(c =>
      !c.is_group &&
      c.participant_ids?.length === 2 &&
      c.participant_ids.includes(affiliate.id) &&
      c.participant_ids.includes(targetId)
    );

    if (existing) {
      setSelectedConvo(existing);
      setShowNewModal(false);
      setMobileShowThread(true);
      return;
    }

    // Create new conversation
    try {
      const { data, error } = await supabase
        .from('affiliate_conversations')
        .insert({
          participant_ids: [affiliate.id, targetId],
          is_group: false,
          created_by: affiliate.id,
        })
        .select()
        .single();

      if (error) throw error;

      setParticipantMap(prev => ({ ...prev, [targetId]: targetName }));
      const newConvo = { ...data, displayName: targetName, hasUnread: false, preview: '' };
      setConversations(prev => [newConvo, ...prev]);
      setSelectedConvo(newConvo);
      setShowNewModal(false);
      setMobileShowThread(true);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      toast.error('Failed to start conversation');
    }
  };

  const startSupportConversation = async () => {
    // Support conversations: participant_ids only has the affiliate
    const existing = conversations.find(c =>
      !c.is_group &&
      c.participant_ids?.length === 1 &&
      c.participant_ids.includes(affiliate.id)
    );

    if (existing) {
      setSelectedConvo(existing);
      setShowNewModal(false);
      setMobileShowThread(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('affiliate_conversations')
        .insert({
          participant_ids: [affiliate.id],
          is_group: false,
          created_by: affiliate.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newConvo = { ...data, displayName: 'Work Van Support', hasUnread: false, preview: '' };
      setConversations(prev => [newConvo, ...prev]);
      setSelectedConvo(newConvo);
      setShowNewModal(false);
      setMobileShowThread(true);
    } catch (err) {
      console.error('Failed to create support conversation:', err);
      toast.error('Failed to start support conversation');
    }
  };

  const startTeamBlast = async () => {
    const teamIds = contacts.team.map(t => t.id);
    if (teamIds.length === 0) return;

    const groupName = `${affiliate.name}'s Team`;

    // Check if group conversation exists
    const existing = conversations.find(c =>
      c.is_group && c.group_name === groupName
    );

    if (existing) {
      setSelectedConvo(existing);
      setShowNewModal(false);
      setMobileShowThread(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('affiliate_conversations')
        .insert({
          participant_ids: [affiliate.id, ...teamIds],
          is_group: true,
          group_name: groupName,
          created_by: affiliate.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newConvo = { ...data, displayName: groupName, hasUnread: false, preview: '' };
      setConversations(prev => [newConvo, ...prev]);
      setSelectedConvo(newConvo);
      setShowNewModal(false);
      setMobileShowThread(true);
    } catch (err) {
      console.error('Failed to create team blast:', err);
      toast.error('Failed to create team conversation');
    }
  };

  const getSenderName = (msg) => {
    if (msg.sender_admin_email) return 'Work Van Team';
    if (msg.sender_affiliate_id === affiliate.id) return 'You';
    return participantMap[msg.sender_affiliate_id] || 'Unknown';
  };

  const isOwnMessage = (msg) => msg.sender_affiliate_id === affiliate.id;
  const isAdminMessage = (msg) => !!msg.sender_admin_email;

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const tierLabel = (tier) => {
    const labels = { affiliate: 'Affiliate', recruiter: 'Manager', director: 'Director' };
    return labels[tier] || tier;
  };

  // --- Render ---

  const renderConversationList = () => (
    <div style={styles.listPanel}>
      <div style={styles.listHeader}>
        <h2 style={styles.listTitle}>Messages</h2>
        <button onClick={openNewModal} style={styles.newBtn} title="New Message">
          <Plus size={18} />
        </button>
      </div>

      {loading ? (
        <div style={styles.centered}><span style={styles.dimText}>Loading...</span></div>
      ) : conversations.length === 0 ? (
        <div style={styles.emptyList}>
          <MessageSquare size={40} color="#444" />
          <p style={styles.dimText}>No conversations yet</p>
          <button onClick={openNewModal} style={styles.startBtn}>Start a conversation</button>
        </div>
      ) : (
        <div style={styles.convoList}>
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => { setSelectedConvo(c); setMobileShowThread(true); }}
              style={{
                ...styles.convoItem,
                background: selectedConvo?.id === c.id ? '#2a2a2a' : 'transparent',
                borderLeft: c.hasUnread ? '3px solid #ff6b35' : '3px solid transparent',
              }}
            >
              <div style={styles.convoAvatar}>
                {c.is_group ? (
                  <Users size={18} color="#aaa" />
                ) : c.displayName === 'Work Van Support' ? (
                  <Shield size={18} color="#ff6b35" />
                ) : (
                  <span style={styles.avatarLetter}>
                    {(c.displayName || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div style={styles.convoInfo}>
                <div style={styles.convoNameRow}>
                  <span style={{
                    ...styles.convoName,
                    fontWeight: c.hasUnread ? '600' : '400',
                    color: c.hasUnread ? '#fff' : '#ccc',
                  }}>
                    {c.displayName}
                  </span>
                  {c.lastMsg && (
                    <span style={styles.convoTime}>{formatTime(c.lastMsg.created_at)}</span>
                  )}
                </div>
                {c.preview && (
                  <p style={{
                    ...styles.convoPreview,
                    color: c.hasUnread ? '#bbb' : '#666',
                  }}>
                    {c.preview.length > 60 ? c.preview.slice(0, 60) + '...' : c.preview}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderThread = () => {
    if (!selectedConvo) {
      return (
        <div style={styles.threadPanel}>
          <div style={styles.emptyThread}>
            <MessageSquare size={48} color="#333" />
            <p style={styles.dimText}>Select a conversation or start a new one</p>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.threadPanel}>
        <div style={styles.threadHeader}>
          <button
            onClick={() => { setMobileShowThread(false); setSelectedConvo(null); }}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={styles.threadHeaderInfo}>
            <span style={styles.threadName}>{selectedConvo.displayName}</span>
            {selectedConvo.is_group && (
              <span style={styles.threadSub}>
                {(selectedConvo.participant_ids || []).length} members
              </span>
            )}
          </div>
        </div>

        <div style={styles.messagesList}>
          {messages.length === 0 ? (
            <div style={styles.emptyMessages}>
              <p style={styles.dimText}>No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const own = isOwnMessage(msg);
              const admin = isAdminMessage(msg);
              const showSender = selectedConvo.is_group || admin;
              const prevMsg = messages[i - 1];
              const showDateSep = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDateSep && (
                    <div style={styles.dateSep}>
                      <span style={styles.dateSepText}>
                        {new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div style={{
                    ...styles.messageBubbleWrap,
                    justifyContent: own ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      ...styles.messageBubble,
                      background: own ? '#1a3a5c' : admin ? '#2a1a0a' : '#1a1a1a',
                      borderColor: own ? '#2a5a8c' : admin ? '#ff6b35' : '#2a2a2a',
                      borderRadius: own
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                    }}>
                      {showSender && !own && (
                        <span style={{
                          ...styles.msgSender,
                          color: admin ? '#ff6b35' : '#888',
                        }}>
                          {getSenderName(msg)}
                        </span>
                      )}
                      <p style={styles.msgBody}>{msg.body}</p>
                      <span style={styles.msgTime}>{formatMessageTime(msg.created_at)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <textarea
            ref={inputRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            style={styles.textInput}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            style={{
              ...styles.sendBtn,
              opacity: !messageText.trim() || sending ? 0.4 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderNewModal = () => {
    if (!showNewModal) return null;

    const canTeamBlast = (affiliate.tier === 'recruiter' || affiliate.tier === 'director') && contacts.team.length > 1;

    return (
      <div style={styles.modalOverlay} onClick={() => setShowNewModal(false)}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>New Message</h3>
            <button onClick={() => setShowNewModal(false)} style={styles.modalClose}>
              <XIcon size={20} />
            </button>
          </div>

          {contactsLoading ? (
            <div style={styles.centered}><span style={styles.dimText}>Loading contacts...</span></div>
          ) : (
            <div style={styles.contactList}>
              {/* Work Van Support */}
              <div
                onClick={startSupportConversation}
                style={styles.contactItem}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ ...styles.contactAvatar, background: '#331a0a' }}>
                  <Shield size={18} color="#ff6b35" />
                </div>
                <div style={styles.contactInfo}>
                  <span style={styles.contactName}>Work Van Support</span>
                  <span style={styles.contactSub}>Get help from the Work Van team</span>
                </div>
                <ChevronRight size={16} color="#555" />
              </div>

              {/* Parent (manager/director) */}
              {contacts.parent && (
                <div
                  onClick={() => startOrOpenConversation(contacts.parent.id, contacts.parent.name)}
                  style={styles.contactItem}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={styles.contactAvatar}>
                    <span style={styles.avatarLetter}>{contacts.parent.name[0].toUpperCase()}</span>
                  </div>
                  <div style={styles.contactInfo}>
                    <span style={styles.contactName}>{contacts.parent.name}</span>
                    <span style={styles.contactSub}>Your {tierLabel(contacts.parent.tier)}</span>
                  </div>
                  <ChevronRight size={16} color="#555" />
                </div>
              )}

              {/* Team blast option */}
              {canTeamBlast && (
                <div
                  onClick={startTeamBlast}
                  style={styles.contactItem}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ ...styles.contactAvatar, background: '#1a2a1a' }}>
                    <Users size={18} color="#4ecca3" />
                  </div>
                  <div style={styles.contactInfo}>
                    <span style={styles.contactName}>Team Blast</span>
                    <span style={styles.contactSub}>Message all {contacts.team.length} team members</span>
                  </div>
                  <ChevronRight size={16} color="#555" />
                </div>
              )}

              {/* Direct team members */}
              {contacts.team.length > 0 && (
                <div style={styles.sectionLabel}>Your Team</div>
              )}
              {contacts.team.map(member => (
                <div
                  key={member.id}
                  onClick={() => startOrOpenConversation(member.id, member.name)}
                  style={styles.contactItem}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={styles.contactAvatar}>
                    <span style={styles.avatarLetter}>{member.name[0].toUpperCase()}</span>
                  </div>
                  <div style={styles.contactInfo}>
                    <span style={styles.contactName}>{member.name}</span>
                    <span style={styles.contactSub}>{tierLabel(member.tier)}</span>
                  </div>
                  <ChevronRight size={16} color="#555" />
                </div>
              ))}

              {!contacts.parent && contacts.team.length === 0 && (
                <div style={styles.emptyContacts}>
                  <p style={styles.dimText}>No team members yet. You can still message Work Van Support above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.listPanelWrap,
        display: mobileShowThread ? undefined : undefined,
      }}>
        <div className="messages-list-panel" style={styles.listPanelWrap}>
          {renderConversationList()}
        </div>
      </div>
      <div className="messages-thread-panel" style={styles.threadPanelWrap}>
        {renderThread()}
      </div>
      {renderNewModal()}

      <style>{`
        @media (max-width: 768px) {
          .messages-list-panel {
            display: ${mobileShowThread ? 'none' : 'flex'} !important;
            width: 100% !important;
            border-right: none !important;
          }
          .messages-thread-panel {
            display: ${mobileShowThread ? 'flex' : 'none'} !important;
            width: 100% !important;
          }
        }
        @media (min-width: 769px) {
          .messages-list-panel {
            display: flex !important;
          }
          .messages-thread-panel {
            display: flex !important;
          }
          .messages-thread-panel button[data-back] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 60px)',
    background: '#0a0a0a',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #2a2a2a',
  },
  listPanelWrap: {
    display: 'flex',
    width: '340px',
    minWidth: '280px',
    flexShrink: 0,
    borderRight: '1px solid #2a2a2a',
  },
  threadPanelWrap: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
  },
  listPanel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #2a2a2a',
  },
  listTitle: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#fff',
  },
  newBtn: {
    background: '#ff6b35',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  convoList: {
    flex: 1,
    overflowY: 'auto',
  },
  convoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid #1a1a1a',
  },
  convoAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid #2a2a2a',
  },
  avatarLetter: {
    color: '#ccc',
    fontSize: '1rem',
    fontWeight: '600',
  },
  convoInfo: {
    flex: 1,
    minWidth: 0,
  },
  convoNameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  convoName: {
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  convoTime: {
    fontSize: '0.7rem',
    color: '#666',
    flexShrink: 0,
  },
  convoPreview: {
    margin: '2px 0 0',
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Thread panel
  threadPanel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#0a0a0a',
  },
  threadHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a2a',
    background: '#0f0f0f',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    padding: '4px',
    display: 'none',
  },
  threadHeaderInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  threadName: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
  },
  threadSub: {
    color: '#666',
    fontSize: '0.75rem',
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dateSep: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 0',
  },
  dateSepText: {
    fontSize: '0.7rem',
    color: '#555',
    background: '#1a1a1a',
    padding: '4px 12px',
    borderRadius: '10px',
  },
  messageBubbleWrap: {
    display: 'flex',
    marginBottom: '4px',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    border: '1px solid',
    position: 'relative',
  },
  msgSender: {
    fontSize: '0.7rem',
    fontWeight: '600',
    marginBottom: '2px',
    display: 'block',
  },
  msgBody: {
    margin: 0,
    color: '#e0e0e0',
    fontSize: '0.9rem',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  msgTime: {
    fontSize: '0.65rem',
    color: '#555',
    marginTop: '4px',
    display: 'block',
    textAlign: 'right',
  },
  inputArea: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #2a2a2a',
    background: '#0f0f0f',
  },
  textInput: {
    flex: 1,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#e0e0e0',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    maxHeight: '120px',
    lineHeight: '1.4',
  },
  sendBtn: {
    background: '#ff6b35',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  // Empty states
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  dimText: {
    color: '#555',
    fontSize: '0.9rem',
  },
  emptyList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 20px',
    flex: 1,
  },
  startBtn: {
    background: '#ff6b35',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    padding: '8px 20px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '8px',
  },
  emptyThread: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flex: 1,
  },
  emptyMessages: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    padding: '40px',
  },
  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '16px',
    border: '1px solid #2a2a2a',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a2a',
  },
  modalTitle: {
    margin: 0,
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: '600',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '4px',
  },
  contactList: {
    overflowY: 'auto',
    padding: '8px 0',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  contactAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  contactName: {
    color: '#e0e0e0',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  contactSub: {
    color: '#666',
    fontSize: '0.75rem',
  },
  sectionLabel: {
    padding: '12px 20px 6px',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  emptyContacts: {
    padding: '24px 20px',
    textAlign: 'center',
  },
};
