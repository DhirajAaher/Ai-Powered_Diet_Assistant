import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-direct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, Bot, User, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/auth";

interface Message { role: "user" | "assistant"; text: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function VoiceAgent() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hello! I'm your NutriAI voice coach. Ask me anything about your diet, nutrition, or healthy lifestyle. You can speak to me or type your question!" }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [input, setInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef<number | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile-voice"], queryFn: () => api.get<any>("/api/profile") });

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setSupported(false);
    }
    return () => { synthRef.current?.cancel(); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function speak(text: string) {
    if (isMuted || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const t = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        setTranscript("");
        if (t.trim()) sendMessage(t.trim());
      }
    };
    recognition.onerror = () => { setIsListening(false); setTranscript(""); };
    recognition.onend = () => { setIsListening(false); };
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  async function getOrCreateConversation(): Promise<number> {
    if (convIdRef.current) return convIdRef.current;
    const data = await api.post<any>("/api/openai/conversations", { title: "Voice Chat" });
    convIdRef.current = data.id;
    return data.id;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const convId = await getOrCreateConversation();
      const response = await fetch(`${BASE}/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content: text }),
      });

      if (!response.body) throw new Error("No stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      setMessages(prev => [...prev, { role: "assistant", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              fullText += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", text: fullText };
                return updated;
              });
            } catch {}
          }
        }
      }
      setIsLoading(false);
      if (fullText) speak(fullText);
    } catch (err) {
      setIsLoading(false);
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't connect. Please check your connection and try again." }]);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" /> Voice AI Coach
          </h1>
          <p className="text-muted-foreground mt-1">Speak naturally with your personal NutriAI diet coach.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { synthRef.current?.cancel(); setIsMuted(!isMuted); }} className="gap-2">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {isMuted ? "Unmute" : "Mute"}
        </Button>
      </div>

      {!supported && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
          Voice recognition is not supported in your browser. Please use Chrome or Edge for the full experience. You can still type your questions below.
        </div>
      )}

      {/* Chat area */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Personalized for {profile?.goal?.replace(/_/g, " ") || "your health goals"}
            {isSpeaking && <Badge variant="secondary" className="text-xs animate-pulse">Speaking...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    {msg.text || <span className="opacity-50 italic">Thinking...</span>}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-bl-sm p-3.5">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Transcript indicator */}
          {isListening && (
            <div className="mx-4 mb-2 p-3 bg-primary/5 rounded-xl border border-primary/20 text-sm text-muted-foreground italic min-h-10">
              {transcript || "Listening..."}
            </div>
          )}

          {/* Input row */}
          <div className="border-t p-4 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="Type or speak your question..."
              className="flex-1 h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} className="h-11 px-4">Send</Button>
            {supported && (
              <Button
                onClick={isListening ? stopListening : startListening}
                variant={isListening ? "destructive" : "outline"}
                className="h-11 w-11 p-0 flex-shrink-0"
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["What should I eat for breakfast?", "How much protein do I need?", "Give me a healthy snack idea", "Analyze my diet risks"].map(q => (
          <button key={q} onClick={() => sendMessage(q)} className="p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-left transition-all">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
