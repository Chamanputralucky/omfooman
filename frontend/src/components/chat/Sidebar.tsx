import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  FolderOpen,
  User,
  LogOut,
  Trash2,
  X,
  Folder,
  Edit3,
  Check,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { authAPI, chatAPI } from '../../services/api';

interface Chat {
  id: string;
  title: string;
  updated_at: string;
  project_id?: string;
}

interface Project {
  id: string;
  name: string;
  chats: Chat[];
  expanded: boolean;
}

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const { chatId } = useParams();
  const { user, logout } = useAuthStore();
  const { clearMessages, refreshTrigger } = useChatStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  useEffect(() => {
    if (user) {
      loadChatsAndProjects();
    }
  }, [user, refreshTrigger]);

  const loadChatsAndProjects = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getUserChats(user!.id);
      const allChats = response.data.chats || [];
      
      // Get projects from localStorage (frontend-only storage)
      const savedProjects = JSON.parse(localStorage.getItem('chatProjects') || '[]');
      
      // Group chats by project
      const projectMap = new Map<string, Project>();
      
      // Initialize saved projects
      savedProjects.forEach((proj: any) => {
        projectMap.set(proj.id, {
          id: proj.id,
          name: proj.name,
          chats: [],
          expanded: proj.expanded !== false // Default to expanded
        });
      });
      
      // Add default "Unorganized" project
      if (!projectMap.has('unorganized')) {
        projectMap.set('unorganized', {
          id: 'unorganized',
          name: 'Unorganized',
          chats: [],
          expanded: true
        });
      }
      
      // Get chat-project assignments from localStorage
      const chatAssignments = JSON.parse(localStorage.getItem('chatAssignments') || '{}');
      
      // Assign chats to projects
      allChats.forEach((chat: Chat) => {
        const projectId = chatAssignments[chat.id] || 'unorganized';
        const project = projectMap.get(projectId);
        if (project) {
          project.chats.push(chat);
        } else {
          // If project doesn't exist, add to unorganized
          projectMap.get('unorganized')!.chats.push(chat);
        }
      });
      
      setChats(allChats);
      setProjects(Array.from(projectMap.values()));
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProjectsToStorage = (updatedProjects: Project[]) => {
    const projectsToSave = updatedProjects
      .filter(p => p.id !== 'unorganized')
      .map(p => ({ id: p.id, name: p.name, expanded: p.expanded }));
    localStorage.setItem('chatProjects', JSON.stringify(projectsToSave));
  };

  const saveChatAssignments = (assignments: Record<string, string>) => {
    localStorage.setItem('chatAssignments', JSON.stringify(assignments));
  };

  const createProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      chats: [],
      expanded: true
    };
    
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    
    setNewProjectName('');
    setShowNewProject(false);
  };

  const updateProjectName = (projectId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, name: newName.trim() } : p
    );
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    
    setEditingProject(null);
    setEditProjectName('');
  };

  const deleteProject = (projectId: string) => {
    if (projectId === 'unorganized') return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // Move all chats from this project to unorganized
    const chatAssignments = JSON.parse(localStorage.getItem('chatAssignments') || '{}');
    project.chats.forEach(chat => {
      chatAssignments[chat.id] = 'unorganized';
    });
    saveChatAssignments(chatAssignments);
    
    // Remove project
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    
    // Reload to reflect changes
    loadChatsAndProjects();
  };

  const toggleProjectExpanded = (projectId: string) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, expanded: !p.expanded } : p
    );
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  };

  const moveChatToProject = (chatId: string, targetProjectId: string) => {
    const chatAssignments = JSON.parse(localStorage.getItem('chatAssignments') || '{}');
    chatAssignments[chatId] = targetProjectId;
    saveChatAssignments(chatAssignments);
    loadChatsAndProjects();
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      clearMessages();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNewChat = () => {
    clearMessages();
    if (onClose) onClose(); // Close sidebar on mobile
  };

  const handleDeleteChat = async (chatIdToDelete: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await chatAPI.deleteChat(chatIdToDelete);
        
        // Remove from chat assignments
        const chatAssignments = JSON.parse(localStorage.getItem('chatAssignments') || '{}');
        delete chatAssignments[chatIdToDelete];
        saveChatAssignments(chatAssignments);
        
        loadChatsAndProjects();
        
        // If we're currently viewing the deleted chat, redirect to new chat
        if (chatId === chatIdToDelete) {
          window.location.href = '/chat';
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    }
  };

  const formatChatTitle = (title: string) => {
    return title.length > 25 ? title.substring(0, 25) + '...' : title;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const menuItems = [
    { icon: Settings, label: 'MCP Configuration', path: '/config' },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mr-3">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-lg font-semibold text-gray-900">mcp/chat-bot</span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              className="lg:hidden"
            />
          )}
        </div>
        
        <Button
          onClick={handleNewChat}
          className="w-full"
          icon={Plus}
          variant="outline"
        >
          New Chat
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <nav className="space-y-2 mb-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${location.pathname === item.path
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Projects Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Projects
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewProject(true)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {showNewProject && (
            <div className="mb-3 p-2 bg-white rounded-lg border">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="mb-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createProject();
                  if (e.key === 'Escape') {
                    setShowNewProject(false);
                    setNewProjectName('');
                  }
                }}
                autoFocus
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={createProject} disabled={!newProjectName.trim()}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.id} className="space-y-1">
                  {/* Project Header */}
                  <div className="flex items-center justify-between group">
                    <button
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="flex items-center flex-1 text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      {project.expanded ? (
                        <ChevronDown className="w-3 h-3 mr-1 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 mr-1 text-gray-400" />
                      )}
                      <Folder className="w-3 h-3 mr-2 text-gray-500" />
                      {editingProject === project.id ? (
                        <Input
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="text-xs h-6"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateProjectName(project.id, editProjectName);
                            if (e.key === 'Escape') {
                              setEditingProject(null);
                              setEditProjectName('');
                            }
                          }}
                          onBlur={() => updateProjectName(project.id, editProjectName)}
                          autoFocus
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-700 truncate">
                          {project.name} ({project.chats.length})
                        </span>
                      )}
                    </button>
                    
                    {project.id !== 'unorganized' && (
                      <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingProject(project.id);
                            setEditProjectName(project.name);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Project Chats */}
                  {project.expanded && (
                    <div className="ml-4 space-y-1">
                      {project.chats.length === 0 ? (
                        <p className="text-xs text-gray-400 px-2 py-1">No chats yet</p>
                      ) : (
                        project.chats.slice(0, 10).map((chat) => (
                          <div
                            key={chat.id}
                            className={`group relative flex items-center rounded-lg transition-colors ${
                              chatId === chat.id 
                                ? 'bg-gray-200 text-gray-900' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Link
                              to={`/chat/${chat.id}`}
                              onClick={onClose}
                              className="flex-1 min-w-0 block px-2 py-1"
                            >
                              <div className="text-xs font-medium truncate">
                                {formatChatTitle(chat.title)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(chat.updated_at)}
                              </div>
                            </Link>
                            
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pr-2">
                              {/* Move to project dropdown */}
                              <select
                                value={project.id}
                                onChange={(e) => moveChatToProject(chat.id, e.target.value)}
                                className="text-xs bg-transparent border-none text-gray-400 hover:text-gray-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {projects.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              
                              <button
                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      {project.chats.length > 10 && (
                        <div className="text-xs text-gray-500 px-2 py-1">
                          And {project.chats.length - 10} more chats...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            icon={LogOut}
            className="ml-2 flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
};