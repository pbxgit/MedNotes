import { Outlet, Link, useNavigate } from 'react-router-dom';
import { auth, logOut } from '../firebase';
import { LogOut, BookOpen, MessageSquare, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Chatbot from './Chatbot';

export default function Layout() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-[#111111]">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
            <BookOpen className="w-6 h-6 text-blue-500" />
            MedNotes Pro
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
            Subjects
          </Link>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Gemini Assistant
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
                  {auth.currentUser?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-sm font-medium truncate">{auth.currentUser?.displayName}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-gray-800 bg-[#111111] z-20 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <BookOpen className="w-5 h-5 text-blue-500" />
          MedNotes
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-300">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#111111] z-20 flex flex-col border-t border-gray-800">
          <nav className="flex-1 p-4 space-y-4">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-gray-800">
              <BookOpen className="w-5 h-5" />
              Subjects
            </Link>
            <button 
              onClick={() => { setIsChatOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-gray-800"
            >
              <MessageSquare className="w-5 h-5" />
              Gemini Assistant
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-gray-800">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-16 md:pt-0 relative">
        <Outlet />
      </main>

      {/* Chatbot Drawer */}
      <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
