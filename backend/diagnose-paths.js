const fs = require('fs');
const path = require('path');

console.log('🔍 诊断路径解析问题...');
console.log('');

console.log('📂 当前信息:');
console.log('  __dirname (编译后):', __dirname);
console.log('  process.cwd():', process.cwd());
console.log('');

// 模拟编译后的路径解析逻辑 (从 dist/routes/workflows.js)
const BACKEND_ROOT_CANDIDATES = [
    path.resolve(__dirname, '..', '..'), // backend/dist/routes -> backend
    path.resolve(process.cwd(), 'backend'),
    path.resolve(process.cwd())
];

console.log('🎯 路径候选者:');
BACKEND_ROOT_CANDIDATES.forEach((p, i) => {
    const uploadsPath = path.join(p, 'uploads');
    const packageJsonPath = path.join(p, 'package.json');
    const uploadsExists = fs.existsSync(uploadsPath);
    const packageExists = fs.existsSync(packageJsonPath);
    const isRealBackendRoot = uploadsExists && packageExists;
    
    console.log(`  候选 ${i}: ${p}`);
    console.log(`    uploads存在: ${uploadsExists}`);
    console.log(`    package.json存在: ${packageExists}`);
    console.log(`    是有效根目录: ${isRealBackendRoot}`);
    
    if (uploadsExists) {
        const workflowsPath = path.join(uploadsPath, 'workflows');
        console.log(`    workflows目录存在: ${fs.existsSync(workflowsPath)}`);
        if (fs.existsSync(workflowsPath)) {
            const workflows = fs.readdirSync(workflowsPath);
            console.log(`    工作流目录: [${workflows.join(', ')}]`);
        }
    }
    console.log('');
});

// 找到选择的路径
const PROJECT_ROOT = BACKEND_ROOT_CANDIDATES.find((p) => {
    try {
        const uploadsPath = path.join(p, 'uploads');
        const isRealBackendRoot = fs.existsSync(uploadsPath) && fs.existsSync(path.join(p, 'package.json'));
        return isRealBackendRoot;
    } catch {
        return false;
    }
}) || path.resolve(__dirname, '..', '..');

console.log('✅ 选择的 PROJECT_ROOT:', PROJECT_ROOT);

const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads');
console.log('✅ 选择的 UPLOAD_ROOT:', UPLOAD_ROOT);

// 检查工作流目录
const workflowsDir = path.join(UPLOAD_ROOT, 'workflows');
console.log('✅ 工作流目录:', workflowsDir);
console.log('✅ 工作流目录存在:', fs.existsSync(workflowsDir));

if (fs.existsSync(workflowsDir)) {
    const workflows = fs.readdirSync(workflowsDir);
    console.log('📋 现有工作流:', workflows);
    
    // 检查每个工作流的结构
    workflows.forEach(code => {
        const workflowPath = path.join(workflowsDir, code);
        if (fs.statSync(workflowPath).isDirectory()) {
            const imagesPath = path.join(workflowPath, 'images');
            const imagesExists = fs.existsSync(imagesPath);
            console.log(`  工作流 ${code}:`);
            console.log(`    images目录存在: ${imagesExists}`);
            if (imagesExists) {
                const images = fs.readdirSync(imagesPath);
                console.log(`    图片文件: [${images.join(', ') || '无'}]`);
            }
        }
    });
}


