import { useState, useRef } from "react";
import { getAuthToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiMessagesQueryKey } from "@workspace/api-client-react";

type Message = {
  id: number | string;
  role: string;
  content: string;
};

export function useChatStream(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return;

    // Add optimistic user message
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();
    
    setMessages(prev => [
      ...prev, 
      { id: userMsgId, role: "user", content },
      { id: assistantMsgId, role: "assistant", content: "" }
    ]);

    setIsStreaming(true);

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                // Done streaming
                break;
              } else if (data.content) {
                // Append text
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId 
                    ? { ...msg, content: msg.content + data.content } 
                    : msg
                ));
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat streaming error:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId 
          ? { ...msg, content: "Sorry, I encountered an error connecting to the AI." } 
          : msg
      ));
    } finally {
      setIsStreaming(false);
      // Invalidate to fetch actual persisted messages next time
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(conversationId) });
    }
  };

  return { messages, setMessages, sendMessage, isStreaming };
}
