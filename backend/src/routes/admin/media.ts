import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { SECURITY_CONFIG } from '../../config/security.js';

// 使用工作目录推断路径，避免 import.meta 依赖

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

// 基础上传目录（项目空间内）
// 统一定位到 backend/uploads（无论在 src 还是 dist 运行）
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try { return fs.existsSync(path.join(p, 'uploads')) && fs.existsSync(path.join(p, 'package.json')); } catch { return false; }
}) || path.resolve(process.cwd(), 'backend');
const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads');
ensureDir(UPLOAD_ROOT);
ensureDir(path.join(UPLOAD_ROOT, 'videos'));
ensureDir(path.join(UPLOAD_ROOT, 'images'));
ensureDir(path.join(UPLOAD_ROOT, 'files'));

function makeFilename(originalName: string) {
  const ext = path.extname(originalName) || '';
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 40) || 'file';
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${stamp}-${rand}${ext}`;
}

const router = Router();

// 独立的存储器，根据端点决定目的目录
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const url = req.originalUrl;
    if (url.includes('/video/')) cb(null, path.join(UPLOAD_ROOT, 'videos'));
    else if (url.includes('/image/')) cb(null, path.join(UPLOAD_ROOT, 'images'));
    else cb(null, path.join(UPLOAD_ROOT, 'files'));
  },
  filename: function (req, file, cb) {
    cb(null, makeFilename(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isVideo = req.originalUrl.includes('/video/');
    const isImage = req.originalUrl.includes('/image/');
    const videoTypes = SECURITY_CONFIG.UPLOAD.ALLOWED_VIDEO_TYPES as unknown as readonly string[];
    const imageTypes = SECURITY_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES as unknown as readonly string[];
    const fileTypes = SECURITY_CONFIG.UPLOAD.ALLOWED_FILE_TYPES as unknown as readonly string[];
    const ok = isVideo
      ? videoTypes.includes(file.mimetype)
      : isImage
        ? imageTypes.includes(file.mimetype)
        : fileTypes.includes(file.mimetype);
    if (!ok) {
      return cb(new Error('不支持的文件类型'));
    }
    cb(null, true);
  }
});

function buildFileResponse(savedFilename: string, subdir: 'videos' | 'images' | 'files') {
  const urlPath = `/${path.posix.join('uploads', subdir, savedFilename)}`.replace(/\\/g, '/');
  return { url: urlPath };
}

// 上传预览视频（项目空间内暂存）
router.post('/video/preview', requireAdminAuth, upload.single('video'), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ success: false, error: '缺少文件字段 video' });
  return res.json({ success: true, data: buildFileResponse(file.filename, 'videos') });
});

// 上传演示视频（项目空间内暂存）
router.post('/video/demo', requireAdminAuth, upload.single('video'), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ success: false, error: '缺少文件字段 video' });
  return res.json({ success: true, data: buildFileResponse(file.filename, 'videos') });
});

// 上传封面图片
router.post('/image/cover', requireAdminAuth, upload.single('image'), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ success: false, error: '缺少文件字段 image' });
  return res.json({ success: true, data: buildFileResponse(file.filename, 'images') });
});

// 上传画廊图片（多图）
router.post('/image/gallery', requireAdminAuth, upload.array('images', SECURITY_CONFIG.UPLOAD.MAX_FILES_PER_REQUEST), (req: Request, res: Response) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) return res.status(400).json({ success: false, error: '缺少文件字段 images' });
  return res.json({ success: true, data: files.map(f => buildFileResponse(f.filename, 'images')) });
});

// 上传自定义附件（项目空间内暂存）
router.post('/file/attachment', requireAdminAuth, upload.single('file'), (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ success: false, error: '缺少文件字段 file' });
  return res.json({ success: true, data: buildFileResponse(file.filename, 'files') });
});

export default router;


