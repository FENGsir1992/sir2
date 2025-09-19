import { Router, Request, Response } from 'express';
import { db } from '../../database/init.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { SYSTEM_CONSTANTS } from '../../config/constants.js';

const router = Router();
// 统一定位到 backend/uploads（无论在 src 还是 dist 运行）
// 基于工作目录推断，避免 import.meta 依赖
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd())
];
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try { 
    const uploadsPath = path.join(p, 'uploads');
    const isRealBackendRoot = fs.existsSync(uploadsPath) && fs.existsSync(path.join(p, 'package.json'));
    return isRealBackendRoot;
  } catch { return false; }
}) || path.resolve(process.cwd(), 'backend');
const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads');

function ensureDir(p: string) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

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
	if (uploadsIndex >= 0) {
		return fileAbsPath.replace(/\\/g, '/').slice(uploadsIndex);
	}
	return fileAbsPath;
}

function getWorkflowSubdir(code: number, kind: 'images' | 'videos' | 'files') {
	return path.join(getWorkflowDirByCode(code), kind);
}

function extractBasenameIfInWorkflow(url: string | undefined, code: number): string | null {
	if (!url || typeof url !== 'string') return null;
	const normalized = url.replace(/\\/g, '/');
	const prefix = `/uploads/workflows/${code}/`;
	if (normalized.startsWith(prefix)) {
		try { 
			return path.basename(normalized); 
		} catch (error) {
			console.warn(`提取文件名失败 ${normalized}:`, error);
			return null; 
		}
	}
	return null;
}

function cleanupUnusedMediaFiles(code: number, keep: { images: string[]; videos: string[]; files: string[]; }) {
	try {
		const kinds: Array<'images' | 'videos' | 'files'> = ['images', 'videos', 'files'];
		kinds.forEach((kind) => {
			const dir = getWorkflowSubdir(code, kind);
			ensureDir(dir);
			const keepSet = new Set((keep as any)[kind] || []);
			try {
				const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
				entries.forEach((name) => {
					if (!keepSet.has(name)) {
						const abs = path.join(dir, name);
						try { 
						fs.rmSync(abs, { force: true }); 
					} catch (error) {
						console.warn(`清理文件失败 ${abs}:`, error);
					}
					}
				});
			} catch (error) {
				console.warn(`清理目录失败 ${dir}:`, error);
			}
		});
	} catch (error) {
		console.warn(`清理未使用媒体文件失败:`, error);
	}
}

async function allocateWorkflowCode(): Promise<number> {
	const free = await db('workflow_codes').where({ assigned: false }).orderBy('code', 'asc').first();
	if (free && typeof free.code === 'number') {
		await db('workflow_codes').where({ code: free.code }).update({ assigned: true, updatedAt: new Date() });
		return free.code as number;
	}
	const maxRow = await db('workflow_codes').max('code as max').first();
	const next = Math.max(0, Number(maxRow?.max || 0)) + 1;
	await db('workflow_codes').insert({ code: next, assigned: true, updatedAt: new Date() });
	return next;
}

async function releaseWorkflowCode(code: number) {
	await db('workflow_codes').insert({ code, assigned: false, workflowId: null, updatedAt: new Date() })
		.onConflict('code').merge({ assigned: false, workflowId: null, updatedAt: new Date() });
}

function moveIfLocal(inputUrl: string | undefined, code: number, kind: 'images' | 'videos' | 'files'): string | undefined {
	if (!inputUrl) return inputUrl;

	console.log(`🔧 moveIfLocal 调用: code=${code}, kind=${kind}, inputUrl=${inputUrl.substring(0, 100)}...`);

	// 支持直接提交的 data:image/*;base64 封面（管理端截帧）
	if (kind === 'images' && typeof inputUrl === 'string' && inputUrl.startsWith('data:image/')) {
		try {
			const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(inputUrl);
			if (match) {
				const detected = (match[1] || 'png').toLowerCase();
				const ext = detected === 'jpeg' ? 'jpg' : detected;
				const base64: string = match[2] || '';
				const buffer = Buffer.from(base64, 'base64');
				const dir = path.join(getWorkflowDirByCode(code), 'images');
				ensureDir(dir);
				const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
				const targetAbs = path.join(dir, filename);
				fs.writeFileSync(targetAbs, buffer);
				const result = toPublicUrl(targetAbs);
				console.log(`✅ Base64图片已保存: ${result}`);
				return result;
			}
		} catch (err) {
			console.error('❌ Base64图片处理失败:', err);
		}
	}

	// 规范化URL，支持绝对地址并去掉查询串
	let localUrl = typeof inputUrl === 'string' ? inputUrl : '';
	localUrl = localUrl.split('?')[0]?.split('#')[0] || localUrl;
	if (localUrl.includes('/uploads/')) {
		const i = localUrl.indexOf('/uploads/');
		localUrl = localUrl.slice(i);
	}

	// 仅迁移项目内 /uploads 路径
	if (!localUrl.startsWith('/uploads/')) {
		console.log(`⚠️ 跳过非本地文件: ${inputUrl}`);
		return inputUrl;
	}
	
	try {
		const filename = path.basename(localUrl);
		// 兼容 Windows：去掉前导斜杠再拼接到项目目录
		const relativeFromRoot = localUrl.replace(/^\/+/, '');
		const sourceAbs = path.join(PROJECT_ROOT, relativeFromRoot);
		const targetDir = getWorkflowDirByCode(code);
		const targetAbs = path.join(targetDir, kind, filename);
		
		console.log(`📂 源文件: ${sourceAbs}`);
		console.log(`📂 目标文件: ${targetAbs}`);
		
		ensureDir(path.dirname(targetAbs));
		
		if (fs.existsSync(sourceAbs)) {
			const fromWorkflowsDir = sourceAbs.replace(/\\/g, '/').includes('/uploads/workflows/');
			
			// 覆盖目标文件以达到"覆盖原始文件"的效果
			try { 
				if (fs.existsSync(targetAbs)) {
					fs.rmSync(targetAbs, { force: true });
					console.log(`🗑️ 已删除旧文件: ${targetAbs}`);
				}
			} catch (err) {
				console.error('删除旧文件失败:', err);
			}
			
			if (fromWorkflowsDir) {
				// 复制而不是移动：保留原文件用于"复制"场景
				fs.copyFileSync(sourceAbs, targetAbs);
				console.log(`📋 文件已复制: ${sourceAbs} -> ${targetAbs}`);
			} else {
				// 来自公共 uploads 根目录的临时文件，采用移动
				fs.renameSync(sourceAbs, targetAbs);
				console.log(`📦 文件已移动: ${sourceAbs} -> ${targetAbs}`);
			}
			
			const result = toPublicUrl(targetAbs);
			console.log(`✅ 文件处理完成，返回URL: ${result}`);
			return result;
		} else {
			console.warn(`⚠️ 源文件不存在: ${sourceAbs}`);
		}
	} catch (err) {
		console.error('❌ 文件复制失败:', err);
	}
	return inputUrl;
}

// 管理员获取工作流列表（默认不过滤状态）
router.get('/', requireAdminAuth, async (req: Request, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			search = '',
			category = '',
			subcategory = '',
			tags = '',
			status = '', // 管理端默认不过滤
			isVip,
			isFree,
			isHot,
			isNew,
			priceRange = '',
			authorId = '',
			sortBy = 'updatedAt',
			sortOrder = 'desc'
		} = req.query as any;

		let query = db('workflows').select('*');

		// 默认排除已归档的数据，只有在明确传入 status 时才按状态筛选
		if (status) {
			query = query.where('status', status);
		} else {
			query = query.whereNot('status', 'archived');
		}

		if (search) {
			const searchTerms = String(search).trim().split(/\s+/);
			query = query.where(function () {
				searchTerms.forEach((term: string) => {
					this.orWhere(function () {
						this.where('title', 'like', `%${term}%`)
							.orWhere('description', 'like', `%${term}%`)
							.orWhere('shortDescription', 'like', `%${term}%`)
							.orWhere('author', 'like', `%${term}%`)
							.orWhere('requirements', 'like', `%${term}%`)
							.orWhereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%"${term}"%`])
							.orWhereRaw('JSON_EXTRACT(features, "$") LIKE ?', [`%${term}%`]);
					});
				});
			});
		}

		if (category) query = query.where('category', category);
		if (subcategory) query = query.where('subcategory', subcategory);

		if (tags) {
			const tagArray = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
			if (tagArray.length > 0) {
				query = query.where(function () {
					tagArray.forEach((tag: string) => {
						this.orWhereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%"${tag}"%`]);
					});
				});
			}
		}

		if (isVip !== undefined) query = query.where('isVip', String(isVip) === 'true');
		if (isFree !== undefined) query = query.where('isFree', String(isFree) === 'true');
		if (isHot !== undefined) query = query.where('isHot', String(isHot) === 'true');
		if (isNew !== undefined) query = query.where('isNew', String(isNew) === 'true');

		if (priceRange) {
			const [minPriceStr, maxPriceStr] = String(priceRange).split('-');
			const minPriceNum = Number(minPriceStr);
			const maxPriceNum = Number(maxPriceStr);
			const hasMin = !Number.isNaN(minPriceNum);
			const hasMax = !Number.isNaN(maxPriceNum);
			if (hasMin && hasMax) {
				query = query.whereBetween('price', [minPriceNum, maxPriceNum]);
			} else if (hasMin) {
				query = query.where('price', '>=', minPriceNum as any);
			} else if (hasMax) {
				query = query.where('price', '<=', maxPriceNum as any);
			}
		}

		if (authorId) query = query.where('authorId', authorId);

		const totalQuery = query.clone();
		const totalResult = await totalQuery.count('* as count');
		const total = Number(totalResult?.[0]?.count || 0);

		const validSortFields = ['createdAt', 'updatedAt', 'publishedAt', 'price', 'downloadCount', 'rating', 'sortOrder', 'title'];
		const validSortOrders = ['asc', 'desc'];
		const finalSortBy = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'updatedAt';
		const finalSortOrder = validSortOrders.includes(String(sortOrder)) ? (String(sortOrder) as 'asc' | 'desc') : 'desc';
		query = query.orderBy(finalSortBy, finalSortOrder);
		if (finalSortBy === 'sortOrder') {
			query = query.orderBy('downloadCount', 'desc');
		}

		const offset = (Number(page) - 1) * Number(limit);
		query = query.limit(Number(limit)).offset(offset);

		const workflows = await query;
		const processedWorkflows = workflows.map((workflow: any) => ({
			...workflow,
			tags: workflow.tags ? JSON.parse(workflow.tags) : [],
			gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
			features: workflow.features ? JSON.parse(workflow.features) : [],
			changelog: workflow.changelog ? JSON.parse(workflow.changelog) : [],
			seoKeywords: workflow.seoKeywords ? JSON.parse(workflow.seoKeywords) : [],
			compatibility: workflow.compatibility ? JSON.parse(workflow.compatibility) : {},
			dependencies: workflow.dependencies ? JSON.parse(workflow.dependencies) : [],
			attachments: workflow.attachments ? JSON.parse(workflow.attachments) : []
		}));

		const totalPages = Math.max(1, Math.ceil(total / Number(limit)));
		const hasNext = Number(page) < totalPages;
		const hasPrev = Number(page) > 1;

		return res.json({
			success: true,
			data: {
				workflows: processedWorkflows,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					totalPages,
					hasNext,
					hasPrev
				}
			}
		});
	} catch (error) {
		console.error('管理员获取工作流列表失败:', error);
		return res.status(500).json({
			success: false,
			error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
			code: 'SERVER_ERROR'
		});
	}
});

// 管理员获取单个工作流详情
router.get('/:id', requireAdminAuth, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const workflow = await db('workflows').where('id', id).first();
		if (!workflow) {
			return res.status(404).json({ success: false, error: '工作流不存在', code: 'WORKFLOW_NOT_FOUND' });
		}
		const processed = {
			...workflow,
			tags: workflow.tags ? JSON.parse(workflow.tags) : [],
			gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
			features: workflow.features ? JSON.parse(workflow.features) : [],
			changelog: workflow.changelog ? JSON.parse(workflow.changelog) : [],
			seoKeywords: workflow.seoKeywords ? JSON.parse(workflow.seoKeywords) : [],
			compatibility: workflow.compatibility ? JSON.parse(workflow.compatibility) : {},
			dependencies: workflow.dependencies ? JSON.parse(workflow.dependencies) : [],
			content: workflow.content ? JSON.parse(workflow.content) : null,
			attachments: workflow.attachments ? JSON.parse(workflow.attachments) : []
		};
		return res.json({ success: true, data: processed });
	} catch (error) {
		console.error('管理员获取工作流详情失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 管理员创建工作流
router.post('/', requireAdminAuth, async (req: any, res: Response) => {
	try {
		const data = req.body || {};
		const adminUser = req.user;
		const id = uuidv4();
		const now = new Date();
		const record = {
			id,
			code: 0, // 将在下面分配实际的code值
			title: data.title,
			description: data.description || '',
			shortDescription: data.shortDescription || '',
			author: adminUser?.username || 'admin',
			authorId: adminUser?.id,
			authorAvatar: '',
			price: data.price || 0,
			originalPrice: data.originalPrice || null,
			isVip: Boolean(data.isVip) || false,
			isFree: Boolean(data.isFree) || false,
			cover: '',
			previewVideo: '',
			demoVideo: '',
			gallery: JSON.stringify(data.gallery || []),
			attachments: JSON.stringify([]),
			category: data.category || 'general',
			subcategory: data.subcategory || '',
			tags: JSON.stringify(data.tags || []),
			status: data.status || 'draft',
			sortOrder: data.sortOrder || 0,
			isHot: Boolean(data.isHot) || false,
			isNew: data.isNew === undefined ? true : Boolean(data.isNew),
			workflowCount: data.workflowCount || 1,
			downloadCount: 0,
			rating: 0,
			ratingCount: 0,
			version: data.version || '1.0.0',
			compatibility: JSON.stringify(data.compatibility || {}),
			dependencies: JSON.stringify(data.dependencies || []),
			requirements: data.requirements || '',
			features: JSON.stringify(data.features || []),
			changelog: JSON.stringify(data.changelog || []),
			seoTitle: data.seoTitle || '',
			seoDescription: data.seoDescription || '',
			seoKeywords: JSON.stringify(data.seoKeywords || []),
			content: JSON.stringify(data.content || {}),
			createdAt: now,
			updatedAt: now,
			publishedAt: data.status === 'published' ? now : null
		};

		if (!record.title) {
			return res.status(400).json({ success: false, error: '标题为必填项', code: 'VALIDATION_ERROR' });
		}

		const code = await allocateWorkflowCode();
		record.code = code;
		// 预创建工作流专属目录
		try { 
			const workflowDir = getWorkflowDirByCode(code);
			console.log(`Admin created workflow directory for code ${code}: ${workflowDir}`);
		} catch (error) {
			console.error(`Admin failed to create workflow directory for code ${code}:`, error);
			// 不要阻止工作流创建，但要记录错误
		}
		
		// 首先处理媒体文件
		const movedCover = moveIfLocal(data.cover, code, 'images');
		const movedPreview = moveIfLocal(data.previewVideo, code, 'videos');
		const movedDemo = moveIfLocal(data.demoVideo, code, 'videos');
		const movedGallery = Array.isArray(data.gallery)
			? data.gallery.map((u: string) => moveIfLocal(u, code, 'images') || u)
			: [];
		const movedAttachments = Array.isArray((data as any).attachments)
			? ((data as any).attachments as any[]).map((u) => moveIfLocal(u as any, code, 'files') || u)
			: [];
		
		// 更新记录中的媒体字段
		record.cover = movedCover || data.cover || '';
		record.previewVideo = movedPreview || data.previewVideo || '';
		record.demoVideo = movedDemo || data.demoVideo || '';
		record.gallery = JSON.stringify(movedGallery);
		record.attachments = JSON.stringify(movedAttachments);
		
		await db('workflows').insert(record);

		return res.status(201).json({ success: true, message: '创建成功', data: { id, code } });
	} catch (error) {
		console.error('管理员创建工作流失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 管理员复制工作流（深拷贝媒体与附件，分配新ID与目录）
router.post('/:id/duplicate', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const src = await db('workflows').where('id', id).first();
    if (!src) {
      return res.status(404).json({ success: false, error: '源工作流不存在', code: 'WORKFLOW_NOT_FOUND' });
    }

    const now = new Date();
    const newId = uuidv4();
    const newCode = await allocateWorkflowCode();

    // 🔧 修复: 创建新工作流目录结构
    try {
      const newWorkflowDir = getWorkflowDirByCode(newCode);
      console.log(`📁 为新工作流创建目录: ${newWorkflowDir}`);
    } catch (error) {
      console.error(`❌ 创建工作流目录失败 (code=${newCode}):`, error);
    }

    // 复制媒体：对于 /uploads 路径将复制/迁移到新 code 目录
    console.log(`🔄 开始复制源工作流 ${src.id} 的媒体文件到新工作流 ${newCode}`);
    const newCover = moveIfLocal(src.cover, newCode, 'images');
    const newPreview = moveIfLocal(src.previewVideo, newCode, 'videos');
    const newDemo = moveIfLocal(src.demoVideo, newCode, 'videos');
    const srcGallery: string[] = src.gallery ? JSON.parse(src.gallery) : [];
    const newGallery = Array.isArray(srcGallery) ? srcGallery.map((u) => moveIfLocal(u, newCode, 'images') || u) : [];
    const srcAttachments: string[] = src.attachments ? JSON.parse(src.attachments) : [];
    const newAttachments = Array.isArray(srcAttachments) ? srcAttachments.map((u) => moveIfLocal(u, newCode, 'files') || u) : [];
    
    console.log(`✅ 媒体文件复制完成:`, {
      cover: newCover,
      preview: newPreview,
      demo: newDemo,
      galleryCount: newGallery.length,
      attachmentCount: newAttachments.length
    });

    const record = {
      id: newId,
      code: newCode,
      title: `${src.title || '未命名'} 副本`,
      description: src.description || '',
      shortDescription: src.shortDescription || '',
      author: src.author,
      authorId: src.authorId,
      authorAvatar: src.authorAvatar || '',
      price: src.price || 0,
      originalPrice: src.originalPrice || null,
      isVip: Boolean(src.isVip) || false,
      isFree: Boolean(src.isFree) || false,
      cover: newCover || src.cover || '',
      previewVideo: newPreview || src.previewVideo || '',
      demoVideo: newDemo || src.demoVideo || '',
      gallery: JSON.stringify(newGallery),
      attachments: JSON.stringify(newAttachments),
      category: src.category || 'general',
      subcategory: src.subcategory || '',
      tags: src.tags || '[]',
      status: 'published', // 🔧 修复: 复制的工作流应该保持发布状态以在商店中显示
      sortOrder: Math.max(src.sortOrder || 0, 1000), // 🔧 复制的工作流设置更高排序值以便在前面显示
      isHot: Boolean(src.isHot), // 🔧 保持原有热门状态
      isNew: true, // 🔧 新复制的工作流标记为新品
      isDailyRecommended: false,
      workflowCount: src.workflowCount || 1,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      version: src.version || '1.0.0',
      compatibility: src.compatibility || '{}',
      dependencies: src.dependencies || '[]',
      requirements: src.requirements || '',
      features: src.features || '[]',
      changelog: '[]',
      seoTitle: src.seoTitle || '',
      seoDescription: src.seoDescription || '',
      seoKeywords: src.seoKeywords || '[]',
      content: src.content || '{}',
      createdAt: now,
      updatedAt: now,
      publishedAt: now // 🔧 修复: 设置发布时间与创建时间一致
    } as any;

    await db('workflows').insert(record);
    console.log(`🎉 工作流复制成功: ${src.title} -> ${record.title} (ID: ${newId}, Code: ${newCode})`);
    return res.status(201).json({ 
      success: true, 
      data: { 
        id: newId, 
        code: newCode,
        title: record.title,
        message: '工作流复制成功，已发布到商店'
      } 
    });
  } catch (error) {
    console.error('管理员复制工作流失败:', error);
    return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
  }
});

// 管理员更新工作流（忽略作者归属）
router.put('/:id', requireAdminAuth, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const data: any = req.body || {};

		const workflow = await db('workflows').where('id', id).first();
		if (!workflow) {
			return res.status(404).json({ success: false, error: '工作流不存在', code: 'WORKFLOW_NOT_FOUND' });
		}

		const updateFields: any = { updatedAt: new Date() };
		const allowedFields = [
			'title', 'description', 'shortDescription', 'price', 'originalPrice',
			'isVip', 'isFree', 'cover', 'previewVideo', 'demoVideo', 'category',
			'subcategory', 'status', 'sortOrder', 'isHot', 'isNew', 'workflowCount',
			'version', 'requirements', 'seoTitle', 'seoDescription', 'isDailyRecommended'
		];
		allowedFields.forEach((f) => { if (data[f] !== undefined) updateFields[f] = data[f]; });

		const jsonFields = ['gallery', 'tags', 'compatibility', 'dependencies', 'features', 'changelog', 'seoKeywords', 'content'];
		jsonFields.forEach((f) => { if (data[f] !== undefined) updateFields[f] = JSON.stringify(data[f]); });

		if (data.status === 'published' && workflow.status !== 'published') {
			updateFields.publishedAt = new Date();
		}

		// 业务规则：每日推荐最多 3 个（不统计已归档的数据）
		if (data.isDailyRecommended === true) {
			const countRow = await db('workflows')
				.count<{ count: number }>({ count: '*' })
				.where('isDailyRecommended', true)
				.andWhereNot('id', id)
				.andWhereNot('status', 'archived')
				.first();
			const currentCount = Number((countRow as any)?.count || 0);
			if (currentCount >= 3) {
				return res.status(400).json({
					success: false,
					error: '每日推荐数量已达上限（3个）',
					code: 'DAILY_LIMIT_REACHED'
				});
			}
		}

		await db('workflows').where('id', id).update(updateFields);

		// 如有媒体字段更新，迁移至专属目录
		if ((data as any).cover !== undefined || (data as any).previewVideo !== undefined || (data as any).demoVideo !== undefined || (data as any).gallery !== undefined || (data as any).attachments !== undefined) {
			const code = (workflow as any).code as number | null;
			if (typeof code === 'number' && code > 0) {
				const movedCover = moveIfLocal((data as any).cover, code, 'images');
				const movedPreview = moveIfLocal((data as any).previewVideo, code, 'videos');
				const movedDemo = moveIfLocal((data as any).demoVideo, code, 'videos');
				const movedGallery = Array.isArray((data as any).gallery)
					? ((data as any).gallery as any[]).map((u) => moveIfLocal(u as any, code, 'images') || u)
					: undefined;
				const movedAttachments = Array.isArray((data as any).attachments)
					? ((data as any).attachments as any[]).map((u) => moveIfLocal(u as any, code, 'files') || u)
					: undefined;
				const finalCover = (data as any).cover !== undefined ? (movedCover || (data as any).cover || '') : (workflow as any).cover;
				const finalPreview = (data as any).previewVideo !== undefined ? (movedPreview || (data as any).previewVideo || '') : (workflow as any).previewVideo;
				const finalDemo = (data as any).demoVideo !== undefined ? (movedDemo || (data as any).demoVideo || '') : (workflow as any).demoVideo;
				const finalGallery = movedGallery !== undefined ? (movedGallery as any) : JSON.parse((workflow as any).gallery || '[]');
				const finalAttachments = movedAttachments !== undefined ? (movedAttachments as any) : JSON.parse((workflow as any).attachments || '[]');

				await db('workflows').where('id', id).update({
					cover: finalCover,
					previewVideo: finalPreview,
					demoVideo: finalDemo,
					gallery: JSON.stringify(finalGallery),
					attachments: JSON.stringify(finalAttachments),
					updatedAt: new Date()
				});

				// 清理未引用的旧文件，实现覆盖效果
				const keepImages: string[] = [];
				const cname = extractBasenameIfInWorkflow(finalCover, code); if (cname) keepImages.push(cname);
				(Array.isArray(finalGallery) ? finalGallery : []).forEach((u: string) => { const n = extractBasenameIfInWorkflow(u, code); if (n) keepImages.push(n); });
				const keepVideos: string[] = [];
				const pn = extractBasenameIfInWorkflow(finalPreview, code); if (pn) keepVideos.push(pn);
				const dn = extractBasenameIfInWorkflow(finalDemo, code); if (dn) keepVideos.push(dn);
				const keepFiles: string[] = [];
				(Array.isArray(finalAttachments) ? finalAttachments : []).forEach((u: string) => { const n = extractBasenameIfInWorkflow(u, code); if (n) keepFiles.push(n); });
				cleanupUnusedMediaFiles(code, { images: keepImages, videos: keepVideos, files: keepFiles });
			}
		}

		return res.json({ success: true, message: '更新成功' });
	} catch (error) {
		console.error('管理员更新工作流失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

// 管理员删除工作流（软删除）
router.delete('/:id', requireAdminAuth, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const workflow = await db('workflows').where('id', id).first();
		if (!workflow) {
			return res.status(404).json({ success: false, error: '工作流不存在', code: 'WORKFLOW_NOT_FOUND' });
		}
		// 软删除时同步清除每日推荐标记，避免占用名额
		await db('workflows').where('id', id).update({ status: 'archived', isDailyRecommended: false, updatedAt: new Date() });
		if ((workflow as any).code) {
			const codeNum = Number((workflow as any).code);
			await releaseWorkflowCode(codeNum);
			await db('workflows').where('id', id).update({ code: null, updatedAt: new Date() });
			// 可选：清理专属目录
			try {
				const dir = getWorkflowDirByCode(codeNum);
				if (fs.existsSync(dir)) {
					fs.rmSync(dir, { recursive: true, force: true });
				}
			} catch {}
		}
		return res.json({ success: true, message: '删除成功' });
	} catch (error) {
		console.error('管理员删除工作流失败:', error);
		return res.status(500).json({ success: false, error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR, code: 'SERVER_ERROR' });
	}
});

export default router;
