import { useParams, Link, useNavigate } from 'react-router-dom';
import { ALL_SUBJECTS } from '../constants';
import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { FileText, Plus, ChevronLeft, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  updatedAt: any;
}

export default function SubjectView() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const subject = ALL_SUBJECTS.find((s) => s.id === subjectId);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || !subjectId) return;

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', auth.currentUser.uid),
      where('subject', '==', subjectId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [subjectId]);

  const handleCreateNote = async () => {
    if (!auth.currentUser || !subjectId) return;
    try {
      const newNoteRef = await addDoc(collection(db, 'notes'), {
        userId: auth.currentUser.uid,
        subject: subjectId,
        title: 'Untitled Note',
        content: '',
        rawContent: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/note/${newNoteRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  if (!subject) return <div className="p-8 text-white">Subject not found</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-gray-100 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Subjects
        </Link>
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">{subject.name}</h1>
            <p className="text-gray-400 text-lg">Manage your notes and clinical cases.</p>
          </div>
          <button
            onClick={handleCreateNote}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            New Note
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-800 rounded-2xl bg-[#111111]">
            <FileText className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No notes yet</h3>
            <p className="text-gray-400 text-center max-w-sm">
              Create your first note for {subject.name} to start organizing your studies.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className="group flex flex-col p-5 bg-[#111111] border border-gray-800 rounded-2xl hover:bg-[#1a1a1a] hover:border-gray-600 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-800/50 rounded-lg text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {note.title || 'Untitled Note'}
                </h3>
                <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'MMM d, yyyy') : 'Just now'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
