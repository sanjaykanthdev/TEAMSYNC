import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Lock, Send, Plus, Users, Smile, MessageSquare
} from 'lucide-react';
import { Channel, Message, User, Team } from '../types';

interface TeamChatProps {
  team: Team | null;
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel: (name: string, topic?: string) => void;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser: User | null;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  team,
  channels,
  activeChannel,
  onSelectChannel,
  onCreateChannel,
  messages,
  onSendMessage,
  currentUser,
}) => {
  const [inputText, setInputText] = useState('');
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    onCreateChannel(newChannelName, newChannelTopic);
    setNewChannelName('');
    setNewChannelTopic('');
    setShowAddChannel(false);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Channels Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/70 flex flex-col justify-between shrink-0 select-none">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Channels</span>
            <button
              onClick={() => setShowAddChannel(true)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Create Channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channel list */}
          <div className="space-y-1">
            {channels.map((chan) => {
              const isActive = activeChannel?.id === chan.id;
              return (
                <button
                  key={chan.id}
                  onClick={() => onSelectChannel(chan)}
                  className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/90 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {chan.is_private ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Hash className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="truncate">{chan.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel Info pill */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{team?.members.length || 1} team collaborators online</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Channel Header */}
        <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-white">{activeChannel?.name || 'select-channel'}</span>
            {activeChannel?.topic && (
              <span className="text-xs text-slate-400 border-l border-slate-700 pl-2 ml-2">
                {activeChannel.topic}
              </span>
            )}
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-medium">
            WebSocket Stream Active
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 stroke-1 text-slate-600" />
              <p className="text-xs">This is the start of #{activeChannel?.name || 'channel'}.</p>
              <p className="text-[11px] text-slate-600">Send a message to start real-time discussion.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.id;
              return (
                <div key={msg.id} className="flex items-start space-x-3 group">
                  <img
                    src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 shrink-0 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <span className={`text-xs font-semibold ${isMe ? 'text-indigo-400' : 'text-slate-200'}`}>
                        {msg.sender?.full_name || 'Team Member'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
          <form onSubmit={handleSend} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${activeChannel?.name || 'channel'}...`}
              className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modal to add channel */}
      {showAddChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Create Discussion Channel</h3>
            <form onSubmit={handleCreateChannel} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Channel Name</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. backend-dev"
                    className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Topic (optional)</label>
                <input
                  type="text"
                  placeholder="What is this channel about?"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddChannel(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
