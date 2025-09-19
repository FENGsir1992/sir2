import path from 'path';
import fs from 'fs';
import { db } from '../src/database/init.js';

function ensureDir(p: string) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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

async function ensureWorkflowCodesTable() {
	const hasTable = await db.schema.hasTable('workflow_codes');
	if (!hasTable) {
		await db.schema.createTable('workflow_codes', (table) => {
			table.integer('code').primary();
			table.boolean('assigned').notNullable().defaultTo(false).index();
			table.string('workflowId').nullable().index();
			table.timestamp('updatedAt').defaultTo(db.fn.now());
		});
	}
}

async function allocateWorkflowCode(): Promise<number> {
	const free = await db('workflow_codes').where({ assigned: false }).orderBy('code', 'asc').first();
	if (free && typeof free.code === 'number') {
		await db('workflow_codes').where({ code: free.code }).update({ assigned: true, updatedAt: new Date() });
		return free.code as number;
	}
	const maxRow = await db('workflow_codes').max('code as max').first();
	const next = Math.max(0, Number((maxRow as any)?.max || 0)) + 1;
	await db('workflow_codes').insert({ code: next, assigned: true, updatedAt: new Date() });
	return next;
}

async function main() {
	await ensureWorkflowCodesTable();
	const rows = await db('workflows').select('id', 'code');
	for (const row of rows) {
		if (row.code === null || row.code === undefined) {
			const code = await allocateWorkflowCode();
			await db('workflows').where('id', row.id).update({ code, updatedAt: new Date() });
			try { getWorkflowDirByCode(code); } catch {}
			await db('workflow_codes').where({ code }).update({ workflowId: row.id, updatedAt: new Date() });
		}
	}
	console.log('✅ 已为缺失编号的工作流分配 code 并创建目录');
}

main().then(() => process.exit(0)).catch((e) => {
	console.error('分配编号失败:', e);
	process.exit(1);
});


