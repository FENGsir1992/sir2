#!/usr/bin/env node

/**
 * 测试封面修复效果
 * 检查数据库中工作流的封面状态
 */

import { db } from '../dist/database/init.js';

async function main() {
  try {
    console.log('🔍 检查工作流封面状态...\n');
    
    // 统计各种封面状态
    const stats = await db('workflows')
      .select(
        db.raw(`
          COUNT(*) as total,
          COUNT(CASE WHEN cover IS NULL OR cover = '' THEN 1 END) as no_cover,
          COUNT(CASE WHEN cover = '/TX.jpg' THEN 1 END) as default_cover,
          COUNT(CASE WHEN cover LIKE 'data:image/%' THEN 1 END) as base64_cover,
          COUNT(CASE WHEN cover LIKE '/uploads/%' THEN 1 END) as file_cover
        `)
      )
      .first();
    
    console.log('📊 工作流封面统计:');
    console.log(`   总计: ${stats.total} 个工作流`);
    console.log(`   无封面: ${stats.no_cover} 个`);
    console.log(`   默认封面(/TX.jpg): ${stats.default_cover} 个`);
    console.log(`   Base64封面: ${stats.base64_cover} 个`);
    console.log(`   文件封面: ${stats.file_cover} 个`);
    
    // 查找有视频但无封面的工作流
    const missingCovers = await db('workflows')
      .select('id', 'title', 'cover', 'previewVideo', 'demoVideo')
      .where(function() {
        this.whereNull('cover').orWhere('cover', '').orWhere('cover', '/TX.jpg');
      })
      .andWhere(function() {
        this.whereNotNull('previewVideo').orWhereNotNull('demoVideo');
      })
      .limit(5);
    
    if (missingCovers.length > 0) {
      console.log('\n⚠️ 发现有视频但缺少封面的工作流:');
      missingCovers.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.title}`);
        console.log(`      ID: ${w.id}`);
        console.log(`      封面: ${w.cover || 'null'}`);
        console.log(`      视频: ${w.previewVideo || w.demoVideo || 'null'}`);
      });
      console.log('\n💡 建议运行封面生成脚本: npm run generate-covers');
    } else {
      console.log('\n✅ 所有有视频的工作流都已设置封面!');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await db.destroy();
  }
}

main();
