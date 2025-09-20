import { Router, Request, Response } from 'express';
import { db } from '../database/init.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_CONSTANTS } from '../config/constants.js';
import { ExtendedWorkflow, WorkflowQueryParams, WorkflowCreateInput } from '../types/workflow.js';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 目录工具：uploads/workflows/{code}/{images|videos|files}
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// 更健壮的后端根目录解析（兼容 src/dist/软链）
// 放宽条件：命中第一个包含 uploads 的候选目录
const BACKEND_ROOT_CANDIDATES = [
  path.resolve(process.cwd(), 'backend'),
  path.resolve(process.cwd()),
  path.resolve(process.cwd(), '..'),
  path.resolve(process.cwd(), '..', 'backend')
];
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
  try { return fs.existsSync(path.join(p, 'uploads')); } catch { return false; }
}) || path.resolve(process.cwd(), 'backend');
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
  // 将绝对路径映射为 /uploads 相对URL
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
    } catch {
      return null;
    }
  }
  return null;
}

function cleanupUnusedMediaFiles(code: number, keep: {
  images: string[];
  videos: string[];
  files: string[];
}) {
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
  // 寻找未分配的最小 code；若没有则取 max+1，从1开始
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
  
  console.log(`moveIfLocal called: code=${code}, kind=${kind}, inputUrl=${inputUrl.substring(0, 50)}...`);
  
  // 支持 data:image/*;base64, 封面截帧场景
  if (kind === 'images' && typeof inputUrl === 'string' && inputUrl.startsWith('data:image/')) {
    try {
      const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(inputUrl);
      if (match) {
        const detected = (match[1] || 'png').toLowerCase();
        const ext = detected === 'jpeg' ? 'jpg' : detected;
        const base64: string = match[2] || '';
        const buffer = Buffer.from(base64, 'base64');
        const dir = path.join(getWorkflowDirByCode(code), 'images');
        console.log(`Processing base64 image: ext=${ext}, bufferSize=${buffer.length}, targetDir=${dir}`);
        ensureDir(dir);
        const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const targetAbs = path.join(dir, filename);
        console.log(`Writing file to: ${targetAbs}`);
        fs.writeFileSync(targetAbs, buffer);
        const publicUrl = toPublicUrl(targetAbs);
        console.log(`File written successfully, returning URL: ${publicUrl}`);
        return publicUrl;
      }
    } catch (error) {
      console.error('Failed to process base64 image:', error);
    }
  }
  // 仅迁移项目内 /uploads 路径
  if (!inputUrl.startsWith('/uploads/')) return inputUrl;
  try {
    const filename = path.basename(inputUrl);
    // 兼容 Windows：去掉前导斜杠再拼接到项目根目录
    const relativeFromRoot = inputUrl.replace(/^\/+/, '');
    let sourceAbs = path.join(PROJECT_ROOT, relativeFromRoot);
    if (!fs.existsSync(sourceAbs)) {
      const alt1 = path.join(PROJECT_ROOT, 'backend', relativeFromRoot);
      if (fs.existsSync(alt1)) sourceAbs = alt1;
    }
    if (!fs.existsSync(sourceAbs)) {
      const alt2 = path.resolve(process.cwd(), relativeFromRoot);
      if (fs.existsSync(alt2)) sourceAbs = alt2;
    }
    const targetDir = getWorkflowDirByCode(code);
    const targetAbs = path.join(targetDir, kind, filename);
    ensureDir(path.dirname(targetAbs));
    if (fs.existsSync(sourceAbs)) {
      // 同路径保护
      if (path.resolve(sourceAbs) === path.resolve(targetAbs)) {
        return toPublicUrl(targetAbs);
      }
      // 确保覆盖目标文件
      try { if (fs.existsSync(targetAbs)) fs.rmSync(targetAbs, { force: true }); } catch {}
      fs.renameSync(sourceAbs, targetAbs);
      return toPublicUrl(targetAbs);
    }
  } catch {
    // ignore move error, keep original url
  }
  return inputUrl;
}

// 获取工作流列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      subcategory = '',
      tags = '',
      status = 'published',
      isVip,
      isFree,
      isHot,
      isNew,
      priceRange = '',
      authorId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as any;

    // 构建查询
    let query = db('workflows').select('*');

    // 状态筛选（默认只显示已发布的）
    if (status) {
      query = query.where('status', status);
    }

    // 搜索功能 - 增强的全文搜索（防SQL注入）
    if (search) {
      const searchTerms = search.trim().split(/\s+/).slice(0, 10); // 限制搜索词数量
      query = query.where(function() {
        searchTerms.forEach((term: string) => {
          // 清理搜索词，防止SQL注入
          const cleanTerm = term.replace(/[%_\\]/g, '\\$&').substring(0, 100);
          this.orWhere(function() {
            this.where('title', 'like', `%${cleanTerm}%`)
                .orWhere('description', 'like', `%${cleanTerm}%`)
                .orWhere('shortDescription', 'like', `%${cleanTerm}%`)
                .orWhere('author', 'like', `%${cleanTerm}%`)
                .orWhere('requirements', 'like', `%${cleanTerm}%`)
                .orWhereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%"${cleanTerm}"%`])
                .orWhereRaw('JSON_EXTRACT(features, "$") LIKE ?', [`%${cleanTerm}%`]);
          });
        });
      });
    }

    // 分类筛选
    if (category) {
      query = query.where('category', category);
    }
    if (subcategory) {
      query = query.where('subcategory', subcategory);
    }

    // 标签筛选（防SQL注入）
    if (tags) {
      const tagArray = tags.split(',').map((tag: string) => tag.trim()).slice(0, 20); // 限制标签数量
      query = query.where(function() {
        tagArray.forEach((tag: string) => {
          // 清理标签，防止SQL注入
          const cleanTag = tag.replace(/[%_\\]/g, '\\$&').substring(0, 50);
          if (cleanTag.length > 0) {
            this.orWhereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%"${cleanTag}"%`]);
          }
        });
      });
    }

    // VIP筛选
    if (isVip !== undefined) {
      query = query.where('isVip', isVip === 'true');
    }

    // 免费筛选
    if (isFree !== undefined) {
      query = query.where('isFree', isFree === 'true');
    }

    // 热门筛选
    if (isHot !== undefined) {
      query = query.where('isHot', isHot === 'true');
    }

    // 新品筛选
    if (isNew !== undefined) {
      query = query.where('isNew', isNew === 'true');
    }

    // 价格区间筛选
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      if (minPrice !== undefined) query = query.where('price', '>=', minPrice);
      if (maxPrice !== undefined) query = query.where('price', '<=', maxPrice);
    }

    // 作者筛选
    if (authorId) {
      query = query.where('authorId', authorId);
    }

    // 获取总数（用于分页）
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count');
    const total = totalResult[0]?.count || 0;

    // 排序
    const validSortFields = ['createdAt', 'updatedAt', 'publishedAt', 'price', 'downloadCount', 'rating', 'sortOrder', 'title'];
    const validSortOrders = ['asc', 'desc'];
    
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    query = query.orderBy(finalSortBy, finalSortOrder);

    // 如果按热度排序，添加二级排序
    if (finalSortBy === 'sortOrder') {
      query = query.orderBy('downloadCount', 'desc');
    }

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    query = query.limit(Number(limit)).offset(offset);

    // 执行查询
    const workflows = await query;

    // 解析JSON字段
    const processedWorkflows = workflows.map(workflow => ({
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

    const totalPages = Math.max(1, Math.ceil(Number(total) / Number(limit)));
    const hasNext = Number(page) < totalPages;
    const hasPrev = Number(page) > 1;

    return res.json({
      success: true,
      data: {
        items: processedWorkflows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total),
          totalPages,
          hasNext,
          hasPrev
        }
      }
    });

  } catch (error) {
    console.error('获取工作流列表失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取工作流详情
// 注意路由顺序：更具体的路径需注册在 ":id" 之前，避免被误匹配
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const workflow = await db('workflows')
      .where('id', id)
      .first();

    if (!workflow) {
      return res.status(404).json({ success: false, error: '资源未找到', code: 'WORKFLOW_NOT_FOUND' });
    }

    // 仅作者或管理员可查看非发布状态
    const isAdmin = Boolean(req.user?.isAdmin);
    const isAuthor = req.user?.id && workflow.authorId === req.user.id;
    const isPublished = workflow.status === 'published';
    if (!isPublished && !isAuthor && !isAdmin) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在',
        code: 'WORKFLOW_NOT_FOUND'
      });
    }

    // 解析JSON字段
    const processedWorkflow = {
      ...workflow,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
      features: workflow.features ? JSON.parse(workflow.features) : [],
      changelog: workflow.changelog ? JSON.parse(workflow.changelog) : [],
      seoKeywords: workflow.seoKeywords ? JSON.parse(workflow.seoKeywords) : [],
      compatibility: workflow.compatibility ? JSON.parse(workflow.compatibility) : {},
      dependencies: workflow.dependencies ? JSON.parse(workflow.dependencies) : [],
      // 未购买者隐藏内容，作者/管理员或已购用户可见
      content: undefined,
      attachments: workflow.attachments ? JSON.parse(workflow.attachments) : []
    };

    // 判断是否已购买或符合免费策略
    let canViewContent = false;
    if (isAuthor || isAdmin) {
      canViewContent = true;
    } else if (req.user?.id) {
      const purchased = await db('order_items')
        .join('orders', 'order_items.orderId', 'orders.id')
        .where('orders.userId', req.user.id)
        .where('order_items.workflowId', id)
        .where('orders.status', 'paid')
        .first();
      const vipFree = Boolean((workflow as any).isVip) && Boolean(req.user?.isVip);
      const isFreeForAll = Boolean((workflow as any).isFree);
      canViewContent = Boolean(purchased) || vipFree || isFreeForAll;
    }

    if (canViewContent) {
      (processedWorkflow as any).content = workflow.content ? JSON.parse(workflow.content) : null;
    }

    // 增加浏览量（可选）
    await db('workflows')
      .where('id', id)
      .increment('viewCount', 1);

    return res.json({
      success: true,
      data: processedWorkflow
    });

  } catch (error) {
    console.error('获取工作流详情失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取推荐工作流
router.get('/featured/recommended', async (req: Request, res: Response) => {
  try {
    const { limit = 6 } = req.query;

    const workflows = await db('workflows')
      .where('status', 'published')
      .where(function() {
        this.where('isHot', true)
            .orWhere('status', 'featured');
      })
      .orderBy('sortOrder', 'desc')
      .orderBy('downloadCount', 'desc')
      .limit(Number(limit));

    const processedWorkflows = workflows.map(workflow => ({
      ...workflow,
      tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      gallery: workflow.gallery ? JSON.parse(workflow.gallery) : [],
      features: workflow.features ? JSON.parse(workflow.features) : []
    }));

    return res.json({
      success: true,
      data: processedWorkflows
    });

  } catch (error) {
    console.error('获取推荐工作流失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取每日推荐（最多3个，没有每日推荐时返回热门工作流）
router.get('/recommended/daily', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(3, Number((req.query as any)?.limit || 3));
    
    // 首先尝试获取每日推荐
    let workflows = await db('workflows')
      .where('status', 'published')
      .andWhere('isDailyRecommended', true)
      .orderBy('sortOrder', 'desc')
      .orderBy('publishedAt', 'desc')
      .limit(limit);

    // 如果没有每日推荐，则返回最热门的工作流作为备用
    if (workflows.length === 0) {
      console.log('📝 没有设置每日推荐，使用热门工作流作为备用');
      workflows = await db('workflows')
        .where('status', 'published')
        .orderBy('viewCount', 'desc')
        .orderBy('downloadCount', 'desc')
        .orderBy('publishedAt', 'desc')
        .limit(limit);
    }

    const processed = workflows.map((w: any) => ({
      ...w,
      tags: w.tags ? JSON.parse(w.tags) : [],
      gallery: w.gallery ? JSON.parse(w.gallery) : [],
      features: w.features ? JSON.parse(w.features) : []
    }));

    return res.json({ success: true, data: processed });
  } catch (error) {
    console.error('获取每日推荐失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取热门标签
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    // 从数据库中获取所有已发布工作流的标签
    const workflows = await db('workflows')
      .select('tags')
      .where('status', 'published')
      .whereNotNull('tags');

    // 统计标签出现频率
    const tagCount: { [key: string]: number } = {};
    
    workflows.forEach(workflow => {
      if (workflow.tags) {
        const tags = JSON.parse(workflow.tags);
        tags.forEach((tag: string) => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    // 按频率排序，取前20个
    const popularTags = Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return res.json({
      success: true,
      data: popularTags
    });

  } catch (error) {
    console.error('获取热门标签失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 获取工作流分类
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    // 从数据库中获取所有分类和子分类
    const categories = await db('workflows')
      .select('category', 'subcategory')
      .where('status', 'published')
      .groupBy('category', 'subcategory')
      .orderBy('category');

    // 组织分类结构
    const categoryMap: { [key: string]: Set<string> } = {};
    
    categories.forEach(({ category, subcategory }) => {
      if (!categoryMap[category]) {
        categoryMap[category] = new Set();
      }
      if (subcategory) {
        categoryMap[category].add(subcategory);
      }
    });

    const result = Object.entries(categoryMap).map(([category, subcategories]) => ({
      category,
      subcategories: Array.from(subcategories)
    }));

    return res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取分类列表失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 创建工作流（需要认证）
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const workflowData: WorkflowCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户认证失败',
        code: 'AUTH_ERROR'
      });
    }

    // 输入验证（仅标题必填，描述可为空）
    if (!workflowData.title) {
      return res.status(400).json({
        success: false,
        error: '标题为必填项',
        code: 'VALIDATION_ERROR'
      });
    }

    // 获取用户信息
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 仅管理员允许创建
    const isAdmin = user.email === 'admin@wz.com' || user.username === 'admin' || user.isAdmin === true;
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: '权限不足', code: 'FORBIDDEN' });
    }

    const workflowId = uuidv4();
    const now = new Date();
    const code = await allocateWorkflowCode();
    // 预创建工作流专属目录（即使没有媒体也创建）
    try { 
      const workflowDir = getWorkflowDirByCode(code);
      console.log(`Created workflow directory for code ${code}: ${workflowDir}`);
    } catch (error) {
      console.error(`Failed to create workflow directory for code ${code}:`, error);
      // 不要阻止工作流创建，但要记录错误
    }

    // 首先处理媒体文件，特别是 base64 图片
    const movedCover = moveIfLocal(workflowData.cover, code, 'images');
    const movedPreview = moveIfLocal(workflowData.previewVideo, code, 'videos');
    const movedDemo = moveIfLocal(workflowData.demoVideo, code, 'videos');
    const movedGallery = Array.isArray(workflowData.gallery)
      ? workflowData.gallery.map((u) => moveIfLocal(u, code, 'images') || u)
      : [];

    const newWorkflow = {
      id: workflowId,
      code,
      title: workflowData.title,
      description: workflowData.description || '',
      shortDescription: workflowData.shortDescription || '',
      author: user.username,
      authorId: userId,
      authorAvatar: user.avatar || '',
      price: workflowData.price || 0,
      originalPrice: workflowData.originalPrice || null,
      isVip: workflowData.isVip || false,
      isFree: workflowData.isFree || false,
      cover: movedCover || workflowData.cover || '',
      previewVideo: movedPreview || workflowData.previewVideo || '',
      demoVideo: movedDemo || workflowData.demoVideo || '',
      gallery: JSON.stringify(movedGallery),
      attachments: JSON.stringify([]),
      category: workflowData.category || 'general',
      subcategory: workflowData.subcategory || '',
      tags: JSON.stringify(workflowData.tags || []),
      status: workflowData.status || 'draft',
      sortOrder: workflowData.sortOrder || 0,
      isHot: workflowData.isHot || false,
      isNew: workflowData.isNew || true,
      workflowCount: workflowData.workflowCount || 1,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      version: workflowData.version || '1.0.0',
      compatibility: JSON.stringify(workflowData.compatibility || {}),
      dependencies: JSON.stringify(workflowData.dependencies || []),
      requirements: workflowData.requirements || '',
      features: JSON.stringify(workflowData.features || []),
      changelog: JSON.stringify(workflowData.changelog || []),
      seoTitle: workflowData.seoTitle || '',
      seoDescription: workflowData.seoDescription || '',
      seoKeywords: JSON.stringify(workflowData.seoKeywords || []),
      content: JSON.stringify(workflowData.content || {}),
      createdAt: now,
      updatedAt: now,
      publishedAt: workflowData.status === 'published' ? now : null
    };

    // 直接插入包含已处理媒体文件的工作流
    await db('workflows').insert(newWorkflow);

    return res.status(201).json({
      success: true,
      message: '工作流创建成功',
      data: {
        id: newWorkflow.id,
        code: newWorkflow.code,
        title: newWorkflow.title,
        price: newWorkflow.price
      }
    });

  } catch (error) {
    console.error('创建工作流失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 更新工作流（需要认证）
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id;

    // 检查工作流是否存在且用户有权限修改
    const workflow = await db('workflows').where('id', id).first();
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在',
        code: 'WORKFLOW_NOT_FOUND'
      });
    }

    if (workflow.authorId !== userId) {
      return res.status(403).json({
        success: false,
        error: '无权限修改此工作流',
        code: 'PERMISSION_DENIED'
      });
    }

    // 构建更新数据
    const updateFields: any = {
      updatedAt: new Date()
    };

    // 只更新提供的字段
    const allowedFields = [
      'title', 'description', 'shortDescription', 'price', 'originalPrice',
      'isVip', 'isFree', 'cover', 'previewVideo', 'demoVideo', 'category',
      'subcategory', 'status', 'sortOrder', 'isHot', 'isNew', 'workflowCount',
      'version', 'requirements', 'seoTitle', 'seoDescription'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    });

    // 处理JSON字段
    const jsonFields = ['gallery', 'tags', 'compatibility', 'dependencies', 'features', 'changelog', 'seoKeywords', 'content', 'attachments'];
    jsonFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields[field] = JSON.stringify(updateData[field]);
      }
    });

    // 如果状态变为已发布，设置发布时间
    if (updateData.status === 'published' && workflow.status !== 'published') {
      updateFields.publishedAt = new Date();
    }

    await db('workflows').where('id', id).update(updateFields);

    // 如果有媒体字段更新，尝试迁移到独立目录
    if (updateData.cover !== undefined || updateData.previewVideo !== undefined || updateData.demoVideo !== undefined || updateData.gallery !== undefined || updateData.attachments !== undefined) {
      const code = (workflow as any).code as number | null;
      if (typeof code === 'number' && code > 0) {
        const movedCover = moveIfLocal(updateData.cover, code, 'images');
        const movedPreview = moveIfLocal(updateData.previewVideo, code, 'videos');
        const movedDemo = moveIfLocal(updateData.demoVideo, code, 'videos');
        const movedGallery = Array.isArray(updateData.gallery)
          ? (updateData.gallery as any[]).map((u) => moveIfLocal(u as any, code, 'images') || u)
          : undefined;
        const movedAttachments = Array.isArray(updateData.attachments)
          ? (updateData.attachments as any[]).map((u) => moveIfLocal(u as any, code, 'files') || u)
          : undefined;

        const finalCover = updateData.cover !== undefined ? (movedCover || updateData.cover || '') : (workflow as any).cover;
        const finalPreview = updateData.previewVideo !== undefined ? (movedPreview || updateData.previewVideo || '') : (workflow as any).previewVideo;
        const finalDemo = updateData.demoVideo !== undefined ? (movedDemo || updateData.demoVideo || '') : (workflow as any).demoVideo;
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

        // 清理未被引用的旧文件，实现覆盖效果
        const keepImages: string[] = [];
        const coverName = extractBasenameIfInWorkflow(finalCover, code); if (coverName) keepImages.push(coverName);
        (Array.isArray(finalGallery) ? finalGallery : []).forEach((u: string) => {
          const n = extractBasenameIfInWorkflow(u, code); if (n) keepImages.push(n);
        });
        const keepVideos: string[] = [];
        const pvName = extractBasenameIfInWorkflow(finalPreview, code); if (pvName) keepVideos.push(pvName);
        const dvName = extractBasenameIfInWorkflow(finalDemo, code); if (dvName) keepVideos.push(dvName);
        const keepFiles: string[] = [];
        (Array.isArray(finalAttachments) ? finalAttachments : []).forEach((u: string) => {
          const n = extractBasenameIfInWorkflow(u, code); if (n) keepFiles.push(n);
        });
        cleanupUnusedMediaFiles(code, { images: keepImages, videos: keepVideos, files: keepFiles });
      }
    }

    return res.json({
      success: true,
      message: '工作流更新成功'
    });

  } catch (error) {
    console.error('更新工作流失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

// 删除工作流（需要认证）
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 检查工作流是否存在且用户有权限删除
    const workflow = await db('workflows').where('id', id).first();
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在',
        code: 'WORKFLOW_NOT_FOUND'
      });
    }

    if (workflow.authorId !== userId) {
      return res.status(403).json({
        success: false,
        error: '无权限删除此工作流',
        code: 'PERMISSION_DENIED'
      });
    }

    // 软删除：将状态设置为 archived，同时清除每日推荐标记，并回收编号
    await db('workflows').where('id', id).update({
      status: 'archived',
      isDailyRecommended: false,
      updatedAt: new Date()
    });

    // 回收编号
    if (workflow.code) {
      await releaseWorkflowCode(Number(workflow.code));
      await db('workflows').where('id', id).update({ code: null, updatedAt: new Date() });
      // 可选：清理专属目录
      try {
        const dir = getWorkflowDirByCode(Number(workflow.code));
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch {}
    }

    return res.json({
      success: true,
      message: '工作流删除成功'
    });

  } catch (error) {
    console.error('删除工作流失败:', error);
    return res.status(500).json({
      success: false,
      error: SYSTEM_CONSTANTS.ERROR_MESSAGES.INTERNAL_ERROR,
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
