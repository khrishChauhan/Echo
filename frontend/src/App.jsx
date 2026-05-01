import React, { useEffect, useState, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { SocketIOProvider } from 'y-socket.io';

function App() {
  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });

  const [users, setUsers] = useState([]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  // Intelligent Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('echo-theme');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'dark'; // Fallback
  });

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  // Shared Document State
  const ydoc = useMemo(() => new Y.Doc(), []);
  const ytext = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  // Sync theme with HTML root & local storage
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    localStorage.setItem('echo-theme', theme);

    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'echo-dark' : 'echo-light');
    }
  }, [theme]);

  // Command Palette Listener
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen((open) => !open);
      }
      if (e.key === 'Escape') setIsCmdOpen(false);
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('echo-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0F1220',
        'editor.lineHighlightBackground': '#15182B',
        'editorCursor.foreground': '#C4B5FD',
        'editor.selectionBackground': '#C4B5FD40',
      }
    });

    monaco.editor.defineTheme('echo-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#F6F7FB',
        'editor.lineHighlightBackground': '#FFFFFF',
        'editorCursor.foreground': '#7DD3FC',
        'editor.selectionBackground': '#BAE6FD66',
      }
    });

    monaco.editor.setTheme(theme === 'dark' ? 'echo-dark' : 'echo-light');
    setIsEditorReady(true);
  }

  useEffect(() => {
    if (username && isEditorReady && editorRef.current) {
      const provider = new SocketIOProvider("/", "monaco", ydoc, { autoConnect: true });
      providerRef.current = provider;

      const userColor = theme === 'dark' ? '#C4B5FD' : '#BAE6FD'; 
      provider.awareness.setLocalStateField("user", { 
        username, 
        color: userColor,
        name: username
      });

      const updateUsers = () => {
        const states = Array.from(provider.awareness.getStates().values());
        setUsers(states.map(state => state.user).filter(user => Boolean(user?.username)));
      };

      provider.awareness.on("change", updateUsers);

      const handleUnload = () => provider.awareness.setLocalStateField("user", null);
      window.addEventListener("beforeunload", handleUnload);

      const monacoBinding = new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );
      bindingRef.current = monacoBinding;

      return () => {
        provider.awareness.setLocalStateField("user", null);
        window.removeEventListener("beforeunload", handleUnload);
        provider.disconnect();
        monacoBinding.destroy();
      };
    }
  }, [username, isEditorReady, ydoc, ytext, theme]);

  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.username.value.trim();
    if (name) {
      setUsername(name);
      window.history.pushState({}, "", "?username=" + encodeURIComponent(name));
    }
  }

  const handleLeave = () => {
    window.location.href = window.location.pathname;
  }

  // --- Components ---

  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-500 active:scale-95 group shadow-sm overflow-hidden"
      aria-label="Toggle theme"
    >
      {/* Dynamic Pastel Bloom Effect */}
      <div className={`absolute inset-0 transition-opacity duration-700 blur-xl opacity-0 group-hover:opacity-20 ${theme === 'dark' ? 'bg-indigo-400' : 'bg-sky-400'}`}></div>
      
      {/* Morphing Gradient Orb */}
      <div className={`absolute inset-1 rounded-full transition-all duration-700 ease-in-out opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'bg-gradient-to-tr from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-tr from-sky-400/10 to-indigo-400/10'}`}></div>

      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon */}
        <svg 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out ${theme === 'dark' ? 'opacity-0 scale-50 rotate-90 translate-y-4' : 'opacity-100 scale-100 rotate-0 translate-y-0'}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {/* Moon Icon */}
        <svg 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0 translate-y-0' : 'opacity-0 scale-50 -rotate-90 -translate-y-4'}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
    </button>
  );

  const AvatarStack = () => (
    <div className="group flex items-center -space-x-1.5 hover:space-x-1.5 transition-all duration-300 cursor-default">
      {users.map((u, i) => (
        <div key={i} className="relative flex items-center transition-all duration-300">
           <div 
             className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white border-[1.5px] border-[var(--bg-color)] z-10 transition-transform duration-200 group-hover:scale-105 shadow-sm" 
             style={{ backgroundColor: u.color || 'var(--accent-primary)' }}
           >
             {u.username.charAt(0).toUpperCase()}
           </div>
           <div className="overflow-hidden w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-2 group-hover:mr-1 transition-all duration-300 whitespace-nowrap">
             <span className="text-xs font-medium text-[var(--text-primary)]">
               {u.username} <span className="text-[var(--text-secondary)]">{u.username === username && '(You)'}</span>
             </span>
           </div>
        </div>
      ))}
    </div>
  );

  const CommandPalette = () => {
    if (!isCmdOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex justify-center pt-[15vh] px-4 animate-fade-in" onClick={() => setIsCmdOpen(false)}>
        <div className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-sm"></div>
        <div 
          className="relative w-full max-w-xl bg-[var(--surface-color)] rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-cmd)] overflow-hidden animate-cmd-palette flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center px-4 py-4 border-b border-[var(--border-color)]">
            <svg className="w-5 h-5 text-[var(--text-secondary)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              autoFocus 
              type="text" 
              placeholder="Type a command or search..." 
              className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)] font-medium" 
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-hover)] rounded border border-[var(--border-color)]">
              ESC
            </kbd>
          </div>
          <div className="py-2 max-h-72 overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</div>
            <button 
              onClick={() => { setTheme(t => t === 'dark' ? 'light' : 'dark'); setIsCmdOpen(false); }} 
              className="w-full flex items-center px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Toggle Theme
            </button>
            <button 
              onClick={() => setIsCmdOpen(false)} 
              className="w-full flex items-center px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Invite Users
            </button>
            <button 
              onClick={() => { handleLeave(); setIsCmdOpen(false); }} 
              className="w-full flex items-center px-4 py-3 text-sm text-red-500 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <svg className="w-4 h-4 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Leave Workspace
            </button>
          </div>
        </div>
      </div>
    )
  };

  // --- Views ---

  if (!username) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center p-6 animate-fade-in bg-[var(--bg-color)]">
        <div className="absolute top-8 right-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-10 h-10 border border-[var(--border-color)] bg-[var(--surface)] rounded-xl flex items-center justify-center shadow-sm">
               <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Join Echo</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Real-time collaborative workspace.</p>
            </div>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <input
                name="username"
                type="text"
                placeholder="Display Name"
                autoFocus
                required
                className="w-full px-4 py-3 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all shadow-sm text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[var(--accent-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
            >
              Continue
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--bg-color)]">
      {/* Top Command Bar */}
      <header className="h-14 flex-none border-b border-[var(--border-color)] bg-[var(--surface-color)] flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-4">
          <div className="w-7 h-7 border border-[var(--border-color)] rounded-md flex items-center justify-center bg-[var(--surface)]">
             <svg className="w-3.5 h-3.5 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex items-center space-x-2 text-sm font-medium text-[var(--text-primary)]">
            <span className="opacity-50">Workspace</span>
            <span className="opacity-30">/</span>
            <span>Untitled</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button 
            onClick={() => setIsCmdOpen(true)}
            className="hidden md:flex items-center space-x-2 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-hover)] rounded border border-transparent hover:border-[var(--border-color)] transition-all cursor-text"
          >
            <span>Search or command</span>
            <kbd className="font-sans px-1.5 py-0.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded opacity-70">⌘K</kbd>
          </button>
          <AvatarStack />
        </div>
      </header>

      {/* Code Editor Area */}
      <main className="flex-1 relative bg-[var(--bg-color)]">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Welcome to Echo."
          theme={theme === 'dark' ? 'echo-dark' : 'echo-light'}
          onMount={handleMount}
          options={{
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            minimap: { enabled: false },
            padding: { top: 24, bottom: 24 },
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 16,
            lineNumbersMinChars: 3,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            fontLigatures: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden'
            }
          }}
        />
      </main>

      <CommandPalette />
    </div>
  );
}

export default App;
