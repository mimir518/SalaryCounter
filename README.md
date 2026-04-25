# 上班回血器

mobile-first 单页静态 PWA，复古热敏小票风。根据本地时间和设置规则实时计算：
- 今日已赚
- 今日进度
- 本月累计
- 本周打工进度

## 文件结构
- `index.html` 页面结构
- `style.css` 小票风 UI
- `app.js` 计算逻辑与本地存储
- `manifest.json` PWA 清单
- `sw.js` 基础离线缓存

## 功能说明
- 自动按设备本地时间结算，无需“开始上班”按钮
- 默认标准工作日：周一至周五；可选中国法定节假日排除（含调休上班日）
- 可切换手动排班：按日期点选上班/休息
- 无午休扣减：只按上班-下班区间持续计薪
- 配置存储在 `localStorage`（键名：`salaryCounter.v1`）

## 部署（Cloudflare Pages）
1. 直接上传本目录到 Git 仓库。
2. Cloudflare Pages 选择该仓库。
3. Framework preset 选 `None`。
4. Build command 留空，Output directory 设为 `/`。
5. 部署后即可在手机浏览器访问并添加到主屏幕。
