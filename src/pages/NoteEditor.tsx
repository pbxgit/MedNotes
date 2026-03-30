import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ArrowLeft, Save, Trash2, Wand2, Loader2, SplitSquareHorizontal, FileText } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function NoteEditor() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [formattedContent, setFormattedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!noteId || !auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'notes', noteId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNote({ id: docSnap.id, ...data });
        if (!title && !rawContent) {
          setTitle(data.title || '');
          setRawContent(data.rawContent || '');
          setFormattedContent(data.content || '');
        }
      } else {
        navigate('/');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `notes/${noteId}`);
    });

    return () => unsubscribe();
  }, [noteId, navigate]);

  const saveNote = useCallback(async (newTitle: string, newRaw: string, newFormatted: string) => {
    if (!noteId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'notes', noteId), {
        title: newTitle,
        rawContent: newRaw,
        content: newFormatted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
    } finally {
      setIsSaving(false);
    }
  }, [noteId]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRaw = e.target.value;
    setRawContent(newRaw);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(title, newRaw, formattedContent);
    }, 1500);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, rawContent, formattedContent);
    }, 1500);
  };

  const formatWithGemini = async () => {
    if (!rawContent.trim()) return;
    setIsFormatting(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert medical note-taker for an MBBS student. Convert the following raw, unstructured notes into a beautifully structured Markdown document. Use headings, bullet points, bold text for emphasis, tables if applicable, and ensure clinical accuracy. Do not add information not present in the raw text, just structure it perfectly.

Raw Notes:
${rawContent}`,
      });
      
      const newFormatted = response.text || rawContent;
      setFormattedContent(newFormatted);
      await saveNote(title, rawContent, newFormatted);
    } catch (error) {
      console.error("Error formatting with Gemini:", error);
      alert("Failed to format notes. Please try again.");
    } finally {
      setIsFormatting(false);
    }
  };

  const handleDelete = async () => {
    if (!noteId || !window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${noteId}`);
    }
  };

  if (!note) return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-100 font-sans">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#111111]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note Title"
            className="bg-transparent border-none text-xl font-semibold text-white focus:outline-none focus:ring-0 placeholder-gray-600 w-full max-w-md"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex bg-gray-900 rounded-lg p-1 border border-gray-800 mr-4">
            <button onClick={() => setViewMode('edit')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'edit' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Edit</button>
            <button onClick={() => setViewMode('split')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Split</button>
            <button onClick={() => setViewMode('preview')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'preview' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Preview</button>
          </div>

          <span className="text-xs text-gray-500 mr-2 hidden sm:inline-block">
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
          
          <button
            onClick={formatWithGemini}
            disabled={isFormatting || !rawContent.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
          >
            {isFormatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            <span className="hidden sm:inline">AI Format</span>
          </button>
          
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-800 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Raw Input */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col border-r border-gray-800 ${viewMode === 'edit' ? 'w-full' : 'w-1/2'}`}>
            <div className="p-2 bg-[#111111] border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3 h-3" /> Raw Notes
            </div>
            <textarea
              value={rawContent}
              onChange={handleContentChange}
              placeholder="Start typing your raw notes here... Use the 'AI Format' button to magically structure them."
              className="flex-1 w-full bg-transparent text-gray-300 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
            />
          </div>
        )}

        {/* Markdown Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col bg-[#0a0a0a] ${viewMode === 'preview' ? 'w-full' : 'w-1/2'}`}>
            <div className="p-2 bg-[#111111] border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <SplitSquareHorizontal className="w-3 h-3" /> Structured Preview
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              <div className="prose prose-invert prose-blue max-w-none">
                {formattedContent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {formattedContent}
                  </ReactMarkdown>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 mt-20">
                    <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                    <p>Click "AI Format" to generate structured markdown.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
