const { EventEmitter } = require('events');
const Session = require('../models/Session');
const supabase = require('../config/supabase');

class SupabaseSessionStore extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // In-memory cache for performance
  }

  async get(sessionId, callback) {
    try {
      console.log(`📋 Getting session: ${sessionId}`);
      
      // First check in-memory cache
      if (this.sessions.has(sessionId)) {
        const cachedSession = this.sessions.get(sessionId);
        if (cachedSession.expires > Date.now()) {
          console.log(`✅ Session found in cache: ${sessionId}`);
          return callback(null, cachedSession.data);
        } else {
          this.sessions.delete(sessionId);
        }
      }

      // Check database
      const sessionRecord = await Session.findById(sessionId);
      if (sessionRecord && sessionRecord.session_data) {
        console.log(`✅ Session found in database: ${sessionId}`);
        
        // Cache in memory
        this.sessions.set(sessionId, {
          data: sessionRecord.session_data,
          expires: new Date(sessionRecord.expires_at).getTime()
        });
        
        // Return the session data directly
        callback(null, sessionRecord.session_data);
      } else {
        console.log(`❌ Session not found: ${sessionId}`);
        callback(null, null);
      }
    } catch (error) {
      console.error('Session get error:', error);
      callback(error);
    }
  }

  async set(sessionId, sessionData, callback) {
    try {
      console.log(`💾 Setting session: ${sessionId}`);
      
      // Update in-memory cache
      this.sessions.set(sessionId, {
        data: sessionData,
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });

      // Check if session exists in database
      const existingSession = await Session.findById(sessionId);
      
      if (existingSession) {
        await Session.update(sessionId, sessionData);
        console.log(`✅ Session updated: ${sessionId}`);
      } else {
        await Session.create(sessionId, sessionData.userId || null, sessionData);
        console.log(`✅ Session created: ${sessionId}`);
      }
      
      callback(null);
    } catch (error) {
      console.error('Session set error:', error);
      callback(error);
    }
  }

  async destroy(sessionId, callback) {
    try {
      console.log(`🗑️ Destroying session: ${sessionId}`);
      
      // Remove from in-memory cache
      this.sessions.delete(sessionId);
      
      // Remove from database
      await Session.delete(sessionId);
      
      console.log(`✅ Session destroyed: ${sessionId}`);
      callback(null);
    } catch (error) {
      console.error('Session destroy error:', error);
      callback(error);
    }
  }

  async touch(sessionId, sessionData, callback) {
    try {
      console.log(`👆 Touching session: ${sessionId}`);
      
      // Update in-memory cache
      if (this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, {
          data: sessionData,
          expires: Date.now() + 24 * 60 * 60 * 1000
        });
      }

      // Touch in database
      await Session.touch(sessionId);
      
      callback(null);
    } catch (error) {
      console.error('Session touch error:', error);
      callback(error);
    }
  }

  // CRITICAL: Properly implement createSession method
  createSession(req, sessionData) {
    console.log(`🆕 Creating session object for: ${req.sessionID}`);
    
    const store = this;
    
    // Create a proper session object with all required methods
    const session = Object.create(null);
    
    // Copy session data
    Object.assign(session, sessionData);
    
    // Ensure cookie exists
    if (!session.cookie) {
      session.cookie = {
        path: '/',
        _expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        originalMaxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      };
    }
    
    // Add required session methods that express-session expects
    session.save = function(callback) {
      callback = callback || function() {};
      store.set(req.sessionID, session, callback);
    };
    
    session.reload = function(callback) {
      callback = callback || function() {};
      store.get(req.sessionID, (err, data) => {
        if (err) return callback(err);
        if (data) {
          // Clear current session data
          Object.keys(session).forEach(key => {
            if (key !== 'save' && key !== 'reload' && key !== 'destroy' && 
                key !== 'regenerate' && key !== 'touch') {
              delete session[key];
            }
          });
          // Assign new data
          Object.assign(session, data);
        }
        callback(null);
      });
    };
    
    session.destroy = function(callback) {
      callback = callback || function() {};
      store.destroy(req.sessionID, callback);
    };
    
    session.regenerate = function(callback) {
      callback = callback || function() {};
      store.destroy(req.sessionID, (err) => {
        if (err) return callback(err);
        // The new session ID will be generated by express-session
        callback(null);
      });
    };
    
    session.touch = function() {
      if (session.cookie) {
        session.cookie._expires = new Date(Date.now() + session.cookie.originalMaxAge);
      }
      return session;
    };

    console.log(`✅ Session object created with methods: ${Object.getOwnPropertyNames(session).join(', ')}`);
    return session;
  }

  async length(callback) {
    try {
      const { count, error } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      
      callback(null, count || 0);
    } catch (error) {
      console.error('Session length error:', error);
      callback(error);
    }
  }

  async clear(callback) {
    try {
      this.sessions.clear();
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .neq('session_id', ''); // Delete all sessions
      
      if (error) throw error;
      
      callback(null);
    } catch (error) {
      console.error('Session clear error:', error);
      callback(error);
    }
  }

  // Clean up expired sessions periodically
  startCleanup() {
    setInterval(async () => {
      try {
        // Clean expired sessions from memory
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.expires <= now) {
            this.sessions.delete(sessionId);
          }
        }

        // Clean expired sessions from database
        await Session.deleteExpired();
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  }
}

module.exports = SupabaseSessionStore;