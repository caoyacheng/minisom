# MiniSom 示例 Notebook

上游 MiniSom 的演示 notebook，与工业工作台 Web 应用无关。

## 运行方式

```bash
cd backend/app/models/som/examples
export PYTHONPATH="$(cd ../vendor && pwd)"
pip install jupyter pandas matplotlib scikit-learn
jupyter notebook
```

Notebook 内使用 `from minisom import MiniSom`（`PYTHONPATH` 指向 `../vendor`）。
