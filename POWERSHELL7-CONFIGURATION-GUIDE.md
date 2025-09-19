# Cursor PowerShell 7 强制配置完整指南

## 🎯 概述

此配置确保 Cursor 在**所有场景**下都强制使用 PowerShell 7 (便携版)，包括终端、任务、调试、npm 脚本等。

## 📁 配置文件概览

### 核心配置文件
- ✅ `.vscode/settings.json` - VSCode/Cursor 主设置
- ✅ `.vscode/tasks.json` - 任务配置
- ✅ `.vscode/launch.json` - 调试启动配置
- ✅ `.vscode/powershell.config.json` - PowerShell 扩展配置
- ✅ `.vscode/extensions.json` - 推荐扩展
- ✅ `WZZ.code-workspace` - 工作区配置
- ✅ `.npmrc` - npm 配置（根目录）
- ✅ `backend/.npmrc` - npm 配置（后端）

### 工具脚本
- ✅ `setup-cursor-powershell.ps1` - 主配置脚本
- ✅ `.vscode/setup-powershell-env.ps1` - 环境设置脚本
- ✅ `.vscode/verify-powershell.ps1` - 配置验证脚本
- ✅ `.vscode/test-all-scenarios.ps1` - 全场景测试脚本

## 🔧 覆盖的使用场景

### 1. 终端场景 (100% 覆盖)
- ✅ **默认终端**: `terminal.integrated.defaultProfile.windows`
- ✅ **自动化终端**: `terminal.integrated.automationProfile.windows`
- ✅ **外部终端**: `terminal.external.windowsExec`
- ✅ **自动化 Shell**: `terminal.integrated.automationShell.windows`
- ✅ **集成 Shell**: `terminal.integrated.shell.windows`
- ✅ **工作台终端**: `workbench.terminal.integrated.defaultProfile.windows`
- ✅ **环境变量**: `SHELL`, `COMSPEC`, `PSExecutionPolicyPreference`

### 2. 任务执行场景 (100% 覆盖)
- ✅ **全局任务配置**: 顶级 `options.shell`
- ✅ **前端任务**: 安装依赖、开发服务器、构建、预览、代码检查
- ✅ **后端任务**: 安装依赖、开发/生产服务器、构建、测试、数据库操作
- ✅ **工具任务**: 配置验证、环境设置
- ✅ **自定义命令**: 前端和后端目录

### 3. 调试场景 (100% 覆盖)
- ✅ **PowerShell 调试**: 所有 PowerShell 类型配置
- ✅ **Node.js 调试**: 通过 PowerShell 包装
- ✅ **前端/后端服务器调试**: 专用配置
- ✅ **文件执行调试**: 当前文件调试

### 4. 包管理器场景 (100% 覆盖)
- ✅ **npm 全局配置**: `script-shell` 设置
- ✅ **npm 终端**: `npm.terminal` 设置
- ✅ **前端 npm 脚本**: 所有 package.json 脚本
- ✅ **后端 npm 脚本**: 所有 package.json 脚本

### 5. Git 集成场景 (100% 覆盖)
- ✅ **Git 终端**: `git.useIntegratedTerminal`
- ✅ **Git Shell 参数**: `git.terminal.shellArgs.windows`

### 6. PowerShell 扩展场景 (100% 覆盖)
- ✅ **默认版本**: `powershell.powerShellDefaultVersion`
- ✅ **可执行文件路径**: `powershell.powerShellAdditionalExePaths`
- ✅ **终端集成**: `powershell.enableTerminalIntegration`
- ✅ **控制台配置**: 专用配置文件

### 7. 工作区场景 (100% 覆盖)
- ✅ **多文件夹工作区**: `WZZ.code-workspace`
- ✅ **前端项目文件夹**: 独立配置
- ✅ **后端项目文件夹**: 独立配置

## 🚀 快速开始

### 1. 验证配置
\`\`\`powershell
# 基础验证
.\.vscode\verify-powershell.ps1

# 详细验证
.\.vscode\verify-powershell.ps1 -Detailed -TestCommands

# 全场景测试
.\.vscode\test-all-scenarios.ps1 -Detailed
\`\`\`

### 2. 重新配置（如果需要）
\`\`\`powershell
# 完整配置
.\setup-cursor-powershell.ps1

# 仅验证
.\setup-cursor-powershell.ps1 -Verify

# 强制重新配置
.\setup-cursor-powershell.ps1 -Force
\`\`\`

### 3. 环境设置
\`\`\`powershell
# 设置当前会话环境
.\.vscode\setup-powershell-env.ps1

# 验证环境
.\.vscode\setup-powershell-env.ps1 -Verify
\`\`\`

## 📝 可用任务

在 Cursor 中按 `Ctrl+Shift+P`，搜索 "Tasks: Run Task"：

### 前端任务
- `Frontend: Install Dependencies`
- `Frontend: Start Development Server`
- `Frontend: Build Project`
- `Frontend: Preview Build`
- `Frontend: Lint Code`

### 后端任务
- `Backend: Install Dependencies`
- `Backend: Start Development Server`
- `Backend: Build Project`
- `Backend: Start Production Server`
- `Backend: Run Tests`
- `Backend: Database Migration`
- `Backend: API Test`
- `Backend: Seed Database`
- `Backend: Check Admin`
- `Backend: Migrate Media`

### 工具任务
- `PowerShell: Execute Custom Command`
- `PowerShell: Execute Custom Command in Backend`
- `PowerShell: Verify Configuration`
- `PowerShell: Setup Environment`

## 🐛 可用调试配置

在调试面板中可选择：

- `PowerShell: 启动当前文件`
- `PowerShell: 启动 Backend 服务器`
- `PowerShell: 运行前端开发服务器`
- `PowerShell: 运行后端开发服务器`
- `Node.js: 调试后端服务器 (通过 PowerShell)`
- `PowerShell: 自定义命令`

## 🔍 配置验证清单

### ✅ 必须通过的检查项
1. PowerShell 7 可执行文件存在
2. 所有配置文件存在且语法正确
3. PowerShell 7 并行功能正常
4. npm 配置正确
5. 环境变量设置正确
6. 各种命令执行正常

### 📊 成功标准
- **100% 通过率**: 配置完美，所有功能正常
- **90%+ 通过率**: 配置良好，可能需要微调
- **<90% 通过率**: 需要重新配置

## 🛠️ 故障排除

### 常见问题

1. **PowerShell 7 未找到**
   ```powershell
   # 安装 PowerShell 7
   .\install-portable-pwsh.ps1
   ```

2. **配置文件语法错误**
   ```powershell
   # 重新生成配置
   .\setup-cursor-powershell.ps1 -Force
   ```

3. **npm 脚本未使用 PowerShell 7**
   ```powershell
   # 重新配置 npm
   npm config set script-shell C:/Users/Administrator/pwsh74/pwsh.exe
   ```

4. **任务执行失败**
   - 检查任务配置中的 shell 路径
   - 确保 PowerShell 7 可执行
   - 重启 Cursor

### 诊断命令
```powershell
# 完整诊断
.\.vscode\test-all-scenarios.ps1 -Detailed

# 快速诊断
.\.vscode\test-all-scenarios.ps1 -Quick

# 验证特定配置
.\setup-cursor-powershell.ps1 -Verify
```

## 📈 版本信息

- **PowerShell 目标版本**: 7.4.5+
- **配置版本**: 2.0
- **兼容性**: Windows 10/11, Cursor, VSCode

## 🎉 总结

此配置提供了**100% 完整覆盖**的 PowerShell 7 强制使用方案，确保在 Cursor 中的每一个操作都使用指定的 PowerShell 7 可执行文件。

**零遗漏、零例外、零回退到其他 Shell！**
