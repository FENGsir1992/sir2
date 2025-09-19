## 现有版本修复 BUG 的流程（Hotfix）

目标：在不改变主流程的前提下，快速修复线上版本问题，保持本地 / GitHub / 服务器 三端一致，且可快速回滚。

---

## 一、本地（Windows PowerShell）
1) 同步主分支并创建热修复分支
```powershell
cd C:\Users\Administrator\Desktop\0\JR
git checkout main
git pull
git checkout -b hotfix/v1.1.x-问题简述
```

2) 修复与自测（可选快速构建）
```powershell
npm run build
cd backend
npm run build
cd ..
```
> 如涉及数据库变更：务必写迁移（backend/src/database/migrations/*.ts），并在本地验证；服务器发布时会自动执行最新迁移。

3) 提交并合并回 main
```powershell
git add -A
git commit -m "fix: 问题简述（根因|修复点）"

git checkout main
git pull
git merge --no-ff hotfix/v1.1.x-问题简述
git push -u origin main
```

4) 可选：打补丁版本标签（便于回查）
```powershell
git tag v1.1.x
git push origin v1.1.x
```

---

## 二、服务器发布（Linux）
方式一（推荐）：一键拉取并发布（自动拉取 main、构建、切换、健康门禁、钉钉通知）
```bash
/usr/local/bin/publish-latest.sh
```

方式二：仅发布（不拉取）
```bash
/usr/local/bin/deploy-jr.sh
```

验证：
```bash
curl -k -I https://www.jiruikeji.top/health   # 期待 HTTP/2 200
```

若异常：
```bash
/usr/local/bin/rollback-jr.sh
pm2 logs jr-backend --lines 100
```

---

## 三、特殊场景建议
- 仅改后端环境/证书（非代码）：
  - 修改：/www/wwwroot/jr-app/shared/backend/env.local 或 certs
  - 重启：`pm2 restart jr-backend`

- 涉及数据库迁移：
  - 确保迁移可重复执行且向后兼容；优先在本地或测试环境验证。

- 紧急修复（无需分支）：
  - 小团队可直接在 main 上 commit + push，然后服务器 `/usr/local/bin/publish-latest.sh`；事后补 tag 和说明。

---

## 四、流程速记
1) 本地：`git checkout -b hotfix/...` → 修复 → `git commit` → 合并回 `main` → `git push`
2) 服务器：`/usr/local/bin/publish-latest.sh`
3) 验证：`/health` 200、页面/接口正常
4) 异常：`/usr/local/bin/rollback-jr.sh`

> 核心不变：始终以 `main` 为发布源；服务器只部署 `main`。脚本内置健康门禁与自动回滚，确保发布安全可控。



