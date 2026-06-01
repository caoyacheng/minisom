# Git 提交前清理清单

仓库已完成「仅保留工作台」的目录扁平化，提交前请按此检查。

## 1. 预览变更

```bash
make git-status
# 或
git status
```

## 2. 预期会看到

- **删除**：根目录 `examples/`、`minisom.py`、`setup.py`、`setup.cfg`、`Readme.md`、`PROJECT.md`、`workbench/`（若曾存在）
- **新增/移动**：`backend/`、`frontend/`、`mcp/`、`Dockerfile`、`README.md`、`backend/scripts/dev.sh` 等

## 3. 不应被提交

以下应在 `.gitignore` 中且 `git ls-files` 无输出：

- `backend/storage/`
- `backend/.venv/`
- `frontend/node_modules/`
- `frontend/dist/`

若曾被跟踪，执行：

```bash
git rm -r --cached backend/storage 2>/dev/null || true
git rm -r --cached backend/.venv 2>/dev/null || true
```

## 4. 暂存并提交

```bash
git add -A
git status   # 最后确认
git commit -m "refactor: flatten repo to workbench-only layout"
```

## 5. 远程仓库名（可选）

本地目录仍可为 `model-workbench`；GitHub 仓库可改名为 `industrial-workbench` 等，与代码无耦合。
