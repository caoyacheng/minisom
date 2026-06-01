"""中英文列名互认（训练集英文表头 ↔ 测试集中文表头）。"""

# 规范名为英文；值为中文别名列表
FEATURE_ALIASES: dict[str, list[str]] = {
    "reactor_temperature_c": ["反应器温度"],
    "reactor_pressure_bar": ["反应器压力"],
    "feed_flow_rate_m3h": ["进料流量"],
    "catalyst_activity": ["催化剂活性"],
    "ph_value": ["pH值", "pH 值"],
    "impurity_ppm": ["杂质浓度"],
    "energy_consumption_kwh": ["能耗"],
    "production_rate_tonh": ["产能"],
    "yield_percent": ["收率"],
    "viscosity_cp": ["粘度"],
    "moisture_percent": ["水分"],
    "operational_cost_index": ["运营成本指数"],
}

LABEL_ALIASES: dict[str, list[str]] = {
    "operating_regime": ["运行工况"],
    "product_grade": ["产品等级"],
    "line_id": ["产线"],
    "shift": ["班次"],
    "batch_id": ["批次编号"],
    "timestamp": ["时间"],
}


def _alias_lookup() -> dict[str, str]:
    """任意已知列名 → 规范名（英文）。"""
    lookup: dict[str, str] = {}
    for canonical, aliases in {**FEATURE_ALIASES, **LABEL_ALIASES}.items():
        lookup[canonical] = canonical
        for alt in aliases:
            lookup[alt] = canonical
    return lookup


_LOOKUP = _alias_lookup()


def resolve_columns(
    requested: list[str],
    available_columns: list[str],
) -> list[str]:
    """把模型保存的列名解析为当前 CSV 中实际存在的列名。"""
    available = set(available_columns)
    resolved: list[str] = []
    missing: list[str] = []

    for name in requested:
        if name in available:
            resolved.append(name)
            continue

        canonical = _LOOKUP.get(name, name)
        candidates = [canonical, *FEATURE_ALIASES.get(canonical, []),
                      *LABEL_ALIASES.get(canonical, [])]
        if name not in candidates:
            candidates.append(name)

        match = next((c for c in candidates if c in available), None)
        if match:
            resolved.append(match)
        else:
            missing.append(name)

    if missing:
        raise ValueError(
            f"Columns not found: {missing}. "
            f"Available: {list(available_columns)}"
        )
    return resolved


def resolve_label_column(
    label_column: str | None,
    available_columns: list[str],
) -> str | None:
    if not label_column:
        return None
    return resolve_columns([label_column], available_columns)[0]
