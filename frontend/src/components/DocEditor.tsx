import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Save, Users, History, Check, Wifi, Clock, Sparkles
} from 'lucide-react';
import { Document, Team } from '../types';
import { offlineSync } from '../services/offlineSync';

interface DocEditorProps {
  team: Team | null;
  documents: Document[];
  activeDoc: Document | null;
  onSelectDoc: (doc: Document) => void;
  onCreateDoc: (title: string, content?: string) => void;
  onUpdateDoc: (docId: number, data: { title?: string; content?: string }) => void;
  isOnline: boolean;
}

export const DocEditor: React.FC<DocEditorProps> = ({
  team,
  documents,
  activeDoc,
  onSelectDoc,
  onCreateDoc,
  onUpdateDoc,
  isOnline,
}) => {
  const [content, setContent] = useState(activeDoc?.content || '');
  const [title, setTitle] = useState(activeDoc?.title || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline_cached'>('saved');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Active simulated co-editors for Yjs CRDT presence visualization
  const activeCoEditors = [
    { name: 'Sarah C.', color: 'border-cyan-400 text-cyan-400 bg-cyan-950/60' },
    { name: 'Marcus V.', color: 'border-indigo-400 text-indigo-400 bg-indigo-950/60' },
  ];

  useEffect(() => {
    if (activeDoc) {
      setContent(activeDoc.content || '');
      setTitle(activeDoc.title || '');
      setSaveStatus('saved');
    }
  }, [activeDoc?.id]);

  // Handle local text changes with auto-save & offline IndexedDB caching
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus('saving');

    if (!activeDoc) return;

    if (!isOnline) {
      // Store in local IndexedDB offline store
      offlineSync.cacheDoc(activeDoc.id, title, newContent);
      offlineSync.queueMutation('DOC_UPDATE', {
        id: activeDoc.id,
        data: { title, content: newContent },
      });
      setSaveStatus('offline_cached');
    } else {
      // Debounced backend save
      const timer = setTimeout(() => {
        onUpdateDoc(activeDoc.id, { title, content: newContent });
        setSaveStatus('saved');
      }, 800);
      return () => clearTimeout(timer);
    }
  };

  const handleTitleChange = (newTitleText: string) => {
    setTitle(newTitleText);
    if (!activeDoc) return;
    onUpdateDoc(activeDoc.id, { title: newTitleText, content });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateDoc(newTitle, '# ' + newTitle + '\n\nStart typing collaborative content here...');
    setNewTitle('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Document Navigator Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col justify-between shrink-0 select-none">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Documents</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Create Document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {documents.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">No docs yet.</div>
            ) : (
              documents.map((doc) => {
                const isActive = activeDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelectDoc(doc)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Engine status indicator */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Yjs CRDT Engine + IndexedDB</span>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        {activeDoc ? (
          <>
            {/* Editor Toolbar Header */}
            <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40">
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="bg-transparent font-bold text-base text-white focus:outline-none w-full border-b border-transparent hover:border-slate-700 focus:border-indigo-500 transition px-1 py-0.5"
                  placeholder="Document Title"
                />
              </div>

              {/* Status and Active Collaborators */}
              <div className="flex items-center space-x-4">
                {/* Sync status */}
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  {saveStatus === 'saved' && (
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="flex items-center space-x-1 text-amber-400 animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Syncing...</span>
                    </span>
                  )}
                  {saveStatus === 'offline_cached' && (
                    <span className="flex items-center space-x-1 text-cyan-400">
                      <Wifi className="w-3 h-3" />
                      <span>Cached Offline</span>
                    </span>
                  )}
                </div>

                {/* Co-editors avatars */}
                <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Co-editing:</span>
                  {activeCoEditors.map((editor, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${editor.color}`}
                    >
                      {editor.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full">
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your project spec, meeting notes, or architecture documentation..."
                className="w-full h-full bg-transparent text-slate-200 text-sm leading-relaxed font-mono resize-none focus:outline-none placeholder-slate-600"
              />
            </div>

            {/* Document Footer */}
            <div className="h-9 border-t border-slate-800/80 px-6 flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/20">
              <div className="flex items-center space-x-4">
                <span>Version: v{activeDoc.version}</span>
                <span>Words: {content.split(/\s+/).filter(Boolean).length}</span>
                <span>Characters: {content.length}</span>
              </div>
              <div>Last modified: {new Date(activeDoc.updated_at).toLocaleTimeString()}</div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <FileText className="w-12 h-12 stroke-1 text-slate-600" />
            <p className="text-sm">Select or create a document to start collaborative editing.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition"
            >
              Create New Document
            </button>
          </div>
        )}
      </div>

      {/* Modal to create doc */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Create Document</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sprint 42 Technical Spec"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
