import path from 'path';
import fs from 'fs';
import { db } from '../src/database/init.js';

function ensureDir(p: string) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function main() {
	const targetIdArg = process.argv[2] || 'latest';
	// 定位项目与上传目录
	const PROJECT_ROOT_CANDIDATES = [
		path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
		path.resolve(process.cwd(), '..'),
		path.resolve(process.cwd())
	];
	const PROJECT_ROOT = PROJECT_ROOT_CANDIDATES.find((p) => {
		try { return fs.existsSync(path.join(p, 'uploads')) || fs.existsSync(path.join(p, '..', 'uploads')); } catch { return false; }
	}) || path.resolve(process.cwd(), '..');

	const BACKEND_ROOT = fs.existsSync(path.join(PROJECT_ROOT, 'uploads'))
		? PROJECT_ROOT
		: path.join(PROJECT_ROOT, 'backend');

	const UPLOAD_ROOT = path.join(BACKEND_ROOT, 'uploads');
	ensureDir(UPLOAD_ROOT);
	ensureDir(path.join(UPLOAD_ROOT, 'images'));

	// 选择目标工作流
	let workflow: any;
	if (targetIdArg === 'latest') {
		workflow = await db('workflows').select('*').orderBy('createdAt', 'desc').first();
	} else {
		workflow = await db('workflows').where('id', targetIdArg).first();
	}
	if (!workflow) {
		console.log('未找到工作流');
		return;
	}

	// 准备一张图片作为封面源
	const srcCandidates = [
		path.join(BACKEND_ROOT, '..', 'public', 'TX.jpg'),
		path.join(BACKEND_ROOT, 'public', 'TX.jpg'),
		path.join(PROJECT_ROOT, 'public', 'TX.jpg')
	];
	const src = srcCandidates.find((p) => fs.existsSync(p));
	if (!src) {
		throw new Error('未找到示例图片 TX.jpg');
	}

	const filename = `cover-test-${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
	const destRel = path.join('uploads', 'images', filename).replace(/\\/g, '/');
	const destAbs = path.join(UPLOAD_ROOT, 'images', filename);
	fs.copyFileSync(src, destAbs);

	await db('workflows').where('id', workflow.id).update({
		cover: `/${destRel}`,
		updatedAt: new Date()
	});

	console.log(`已设置工作流封面: id=${workflow.id}, code=${workflow.code}, cover=/${destRel}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


