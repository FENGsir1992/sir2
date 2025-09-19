import path from 'path';
import fs from 'fs';
import { db } from '../src/database/init.js';

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// 定位 backend 根与 uploads 目录
const CWD = path.dirname(new URL(import.meta.url).pathname);
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(CWD, '..'),
  path.resolve(CWD, '..', '..'),
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try {
    const hasUploads = fs.existsSync(path.join(p, 'uploads'));
    const hasPkg = fs.existsSync(path.join(p, 'package.json'));
    return hasUploads && hasPkg;
  } catch { return false; }
}) || path.resolve(CWD, '..');
const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads');

function getWorkflowDirByCode(code: number) {
  const root = path.join(UPLOAD_ROOT, 'workflows', String(code));
  const normalized = path.normalize(root);
  ensureDir(normalized);
  ensureDir(path.join(normalized, 'images'));
  return normalized;
}

function toPublicUrl(abs: string) {
  const idx = abs.replace(/\\/g, '/').lastIndexOf('/uploads/');
  return idx >= 0 ? abs.replace(/\\/g, '/').slice(idx) : abs;
}

function writeBase64Image(dataUrl: string, code: number): string | undefined {
  try {
    const m = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl);
    if (!m) return undefined;
    const detected = (m[1] || 'png').toLowerCase();
    const ext = detected === 'jpeg' ? 'jpg' : detected;
    const base64: string = m[2] || '';
    const buffer = Buffer.from(base64, 'base64');
    const dir = path.join(getWorkflowDirByCode(code), 'images');
    ensureDir(dir);
    const filename = `cover-fix-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const targetAbs = path.join(dir, filename);
    fs.writeFileSync(targetAbs, buffer);
    return toPublicUrl(targetAbs);
  } catch { return undefined; }
}

function pickExistingCoverForCode(code: number): string | undefined {
  try {
    const dir = path.join(getWorkflowDirByCode(code), 'images');
    if (!fs.existsSync(dir)) return undefined;
    const entries = fs.readdirSync(dir).filter(n => /\.(jpg|jpeg|png|webp)$/i.test(n));
    if (entries.length > 0) {
      const abs = path.join(dir, entries.sort()[0]);
      return toPublicUrl(abs);
    }
    // 兼容历史误写入 backend/backend/uploads，尝试迁移一份
    const innerDir = path.join(PROJECT_ROOT, 'backend', 'uploads', 'workflows', String(code), 'images');
    if (fs.existsSync(innerDir)) {
      const innerEntries = fs.readdirSync(innerDir).filter(n => /\.(jpg|jpeg|png|webp)$/i.test(n));
      if (innerEntries.length > 0) {
        const innerAbs = path.join(innerDir, innerEntries.sort()[0]);
        const filename = path.basename(innerAbs);
        const targetAbs = path.join(dir, filename);
        try { if (fs.existsSync(targetAbs)) fs.rmSync(targetAbs, { force: true }); } catch {}
        fs.copyFileSync(innerAbs, targetAbs);
        return toPublicUrl(targetAbs);
      }
    }
  } catch {}
  return undefined;
}

function copyFromUploadsRoot(rel: string, code: number): string | undefined {
  try {
    const norm = rel.replace(/^\/+/, '');
    let sourceAbs = path.join(PROJECT_ROOT, norm);
    if (!fs.existsSync(sourceAbs)) {
      const innerAlt = path.join(PROJECT_ROOT, 'backend', norm);
      if (fs.existsSync(innerAlt)) {
        sourceAbs = innerAlt;
      } else {
        return undefined;
      }
    }
    const dir = path.join(getWorkflowDirByCode(code), 'images');
    ensureDir(dir);
    const filename = path.basename(sourceAbs);
    const targetAbs = path.join(dir, filename);
    try { if (fs.existsSync(targetAbs)) fs.rmSync(targetAbs, { force: true }); } catch {}
    fs.copyFileSync(sourceAbs, targetAbs);
    return toPublicUrl(targetAbs);
  } catch { return undefined; }
}

function copyFallbackTx(code: number): string | undefined {
  const candidates = [
    path.join(PROJECT_ROOT, '..', 'public', 'TX.jpg'),
    path.join(PROJECT_ROOT, 'public', 'TX.jpg'),
    path.join(process.cwd(), 'public', 'TX.jpg')
  ];
  const src = candidates.find(p => fs.existsSync(p));
  if (!src) return undefined;
  const dir = path.join(getWorkflowDirByCode(code), 'images');
  ensureDir(dir);
  const filename = `cover-fallback-${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
  const dest = path.join(dir, filename);
  fs.copyFileSync(src, dest);
  return toPublicUrl(dest);
}

async function main() {
  const rows = await db('workflows').select('id','code','cover','gallery','updatedAt').orderBy('createdAt','desc');
  let fixed = 0;
  for (const r of rows) {
    let code = Number(r.code);
    if (!code || Number.isNaN(code)) {
      // 跳过无 code 的，已由 assign-codes 处理
      continue;
    }

    let current: string = r.cover || '';
    let nextUrl: string | undefined;

    // 1) 处理 data:image 封面
    if (typeof current === 'string' && current.startsWith('data:image/')) {
      nextUrl = writeBase64Image(current, code);
    }

    // 2) 若是 /uploads/* 但文件不存在，尝试：工作流目录现有图片 -> gallery[0] -> TX.jpg
    if (!nextUrl && typeof current === 'string' && current.startsWith('/uploads/')) {
      const rel = current.replace(/^\/+/, '');
      const abs = path.join(PROJECT_ROOT, rel);
      const exists = fs.existsSync(abs);
      if (!exists) {
        nextUrl = pickExistingCoverForCode(code);
        if (!nextUrl) {
          // 尝试从 gallery[0]
          try {
            const g: string[] = r.gallery ? JSON.parse(r.gallery as any) : [];
            const g0 = Array.isArray(g) && g.length > 0 ? g[0] : '';
            if (g0 && /^\/uploads\//.test(g0)) {
              nextUrl = copyFromUploadsRoot(g0, code);
            }
          } catch {}
        }
        if (!nextUrl) {
          nextUrl = copyFallbackTx(code);
        }
      }
    }

    // 3) 若 cover 为空：尝试工作流目录现有图片 -> gallery[0] -> TX.jpg
    if (!nextUrl && (!current || String(current).trim() === '')) {
      nextUrl = pickExistingCoverForCode(code);
      if (!nextUrl) {
        try {
          const g: string[] = r.gallery ? JSON.parse(r.gallery as any) : [];
          const g0 = Array.isArray(g) && g.length > 0 ? g[0] : '';
          if (g0 && /^\/uploads\//.test(g0)) {
            nextUrl = copyFromUploadsRoot(g0, code);
          }
        } catch {}
      }
      if (!nextUrl) {
        nextUrl = copyFallbackTx(code);
      }
    }

    if (nextUrl && nextUrl !== current) {
      await db('workflows').where('id', r.id).update({ cover: nextUrl, updatedAt: new Date() });
      fixed += 1;
      // eslint-disable-next-line no-console
      console.log(`✔ 修复封面: id=${r.id}, code=${code}, cover=${nextUrl}`);
    }
  }
  console.log(`✅ 完成：修复 ${fixed} 条封面记录`);
}

main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1); });


