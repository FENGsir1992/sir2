import path from 'path';
import fs from 'fs';
import { db } from '../src/database/init.js';

function ensureDir(p: string) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const CWD = path.dirname(new URL(import.meta.url).pathname);
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(CWD, '..'),            // backend/scripts -> backend
  path.resolve(CWD, '..', '..'),      // backend/dist/scripts -> backend/dist
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try { return fs.existsSync(path.join(p, 'uploads')); } catch { return false; }
}) || path.resolve(CWD, '..');
const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads');

function getWorkflowDirByCode(code: number) {
	const root = path.join(UPLOAD_ROOT, 'workflows', String(code));
	const normalized = path.normalize(root);
	ensureDir(normalized);
	ensureDir(path.join(normalized, 'images'));
	ensureDir(path.join(normalized, 'videos'));
	ensureDir(path.join(normalized, 'files'));
	return normalized;
}

function toPublicUrl(fileAbsPath: string) {
	const uploadsIndex = fileAbsPath.replace(/\\/g, '/').lastIndexOf('/uploads/');
	if (uploadsIndex >= 0) return fileAbsPath.replace(/\\/g, '/').slice(uploadsIndex);
	return fileAbsPath;
}

function moveIfLocal(inputUrl: string | undefined, code: number, kind: 'images' | 'videos' | 'files'): string | undefined {
	if (!inputUrl) return inputUrl;
	if (!inputUrl.startsWith('/uploads/')) return inputUrl;
	try {
		const filename = path.basename(inputUrl);
		const relativeFromRoot = inputUrl.replace(/^\/+/, '');
		const sourceAbs = path.join(PROJECT_ROOT, relativeFromRoot);
		const targetDir = getWorkflowDirByCode(code);
		const targetAbs = path.join(targetDir, kind, filename);
		ensureDir(path.dirname(targetAbs));
		if (fs.existsSync(sourceAbs)) {
			fs.renameSync(sourceAbs, targetAbs);
			return toPublicUrl(targetAbs);
		}
	} catch {}
	return inputUrl;
}

async function main() {
	const workflows = await db('workflows').select('id', 'code', 'cover', 'previewVideo', 'demoVideo', 'gallery', 'attachments');
	for (const wf of workflows) {
		const code = Number((wf as any).code);
		if (!code || Number.isNaN(code)) continue;
		// 确保工作流目录存在
		try { getWorkflowDirByCode(code); } catch {}
		const movedCover = moveIfLocal((wf as any).cover, code, 'images') || (wf as any).cover;
		const movedPreview = moveIfLocal((wf as any).previewVideo, code, 'videos') || (wf as any).previewVideo;
		const movedDemo = moveIfLocal((wf as any).demoVideo, code, 'videos') || (wf as any).demoVideo;
		let movedGalleryStr = (wf as any).gallery;
		let movedAttachmentsStr = (wf as any).attachments;
		try {
			const gallery = (wf as any).gallery ? JSON.parse((wf as any).gallery) : [];
			if (Array.isArray(gallery)) {
				const moved = gallery.map((u: string) => moveIfLocal(u, code, 'images') || u);
				movedGalleryStr = JSON.stringify(moved);
			}
		} catch {}
		try {
			const attachments = (wf as any).attachments ? JSON.parse((wf as any).attachments) : [];
			if (Array.isArray(attachments)) {
				const moved = attachments.map((u: string) => moveIfLocal(u, code, 'files') || u);
				movedAttachmentsStr = JSON.stringify(moved);
			}
		} catch {}
		await db('workflows').where('id', (wf as any).id).update({
			cover: movedCover,
			previewVideo: movedPreview,
			demoVideo: movedDemo,
			gallery: movedGalleryStr,
			attachments: movedAttachmentsStr,
			updatedAt: new Date()
		});
	}
	console.log('✅ 已迁移媒体文件到各工作流独立目录');
}

main().then(() => process.exit(0)).catch((e) => {
	console.error('迁移失败:', e);
	process.exit(1);
});


