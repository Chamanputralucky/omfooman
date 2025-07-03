const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const OpenAI = require('openai');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models and services
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const Attachment = require('./models/Attachment');
const AuthToken = require('./models/AuthToken');
const FileUploadService = require('./services/fileUpload');
const FileParser = require('./services/fileParser');
const upload = require('./middleware/upload');
const SupabaseSessionStore = require('./middleware/sessionStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize session store
const sessionStore = new SupabaseSessionStore();
sessionStore.startCleanup();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    console.log('🔍 CORS check - Origin:', origin, 'Allowed:', allowedOrigins);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration with Supabase store
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'sessionId'
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Cookies:', req.headers.cookie);
  next();
});

// MCP Server Management
let mcpProcess = null;
let mcpReady = false;
let mcpStartTime = null;

const startMCPServer = async (userTokens = null) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('🚀 Starting MCP server...');
      
      if (mcpProcess) {
        console.log('⚠️ Killing existing MCP process...');
        mcpProcess.kill('SIGTERM');
        mcpProcess = null;
      }

      mcpReady = false;
      mcpStartTime = Date.now();

      const pythonPath = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(__dirname, 'mcp_toolkit.py');
      
      console.log('🐍 Python path:', pythonPath);
      console.log('📄 Script path:', scriptPath);

      const env = { ...process.env };
      
      // Add token data to environment if provided
      if (userTokens) {
        env.GOOGLE_ACCESS_TOKEN = userTokens.access_token;
        env.GOOGLE_REFRESH_TOKEN = userTokens.refresh_token;
        env.GOOGLE_ID_TOKEN = userTokens.id_token;
        env.GOOGLE_TOKEN_EXPIRES_AT = userTokens.expires_at;
        console.log('🔑 Added user tokens to MCP environment');
      }

      mcpProcess = spawn(pythonPath, [scriptPath], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let startupOutput = '';

      mcpProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log('📤 MCP stdout:', output.trim());
        
        if (output.includes('MCP server ready') || output.includes('Server running')) {
          mcpReady = true;
          console.log('✅ MCP server is ready!');
          resolve();
        }
      });

      mcpProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.log('📥 MCP stderr:', error.trim());
        
        if (error.includes('Error') || error.includes('Exception')) {
          console.error('❌ MCP server error:', error);
        }
      });

      mcpProcess.on('close', (code) => {
        console.log(`🔚 MCP process exited with code ${code}`);
        mcpReady = false;
        mcpProcess = null;
      });

      mcpProcess.on('error', (error) => {
        console.error('❌ Failed to start MCP process:', error);
        mcpReady = false;
        mcpProcess = null;
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!mcpReady) {
          console.log('⏰ MCP server startup timeout');
          console.log('Startup output:', startupOutput);
          resolve(); // Don't reject, just continue without MCP
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Error starting MCP server:', error);
      reject(error);
    }
  });
};

// Start MCP server on startup
startMCPServer().catch(console.error);

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Session:', req.session);
    
    if (!req.session || !req.session.userId) {
      console.log('❌ No session or userId found');
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Not authenticated' 
      });
    }

    // Get user from database
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log('❌ User not found in database');
      req.session.destroy();
      return res.status(401).json({ 
        authenticated: false, 
        error: 'User not found' 
      });
    }

    req.user = user;
    console.log('✅ User authenticated:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ 
      authenticated: false, 
      error: 'Authentication error' 
    });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  const mcpStatus = mcpReady ? 'ready' : 'not ready';
  const mcpUptime = mcpStartTime ? Math.floor((Date.now() - mcpStartTime) / 1000) : 0;
  
  res.json({
    status: 'ok',
    uptime: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    mcp: {
      status: mcpStatus,
      uptime: mcpUptime,
      processId: mcpProcess ? mcpProcess.pid : null
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// MCP status endpoint
app.get('/api/mcp/status', (req, res) => {
  res.json({
    ready: mcpReady,
    processId: mcpProcess ? mcpProcess.pid : null,
    uptime: mcpStartTime ? Math.floor((Date.now() - mcpStartTime) / 1000) : 0,
    startTime: mcpStartTime ? new Date(mcpStartTime).toISOString() : null
  });
});

// Restart MCP server
app.post('/api/mcp/restart', requireAuth, async (req, res) => {
  try {
    console.log('🔄 Restarting MCP server...');
    
    // Get user's tokens for MCP restart
    const userTokens = await AuthToken.findByUserId(req.user.id);
    
    await startMCPServer(userTokens);
    
    res.json({ 
      success: true, 
      message: 'MCP server restarted',
      ready: mcpReady 
    });
  } catch (error) {
    console.error('❌ Failed to restart MCP server:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Google OAuth routes
app.get('/auth/google', (req, res) => {
  console.log('🔗 Starting Google OAuth flow');
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar'
    ],
    prompt: 'consent'
  });
  
  console.log('🔗 Redirecting to:', authUrl);
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    console.log('📥 Google OAuth callback received');
    console.log('Query params:', req.query);
    
    const { code, error } = req.query;
    
    if (error) {
      console.error('❌ OAuth error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    const { tokens } = await client.getAccessToken(code);
    console.log('✅ Tokens received');

    // Get user info
    client.setCredentials(tokens);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    console.log('👤 User info:', {
      id: payload.sub,
      email: payload.email,
      name: payload.name
    });

    // Find or create user
    let user = await User.findByGoogleId(payload.sub);
    
    if (!user) {
      console.log('👤 Creating new user...');
      user = await User.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      });
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ Existing user found:', user.id);
      // Update user info
      user = await User.update(user.id, {
        name: payload.name,
        picture: payload.picture
      });
    }

    // Store or update tokens
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    
    try {
      const existingTokens = await AuthToken.findByUserId(user.id);
      if (existingTokens) {
        await AuthToken.update(user.id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingTokens.refresh_token,
          id_token: tokens.id_token,
          expires_at: expiresAt
        });
      } else {
        await AuthToken.create({
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token,
          expiresAt
        });
      }
      console.log('✅ Tokens stored in database');
    } catch (tokenError) {
      console.error('❌ Error storing tokens:', tokenError);
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    console.log('✅ Session created for user:', user.email);

    // Restart MCP server with new tokens
    try {
      const userTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        id_token: tokens.id_token,
        expires_at: expiresAt
      };
      
      await startMCPServer(userTokens);
      console.log('✅ MCP server restarted with user tokens');
    } catch (mcpError) {
      console.error('⚠️ MCP server restart failed:', mcpError);
    }

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const userParam = encodeURIComponent(JSON.stringify(req.session.user));
    res.redirect(`${frontendUrl}/login?success=true&user=${userParam}`);

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
  }
});

// Check authentication status
app.get('/auth/user', (req, res) => {
  console.log('🔍 Checking auth status - Session:', req.session);
  
  if (req.session && req.session.userId && req.session.user) {
    console.log('✅ User is authenticated:', req.session.user.email);
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    console.log('❌ User is not authenticated');
    res.json({
      authenticated: false,
      user: null
    });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  console.log('👋 Logging out user');
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('sessionId');
    console.log('✅ User logged out successfully');
    res.json({ success: true });
  });
});

// Chat routes
app.post('/api/chat', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('💬 Chat request received');
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0);
    
    const { message, chatId, model = 'gpt-4', enabledTools = [] } = req.body;
    const files = req.files || [];
    
    if (!message && files.length === 0) {
      return res.status(400).json({ error: 'Message or files required' });
    }

    let currentChat;
    
    // Get or create chat
    if (chatId && chatId !== 'new') {
      currentChat = await Chat.findById(chatId);
      if (!currentChat || currentChat.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Chat not found' });
      }
    } else {
      // Create new chat
      const chatTitle = message ? 
        message.substring(0, 50) + (message.length > 50 ? '...' : '') : 
        'File Upload';
      
      currentChat = await Chat.create(req.user.id, chatTitle);
      console.log('✅ New chat created:', currentChat.id);
    }

    // Handle file uploads
    let attachmentData = [];
    let fileContents = [];
    
    if (files.length > 0) {
      console.log(`📎 Processing ${files.length} file(s)...`);
      
      for (const file of files) {
        try {
          // Upload file to Supabase
          const uploadResult = await FileUploadService.uploadFile(file, req.user.id);
          
          // Create attachment record
          const attachment = await Attachment.create({
            messageId: null, // Will be updated after message creation
            userId: req.user.id,
            filename: uploadResult.filename,
            originalName: uploadResult.originalName,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize,
            storagePath: uploadResult.storagePath
          });
          
          attachmentData.push(attachment);
          
          // Parse file content
          const content = await FileParser.parseFile(
            uploadResult.storagePath,
            uploadResult.mimeType,
            uploadResult.originalName
          );
          
          fileContents.push({
            filename: uploadResult.originalName,
            content: content
          });
          
          console.log(`✅ File processed: ${uploadResult.originalName}`);
        } catch (fileError) {
          console.error(`❌ Error processing file ${file.originalname}:`, fileError);
          fileContents.push({
            filename: file.originalname,
            content: `Error processing file: ${fileError.message}`
          });
        }
      }
    }

    // Create user message
    const userMessage = await Message.create({
      chatId: currentChat.id,
      userId: req.user.id,
      role: 'user',
      content: message || 'File upload',
      attachments: attachmentData.map(att => ({
        id: att.id,
        filename: att.filename,
        original_name: att.original_name,
        mime_type: att.mime_type,
        file_size: att.file_size,
        storage_path: att.storage_path
      }))
    });

    // Update attachment records with message ID
    for (const attachment of attachmentData) {
      await Attachment.update(attachment.id, { message_id: userMessage.id });
    }

    // Prepare message for OpenAI
    let fullMessage = message || '';
    
    if (fileContents.length > 0) {
      fullMessage += '\n\nAttached files:\n';
      fileContents.forEach(file => {
        fullMessage += `\n--- ${file.filename} ---\n${file.content}\n`;
      });
    }

    // Get available tools
    const availableTools = getAvailableTools();
    const toolsToUse = enabledTools.length > 0 ? 
      availableTools.filter(tool => enabledTools.includes(tool.function.name)) : 
      availableTools;

    console.log(`🛠️ Using ${toolsToUse.length} tools:`, toolsToUse.map(t => t.function.name));

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant with access to Google Workspace tools (Drive, Gmail, Calendar). 
          
When users upload files, analyze them thoroughly and provide insights. For images, describe what you see. For documents, summarize the content and answer questions about it.

You have access to these Google Workspace capabilities:
- Google Drive: Search, read, create, edit, and share files
- Gmail: Send emails, read messages, manage labels  
- Google Calendar: Create events, check availability, manage schedules

Always be helpful, accurate, and provide actionable responses. When using tools, explain what you're doing and why.`
        },
        {
          role: 'user',
          content: fullMessage
        }
      ],
      tools: toolsToUse,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000
    });

    let response = completion.choices[0].message.content;
    let toolsUsed = [];

    // Handle tool calls
    if (completion.choices[0].message.tool_calls) {
      console.log('🛠️ Processing tool calls...');
      
      for (const toolCall of completion.choices[0].message.tool_calls) {
        try {
          const result = await executeToolCall(toolCall, req.user.id);
          toolsUsed.push(toolCall.function.name);
          
          // Add tool result to response
          response += `\n\n[Tool: ${toolCall.function.name}]\n${result}`;
        } catch (toolError) {
          console.error('❌ Tool execution error:', toolError);
          response += `\n\n[Tool Error: ${toolCall.function.name}] ${toolError.message}`;
        }
      }
    }

    // Create assistant message
    await Message.create({
      chatId: currentChat.id,
      userId: req.user.id,
      role: 'assistant',
      content: response,
      model: model,
      toolsUsed: toolsUsed
    });

    // Update chat timestamp
    await Chat.update(currentChat.id, { updated_at: new Date().toISOString() });

    console.log('✅ Chat response sent');
    
    res.json({
      response: response,
      chatId: currentChat.id,
      model: model,
      toolsUsed: toolsUsed,
      attachments: attachmentData
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Get chat by ID
app.get('/api/chat/:chatId', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chatWithMessages = await Chat.getWithMessages(chatId, req.user.id);
    
    if (!chatWithMessages) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json(chatWithMessages);
  } catch (error) {
    console.error('❌ Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

// Get user's chats
app.get('/api/chats/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own chats
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const chats = await Chat.findByUserId(userId);
    
    res.json({ chats });
  } catch (error) {
    console.error('❌ Get chats error:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// Delete chat
app.delete('/api/chat/:chatId', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Verify chat ownership
    const chat = await Chat.findById(chatId);
    if (!chat || chat.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Delete the chat (messages will be deleted by cascade)
    await Chat.delete(chatId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Get available tools
app.get('/api/tools', (req, res) => {
  const tools = getAvailableTools();
  res.json({ tools });
});

// Update tool preferences
app.put('/api/tools/preferences', requireAuth, async (req, res) => {
  try {
    const { enabledTools } = req.body;
    
    await User.updatePreferences(req.user.id, {
      enabled_tools: enabledTools
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Update tool preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Attachment download
app.get('/api/attachments/:attachmentId/download', requireAuth, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    
    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Get signed URL for download
    const signedUrl = await Attachment.getSignedUrl(attachment.storage_path);
    
    res.redirect(signedUrl);
  } catch (error) {
    console.error('❌ Download attachment error:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Helper functions

function getAvailableTools() {
  return [
    {
      type: "function",
      function: {
        name: "drive_search_files",
        description: "Search for files in Google Drive by name, content, or type",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for files"
            },
            file_type: {
              type: "string",
              description: "Filter by file type (e.g., 'document', 'spreadsheet', 'pdf')"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "drive_read_file",
        description: "Read the content of a file from Google Drive",
        parameters: {
          type: "object",
          properties: {
            file_id: {
              type: "string",
              description: "The ID of the file to read"
            }
          },
          required: ["file_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "drive_create_file",
        description: "Create a new file in Google Drive",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the file to create"
            },
            content: {
              type: "string",
              description: "Content of the file"
            },
            file_type: {
              type: "string",
              description: "Type of file to create ('document', 'spreadsheet', 'text')"
            }
          },
          required: ["name", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "drive_share_file",
        description: "Share a Google Drive file with specific users",
        parameters: {
          type: "object",
          properties: {
            file_id: {
              type: "string",
              description: "The ID of the file to share"
            },
            email: {
              type: "string",
              description: "Email address to share with"
            },
            role: {
              type: "string",
              description: "Permission level ('reader', 'writer', 'commenter')"
            }
          },
          required: ["file_id", "email"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "gmail_send_email",
        description: "Send an email via Gmail",
        parameters: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient email address"
            },
            subject: {
              type: "string",
              description: "Email subject"
            },
            body: {
              type: "string",
              description: "Email body content"
            },
            cc: {
              type: "string",
              description: "CC email addresses (comma-separated)"
            }
          },
          required: ["to", "subject", "body"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "gmail_search_emails",
        description: "Search for emails in Gmail",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Gmail search query (e.g., 'from:user@example.com', 'subject:meeting')"
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "gmail_read_email",
        description: "Read the content of a specific email",
        parameters: {
          type: "object",
          properties: {
            message_id: {
              type: "string",
              description: "The ID of the email message to read"
            }
          },
          required: ["message_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calendar_create_event",
        description: "Create a new calendar event",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Event title"
            },
            start_time: {
              type: "string",
              description: "Start time in ISO format (e.g., '2024-01-15T10:00:00')"
            },
            end_time: {
              type: "string",
              description: "End time in ISO format"
            },
            description: {
              type: "string",
              description: "Event description"
            },
            attendees: {
              type: "string",
              description: "Comma-separated list of attendee email addresses"
            }
          },
          required: ["title", "start_time", "end_time"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calendar_list_events",
        description: "List upcoming calendar events",
        parameters: {
          type: "object",
          properties: {
            days_ahead: {
              type: "number",
              description: "Number of days ahead to look for events"
            },
            max_results: {
              type: "number",
              description: "Maximum number of events to return"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calendar_check_availability",
        description: "Check calendar availability for a specific time range",
        parameters: {
          type: "object",
          properties: {
            start_time: {
              type: "string",
              description: "Start time in ISO format"
            },
            end_time: {
              type: "string",
              description: "End time in ISO format"
            }
          },
          required: ["start_time", "end_time"]
        }
      }
    }
  ];
}

async function executeToolCall(toolCall, userId) {
  if (!mcpReady) {
    throw new Error('MCP server is not ready. Please try again in a moment.');
  }

  return new Promise((resolve, reject) => {
    try {
      const request = {
        method: 'tools/call',
        params: {
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments)
        }
      };

      console.log('🛠️ Executing tool call:', request);

      mcpProcess.stdin.write(JSON.stringify(request) + '\n');

      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, 30000);

      const onData = (data) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.result) {
              clearTimeout(timeout);
              mcpProcess.stdout.removeListener('data', onData);
              resolve(response.result.content || response.result);
              return;
            } else if (response.error) {
              clearTimeout(timeout);
              mcpProcess.stdout.removeListener('data', onData);
              reject(new Error(response.error.message || 'Tool execution failed'));
              return;
            }
          }
        } catch (parseError) {
          // Continue collecting data
        }
      };

      mcpProcess.stdout.on('data', onData);

    } catch (error) {
      console.error('❌ Tool execution error:', error);
      reject(error);
    }
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔚 SIGTERM received, shutting down gracefully');
  
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔚 SIGINT received, shutting down gracefully');
  
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Set' : 'Not set'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});