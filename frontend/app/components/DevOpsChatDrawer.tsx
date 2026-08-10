"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  Trash2, 
  X, 
  Sparkles, 
  Terminal, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import { api } from "../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface DevOpsChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isFullScreen?: boolean;
}

export const DevOpsChatDrawer: React.FC<DevOpsChatDrawerProps> = ({
  isOpen,
  onClose,
  isFullScreen = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Why is the application running slowly?",
    "Check container statuses & restart history",
    "What caused the recent error spike in logs?",
    "Explain the active incident and root cause",
    "How can I resolve high CPU utilization?"
  ];

  const fetchHistory = async () => {
    try {
      const data = await api.getChatHistory();
      if (data.history) {
        setMessages(data.history);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen || isFullScreen) {
      fetchHistory();
    }
  }, [isOpen, isFullScreen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendChatMessage(text);
      if (res) {
        setMessages((prev) => [...prev, res]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Failed to query CloudBrain backend: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await api.clearChatHistory();
    await fetchHistory();
  };

  if (!isOpen && !isFullScreen) return null;

  const containerClasses = isFullScreen
    ? "w-full h-[calc(100vh-140px)] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl"
    : "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col animate-slideLeft";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-md text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              CloudBrain AI Copilot
              <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded">
                Live RAG
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Context-aware assistant connected to live system telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClear}
            title="Clear Chat History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {!isFullScreen && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m, i) => {
          const isUser = m.role === "user";

          return (
            <div
              key={i}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center space-x-1.5 mb-1 px-1">
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  {isUser ? "You" : "CloudBrain AI"}
                </span>
                <span className="text-[9px] text-slate-600 font-mono">
                  {m.timestamp}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                    : "bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none font-sans"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-indigo-400 p-3 rounded-xl bg-slate-950/60 border border-slate-800 w-fit">
            <Bot className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">Analyzing metrics & telemetry signals...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Suggested Questions
        </span>
        <div className="flex flex-wrap gap-1.5">
          {suggestedPrompts.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[10px] text-slate-300 hover:text-white bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 px-2.5 py-1 rounded-full transition-all text-left truncate max-w-full"
            >
              • {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask CloudBrain about incidents, containers, or logs..."
          className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
