/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader, 
  Upload, 
  FileText,
  Image,
  Download,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { API_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';

const AIAssistant = ({ 
  isOpen, 
  onClose, 
  userRole = 'doctor', 
  patientId = null, 
  patientName = null 
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  // Initialize with welcome message and conversation context
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = userRole === 'doctor' 
        ? `Hello Dr. ${user?.name || 'Doctor'}! I'm your AI Assistant specialized for medical professionals. I can help you with:
        
• Patient information and medical records analysis
• Clinical insights and treatment recommendations  
• Appointment management and scheduling
• Medical documentation and report generation
• Diagnosis support and medical terminology
• Patient care coordination

How can I assist you with your medical practice today?`
        : `Hello ${patientName || 'Patient'}! I'm your AI Assistant designed to help you understand your health information. I can assist you with:

• Explaining your medical reports in simple terms
• Understanding medications and treatments
• Health education and wellness tips
• Appointment scheduling and reminders
• Organizing your personal health records
• General health questions and guidance

What would you like to know about your health today?`;
      
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
      
      // Initialize conversation context
      setConversationContext({
        userRole,
        patientId,
        patientName,
        sessionStart: new Date(),
        topics: [],
        preferences: {}
      });
    }
  }, [isOpen, userRole, user?.name, patientName, patientId, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE}/ai/ask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: inputMessage.trim(),
          userRole: userRole,
          conversationContext: conversationContext,
          ...(patientId && { patientId })
        })
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          metadata: {
            language: data.language,
            responseType: data.responseType,
            structuredData: data.structuredData,
            documentMetadata: data.documentMetadata,
            data: data.data
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update conversation context with new topics and preferences
        setConversationContext(prev => ({
          ...prev,
          topics: [...(prev.topics || []), inputMessage.trim()],
          lastInteraction: new Date(),
          preferences: {
            ...prev.preferences,
            ...(data.preferences || {})
          }
        }));
      } else {
        throw new Error(data.message || 'AI request failed');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just show a message about file upload
      // In a full implementation, you'd upload the file and send it to the AI
      const fileMessage = {
        id: Date.now(),
        type: 'user',
        content: `📎 Uploaded file: ${file.name}`,
        timestamp: new Date(),
        isFile: true
      };
      setMessages(prev => [...prev, fileMessage]);
    }
  };

  const getQuickActions = () => {
    if (userRole === 'doctor') {
      return [
        { icon: Users, label: 'My Patients', action: 'Show me my active patients and their recent activity' },
        { icon: Calendar, label: 'Today\'s Schedule', action: 'What are my appointments for today and any urgent cases?' },
        { icon: FileText, label: 'Recent Reports', action: 'Show me recent medical reports that need my attention' },
        { icon: AlertCircle, label: 'Critical Cases', action: 'Show me patients with critical conditions or urgent follow-ups' },
        { icon: Bot, label: 'Clinical Insights', action: 'Help me analyze patient data and provide clinical recommendations' },
        { icon: CheckCircle, label: 'Treatment Plans', action: 'Assist me in creating or reviewing treatment plans' }
      ];
    } else {
      return [
        { icon: FileText, label: 'My Health Records', action: 'Show me my medical reports and explain them in simple terms' },
        { icon: Calendar, label: 'My Appointments', action: 'What are my upcoming appointments and what should I prepare?' },
        { icon: Download, label: 'Download Records', action: 'Help me download and organize my medical records' },
        { icon: CheckCircle, label: 'Health Summary', action: 'Give me a comprehensive summary of my health status' },
        { icon: Bot, label: 'Health Tips', action: 'Provide me with personalized health tips and wellness advice' },
        { icon: AlertCircle, label: 'Medication Info', action: 'Help me understand my medications and their side effects' }
      ];
    }
  };

  const handleQuickAction = (action) => {
    setInputMessage(action);
    handleSendMessage();
  };

  const formatMessage = (message) => {
    if (message.metadata?.structuredData) {
      return (
        <div className="space-y-2">
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.metadata.data && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {message.metadata.title || 'Related Information'}
              </h4>
              <div className="space-y-2">
                {message.metadata.data.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-blue-600 dark:text-blue-300 ml-2">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Chat Panel */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Assistant</h3>
              <p className="text-white/80 text-sm">
                {userRole === 'doctor' ? 'Doctor Assistant' : 'Patient Assistant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isError
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'assistant' && !message.isError && (
                    <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {formatMessage(message)}
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {getQuickActions().map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.action)}
                  className="flex items-center space-x-2 p-3 text-xs bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-800/30 dark:hover:to-blue-800/30 rounded-lg transition-all duration-200 border border-purple-200 dark:border-purple-700"
                >
                  <action.icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Upload className="h-4 w-4" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
