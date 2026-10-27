export interface User {
  id: string;
  email: string;
  username: string;
  provider?: 'local' | 'google' | 'kakao';
  avatar_url?: string;
  role?: 'admin' | 'user';
  created_at?: string;
}

export interface SavedDrawer {
  id: string;
  userId?: string;
  name: string;
  category?: string;
  width: number;
  depth: number;
  height: number;
  items?: any[];
  createdAt?: string;
  updatedAt?: string;
}
