import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { id: activeConvId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(activeConvId || null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(!activeConvId);
  const messagesEnd = useRef(null);

  useEffect(() => {
    api.getConversations().then(data => { setConversations(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    api.getMessages(activeConv).then(data => {
      setMessages(data.messages);
      setOtherUser(data.otherUser);
    }).catch(() => {});
  }, [activeConv]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      const data = await api.sendMessage({ conversation_id: activeConv, content: newMsg, receiver_id: otherUser?.id });
      setMessages(prev => [...prev, data.message]);
      if (!activeConv && data.conversation_id) setActiveConv(data.conversation_id);
      setNewMsg('');
      // Refresh conversations
      api.getConversations().then(setConversations).catch(() => {});
    } catch (err) { alert(err.message); }
  };

  const formatTime = (d) => {
    const dt = new Date(d);
    const now = new Date();
    const diff = now - dt;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="messages-layout fade-in">
      {/* Conversations list */}
      <div className={`conversations-list ${showList ? 'mobile-show' : ''}`}>
        <div className="conversations-list-header">Messages</div>
        {conversations.length === 0 ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>No conversations yet</div>
        ) : (
          conversations.map(conv => (
            <div key={conv.id} className={`conversation-item ${activeConv === conv.id ? 'active' : ''}`}
              onClick={() => { setActiveConv(conv.id); setShowList(false); }}>
              <div className="conv-avatar">{conv.other_name?.[0]}</div>
              <div className="conv-info">
                <div className="conv-name">{conv.other_name}</div>
                <div className="conv-last-message">{conv.last_message || 'No messages yet'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className="conv-time">{formatTime(conv.last_message_at)}</span>
                {conv.unread_count > 0 && <div className="conv-unread" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat window */}
      {activeConv ? (
        <div className="chat-window">
          <div className="chat-header">
            <button className="btn btn-ghost btn-icon" onClick={() => setShowList(true)} style={{ display: 'none' }}>
              <ArrowLeft size={18} />
            </button>
            <div className="conv-avatar" style={{ width: 36, height: 36 }}>{otherUser?.full_name?.[0]}</div>
            <div>
              <div className="chat-name">{otherUser?.full_name}</div>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
                <div>{msg.content}</div>
                <div className="msg-time">{formatTime(msg.created_at)}</div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>
          <form className="chat-input-area" onSubmit={handleSend}>
            <input type="text" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-icon"><Send size={18} /></button>
          </form>
        </div>
      ) : (
        <div className="chat-no-selection">
          <div style={{ fontSize: '3rem', opacity: 0.3 }}>💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the left to start chatting</p>
        </div>
      )}
    </div>
  );
}
