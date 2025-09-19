import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('workflows', (table) => {
    // 添加视频相关字段
    table.string('previewVideo').nullable(); // 预览视频URL
    table.string('demoVideo').nullable(); // 演示视频URL
    table.json('gallery').nullable(); // 图片画廊，存储为JSON数组
    
    // 添加更多描述字段
    table.text('shortDescription').nullable(); // 短描述
    table.text('features').nullable(); // 特性说明，JSON格式
    table.text('requirements').nullable(); // 使用要求
    table.text('changelog').nullable(); // 更新日志，JSON格式
    
    // 添加分类和状态字段
    table.string('category').defaultTo('general'); // 分类
    table.string('subcategory').nullable(); // 子分类
    table.enum('status', ['draft', 'published', 'archived', 'featured']).defaultTo('draft'); // 状态
    table.integer('sortOrder').defaultTo(0); // 排序权重
    
    // 添加技术相关字段
    table.string('version').defaultTo('1.0.0'); // 版本号
    table.json('compatibility').nullable(); // 兼容性信息
    table.json('dependencies').nullable(); // 依赖项
    
    // 添加营销相关字段
    table.string('seoTitle').nullable(); // SEO标题
    table.text('seoDescription').nullable(); // SEO描述
    table.json('seoKeywords').nullable(); // SEO关键词
    table.boolean('isHot').defaultTo(false); // 是否热门
    table.boolean('isNew').defaultTo(false); // 是否新品
    table.decimal('originalPrice', 10, 2).nullable(); // 原价（用于显示折扣）
    table.timestamp('publishedAt').nullable(); // 发布时间
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('workflows', (table) => {
    table.dropColumn('previewVideo');
    table.dropColumn('demoVideo');
    table.dropColumn('gallery');
    table.dropColumn('shortDescription');
    table.dropColumn('features');
    table.dropColumn('requirements');
    table.dropColumn('changelog');
    table.dropColumn('category');
    table.dropColumn('subcategory');
    table.dropColumn('status');
    table.dropColumn('sortOrder');
    table.dropColumn('version');
    table.dropColumn('compatibility');
    table.dropColumn('dependencies');
    table.dropColumn('seoTitle');
    table.dropColumn('seoDescription');
    table.dropColumn('seoKeywords');
    table.dropColumn('isHot');
    table.dropColumn('isNew');
    table.dropColumn('originalPrice');
    table.dropColumn('publishedAt');
  });
}
