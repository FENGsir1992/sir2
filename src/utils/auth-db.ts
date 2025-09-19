// Simple localStorage-based auth "database" for the browser
// NOTE: This stores hashed passwords using Web Crypto (SHA-256) when available.
// It is suitable for demos and local development only.

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // sha256 of password
  avatar?: string;
  createdAt: string;
};

const LS_KEY = "wz.auth.users.v1";

function readUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UserRecord[];
  } catch (error) {
    console.warn('Failed to read users from localStorage:', error);
    return [];
  }
}

function writeUsers(users: UserRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(users));
}

export async function hashPassword(password: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API 不可用，无法安全地哈希密码。请使用现代浏览器。');
  }
  
  try {
    const enc = new TextEncoder().encode(password);
    const buf = await window.crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    console.error('密码哈希失败:', error);
    throw new Error('密码哈希失败，请稍后再试');
  }
}

export function getUsers(): UserRecord[] {
  return readUsers();
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const users = readUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function addUser(params: { username: string; email: string; password: string; avatar?: string; }): Promise<UserRecord> {
  const { username, email, password, avatar } = params;
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("该邮箱已注册");
  }
  const users = readUsers();
  const user: UserRecord = {
    id: makeId(),
    username,
    email,
    passwordHash: await hashPassword(password),
    avatar,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export async function verifyPassword(email: string, password: string): Promise<UserRecord | null> {
  const user = findUserByEmail(email);
  if (!user) return null;
  const hp = await hashPassword(password);
  if (hp === user.passwordHash) return user;
  return null;
}

// Session helpers
const SESSION_KEY = "wz.auth.session.v1";
export type SessionUser = { 
  id: string; 
  name: string; 
  email: string; 
  avatar?: string; 
  isVip?: boolean; 
  balance?: number; 
  vipExpiresAt?: string;
  token?: string; // JWT token
};

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch (error) {
    console.warn('Failed to load session from localStorage:', error);
    return null;
  }
}

export function saveSession(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

