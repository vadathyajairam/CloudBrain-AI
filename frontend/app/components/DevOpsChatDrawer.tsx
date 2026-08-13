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
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { api, RAGSource } from "../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  rag_sources?: RAGSource[];
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
    "Why is PostgreSQL or demo-app failing?",
    "Check container statuses & restart counts",
    "What caused the recent error spike in logs?",
    "Explain active incident root cause & RAG runbook",
    "How can I resolve high CPU utilization?",
  ];

  const fetchHistory = async () => {
    try {
      const data = await api.getChatHistory();
      if (data.history) {
        setMessages(data.history);
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
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
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          content: `⚠️ Failed to query Synexis AI backend: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await api.clearChatHistory();
      setMessages([]);
      await fetchHistory();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen && !isFullScreen) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 ${
        isFullScreen ? "relative inset-0 w-full border-none shadow-none" : ""
      }`}
    >
      {/* Header */}
      <div className="h-[61px] px-4 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              <span>Synexis AI Copilot</span>
              <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                RAG Grounded
              </span>
            </div>
            <div className="text-[10px] text-slate-500">Live Telemetry & Knowledge Assistant</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {!isFullScreen && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[90%] rounded-xl p-3.5 text-xs leading-relaxed shadow-xs ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* RAG Knowledge Citations */}
              {msg.rag_sources && msg.rag_sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    Referenced RAG Runbooks:
                  </div>
                  <div className="space-y-1">
                    {msg.rag_sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-700 font-mono flex items-center justify-between"
                      >
                        <span className="truncate">{src.title}</span>
                        <span className="text-indigo-600 font-bold shrink-0">{Math.round((src.score || 0.8) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>Synexis AI is querying live telemetry & RAG knowledge...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 border-t border-slate-200 bg-white shrink-0">
        <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Suggested Questions:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Synexis about your system, logs, or runbooks..."
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
