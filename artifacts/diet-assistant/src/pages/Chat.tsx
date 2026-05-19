import { useState, useEffect, useRef } from "react";
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useListOpenaiMessages 
} from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Send, Bot, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const headers = { request: { headers: getAuthHeaders() } };
  
  const { data: conversations, refetch: refetchConvos } = useListOpenaiConversations(headers);
  const createConvo = useCreateOpenaiConversation(headers);
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set active ID to newest if none selected
  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const { data: historyMessages, isLoading: historyLoading } = useListOpenaiMessages(activeId as number, {
    ...headers,
    query: { enabled: !!activeId }
  });

  const { messages: streamMessages, sendMessage, isStreaming, setMessages: setStreamMessages } = useChatStream(activeId);

  // Sync history with stream state when history changes
  useEffect(() => {
    if (historyMessages && !isStreaming) {
      setStreamMessages(historyMessages.map(m => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content
      })));
    }
  }, [historyMessages, isStreaming, setStreamMessages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamMessages]);

  const handleCreateNew = () => {
    createConvo.mutate({ data: { title: "New Diet Chat" } }, {
      onSuccess: (data) => {
        refetchConvos();
        setActiveId(data.id);
        setStreamMessages([]);
      }
    });
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    // Create convo on first message if none exists
    if (!activeId) {
      createConvo.mutate({ data: { title: input.substring(0, 30) + "..." } }, {
        onSuccess: (data) => {
          refetchConvos();
          setActiveId(data.id);
          sendMessage(input);
          setInput("");
        }
      });
      return;
    }

    sendMessage(input);
    setInput("");
  };

  const quickQuestions = [
    "Healthy snacks under 200 calories?",
    "High protein vegetarian dinner ideas?",
    "How to reduce sugar cravings?"
  ];

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      
      {/* Sidebar - Convo List */}
      <Card className="md:w-72 flex flex-col border-0 shadow-lg shadow-black/5 bg-card/80 backdrop-blur shrink-0 overflow-hidden">
        <div className="p-4 border-b">
          <Button onClick={handleCreateNew} className="w-full justify-start rounded-xl" variant="secondary">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                activeId === conv.id ? 'bg-primary text-primary-foreground font-medium shadow-md' : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <div className="truncate">{conv.title}</div>
              <div className="text-[10px] opacity-70 mt-1">{format(parseISO(conv.createdAt), 'MMM d, h:mm a')}</div>
            </button>
          ))}
          {conversations?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-0 shadow-xl shadow-black/5 bg-card overflow-hidden relative">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {streamMessages.length === 0 && !historyLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">AI Nutrition Expert</h2>
              <p className="text-muted-foreground mb-8">Ask me anything about food, calories, meal planning, or healthy alternatives.</p>
              
              <div className="flex flex-wrap justify-center gap-2">
                {quickQuestions.map(q => (
                  <button 
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="bg-secondary text-secondary-foreground text-sm py-2 px-4 rounded-full border border-transparent hover:border-primary transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {streamMessages.map((msg, i) => (
              <motion.div 
                key={msg.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4"/> : <Bot className="w-4 h-4"/>}
                </div>
                <div className={`max-w-[85%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-secondary/50 border rounded-tl-sm text-foreground prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-background/50'
                }`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content || (isStreaming && i === streamMessages.length - 1 ? '...' : '')}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isStreaming && (
            <div className="flex gap-2 items-center text-muted-foreground text-sm p-4">
              <Bot className="w-4 h-4 animate-bounce" /> AI is typing...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/50 backdrop-blur-md border-t">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex items-center">
            <Input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about calories, recipes, or nutrition..."
              className="pr-14 h-14 rounded-2xl bg-card border-border shadow-sm text-base focus-visible:ring-primary/20"
              disabled={isStreaming}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-2 h-10 w-10 rounded-xl"
              disabled={!input.trim() || isStreaming}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
          <div className="text-center mt-2 text-xs text-muted-foreground opacity-70">
            AI can make mistakes. Always consult a real doctor for medical advice.
          </div>
        </div>
      </Card>

    </div>
  );
}
