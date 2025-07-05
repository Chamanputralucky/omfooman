import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';

export const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex bg-gray-50 relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={closeSidebar} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface onToggleSidebar={toggleSidebar} />
      </div>
    </div>
  );
};