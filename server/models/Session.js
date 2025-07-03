const supabase = require('../config/supabase');

class Session {
  static async create(sessionId, userId, sessionData) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        session_id: sessionId,
        user_id: userId,
        session_data: sessionData,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  static async findById(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString()) // Only get non-expired sessions
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  static async update(sessionId, sessionData) {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        session_data: sessionData,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  static async delete(sessionId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) {
      throw error;
    }
  }

  static async deleteExpired() {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error deleting expired sessions:', error);
    }
  }

  static async touch(sessionId) {
    const { error } = await supabase
      .from('sessions')
      .update({
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
    
    if (error) {
      console.error('Error touching session:', error);
    }
  }
}

module.exports = Session;