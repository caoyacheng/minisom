# 工业模型工作台

基于 FastAPI + React 的工业建模平台，支持 SOM 等模型训练、测试评估、版本管理与在线推理。SOM 底层使用内嵌的 [MiniSom](https://github.com/JustGlowing/minisom)（`backend/app/models/som/vendor/minisom.py`）。

## 功能

- **训练**：上传 CSV、配置超参数、异步训练、U-Matrix / 激活图可视化
- **测试**：选择模型、上传测试集、查看量化误差与 Win Map
- **部署**：模型版本管理、pickle 导出、激活推理模型、REST API、Docker 一键启动

## 本地开发

### 1. 后端

**一键启动（推荐）：**

```bash
cd backend
./scripts/dev.sh
```

或手动：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export PYTHONPATH="$(pwd)"
uvicorn app.main:app --reload --port 8000
```

仓库含 `backend/.python-version`（3.12.13），已配置 pyenv 时会自动选用。

API 文档：http://127.0.0.1:8000/docs

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

访问：http://127.0.0.1:5180（Vite 已配置 `/api` 代理到 8000）

### 3. MCP（供 T-Claw / OpenClaw 调用）

```bash
cd mcp
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SOM_API_BASE=http://127.0.0.1:8000
python -m som_mcp
```

配置示例见 `mcp/t-claw.mcp.example.json`，工具说明见 `mcp/README.md`。

## Docker 部署

```bash
docker compose up --build
```

访问：http://localhost:8000  
MinIO 控制台：http://localhost:9001（默认 `minioadmin` / `minioadmin`）

Compose 会启动 **PostgreSQL**（元数据）与 **MinIO**（模型/数据集 blob）。本地开发可不启这些服务，默认使用 SQLite + `backend/storage/blobs/`。

环境变量示例见 `backend/.env.example`。

## API 示例

### 健康检查

```bash
curl http://localhost:8000/api/health
```

### 推理

```bash
curl -X POST http://localhost:8000/api/inference/predict \
  -H "Content-Type: application/json" \
  -d '{"samples": [[0.1, 0.2, 0.3, 0.4]]}'
```

先在「部署」页激活一个模型，或请求体中传入 `model_id`。

### 下载模型

```bash
curl -O http://localhost:8000/api/models/{model_id}/download
```

## 数据格式

- 上传 **CSV** 文件
- 数值列作为特征；可选一列作为标签（用于 labels_map 可视化）
- 建议在训练前启用「归一化」

## 目录说明

| 路径 | 说明 |
|------|------|
| `backend/app/` | FastAPI 应用 |
| `backend/app/models/` | 按模型类型划分（`som/` 含训练、推理、vendor） |
| `backend/app/storage/` | Blob + PostgreSQL/SQLite 存储层 |
| `backend/storage/` | 运行时数据（blobs、meta.db） |
| `frontend/` | React 前端 |
| `mcp/` | MCP 服务（Agent 调用后端 API） |
| `sample_datasets/` | 示例 CSV |
| `Dockerfile` | 多阶段构建镜像 |
| `backend/scripts/dev.sh` | 本地后端启动脚本 |

## 提交前（维护者）

目录重构后的 Git 清理步骤见 [docs/GIT_CLEANUP.md](docs/GIT_CLEANUP.md)。根目录可执行 `make git-status` 快速检查。

## 注意事项

- 首版为单用户 MVP，无登录鉴权；生产环境请自行加认证
- 评估结果（`/api/evaluation/run`）会写入 SQLite 表 `evaluation_runs`，重启后端仍可查询 Win Map
- `train_batch_offline_fast` 需要安装 `numba`：`pip install numba`
- 模型以 pickle 格式存储，仅加载本系统生成的文件
