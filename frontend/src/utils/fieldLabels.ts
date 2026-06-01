/** 英文字段名 → 中文显示名；已是中文则原样返回 */
const FIELD_LABELS: Record<string, string> = {
  batch_id: '批次编号',
  timestamp: '时间',
  product_grade: '产品等级',
  line_id: '产线',
  shift: '班次',
  reactor_temperature_c: '反应器温度',
  reactor_pressure_bar: '反应器压力',
  feed_flow_rate_m3h: '进料流量',
  catalyst_activity: '催化剂活性',
  ph_value: 'pH值',
  impurity_ppm: '杂质浓度',
  energy_consumption_kwh: '能耗',
  production_rate_tonh: '产能',
  yield_percent: '收率',
  viscosity_cp: '粘度',
  moisture_percent: '水分',
  operational_cost_index: '运营成本指数',
  operating_regime: '运行工况',
  // 中文列名（与示例 CSV 一致）
  批次编号: '批次编号',
  时间: '时间',
  产品等级: '产品等级',
  产线: '产线',
  班次: '班次',
  反应器温度: '反应器温度',
  反应器压力: '反应器压力',
  进料流量: '进料流量',
  催化剂活性: '催化剂活性',
  pH值: 'pH值',
  杂质浓度: '杂质浓度',
  能耗: '能耗',
  产能: '产能',
  收率: '收率',
  粘度: '粘度',
  水分: '水分',
  运营成本指数: '运营成本指数',
  运行工况: '运行工况',
};

export function labelField(name: string): string {
  return FIELD_LABELS[name] ?? name;
}
