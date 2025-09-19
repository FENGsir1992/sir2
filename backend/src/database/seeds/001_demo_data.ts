import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // 清理现有数据
  await knex('order_items').del();
  await knex('orders').del();
  await knex('payments').del();
  await knex('cart_items').del();
  await knex('workflows').del();
  await knex('membership_plans').del();
  await knex('uploaded_files').del();
  await knex('users').del();

  // 创建测试用户
  const users = [
    {
      id: uuidv4(),
      username: '湾旁AI智能体',
      email: 'admin@wz.com',
      passwordHash: await bcrypt.hash('123456', 10),
      avatar: '/TX.jpg',
      isVip: true,
      vipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
      balance: 1000.00,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      username: 'AIGC小叮当',
      email: 'user1@wz.com',
      passwordHash: await bcrypt.hash('123456', 10),
      avatar: '/TX.jpg',
      isVip: false,
      balance: 50.00,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      username: '阿一Coze智能体',
      email: 'user2@wz.com',
      passwordHash: await bcrypt.hash('123456', 10),
      avatar: '/TX.jpg',
      isVip: true,
      vipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
      balance: 200.00,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await knex('users').insert(users);

  // 创建工作流数据
  const workflows = [
    {
      id: uuidv4(),
      title: '灵魂画手抽象视频',
      description: '使用AI技术生成抽象艺术风格的视频内容，适合社交媒体分享。本工作流集成了最新的AI绘画技术，能够快速生成具有艺术感的抽象视频内容。',
      shortDescription: '使用AI技术生成抽象艺术风格的视频内容',
      author: '湾旁AI智能体',
      authorId: users[0]?.id || '',
      price: 99.99,
      originalPrice: 149.99,
      isVip: false,
      isFree: false,
      cover: '/uploads/images/workflow-cover-1.jpg',
      previewVideo: '/uploads/videos/preview-1.mp4',
      demoVideo: '/uploads/videos/demo-1.mp4',
      gallery: JSON.stringify([
        '/uploads/images/gallery-1-1.jpg',
        '/uploads/images/gallery-1-2.jpg',
        '/uploads/images/gallery-1-3.jpg'
      ]),
      category: 'video-generation',
      subcategory: 'abstract-art',
      tags: JSON.stringify(['视频生成', 'AI艺术', '抽象风格', '社交媒体']),
      status: 'published',
      sortOrder: 100,
      isHot: true,
      isNew: false,
      workflowCount: 2,
      downloadCount: 156,
      rating: 4.8,
      ratingCount: 32,
      version: '2.1.0',
      compatibility: JSON.stringify({
        'ComfyUI': '>=0.1.0',
        'Python': '>=3.8',
        'CUDA': '>=11.0'
      }),
      dependencies: JSON.stringify([
        'stable-diffusion-webui',
        'controlnet',
        'lora-models'
      ]),
      requirements: '需要至少8GB显存的NVIDIA显卡，推荐RTX 3080或更高配置',
      features: JSON.stringify([
        '支持多种抽象艺术风格',
        '可自定义视频时长和分辨率',
        '批量生成功能',
        '实时预览效果',
        '支持导出多种格式'
      ]),
      changelog: JSON.stringify([
        {
          version: '2.1.0',
          date: '2024-12-12',
          changes: ['优化渲染速度', '新增3种艺术风格', '修复内存泄漏问题']
        },
        {
          version: '2.0.0',
          date: '2024-11-20',
          changes: ['重构核心算法', '支持4K分辨率输出', '新增批量处理功能']
        }
      ]),
      seoTitle: '灵魂画手抽象视频生成器 - AI艺术视频制作工具',
      seoDescription: '专业的AI抽象艺术视频生成工具，支持多种风格，适合社交媒体内容创作',
      seoKeywords: JSON.stringify(['AI视频生成', '抽象艺术', '视频制作', 'ComfyUI', '社交媒体']),
      content: JSON.stringify({ 
        nodes: [
          { id: 'input', type: 'text_input', position: [0, 0] },
          { id: 'style', type: 'style_selector', position: [200, 0] },
          { id: 'generate', type: 'video_generator', position: [400, 0] },
          { id: 'output', type: 'video_output', position: [600, 0] }
        ], 
        connections: [
          { from: 'input', to: 'generate' },
          { from: 'style', to: 'generate' },
          { from: 'generate', to: 'output' }
        ]
      }),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
      updatedAt: new Date(),
      publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25天前发布
    },
    {
      id: uuidv4(),
      title: 'TK微恐爆款悬疑视频',
      description: '专为TikTok设计的悬疑短视频制作工作流，轻松制作爆款内容',
      author: 'AIGC小叮当',
      authorId: users[1]?.id || '',
      price: 49.90,
      isVip: true,
      isFree: false,
      tags: JSON.stringify(['TikTok', '悬疑', '短视频']),
      workflowCount: 1,
      downloadCount: 89,
      rating: 4.6,
      ratingCount: 18,
      content: JSON.stringify({ nodes: [], connections: [] }),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      title: '【阿一】十年之后未来婚相',
      description: '使用AI预测技术，生成未来婚礼场景和情侣形象',
      author: '阿一Coze智能体',
      authorId: users[2]?.id || '',
      price: 0,
      isVip: false,
      isFree: true,
      tags: JSON.stringify(['AI预测', '婚礼', '情侣']),
      workflowCount: 3,
      downloadCount: 234,
      rating: 4.9,
      ratingCount: 45,
      content: JSON.stringify({ nodes: [], connections: [] }),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      title: 'ComfyUI动件迁移',
      description: '专业的ComfyUI工作流迁移工具，支持批量转换和优化',
      author: '湾旁AI智能体',
      authorId: users[0]?.id || '',
      price: 199.00,
      isVip: true,
      isFree: false,
      tags: JSON.stringify(['ComfyUI', '工具', '迁移']),
      workflowCount: 1,
      downloadCount: 67,
      rating: 4.7,
      ratingCount: 12,
      content: JSON.stringify({ nodes: [], connections: [] }),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      title: '爆火心理情感|情侣-抖单视频',
      description: '专为情感类内容设计的视频制作工作流，适合抖音等平台',
      author: '茂茂',
      authorId: users[1]?.id || '',
      price: 49.90,
      isVip: false,
      isFree: false,
      tags: JSON.stringify(['情感', '抖音', '心理']),
      workflowCount: 1,
      downloadCount: 123,
      rating: 4.5,
      ratingCount: 28,
      content: JSON.stringify({ nodes: [], connections: [] }),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      title: 'Veo3各种自拍vlog',
      description: '使用最新Veo3技术制作高质量自拍vlog视频',
      author: 'AIGC画师',
      authorId: users[2]?.id || '',
      price: 79.90,
      isVip: false,
      isFree: false,
      tags: JSON.stringify(['Veo3', 'vlog', '自拍']),
      workflowCount: 2,
      downloadCount: 91,
      rating: 4.4,
      ratingCount: 15,
      content: JSON.stringify({ nodes: [], connections: [] }),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await knex('workflows').insert(workflows);

  // 创建会员套餐
  const membershipPlans = [
    {
      id: uuidv4(),
      name: '月度会员',
      description: '享受1个月的VIP特权',
      price: 29.90,
      duration: 30,
      features: JSON.stringify(['免费下载VIP工作流', '优先客服支持', '专属会员标识', '每月5个免费积分']),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      name: '季度会员',
      description: '享受3个月的VIP特权，更优惠',
      price: 79.90,
      duration: 90,
      features: JSON.stringify(['免费下载VIP工作流', '优先客服支持', '专属会员标识', '每月10个免费积分', '专属会员群']),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      name: '年度会员',
      description: '享受12个月的VIP特权，最划算',
      price: 299.00,
      duration: 365,
      features: JSON.stringify(['免费下载VIP工作流', '优先客服支持', '专属会员标识', '每月20个免费积分', '专属会员群', '线下活动优先参与权']),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await knex('membership_plans').insert(membershipPlans);

  console.log('✅ 种子数据插入完成');
  console.log('📧 测试账号: admin@wz.com / user1@wz.com / user2@wz.com');
  console.log('🔑 密码: 123456');
}
