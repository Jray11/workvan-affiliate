import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../ToastContext';
import { MessageSquare, Send, Plus, ArrowLeft, Users, Shield, ChevronRight, Hash, X as XIcon, UserPlus } from 'lucide-react';

export default function Messages({ affiliate }) {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [participantMap, setParticipantMap] = useState({});
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelMembers, setChannelMembers] = useState([]);
  const [activeSection, setActiveSection] = useState('dms'); // 'dms' or 'channels'
  const messagesEndRef = useRef(null);
  const isDirector = affiliate.tier === 'director';
  const isManager = affiliate.tier === 'recruiter' || isDirector;

  useEffect(() => { loadAll(); }, [affiliate.id]); // eslint-disable-line

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
      markAsRead(selectedConvo.id);
    }
  }, [selectedConvo?.id]); // eslint-disable-line

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: new messages in selected convo
  useEffect(() => {
    if (!selectedConvo) return;
    const ch = supabase.channel(`msgs-${selectedConvo.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'affiliate_messages', filter: `conversation_id=eq.${selectedConvo.id}` },
        (payload) => { setMessages(prev => [...prev, payload.new]); markAsRead(selectedConvo.id); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedConvo?.id]); // eslint-disable-line

  // Realtime: conversation list updates
  useEffect(() => {
    const ch = supabase.channel('convo-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_messages' }, () => loadAll())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [affiliate.id]); // eslint-disable-line

  const loadAll = async () => {
    try {
      const { data: convos } = await supabase
        .from('affiliate_conversations')
        .select('*')
        .contains('participant_ids', [affiliate.id])
        .order('updated_at', { ascending: false });

      if (!convos || convos.length === 0) {
        setConversations([]); setChannels([]); setLoading(false); return;
      }

      // Build participant map
      const allIds = new Set();
      convos.forEach(c => (c.participant_ids || []).forEach(id => allIds.add(id)));
      allIds.delete(affiliate.id);

      let pMap = { [affiliate.id]: affiliate.name };
      if (allIds.size > 0) {
        const { data: affs } = await supabase.from('affiliates').select('id, name, tier').in('id', Array.from(allIds));
        if (affs) affs.forEach(a => { pMap[a.id] = a.name; });
      }
      setParticipantMap(pMap);

      // Get last messages + read status
      const convoIds = convos.map(c => c.id);
      const { data: lastMsgs } = await supabase.from('affiliate_messages')
        .select('conversation_id, body, created_at, sender_affiliate_id, sender_admin_email')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      const { data: reads } = await supabase.from('affiliate_message_reads')
        .select('conversation_id, last_read_at')
        .eq('affiliate_id', affiliate.id)
        .in('conversation_id', convoIds);

      const readMap = {};
      (reads || []).forEach(r => { readMap[r.conversation_id] = r.last_read_at; });

      const lastMsgMap = {};
      (lastMsgs || []).forEach(m => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });

      const enriched = convos.map(c => {
        const lastMsg = lastMsgMap[c.id];
        const lastRead = readMap[c.id];
        const hasUnread = lastMsg && (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead));

        let displayName = c.group_name || '';
        if (!displayName && !c.is_group) {
          const otherId = (c.participant_ids || []).find(id => id !== affiliate.id);
          if (otherId && pMap[otherId]) displayName = pMap[otherId];
          else if (c.participant_ids?.length === 1) displayName = 'Work Van Support';
          else displayName = 'Unknown';
        }

        let preview = '';
        if (lastMsg) {
          const sl = lastMsg.sender_admin_email ? 'Work Van' : lastMsg.sender_affiliate_id === affiliate.id ? 'You' : (pMap[lastMsg.sender_affiliate_id] || '').split(' ')[0];
          preview = sl ? `${sl}: ${lastMsg.body}` : lastMsg.body;
        }

        return { ...c, displayName, lastMsg, hasUnread, preview };
      });

      setConversations(enriched.filter(c => !c.is_group));
      setChannels(enriched.filter(c => c.is_group));
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convoId) => {
    const { data } = await supabase.from('affiliate_messages')
      .select('*').eq('conversation_id', convoId).order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const markAsRead = async (convoId) => {
    await supabase.from('affiliate_message_reads')
      .upsert({ conversation_id: convoId, affiliate_id: affiliate.id, last_read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,affiliate_id' });
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !selectedConvo || sending) return;
    setSending(true);
    try {
      await supabase.from('affiliate_messages').insert({ conversation_id: selectedConvo.id, sender_affiliate_id: affiliate.id, body: text });
      await supabase.from('affiliate_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConvo.id);
      setMessageText('');
    } catch (err) {
      toast.error('Failed to send');
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // Load messageable contacts (full downline for directors)
  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const people = [];

      // Parent (manager/director)
      if (affiliate.parent_affiliate_id) {
        const { data } = await supabase.from('affiliates').select('id, name, tier').eq('id', affiliate.parent_affiliate_id).single();
        if (data) people.push({ ...data, relation: 'Your ' + tierLabel(data.tier) });
      }

      // Direct reports
      const { data: direct } = await supabase.from('affiliates').select('id, name, tier').eq('parent_affiliate_id', affiliate.id).order('name');
      if (direct) direct.forEach(d => people.push({ ...d, relation: tierLabel(d.tier) }));

      // Directors: also get full downline (sub-affiliates of their managers)
      if (isDirector && direct) {
        const mgrIds = direct.filter(d => d.tier === 'recruiter').map(d => d.id);
        if (mgrIds.length > 0) {
          const { data: subs } = await supabase.from('affiliates').select('id, name, tier, parent_affiliate_id')
            .in('parent_affiliate_id', mgrIds).order('name');
          if (subs) {
            subs.forEach(s => {
              const mgrName = direct.find(d => d.id === s.parent_affiliate_id)?.name || '';
              people.push({ ...s, relation: `Affiliate (under ${mgrName})` });
            });
          }
        }
      }

      setContacts(people);
    } catch {} finally { setContactsLoading(false); }
  };

  const startOrOpenDM = async (targetId, targetName) => {
    // Check existing
    const existing = [...conversations, ...channels].find(c =>
      !c.is_group && c.participant_ids?.length === 2 &&
      c.participant_ids.includes(affiliate.id) && c.participant_ids.includes(targetId));
    if (existing) { selectConvo(existing); setShowNewDM(false); return; }

    try {
      const { data, error } = await supabase.from('affiliate_conversations')
        .insert({ participant_ids: [affiliate.id, targetId], is_group: false, created_by: affiliate.id })
        .select().single();
      if (error) throw error;
      setParticipantMap(prev => ({ ...prev, [targetId]: targetName }));
      const newC = { ...data, displayName: targetName, hasUnread: false, preview: '' };
      setConversations(prev => [newC, ...prev]);
      selectConvo(newC);
      setShowNewDM(false);
    } catch (err) { toast.error('Failed to start conversation'); }
  };

  const startSupport = async () => {
    const existing = conversations.find(c => !c.is_group && c.participant_ids?.length === 1 && c.participant_ids.includes(affiliate.id));
    if (existing) { selectConvo(existing); setShowNewDM(false); return; }

    try {
      const { data, error } = await supabase.from('affiliate_conversations')
        .insert({ participant_ids: [affiliate.id], is_group: false, created_by: affiliate.id })
        .select().single();
      if (error) throw error;
      const newC = { ...data, displayName: 'Work Van Support', hasUnread: false, preview: '' };
      setConversations(prev => [newC, ...prev]);
      selectConvo(newC);
      setShowNewDM(false);
    } catch (err) { toast.error('Failed to start support chat'); }
  };

  // Channels
  const loadChannelContacts = async () => {
    // Same as contacts but for channel member selection
    await loadContacts();
  };

  const createChannel = async () => {
    if (!channelName.trim()) { toast.error('Channel name required'); return; }
    const memberIds = [affiliate.id, ...channelMembers];
    try {
      const { data, error } = await supabase.from('affiliate_conversations')
        .insert({ participant_ids: memberIds, is_group: true, group_name: channelName.trim(), created_by: affiliate.id })
        .select().single();
      if (error) throw error;
      const newCh = { ...data, displayName: channelName.trim(), hasUnread: false, preview: '' };
      setChannels(prev => [newCh, ...prev]);
      selectConvo(newCh);
      setShowNewChannel(false);
      setChannelName('');
      setChannelMembers([]);
      setActiveSection('channels');
    } catch (err) { toast.error('Failed to create channel'); }
  };

  const ensureDefaultChannels = useCallback(async () => {
    if (!isDirector) return;
    // Only directors auto-create default channels
    const { data: direct } = await supabase.from('affiliates').select('id, tier').eq('parent_affiliate_id', affiliate.id);
    if (!direct || direct.length === 0) return;

    const mgrIds = direct.filter(d => d.tier === 'recruiter').map(d => d.id);
    let allDownlineIds = direct.map(d => d.id);

    if (mgrIds.length > 0) {
      const { data: subs } = await supabase.from('affiliates').select('id').in('parent_affiliate_id', mgrIds);
      if (subs) allDownlineIds.push(...subs.map(s => s.id));
    }

    // Check for "Leadership" channel
    const hasLeadership = channels.some(c => c.group_name === 'Leadership');
    if (!hasLeadership && mgrIds.length > 0) {
      const { data: ch } = await supabase.from('affiliate_conversations')
        .insert({ participant_ids: [affiliate.id, ...mgrIds], is_group: true, group_name: 'Leadership', created_by: affiliate.id })
        .select().single();
      if (ch) setChannels(prev => [{ ...ch, displayName: 'Leadership', hasUnread: false, preview: '' }, ...prev]);
    }

    // Check for "All Hands" channel
    const hasAllHands = channels.some(c => c.group_name === 'All Hands');
    if (!hasAllHands && allDownlineIds.length > 0) {
      const { data: ch } = await supabase.from('affiliate_conversations')
        .insert({ participant_ids: [affiliate.id, ...allDownlineIds], is_group: true, group_name: 'All Hands', created_by: affiliate.id })
        .select().single();
      if (ch) setChannels(prev => [{ ...ch, displayName: 'All Hands', hasUnread: false, preview: '' }, ...prev]);
    }
  }, [affiliate.id, channels.length]); // eslint-disable-line

  useEffect(() => {
    if (!loading && isDirector && channels.length === 0) ensureDefaultChannels();
  }, [loading, isDirector]); // eslint-disable-line

  const selectConvo = (c) => { setSelectedConvo(c); setMobileShowThread(true); };

  const getSenderName = (msg) => {
    if (msg.sender_admin_email) return 'Work Van Team';
    if (msg.sender_affiliate_id === affiliate.id) return 'You';
    return participantMap[msg.sender_affiliate_id] || 'Unknown';
  };

  const tierLabel = (t) => ({ affiliate: 'Affiliate', recruiter: 'Manager', director: 'Director' }[t] || t);

  const fmtTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fmtMsgTime = (ts) => {
    const d = new Date(ts);
    if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const toggleChannelMember = (id) => {
    setChannelMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- RENDER ---
  const s = styles;

  const renderList = () => {
    const items = activeSection === 'channels' ? channels : conversations;
    return (
      <div style={s.listPanel}>
        <div style={s.listHeader}>
          <h2 style={s.listTitle}>Messages</h2>
          <button onClick={() => {
            if (activeSection === 'channels' && isManager) { loadChannelContacts(); setShowNewChannel(true); }
            else { loadContacts(); setShowNewDM(true); }
          }} style={s.newBtn} title={activeSection === 'channels' ? 'New Channel' : 'New Message'}>
            <Plus size={18} />
          </button>
        </div>

        {/* Section tabs */}
        <div style={s.sectionTabs}>
          <button onClick={() => setActiveSection('dms')} style={{ ...s.sectionTab, ...(activeSection === 'dms' ? s.sectionTabActive : {}) }}>
            DMs {conversations.filter(c => c.hasUnread).length > 0 && <span style={s.tabBadge}>{conversations.filter(c => c.hasUnread).length}</span>}
          </button>
          <button onClick={() => setActiveSection('channels')} style={{ ...s.sectionTab, ...(activeSection === 'channels' ? s.sectionTabActive : {}) }}>
            <Hash size={14} /> Channels {channels.filter(c => c.hasUnread).length > 0 && <span style={s.tabBadge}>{channels.filter(c => c.hasUnread).length}</span>}
          </button>
        </div>

        {loading ? (
          <div style={s.centered}><span style={s.dim}>Loading...</span></div>
        ) : items.length === 0 ? (
          <div style={s.emptyList}>
            {activeSection === 'channels' ? <Hash size={40} color="#444" /> : <MessageSquare size={40} color="#444" />}
            <p style={s.dim}>{activeSection === 'channels' ? 'No channels yet' : 'No conversations yet'}</p>
            <button onClick={() => {
              if (activeSection === 'channels' && isManager) { loadChannelContacts(); setShowNewChannel(true); }
              else { loadContacts(); setShowNewDM(true); }
            }} style={s.startBtn}>
              {activeSection === 'channels' ? 'Create a Channel' : 'Start a Conversation'}
            </button>
          </div>
        ) : (
          <div style={s.convoList}>
            {items.map(c => (
              <div key={c.id} onClick={() => selectConvo(c)} style={{
                ...s.convoItem,
                background: selectedConvo?.id === c.id ? '#2a2a2a' : 'transparent',
                borderLeft: c.hasUnread ? '3px solid #ff6b35' : '3px solid transparent',
              }}>
                <div style={s.convoAvatar}>
                  {c.is_group ? <Hash size={18} color="#4ecca3" /> :
                   c.displayName === 'Work Van Support' ? <Shield size={18} color="#ff6b35" /> :
                   <span style={s.avatarLetter}>{(c.displayName || '?')[0].toUpperCase()}</span>}
                </div>
                <div style={s.convoInfo}>
                  <div style={s.convoNameRow}>
                    <span style={{ ...s.convoName, fontWeight: c.hasUnread ? '600' : '400', color: c.hasUnread ? '#fff' : '#ccc' }}>
                      {c.displayName}
                    </span>
                    {c.lastMsg && <span style={s.convoTime}>{fmtTime(c.lastMsg.created_at)}</span>}
                  </div>
                  {c.preview && <p style={{ ...s.convoPreview, color: c.hasUnread ? '#bbb' : '#666' }}>
                    {c.preview.length > 55 ? c.preview.slice(0, 55) + '...' : c.preview}
                  </p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderThread = () => {
    if (!selectedConvo) return (
      <div style={s.threadPanel}>
        <div style={s.emptyThread}><MessageSquare size={48} color="#333" /><p style={s.dim}>Select a conversation</p></div>
      </div>
    );

    return (
      <div style={s.threadPanel}>
        <div style={s.threadHeader}>
          <button onClick={() => { setMobileShowThread(false); setSelectedConvo(null); }} style={s.backBtn} className="mobile-back">
            <ArrowLeft size={20} />
          </button>
          <div style={s.threadHeaderInfo}>
            <span style={s.threadName}>
              {selectedConvo.is_group && <Hash size={16} color="#4ecca3" style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
              {selectedConvo.displayName}
            </span>
            {selectedConvo.is_group && (
              <span style={s.threadSub}>{(selectedConvo.participant_ids || []).length} members</span>
            )}
          </div>
        </div>

        <div style={s.messagesList}>
          {messages.length === 0 ? (
            <div style={s.emptyMessages}><p style={s.dim}>No messages yet. Say hello!</p></div>
          ) : messages.map((msg, i) => {
            const own = msg.sender_affiliate_id === affiliate.id;
            const admin = !!msg.sender_admin_email;
            const showSender = selectedConvo.is_group || admin;
            const prevMsg = messages[i - 1];
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDate && <div style={s.dateSep}><span style={s.dateSepText}>{new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>}
                <div style={{ ...s.bubbleWrap, justifyContent: own ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    ...s.bubble,
                    background: own ? '#1a3a5c' : admin ? '#2a1a0a' : '#1a1a1a',
                    borderColor: own ? '#2a5a8c' : admin ? '#ff6b35' : '#2a2a2a',
                    borderRadius: own ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  }}>
                    {showSender && !own && <span style={{ ...s.msgSender, color: admin ? '#ff6b35' : '#888' }}>{getSenderName(msg)}</span>}
                    <p style={s.msgBody}>{msg.body}</p>
                    <span style={s.msgTime}>{fmtMsgTime(msg.created_at)}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={s.inputArea}>
          <textarea value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type a message..." rows={1} style={s.textInput} />
          <button onClick={handleSend} disabled={!messageText.trim() || sending}
            style={{ ...s.sendBtn, opacity: !messageText.trim() || sending ? 0.4 : 1 }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  };

  // New DM Modal
  const renderNewDM = () => {
    if (!showNewDM) return null;
    return (
      <div style={s.overlay} onClick={() => setShowNewDM(false)}>
        <div style={s.modal} onClick={e => e.stopPropagation()}>
          <div style={s.modalHeader}>
            <h3 style={s.modalTitle}>New Message</h3>
            <button onClick={() => setShowNewDM(false)} style={s.modalClose}><XIcon size={20} /></button>
          </div>
          {contactsLoading ? <div style={s.centered}><span style={s.dim}>Loading...</span></div> : (
            <div style={s.contactList}>
              {/* Support */}
              <div onClick={startSupport} style={s.contactItem} onMouseEnter={e => e.currentTarget.style.background='#2a2a2a'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ ...s.contactAvatar, background: '#331a0a' }}><Shield size={18} color="#ff6b35" /></div>
                <div style={s.contactInfo}><span style={s.contactName}>Work Van Support</span><span style={s.contactSub}>Get help from the team</span></div>
                <ChevronRight size={16} color="#555" />
              </div>
              {contacts.map(c => (
                <div key={c.id} onClick={() => startOrOpenDM(c.id, c.name)} style={s.contactItem}
                  onMouseEnter={e => e.currentTarget.style.background='#2a2a2a'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={s.contactAvatar}><span style={s.avatarLetter}>{c.name[0].toUpperCase()}</span></div>
                  <div style={s.contactInfo}>
                    <span style={s.contactName}>{c.name}</span>
                    <span style={s.contactSub}>{c.relation}</span>
                  </div>
                  <ChevronRight size={16} color="#555" />
                </div>
              ))}
              {contacts.length === 0 && <div style={{ padding: '2rem', textAlign: 'center' }}><p style={s.dim}>No contacts besides Work Van Support</p></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // New Channel Modal
  const renderNewChannel = () => {
    if (!showNewChannel) return null;
    return (
      <div style={s.overlay} onClick={() => setShowNewChannel(false)}>
        <div style={{ ...s.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
          <div style={s.modalHeader}>
            <h3 style={s.modalTitle}>Create Channel</h3>
            <button onClick={() => setShowNewChannel(false)} style={s.modalClose}><XIcon size={20} /></button>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Channel Name</label>
              <input type="text" value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="e.g. Q2 Push, New Hires"
                style={{ width: '100%', padding: '0.6rem', background: '#242424', border: '1px solid #3a3a3a', borderRadius: '8px', color: '#e0e0e0', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Members ({channelMembers.length} selected)
              </label>
              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #2a2a2a', borderRadius: '8px' }}>
                {contactsLoading ? <div style={s.centered}><span style={s.dim}>Loading...</span></div> :
                  contacts.map(c => {
                    const selected = channelMembers.includes(c.id);
                    return (
                      <div key={c.id} onClick={() => toggleChannelMember(c.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                        cursor: 'pointer', background: selected ? '#ff6b3510' : 'transparent', borderBottom: '1px solid #1a1a1a'
                      }}>
                        <input type="checkbox" checked={selected} readOnly style={{ accentColor: '#ff6b35', pointerEvents: 'none' }} />
                        <div>
                          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>{c.name}</div>
                          <div style={{ color: '#666', fontSize: '0.75rem' }}>{c.relation}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowNewChannel(false)} style={{ flex: 1, padding: '0.75rem', background: '#2a2a2a', border: 'none', borderRadius: '8px', color: '#e0e0e0', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createChannel} disabled={!channelName.trim() || channelMembers.length === 0}
                style={{ flex: 2, padding: '0.75rem', background: !channelName.trim() || channelMembers.length === 0 ? '#555' : '#ff6b35', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: !channelName.trim() || channelMembers.length === 0 ? 'not-allowed' : 'pointer' }}>
                Create Channel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.container}>
      <div className="msg-list-panel" style={s.listWrap}>{renderList()}</div>
      <div className="msg-thread-panel" style={s.threadWrap}>{renderThread()}</div>
      {renderNewDM()}
      {renderNewChannel()}
      <style>{`
        @media (max-width: 768px) {
          .msg-list-panel { display: ${mobileShowThread ? 'none' : 'flex'} !important; width: 100% !important; border-right: none !important; }
          .msg-thread-panel { display: ${mobileShowThread ? 'flex' : 'none'} !important; width: 100% !important; }
          .mobile-back { display: flex !important; }
        }
        @media (min-width: 769px) {
          .msg-list-panel, .msg-thread-panel { display: flex !important; }
          .mobile-back { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: 'calc(100vh - 60px)', background: '#0a0a0a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2a' },
  listWrap: { display: 'flex', width: '340px', minWidth: '280px', flexShrink: 0, borderRight: '1px solid #2a2a2a' },
  threadWrap: { display: 'flex', flex: 1, minWidth: 0 },
  listPanel: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%' },
  listHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #2a2a2a' },
  listTitle: { margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#fff' },
  newBtn: { background: '#ff6b35', border: 'none', borderRadius: '8px', color: '#fff', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  sectionTabs: { display: 'flex', borderBottom: '1px solid #2a2a2a' },
  sectionTab: { flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#888', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
  sectionTabActive: { color: '#ff6b35', borderBottomColor: '#ff6b35' },
  tabBadge: { background: '#ff6b35', color: '#fff', fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: '8px', marginLeft: '4px' },
  convoList: { flex: 1, overflowY: 'auto' },
  convoItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a' },
  convoAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #2a2a2a' },
  avatarLetter: { color: '#ccc', fontSize: '1rem', fontWeight: '600' },
  convoInfo: { flex: 1, minWidth: 0 },
  convoNameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  convoName: { fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convoTime: { fontSize: '0.7rem', color: '#666', flexShrink: 0 },
  convoPreview: { margin: '2px 0 0', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  threadPanel: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#0a0a0a' },
  threadHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #2a2a2a', background: '#0f0f0f' },
  backBtn: { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px', display: 'none' },
  threadHeaderInfo: { display: 'flex', flexDirection: 'column' },
  threadName: { color: '#fff', fontSize: '1rem', fontWeight: '600' },
  threadSub: { color: '#666', fontSize: '0.75rem' },
  messagesList: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  dateSep: { display: 'flex', justifyContent: 'center', padding: '12px 0' },
  dateSepText: { fontSize: '0.7rem', color: '#555', background: '#1a1a1a', padding: '4px 12px', borderRadius: '10px' },
  bubbleWrap: { display: 'flex', marginBottom: '4px' },
  bubble: { maxWidth: '75%', padding: '10px 14px', border: '1px solid', position: 'relative' },
  msgSender: { fontSize: '0.7rem', fontWeight: '600', marginBottom: '2px', display: 'block' },
  msgBody: { margin: 0, color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  msgTime: { fontSize: '0.65rem', color: '#555', marginTop: '4px', display: 'block', textAlign: 'right' },
  inputArea: { display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#0f0f0f' },
  textInput: { flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '10px 14px', color: '#e0e0e0', fontSize: '0.9rem', resize: 'none', outline: 'none', fontFamily: 'inherit', maxHeight: '120px', lineHeight: '1.4' },
  sendBtn: { background: '#ff6b35', border: 'none', borderRadius: '10px', color: '#fff', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' },
  dim: { color: '#555', fontSize: '0.9rem' },
  emptyList: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 20px', flex: 1 },
  startBtn: { background: '#ff6b35', border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 20px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '8px' },
  emptyThread: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', flex: 1 },
  emptyMessages: { display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#1a1a1a', borderRadius: '16px', border: '1px solid #2a2a2a', width: '100%', maxWidth: '420px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #2a2a2a' },
  modalTitle: { margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '600' },
  modalClose: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' },
  contactList: { flex: 1, overflowY: 'auto' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', background: 'transparent' },
  contactAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#242424', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  contactName: { color: '#e0e0e0', fontSize: '0.9rem', fontWeight: '500' },
  contactSub: { color: '#666', fontSize: '0.75rem' },
};
