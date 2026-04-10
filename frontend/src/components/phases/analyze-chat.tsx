"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { FAKE_ANALYZE_CHAT, type ChatMessage, type Ticket } from "@/lib/fake-data";

interface AnalyzeChatProps {
  ticket: Ticket;
  onComplete: () => void;
}

export function AnalyzeChat({ ticket, onComplete }: AnalyzeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate loading messages
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    FAKE_ANALYZE_CHAT.forEach((msg, i) => {
      timeouts.push(
        setTimeout(() => {
          if (msg.role === "ai") setTyping(true);
          setTimeout(() => {
            setTyping(false);
            setMessages((prev) => [...prev, msg]);
          }, msg.role === "ai" ? 800 : 0);
        }, i * 1500)
      );
    });
    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleChoice = (choice: string) => {
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: choice,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Simulate AI follow-up
    setTimeout(() => {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content:
              "Good choice. I have enough information for this area now. Based on the analysis, this ticket is ready to move to the **Plan** phase.\n\nI'll compile the analysis into the wiki and update the knowledge base.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
          },
        ]);
      }, 1200);
    }, 500);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const lastAiMessage = [...messages].reverse().find((m) => m.role === "ai");

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="shrink-0 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan" />
          <span className="text-xs font-medium">Analyze Phase</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            Business questions to clarify requirements
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="p-5 space-y-4 max-w-2xl">
          {/* Ticket context */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 mb-6">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Ticket Description
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "ai"
                    ? "bg-cyan/10 border border-cyan/20"
                    : "bg-violet/10 border border-violet/20"
                }`}
              >
                {msg.role === "ai" ? (
                  <Bot className="w-3.5 h-3.5 text-cyan" />
                ) : (
                  <User className="w-3.5 h-3.5 text-violet" />
                )}
              </div>
              <div
                className={`flex-1 min-w-0 ${msg.role === "user" ? "text-right" : ""}`}
              >
                <div
                  className={`inline-block text-left p-3 rounded-lg text-sm leading-relaxed max-w-[90%] ${
                    msg.role === "ai"
                      ? "bg-card border border-border"
                      : "bg-violet/10 border border-violet/20"
                  }`}
                >
                  <div className="text-xs whitespace-pre-wrap [&_strong]:font-semibold [&_strong]:text-foreground text-muted-foreground">
                    {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={i}>{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground/50 mt-1 px-1">
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-cyan" />
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Multiple choice area */}
      {lastAiMessage?.choices && !typing && (
        <div className="shrink-0 px-5 py-3 border-t border-border bg-card/50">
          <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
            Choose an answer
          </div>
          <div className="space-y-1.5">
            {lastAiMessage.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(choice)}
                className="w-full text-left px-3 py-2 rounded-md border border-border/50 bg-secondary/30 hover:bg-secondary hover:border-border text-xs transition-all"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message or pick from choices above..."
            className="min-h-[40px] max-h-[120px] resize-none text-xs bg-secondary border-border/50"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="sm"
            className="h-10 w-10 p-0 bg-cyan text-background hover:bg-cyan/90"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
