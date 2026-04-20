# 上班回血器（Salary Counter）

一个 mobile-first 的轻量网页：输入月到手工资后，按设备本地时间自动结算“今天已赚 / 本月累计 / 当前状态 / 当前时薪 / 每秒增加”。

## 功能特点

- 基于**浏览器本地时间**自动计算（无服务器依赖）
- 主页面极简，只显示核心收入数据；设置放在弹窗里
- 自动识别本地时区（展示在保存提示中）
- 支持午休不计薪、非工作日不计薪
- 支持“当月工作天数”按中国节假日（含调休）自动估算，并允许手动修改
- 下午打开网页也会自动补算当天已过计薪时段
- 设置保存在 `localStorage`，刷新不丢失
- 每秒刷新显示数据
- 适合 iPhone / Android 竖屏单手查看
- 提供 `manifest.json` 与图标，支持“添加到主屏幕”

## 文件结构

```
.
├── index.html      # 页面结构（主视图 + 设置弹窗）
├── style.css       # mobile-first 样式
├── app.js          # 计算逻辑与本地存储
├── manifest.json   # PWA 基础配置
├── favicon.svg
├── icon.svg
└── README.md
```

## 本地运行

### 方式 1：直接打开
1. 双击 `index.html` 用浏览器打开。
2. 推荐手机浏览器直接访问静态文件地址，或电脑开移动端模拟查看。

### 方式 2：本地静态服务（推荐）
```bash
python3 -m http.server 8080
```
然后访问：`http://localhost:8080`

## 上传到 GitHub

```bash
git init
git add .
git commit -m "feat: init salary healer web app"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

## 部署到 Cloudflare Pages

1. 登录 Cloudflare Dashboard。
2. 进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择该项目仓库。
4. 构建设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`（根目录）
5. 点击 **Save and Deploy**。
6. 首次部署完成后，打开分配的 `*.pages.dev` 地址即可。

## 计算规则

- `日标准计薪分钟 = (下班 - 上班) - 午休时长`
- `时薪 = 月到手工资 / 当月工作天数 / (日标准计薪小时)`
- `今日已赚 = 今日已计薪分钟 / 60 × 时薪`
- `本月累计 = 本月 1 日到当前时刻所有应计薪分钟 / 60 × 时薪`
- 状态判断：`非工作日 / 上班前 / 上班中 / 午休中 / 下班后`

## 注意

- 默认工作日为周一到周五，可手动改。
- 当月工作天数默认按内置中国节假日规则估算；如公司有特殊排班，请手动修改后保存。
- 若月工资未填写或 ≤ 0，不会保存，并给出提示。
- 首版按“固定每日时段”模型计算，不含加班时长的自动统计。
