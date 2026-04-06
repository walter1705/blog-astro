import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { projects } from '../data/projects';

interface Line {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

const PROMPT = 'walter@portfolio:~$';

const HELP_TEXT = `
Available commands:

  help              Show this message
  projects          List all projects
  open [slug]       Open a project demo (e.g. open portfolio)
  contact           Show contact information
  portfolio         Go to the home page
  grafana           Go to the dashboard
  clear             Clear the terminal
`.trim();

const CONTACT_TEXT = `{
  "name": "Walter",
  "role": "Junior Fullstack Developer",
  "email": "waltergranada77@gmail.com",
  "github": "https://github.com/walter1705",
  "availability": "Open to interesting opportunities"
}`;

const BOOT_LINES: Line[] = [
  { type: 'system', text: '┌──────────────────────────────────────┐' },
  { type: 'system', text: '│     walter@portfolio — Terminal v1.0   │' },
  { type: 'system', text: '│     Astro 5 + React + TypeScript        │' },
  { type: 'system', text: '└──────────────────────────────────────┘' },
  { type: 'system', text: '' },
  { type: 'output', text: 'Type "help" to see available commands.' },
  { type: 'output', text: '' },
];

function processCommand(raw: string): Line[] {
  const [cmd, ...args] = raw.trim().toLowerCase().split(/\s+/);
  const output: Line[] = [];

  switch (cmd) {
    case 'help':
      output.push({ type: 'output', text: HELP_TEXT });
      break;

    case 'projects':
      output.push({ type: 'output', text: 'Available projects:\n' });
      projects.forEach((p, i) => {
        output.push({
          type: 'output',
          text: `  ${i + 1}. ${p.title} [${p.slug}]\n     ${p.description}\n     Tech: ${p.tech.join(', ')}`,
        });
      });
      break;

    case 'open': {
      const slug = args[0];
      if (!slug) {
        output.push({ type: 'error', text: 'Error: specify a slug. e.g. open portfolio' });
        break;
      }
      const project = projects.find((p) => p.slug === slug);
      if (!project) {
        output.push({
          type: 'error',
          text: `Error: project "${slug}" not found. Use "projects" to see the list.`,
        });
        break;
      }
      const url = project.demo ?? project.github;
      if (url) {
        output.push({ type: 'output', text: `Opening ${project.title}...` });
        setTimeout(() => window.open(url, '_blank'), 500);
      } else {
        output.push({ type: 'error', text: "This project doesn't have a public URL yet." });
      }
      break;
    }

    case 'contact':
      output.push({ type: 'output', text: CONTACT_TEXT });
      break;

    case 'portfolio':
      output.push({ type: 'output', text: 'Redirecting to home...' });
      setTimeout(() => (window.location.href = '/'), 600);
      break;

    case 'grafana':
      output.push({ type: 'output', text: 'Opening dashboard...' });
      setTimeout(() => (window.location.href = '/dashboard'), 600);
      break;

    case 'clear':
      // special — handled in component
      return [{ type: 'system', text: '__CLEAR__' }];

    case '':
      break;

    default:
      output.push({
        type: 'error',
        text: `Command not found: "${cmd}". Type "help" to see available commands.`,
      });
  }

  return output;
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>(BOOT_LINES);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = input.trim();
    const inputLine: Line = { type: 'input', text: `${PROMPT} ${trimmed}` };
    const result = processCommand(trimmed);

    if (result[0]?.text === '__CLEAR__') {
      setLines(BOOT_LINES);
      setInput('');
      setHistoryIndex(-1);
      return;
    }

    setLines((prev) => [...prev, inputLine, ...result]);

    if (trimmed) {
      setHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    }
    setInput('');
    setHistoryIndex(-1);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submit();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex] ?? '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(nextIndex);
      setInput(nextIndex === -1 ? '' : (history[nextIndex] ?? ''));
      return;
    }
  }

  return (
    <div
      className="h-screen bg-gray-950 font-mono text-sm flex flex-col overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-4 text-gray-400 text-xs tracking-wide">
          walter@portfolio — bash — 80×24
        </span>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 select-text">
        {lines.map((line, i) => (
          <pre
            key={i}
            className={[
              'whitespace-pre-wrap break-words leading-relaxed',
              line.type === 'input' ? 'text-green-400' : '',
              line.type === 'output' ? 'text-gray-300' : '',
              line.type === 'error' ? 'text-red-400' : '',
              line.type === 'system' ? 'text-indigo-400' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {line.text}
          </pre>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-950 shrink-0">
        <span className="text-green-400 shrink-0">{PROMPT}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 bg-transparent text-green-300 outline-none caret-green-400 placeholder:text-gray-700"
          placeholder="type a command..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
