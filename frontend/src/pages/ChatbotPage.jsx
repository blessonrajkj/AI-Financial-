import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User, Mic, MicOff, Sparkles } from 'lucide-react';
import { API_URL } from '../services/api';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your PariView AI Financial Assistant. Ask me anything about your transactions, budgets, or savings goals! Try checking 'What is my budget status?'"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    "What is my current net worth?",
    "Am I overspending on food?",
    "Give me budget tips",
    "List my recent transactions"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/ai/chat`, {
        message: text
      });
      // Add bot response
      setMessages(prev => [...prev, { sender: 'bot', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I am having trouble connecting to my brain right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // Web Speech API Voice entry handler
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Try Chrome/Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-10rem)] flex flex-col bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
      {/* Bot Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-background border-b border-borderColor flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-textPrimary">PariView AI Assistant</h3>
            <p className="text-[10px] text-success font-semibold flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse"></span>Active</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-textMuted bg-primary/5 px-2.5 py-1 rounded-full border border-primary/15 text-[10px] font-bold">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Powered by Gemini</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
        {messages.map((msg, index) => {
          const isBot = msg.sender === 'bot';
          return (
            <div key={index} className={`flex items-start space-x-2.5 sm:space-x-3 max-w-[90%] sm:max-w-[80%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse space-x-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${isBot ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}`}>
                {isBot ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${isBot ? 'bg-background border border-borderColor text-textPrimary rounded-tl-none' : 'bg-primary text-white shadow-md shadow-primary/15 rounded-tr-none'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-start space-x-3 mr-auto">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl rounded-tl-none flex space-x-1.5 items-center justify-center">
              <div className="w-2.5 h-2.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-textMuted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div className="px-3.5 sm:px-6 py-2 flex flex-wrap gap-1.5 sm:gap-2">
          {suggestionChips.map(chip => (
            <button 
              key={chip} 
              onClick={() => handleSendMessage(chip)}
              className="px-3 py-1.5 bg-background border border-borderColor hover:border-primary/40 hover:text-primary text-textSecondary text-xs font-semibold rounded-full transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 sm:p-4 bg-background border-t border-borderColor">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center space-x-3 bg-cardBg border border-borderColor rounded-2xl p-2 pr-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or ask a financial question..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-textPrimary placeholder-textMuted focus:outline-none"
          />
          
          <button 
            type="button"
            onClick={handleVoiceInput}
            className={`p-2 rounded-xl border border-borderColor transition-all ${isListening ? 'bg-danger text-white border-danger animate-pulse' : 'text-textSecondary hover:text-textPrimary bg-background'}`}
            title="Voice input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button 
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-primary hover:bg-primaryHover text-white rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotPage;