# Som MCP Server

将 Som 算法工作台（FastAPI 后端）暴露为 MCP 工具，供 **T-Claw / OpenClaw** 等 Agent 调用。

## 前置条件

1. 后端已启动（默认 `http://127.0.0.1:8000`）：

```bash
cd backend
PYTHONPATH="$(pwd)" .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. 安装 MCP 依赖：

```bash
cd mcp
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 启动 MCP（stdio）

```bash
cd mcp
source .venv/bin/activate
export SOM_API_BASE=http://127.0.0.1:8000
python -m som_mcp
```

## T-Claw / OpenClaw 配置

将 `t-claw.mcp.example.json` 中的片段合并到你的 MCP 配置，并把 `cwd` 改成本机 `mcp` 绝对路径：

```json
{
  "mcpServers": {
    "som-workbench": {
      "command": "/path/to/your-repo/mcp/.venv/bin/python",
      "args": ["-m", "som_mcp"],
      "cwd": "/path/to/your-repo/mcp",
      "env": {
        "SOM_API_BASE": "http://127.0.0.1:8000"
      }
    }
  }
}
```

## 可用工具

| 工具 | 说明 |
|------|------|
| `som_health` | 健康检查 + active 模型 |
| `som_upload_dataset` | 上传 CSV |
| `som_get_dataset` | 数据集预览 |
| `som_suggest_grid` | 建议网格大小 |
| `som_start_training` | 启动训练（异步） |
| `som_get_training_job` | 查询训练进度 |
| `som_wait_training` | 等待训练完成 |
| `som_get_training_visualizations` | U-matrix 等可视化 |
| `som_list_models` | 模型列表 |
| `som_get_model` | 模型详情 |
| `som_activate_model` | 部署（设为 active） |
| `som_delete_model` | 删除模型 |
| `som_run_evaluation` | 测试集评估与异常检测 |
| `som_predict` | 向量推理 |
| `som_predict_file` | CSV 批量推理 |
| `som_train_and_deploy` | 上传→训练→部署 一键流程 |

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `SOM_API_BASE` | `http://127.0.0.1:8000` | FastAPI 后端地址 |

## 连接测试失败？常见原因

Som MCP 是 **两个独立进程**，不要和单一服务搞混：

```
T-Claw  ──stdio──►  MCP (python -m som_mcp)  ──HTTP──►  FastAPI (uvicorn :8000)
```

| 现象 | 原因 | 处理 |
|------|------|------|
| 连接测试报 `8000` 不可达 / 连接拒绝 | **后端没启动** | 先启动 `uvicorn`，再测 MCP |
| 连接测试报 `502` 但 `curl` 正常 | 系统开了 **HTTP 代理**（如 Clash `127.0.0.1:7892`），部分客户端把本地请求也走代理 | MCP 已设 `trust_env=False`；T-Claw 环境加 `NO_PROXY=127.0.0.1,localhost` |
| 改了 MCP 配置仍不生效 | T-Claw 在**启动/加载时**才拉起 MCP 子进程 | 保存配置后 **重新加载 MCP** 或重启 T-Claw |
| `python -m som_mcp` 找不到模块 | 用了系统 `python`，未装 `mcp` 包 | 配置里写 **`.venv/bin/python` 绝对路径** |
| 工具列表为空 / 注册失败 | MCP 子进程没起来（路径、cwd、依赖错误） | 看 T-Claw MCP 日志；本地执行 `cd mcp && .venv/bin/python -m som_mcp` 试启动 |

**说明：** 工具**注册**（列出 `som_health` 等）只要求 MCP 进程能启动；**连接测试**往往会调用 `som_health` 打后端，所以 **8000 必须先在线**。后端起来后若只改了 MCP 配置，需要 reload；若只是后端刚启动、MCP 配置未改，一般直接重试连接测试即可。

### 启动后端（终端 1）

```bash
cd backend
PYTHONPATH="$(pwd)" .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

验证：`curl http://127.0.0.1:8000/api/health`

### 验证 MCP（终端 2，可选）

```bash
cd mcp
.venv/bin/python -c "from som_mcp.server import som_health; print(som_health())"
```

## Agent 使用示例

- 「用 `/data/train.csv` 训练 SOM，特征列用产能和温度，网格 10×10」  
  → `som_upload_dataset` → `som_start_training` → `som_wait_training` → `som_activate_model`

- 「对 `/data/test.csv` 做异常检测」  
  → `som_upload_dataset` → `som_run_evaluation`

- 「一键训练并部署」  
  → `som_train_and_deploy`
