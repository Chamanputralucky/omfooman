import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Paperclip, Settings, X, FileText, Image, File, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { ToolsPanel } from './ToolsPanel';
import { ModelSelector } from './ModelSelector';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { chatAPI } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  model?: string;
  tools_used?: string[];
  attachments?: Array<{
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    storage_path: string;
  }>;
}

interface AttachmentPreview {
  file: File;
  id: string;
  preview?: string;
}

interface ChatInterfaceProps {
  onToggleSidebar?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onToggleSidebar }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    selectedModel,
    enabledTools,
    setCurrentChatId,
    refreshChats
  } = useChatStore();
  const { user } = useAuthStore();

  // Load chat messages when chatId changes
  useEffect(() => {
    if (chatId && chatId !== 'new') {
      loadChatMessages();
      setCurrentChatId(chatId);
    } else {
      setMessages([]);
      setCurrentChatId(null);
    }
  }, [chatId, setCurrentChatId]);

  const loadChatMessages = async () => {
    try {
      const response = await chatAPI.getChat(chatId!);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const attachment: AttachmentPreview = { file, id };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, attachment]);
      }
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to render message content with proper link handling
  const renderMessageContent = (content: string) => {
    // Split content by URLs and render them as links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index} className="whitespace-pre-wrap break-words">{part}</span>;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
      attachments: attachments.map(att => ({
        id: att.id,
        filename: att.file.name,
        original_name: att.file.name,
        mime_type: att.file.type,
        file_size: att.file.size,
        storage_path: ''
      }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('message', input.trim());
      formData.append('model', selectedModel);
      formData.append('enabledTools', JSON.stringify(enabledTools));
      if (chatId && chatId !== 'new') {
        formData.append('chatId', chatId);
      }
      
      // Add attachments to form data
      attachments.forEach(attachment => {
        formData.append('attachments', attachment.file);
      });

      const response = await chatAPI.sendMessageWithAttachments(formData);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        created_at: new Date().toISOString(),
        model: response.data.model,
        tools_used: response.data.toolsUsed || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // If this was a new chat, navigate to the chat URL and refresh sidebar
      if (response.data.chatId && (!chatId || chatId === 'new')) {
        navigate(`/chat/${response.data.chatId}`, { replace: true });
        setCurrentChatId(response.data.chatId);
        // Refresh the chat list in the sidebar
        refreshChats();
      }
      
      // Clear attachments after successful send
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            icon={Menu}
            onClick={onToggleSidebar}
            className="lg:hidden"
          />
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {chatId && chatId !== 'new' ? 'Chat' : 'New Chat'}
          </h1>
          <div className="hidden sm:block">
            <ModelSelector />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="sm:hidden">
            <ModelSelector />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Settings}
            onClick={() => setShowToolsPanel(!showToolsPanel)}
            className={showToolsPanel ? 'bg-gray-100' : ''}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="max-w-md">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
                  Where would you like to start?
                </h2>
                <p className="text-gray-600 mb-6 lg:mb-8 text-sm lg:text-base">
                  I can help you with Google Drive, Gmail, Calendar, file analysis, and more. Just ask me anything or upload a file!
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg text-left">
                    <strong>📄 File Analysis:</strong> Upload PDFs, Word docs, images, or text files for analysis
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-left">
                    <strong>📧 Email Management:</strong> Send emails, search Gmail, manage your inbox
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-left">
                    <strong>📅 Calendar:</strong> Schedule meetings, check availability, manage events
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-left">
                    <strong>💾 Google Drive:</strong> Search files, create documents, share content
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="break-words overflow-wrap-anywhere">
                      {renderMessageContent(message.content)}
                    </div>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment) => {
                          const IconComponent = getFileIcon(attachment.mime_type);
                          return (
                            <div
                              key={attachment.id}
                              className={`flex items-center space-x-2 p-2 rounded-lg ${
                                message.role === 'user' ? 'bg-gray-800' : 'bg-gray-200'
                              }`}
                            >
                              <IconComponent className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm truncate flex-1 min-w-0">{attachment.original_name}</span>
                              <span className="text-xs opacity-70 flex-shrink-0">
                                {formatFileSize(attachment.file_size)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Message metadata */}
                    <div
                      className={`text-xs mt-2 flex flex-wrap items-center gap-2 ${
                        message.role === 'user' ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                      {message.model && (
                        <span>• {message.model}</span>
                      )}
                      {message.tools_used && message.tools_used.length > 0 && (
                        <span className="break-all">• Tools: {message.tools_used.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Tools Panel */}
        {showToolsPanel && (
          <div className="hidden lg:block">
            <ToolsPanel onClose={() => setShowToolsPanel(false)} />
          </div>
        )}
      </div>

      {/* Mobile Tools Panel Overlay */}
      {showToolsPanel && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowToolsPanel(false)}>
          <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <ToolsPanel onClose={() => setShowToolsPanel(false)} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Attachment Previews */}
          {attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative bg-gray-100 rounded-lg p-2 flex items-center space-x-2 max-w-xs"
                >
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-8 h-8 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <File className="w-8 h-8 text-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end space-x-2 lg:space-x-3 bg-gray-50 rounded-2xl p-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Paperclip}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              />
              
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What do you want to know? You can also upload files for analysis..."
                  className="w-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500 max-h-[120px] text-sm lg:text-base"
                  rows={1}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 hidden sm:block"
                  onClick={() => setShowToolsPanel(!showToolsPanel)}
                >
                  Tools
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={(!input.trim() && attachments.length === 0) || loading}
                  className="bg-gray-900 text-white hover:bg-gray-800 rounded-full w-8 h-8 p-0 flex-shrink-0"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};