# Salary Counter（复古热敏小票风）

一个 mobile-first 的单页静态应用：用“热敏小票”视觉实时显示今日回血金额、本月累计、周进度，并支持标准工作日与手动排班两种计薪规则。

## 本地运行

这是纯静态页面，不依赖构建工具。

```bash
# 在仓库根目录执行（任选其一）
python3 -m http.server 8080
# 或
npx serve .
```

然后打开 `http://localhost:8080`。

## Cloudflare Pages 部署

1. 将仓库推送到 GitHub/GitLab。
2. 在 Cloudflare Pages 新建项目并连接该仓库。
3. 选择 **Framework preset: None**。
4. Build command 留空（或 `echo "static"`）。
5. Build output directory 设置为仓库根目录 `.`。
6. 部署后即可直接访问（`index.html` 为入口）。

## 数据存储字段（localStorage）

键名：`salary_counter_config_v2`

```json
{
  "salary": 10000,
  "mode": "standard",
  "workStart": "09:00",
  "workEnd": "18:00",
  "useHolidayOverride": true,
  "manualSchedule": {
    "2026-04-06": true
  },
  "configVersion": 2
}
```

- `salary`: 月工资（税前）。
- `mode`: `standard`（标准工作日）或 `manual`（手动排班）。
- `workStart` / `workEnd`: 上下班时间（不扣午休）。
- `useHolidayOverride`: 是否启用内置 2025/2026 法定节假日与调休覆盖。
- `manualSchedule`: 手动排班映射（`YYYY-MM-DD => true/false`，仅 `manual` 模式生效）。
- `configVersion`: 配置版本号。

## 计算规则

1. **当月计薪天数**
   - `standard`：默认周一到周五；若开启覆盖，会根据 2025/2026 节假日与调休修正。
   - `manual`：仅以 `manualSchedule` 中为 `true` 的日期计薪。
2. **日薪** = `月工资 / 本月计薪天数`。
3. **每秒回血** = `日薪 / 当日工作秒数`（`workEnd - workStart`）。
4. **今日已赚**
   - 上班前：0
   - 上班中：`已过工作秒数 * 每秒回血`
   - 下班后：`日薪`
   - 休息日/节假日：0
5. **本月累计**
   - 历史计薪日按整日薪累加；今天按实时进度累加。
6. **本周打工进度（周一到周日）**
   - 分子：本周已赚计薪秒数（历史工作日记满、今日按实时秒数）
   - 分母：本周应计薪总秒数（本周计薪日数 × 每日工作秒数）

## 说明

- 基于浏览器本地时间计算。
- 页面每秒刷新金额与进度，无需“开始上班”按钮。
- 默认模式为“标准工作日”，设置抽屉中仅在切换到“手动排班”时显示日历区。
