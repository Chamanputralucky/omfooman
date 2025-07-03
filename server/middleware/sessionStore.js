const { EventEmitter } = require('events');
const Session = require('../models/Session');
const supabase = require('../config/supabase');

class SupabaseSessionStore extends EventEmitter {
  constructor() {
    super(); // Call EventEmitter constructor
    this.sessions = new Map(); // In-memory cache for performance
  }

  async get(sessionId, callback) {
    try {
      // First check in-memory cache
      if (this.sessions.has(sessionId)) {
        const cachedSession = this.sessions.get(sessionId);
        if (cachedSession.expires > Date.now()) {
          return callback(null, cachedSession.data);
        } else {
          this.sessions.delete(sessionId);
        }
      }

      // Check database
      const sessionRecord = await Session.findById(sessionId);
      if (sessionRecord) {
        // Cache in memory
        this.sessions.set(sessionId, {
          data: sessionRecord.session_data,
          expires: new Date(sessionRecord.expires_at).getTime()
        });
        callback(null, sessionRecord.session_data);
      } else {
        callback(null, null);
      }
    } catch (error) {
      console.error('Session get error:', error);
      callback(error);
    }
  }

  async set(sessionId, sessionData, callback) {
    try {
      // Update in-memory cache
      this.sessions.set(sessionId, {
        data: sessionData,
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });

      // Check if session exists in database
      const existingSession = await Session.findById(sessionId);
      
      if (existingSession) {
        await Session.update(sessionId, sessionData);
      } else {
        await Session.create(sessionId, sessionData.userId || null, sessionData);
      }
      
      callback(null);
    } catch (error) {
      console.error('Session set error:', error);
      callback(error);
    }
  }

  async destroy(sessionId, callback) {
    try {
      // Remove from in-memory cache
      this.sessions.delete(sessionId);
      
      // Remove from database
      await Session.delete(sessionId);
      
      callback(null);
    } catch (error) {
      console.error('Session destroy error:', error);
      callback(error);
    }
  }

  async touch(sessionId, sessionData, callback) {
    try {
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