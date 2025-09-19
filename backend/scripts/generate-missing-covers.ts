#!/usr/bin/env node

/**
 * 批量为缺少封面的工作流生成封面
 * 从工作流的预览视频中自动截取帧作为封面
 */

import { db } from '../dist/database/init.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// 确保目录存在
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// 获取工作流目录
function getWorkflowDirByCode(code: number): string {
  return path.join(PROJECT_ROOT, 'uploads', 'workflows', String(code));
}

// 转换为公开URL
function toPublicUrl(absolutePath: string): string {
  const rel = path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
  return `/${rel}`;
}

// 使用 ffmpeg 从视频截取帧（需要系统安装 ffmpeg）
async function extractVideoFrame(videoPath: string, outputPath: string, timeSeconds: number = 2): Promise<boolean> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-ss', String(timeSeconds),
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outputPath
    ], { stdio: 'pipe' });
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`✅ 视频帧截取成功: ${outputPath}`);
        resolve(true);
      } else {
        console.error(`❌ 视频帧截取失败: ${videoPath}, exit code: ${code}`);
        resolve(false);
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error(`❌ ffmpeg 执行失败:`, error.message);
      resolve(false);
    });
  });
}

// 检查视频文件是否存在
function getVideoFilePath(videoUrl: string): string | null {
  if (!videoUrl || !videoUrl.startsWith('/uploads/')) return null;
  
  const relativePath = videoUrl.replace(/^\/+/, '');
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  
  return fs.existsSync(absolutePath) ? absolutePath : null;
}

async function main() {
  console.log('🚀 开始批量生成缺少封面的工作流封面...\n');
  
  try {
    // 查找缺少封面但有视频的工作流
    const workflows = await db('workflows')
      .select('id', 'code', 'title', 'cover', 'previewVideo', 'demoVideo')
      .where(function() {
        this.whereNull('cover').orWhere('cover', '').orWhere('cover', '/TX.jpg');
      })
      .andWhere(function() {
        this.whereNotNull('previewVideo').orWhereNotNull('demoVideo');
      })
      .orderBy('createdAt', 'desc');
    
    console.log(`📊 找到 ${workflows.length} 个需要生成封面的工作流\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const workflow of workflows) {
      const { id, code, title, cover, previewVideo, demoVideo } = workflow;
      
      console.log(`\n🔄 处理工作流: ${title} (ID: ${id}, Code: ${code})`);
      console.log(`   当前封面: ${cover || 'null'}`);
      console.log(`   预览视频: ${previewVideo || 'null'}`);
      console.log(`   演示视频: ${demoVideo || 'null'}`);
      
      // 选择最佳视频源
      const videoUrl = previewVideo || demoVideo;
      if (!videoUrl) {
        console.log(`   ⚠️ 跳过: 没有视频源`);
        continue;
      }
      
      // 检查视频文件是否存在
      const videoFilePath = getVideoFilePath(videoUrl);
      if (!videoFilePath) {
        console.log(`   ❌ 跳过: 视频文件不存在 ${videoUrl}`);
        failCount++;
        continue;
      }
      
      // 确保工作流目录存在
      const workflowCode = Number(code);
      if (!workflowCode || Number.isNaN(workflowCode)) {
        console.log(`   ❌ 跳过: 无效的工作流代码 ${code}`);
        failCount++;
        continue;
      }
      
      const workflowDir = getWorkflowDirByCode(workflowCode);
      const imagesDir = path.join(workflowDir, 'images');
      ensureDir(imagesDir);
      
      // 生成封面文件名
      const coverFileName = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const coverFilePath = path.join(imagesDir, coverFileName);
      
      // 使用 ffmpeg 截取视频帧
      console.log(`   🎬 从视频截取封面: ${videoFilePath} -> ${coverFilePath}`);
      const success = await extractVideoFrame(videoFilePath, coverFilePath, 2);
      
      if (success) {
        // 更新数据库
        const coverUrl = toPublicUrl(coverFilePath);
        await db('workflows').where('id', id).update({
          cover: coverUrl,
          updatedAt: new Date()
        });
        
        console.log(`   ✅ 封面生成成功: ${coverUrl}`);
        successCount++;
      } else {
        console.log(`   ❌ 封面生成失败`);
        failCount++;
      }
    }
    
    console.log(`\n🎉 批量生成完成!`);
    console.log(`   ✅ 成功: ${successCount} 个`);
    console.log(`   ❌ 失败: ${failCount} 个`);
    console.log(`   📊 总计: ${workflows.length} 个\n`);
    
  } catch (error) {
    console.error('❌ 批量生成过程中发生错误:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// 检查 ffmpeg 是否可用
function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
    
    ffmpeg.on('close', (code: number) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

// 主函数
(async () => {
  console.log('🔍 检查 ffmpeg 是否可用...');
  const hasFFmpeg = await checkFFmpeg();
  
  if (!hasFFmpeg) {
    console.error('❌ 未找到 ffmpeg，请先安装 ffmpeg:');
    console.error('   Windows: choco install ffmpeg 或下载 https://ffmpeg.org/');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Linux: apt-get install ffmpeg 或 yum install ffmpeg');
    process.exit(1);
  }
  
  console.log('✅ ffmpeg 可用，开始处理...\n');
  await main();
})();


