import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { db } from '../database/init.js';
import { SECURITY_CONFIG } from '../config/security.js';

const router = Router();

// 统一 uploads 根目录（与 server.ts 一致的健壮定位）
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];
const BACKEND_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try { return fs.existsSync(path.join(p, 'uploads')) && fs.existsSync(path.join(p, 'package.json')); } catch { return false; }
}) || path.resolve(process.cwd(), 'backend');
const UPLOAD_ROOT = path.join(BACKEND_ROOT, 'uploads');
function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
ensureDir(UPLOAD_ROOT);
ensureDir(path.join(UPLOAD_ROOT, 'files'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(UPLOAD_ROOT, 'files'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${base}-${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE,
    files: SECURITY_CONFIG.UPLOAD.MAX_FILES_PER_REQUEST 
  },
  fileFilter: (req, file, cb) => {
    try {
      // 【安全加强】更严格的文件类型验证（MIME ∪ 图片 ∪ 视频）
      const allowedSet = new Set([
        ...SECURITY_CONFIG.UPLOAD.ALLOWED_FILE_TYPES,
        ...SECURITY_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES,
        ...SECURITY_CONFIG.UPLOAD.ALLOWED_VIDEO_TYPES,
      ] as unknown as string[]);

      // 扩展名白名单，防止MIME伪造
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg', '.avi', '.mov', '.pdf', '.txt', '.md', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
      const fileExt = path.extname(file.originalname).toLowerCase();

      // 文件名安全检查
      if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return cb(new Error('文件名包含非法字符'));
      }

      // 如果是通用MIME，则仅依据扩展名判断
      if (file.mimetype === 'application/octet-stream') {
        if (!allowedExtensions.includes(fileExt)) return cb(new Error(`不支持的文件扩展名: ${fileExt}`));
        return cb(null, true);
      }

      // 正常场景：需要同时满足 MIME 与 扩展名 白名单
      if (!allowedSet.has(file.mimetype)) {
        return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
      }
      if (!allowedExtensions.includes(fileExt)) {
        return cb(new Error(`不支持的文件扩展名: ${fileExt}`));
      }

      return cb(null, true);
    } catch (e) {
      return cb(new Error('文件类型校验失败'));
    }
  }
});

function toPublicUrl(savedName: string) {
  return `/uploads/files/${savedName}`.replace(/\\/g, '/');
}

// 【安全加强】文件内容验证函数
async function validateFileContent(filePath: string, mimetype: string): Promise<boolean> {
  try {
    // 读取文件头部字节进行验证
    const buffer = fs.readFileSync(filePath);
    const header = buffer.slice(0, 16);
    
    // 常见文件类型的魔数验证
    const magicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'video/mp4': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70], // null表示跳过该字节
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04]
    };
    
    const magic = magicNumbers[mimetype as keyof typeof magicNumbers];
    if (magic) {
      for (let i = 0; i < magic.length; i++) {
        if (magic[i] !== null && header[i] !== magic[i]) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('文件内容验证失败:', error);
    return false;
  }
}

// 单文件上传
router.post('/single', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: '未接收到文件' });
    
    // 【安全加强】验证文件内容
    const filePath = req.file.path;
    const isValidContent = await validateFileContent(filePath, req.file.mimetype);
    if (!isValidContent) {
      // 删除无效文件
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({ 
        success: false, 
        error: '文件内容与声明的类型不匹配', 
        code: 'INVALID_FILE_CONTENT' 
      });
    }
    
    const id = uuidv4();
    const relUrl = toPublicUrl(req.file.filename);
    await db('uploaded_files').insert({
      id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: path.join('uploads', 'files', req.file.filename),
      url: relUrl,
      userId: req.user?.id || null,
      createdAt: new Date(),
    });
    return res.status(201).json({ success: true, data: { id, url: relUrl } });
  } catch (error) {
    console.error('单文件上传失败:', error);
    // 清理可能的临时文件
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return res.status(500).json({ success: false, error: '服务器内部错误', code: 'SERVER_ERROR' });
  }
});

// 多文件上传
router.post('/multiple', requireAuth, upload.array('files', SECURITY_CONFIG.UPLOAD.MAX_FILES_PER_REQUEST), async (req: AuthRequest, res: Response) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) return res.status(400).json({ success: false, error: '未接收到文件' });
    const results: any[] = [];
    for (const f of files) {
      const id = uuidv4();
      const relUrl = toPublicUrl(f.filename);
      await db('uploaded_files').insert({
        id,
        originalName: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        path: path.join('uploads', 'files', f.filename),
        url: relUrl,
        userId: req.user?.id || null,
        createdAt: new Date(),
      });
      results.push({ id, url: relUrl });
    }
    return res.status(201).json({ success: true, data: results });
  } catch (error) {
    console.error('多文件上传失败:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误', code: 'SERVER_ERROR' });
  }
});

// 文件列表（当前用户）
router.get('/list', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Number((req.query as any)?.page || 1);
    const limit = Math.min(100, Number((req.query as any)?.limit || 20));
    const offset = (page - 1) * limit;
    const baseQuery = db('uploaded_files').where('userId', req.user!.id);
    const totalRow = await baseQuery.clone().count<{ count: number }>({ count: '*' }).first();
    const total = Number((totalRow as any)?.count || 0);
    const rows = await baseQuery.clone().orderBy('createdAt', 'desc').limit(limit).offset(offset);
    return res.json({ success: true, data: { files: rows, pagination: { page, limit, total } } });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误', code: 'SERVER_ERROR' });
  }
});

// 删除文件（仅限本人）
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const row = await db('uploaded_files').where({ id, userId: req.user!.id }).first();
    if (!row) return res.status(404).json({ success: false, error: '文件不存在', code: 'NOT_FOUND' });
    // 删除磁盘文件
    try { fs.rmSync(path.join(process.cwd(), 'backend', row.path), { force: true }); } catch {}
    await db('uploaded_files').where({ id }).del();
    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除文件失败:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误', code: 'SERVER_ERROR' });
  }
});

export default router;


