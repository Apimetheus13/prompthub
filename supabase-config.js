// supabase-config.js
// PromptHub Supabase 配置與功能整合

// supabase-config.js
// PromptHub Supabase 配置與功能整合

// 🔑 Supabase 配置 - 請替換為你的實際金鑰
const SUPABASE_URL = 'https://vgipyxmrjnhbthnssapz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXB5eG1yam5oYnRobnNzYXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDYxODAsImV4cCI6MjA3MTg4MjE4MH0.y1zhmd0VQtTS9xiRiJ4LQAXKuNgRJupNyVGlS1e1eVg';

// 🌐 動態載入 Supabase 客戶端
let supabaseClient = null;

async function getSupabase() {
  if (!supabaseClient) {
    try {
      // 從 CDN 載入 Supabase
      const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      
      console.log('✅ Supabase 客戶端初始化成功');
    } catch (error) {
      console.error('❌ Supabase 初始化失敗:', error);
      throw error;
    }
  }
  return supabaseClient;
}

// 🔐 認證系統
const SupabaseAuth = {
  // 註冊新用戶
  async signUp(email, password, options = {}) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: options.username || email.split('@')[0],
            display_name: options.displayName || options.username || email.split('@')[0]
          }
        }
      });

      if (error) throw error;
      
      console.log('✅ 用戶註冊成功:', data);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ 註冊失敗:', error);
      return { success: false, data: null, error };
    }
  },

  // 用戶登入
  async signIn(email, password) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      console.log('✅ 用戶登入成功:', data.user.email);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ 登入失敗:', error);
      return { success: false, data: null, error };
    }
  },

  // 用戶登出
  async signOut() {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      console.log('✅ 用戶登出成功');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ 登出失敗:', error);
      return { success: false, error };
    }
  },

  // 獲取當前用戶
  async getCurrentUser() {
    try {
      const supabase = await getSupabase();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      return { success: true, user, error: null };
    } catch (error) {
      console.error('❌ 獲取用戶資訊失敗:', error);
      return { success: false, user: null, error };
    }
  },

  // 監聽認證狀態變化
  onAuthStateChange(callback) {
    getSupabase().then(supabase => {
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔄 認證狀態變化:', event);
        callback(event, session);
      });
    });
  },

  // 重設密碼
  async resetPassword(email) {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ 重設密碼失敗:', error);
      return { success: false, error };
    }
  }
};

// 📝 Prompts 資料庫操作
const SupabasePrompts = {
  // 獲取用戶的 prompts
  async getUserPrompts(userId) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`✅ 載入了 ${data?.length || 0} 個用戶 Prompts`);
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ 載入用戶 Prompts 失敗:', error);
      return { success: false, data: [], error };
    }
  },

  // 獲取公開的 prompts
  async getPublicPrompts(limit = 50) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`✅ 載入了 ${data?.length || 0} 個公開 Prompts`);
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ 載入公開 Prompts 失敗:', error);
      return { success: false, data: [], error };
    }
  },

  // 創建新的 prompt
  async createPrompt(promptData) {
    try {
      const supabase = await getSupabase();
      
      // 獲取當前用戶
      const { user } = await SupabaseAuth.getCurrentUser();
      if (!user) throw new Error('用戶未登入');

      const newPrompt = {
        user_id: user.id,
        title: promptData.title,
        content: promptData.content,
        description: promptData.description || '',
        category: promptData.category || 'other',
        tags: promptData.tags || [],
        is_public: promptData.isPublic || false,
        likes_count: 0,
        views_count: 0,
        bookmarks_count: 0
      };

      const { data, error } = await supabase
        .from('prompts')
        .insert([newPrompt])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Prompt 創建成功:', data.title);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ 創建 Prompt 失敗:', error);
      return { success: false, data: null, error };
    }
  },

  // 更新 prompt
  async updatePrompt(id, updates) {
    try {
      const supabase = await getSupabase();
      
      const { data, error } = await supabase
        .from('prompts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Prompt 更新成功:', data.title);
      return { success: true, data, error: null };
    } catch (error) {
      console.error('❌ 更新 Prompt 失敗:', error);
      return { success: false, data: null, error };
    }
  },

  // 刪除 prompt
  async deletePrompt(id) {
    try {
      const supabase = await getSupabase();
      
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('✅ Prompt 刪除成功');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ 刪除 Prompt 失敗:', error);
      return { success: false, error };
    }
  },

  // 搜尋 prompts
  async searchPrompts(query, options = {}) {
    try {
      const supabase = await getSupabase();
      
      let queryBuilder = supabase
        .from('prompts')
        .select('*');

      // 如果有搜尋關鍵字
      if (query && query.trim()) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${query}%,content.ilike.%${query}%,description.ilike.%${query}%`
        );
      }

      // 只搜尋公開的 prompts（除非指定用戶）
      if (!options.userId) {
        queryBuilder = queryBuilder.eq('is_public', true);
      } else {
        queryBuilder = queryBuilder.eq('user_id', options.userId);
      }

      // 分類篩選
      if (options.category) {
        queryBuilder = queryBuilder.eq('category', options.category);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      if (error) throw error;
      
      console.log(`✅ 搜尋到 ${data?.length || 0} 個 Prompts`);
      return { success: true, data: data || [], error: null };
    } catch (error) {
      console.error('❌ 搜尋 Prompts 失敗:', error);
      return { success: false, data: [], error };
    }
  }
};

// 💫 互動功能（按讚、收藏等）
const SupabaseInteractions = {
  // 切換按讚狀態
  async toggleLike(promptId) {
    try {
      const supabase = await getSupabase();
      const { user } = await SupabaseAuth.getCurrentUser();
      
      if (!user) throw new Error('用戶未登入');

      // 檢查是否已經按讚
      const { data: existing } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_id', promptId)
        .eq('type', 'like')
        .single();

      if (existing) {
        // 取消按讚
        await supabase
          .from('interactions')
          .delete()
          .eq('id', existing.id);
        
        return { success: true, liked: false, error: null };
      } else {
        // 新增按讚
        await supabase
          .from('interactions')
          .insert([{
            user_id: user.id,
            prompt_id: promptId,
            type: 'like'
          }]);
        
        return { success: true, liked: true, error: null };
      }
    } catch (error) {
      console.error('❌ 按讚操作失敗:', error);
      return { success: false, liked: false, error };
    }
  }
};

// 🔄 資料遷移工具
const DataMigration = {
  // 將本地資料遷移到雲端
  async migrateLocalData() {
    try {
      const { user } = await SupabaseAuth.getCurrentUser();
      if (!user) return { success: false, error: '用戶未登入' };

      // 獲取本地資料
      const localData = localStorage.getItem('prompthub_prompts');
      if (!localData) return { success: true, migrated: 0 };

      const localPrompts = JSON.parse(localData);
      let migratedCount = 0;

      // 遷移每個 prompt
      for (const prompt of localPrompts) {
        if (prompt.author === '我' || prompt.author === 'local') {
          const result = await SupabasePrompts.createPrompt({
            title: prompt.title,
            content: prompt.content,
            description: prompt.description,
            category: prompt.category || 'other',
            tags: prompt.tags || [],
            isPublic: prompt.isPublic || false
          });

          if (result.success) {
            migratedCount++;
          }
        }
      }

      // 清除本地資料
      if (migratedCount > 0) {
        localStorage.removeItem('prompthub_prompts');
      }

      console.log(`✅ 成功遷移 ${migratedCount} 個 Prompts 到雲端`);
      return { success: true, migrated: migratedCount, error: null };
    } catch (error) {
      console.error('❌ 資料遷移失敗:', error);
      return { success: false, migrated: 0, error };
    }
  }
};

// 🎯 統一的 PromptHub Supabase 介面
window.PromptHubSupabase = {
  auth: SupabaseAuth,
  prompts: SupabasePrompts,
  interactions: SupabaseInteractions,
  migration: DataMigration,
  
  // 初始化函數
  async init() {
    try {
      await getSupabase();
      console.log('🚀 PromptHub Supabase 初始化完成');
      return true;
    } catch (error) {
      console.error('❌ PromptHub Supabase 初始化失敗:', error);
      return false;
    }
  },
  
  // 檢查連接狀態
  async healthCheck() {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('prompts')
        .select('count(*)')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }
};

// 自動初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.PromptHubSupabase.init();
  } catch (error) {
    console.error('PromptHub Supabase 自動初始化失敗:', error);
  }
});

console.log('📦 PromptHub Supabase 配置載入完成');

// 🔑 Supabase 配置 - 請替換為你的實際金鑰
const SUPABASE_URL = 'https://vgipyxmrjnhbthnssapz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXB5eG1yam5oYnRobnNzYXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDYxODAsImV4cCI6MjA3MTg4MjE4MH0.y1zhmd0VQtTS9xiRiJ4LQAXKuNgRJupNyVGlS1e1eVg';

// 其餘完整代碼...
