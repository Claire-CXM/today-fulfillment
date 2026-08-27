# 今日兑现 V25 设计 QA

## 对照目标

- source visual truth path: `docs/design-reference-v3.png`
- homepage implementation screenshot path: `docs/design-qa-implementation-v21.png`
- homepage combined comparison evidence: `docs/design-qa-comparison-v21.png`
- secondary-page implementation screenshots:
  - `docs/design-qa-focus-v23.png`
  - `docs/design-qa-editor-v23.png`
  - `docs/design-qa-calendar-v23.png`
  - `docs/design-qa-review-v23.png`
  - `docs/design-qa-rewards-v23.png`
  - `docs/design-qa-profile-v23.png`
- secondary-page combined comparison evidence: `docs/design-qa-secondary-comparison-v23.png`
- local implementation: `http://localhost:4173/`
- viewport: 请求的 CSS 视口为 390 × 844；页面 client width 为 375；浏览器输出截图为 375 × 811；deviceScaleFactor 为 1。
- density normalization: 参考图 853 × 1844，使用高质量双三次缩放归一为 375 × 811；实现图为原生 375 × 811，不做二次缩放。
- state: 今天页对照状态为 3 项任务（进行中、待开始、已完成），完成进度 1/3；次级页面对照状态为存在一项普通暂停任务，覆盖专注、任务编辑、日历、复盘、奖惩与我的页面。

## Findings

当前没有待处理的 P0、P1 或 P2 问题。

- [P3] 底部“今天”图标仍采用统一 Ionicons 线性图标，而参考稿是带叶片的定制实心房屋图标。当前图标在尺寸、颜色和导航状态上保持一致，不影响识别与操作；若后续补充正式品牌图标资产，可直接替换。
- [P3] 参考稿的第一项任务带有“节点 2/3”进度线；本次同状态实现样本没有为该任务创建节点，因此按既定产品规则不显示虚假进度。节点任务的进度组件和节点弹窗已单独验证。
- [P3] 图二只提供今天页的完整像素基线，次级页面以 DESIGN.md 中已经确认的颜色、字体、圆角、阴影、图像与状态规则做系统化迁移；因此次级页面结论是设计语言一致性通过，而不是逐像素复刻未提供的页面稿。

## Required Fidelity Surfaces

- Fonts and typography: 使用 PingFang SC / Microsoft YaHei / Noto Sans SC 回退链；大标题、承诺文案、区块标题、状态和小字的层级、字重、行高与参考稿接近，无截断或异常换行。
- Spacing and layout rhythm: 今天页的日期、标题、承诺、花径、任务合并卡、成长卡和悬浮导航顺序与首屏比例已对齐；次级页面延续 20–24 px 页面边距、24–32 px 区块间距、24–30 px 卡片圆角和低强度阴影。375 px 内容宽度无横向溢出；主页面保留底部导航，专注与任务编辑页采用沉浸式布局并隐藏导航。
- Colors and visual tokens: 浅薄荷背景、深青绿正文、品牌绿、待开始蓝、柔白卡片、低强度阴影与参考稿一致；状态色语义明确。
- Image quality and asset fidelity: 标题叶片、三阶段石头花径、成长徽章和自由日日历标识均为真实图片或图标库资产；没有用文字字形、emoji、CSS 图形或手绘 SVG 冒充目标图像。花径使用适配槽位的居中裁切，无棋盘格、透明边缘或拉伸变形。
- Copy and content: 核心文案沿用参考稿；动态倒计时、剩余时长和徽章解锁文案保持产品真实数据，不使用静态占位内容。
- Icons and controls: 导航与任务图标来自同一线性图标库；进行中按钮为实心绿，待开始按钮为绿色描边，状态胶囊为绿/蓝语义；主要控件均可交互。
- Accessibility and responsiveness: 表单有标签，图片有 alt 或装饰性空 alt，主导航与确认弹窗均为语义化可交互控件；390 px 手机视口无水平溢出，页面可滚动，主导航切页自动回到顶部，专注与编辑页的关键操作不被持久控件遮挡。

## Full-view Comparison Evidence

`docs/design-qa-comparison-v21.png` 将参考图和今天页实现图在同一 790 × 851 画布内并排呈现。`docs/design-qa-secondary-comparison-v23.png` 将同一图二基线与专注、任务编辑、日历、复盘、奖惩、我的六个实现截图放入同一对照画布。两次全视图检查显示，核心层级、浅薄荷背景、植物意象、柔白卡片、绿色行动控件和低强度阴影已构成一致系统，没有改变主要区域比例或界面密度的差异。

## Focused Region Comparison Evidence

合并图中的实现截图按原生 375 × 811 尺寸呈现；标题叶片、三阶段石头、任务状态、按钮边框、页面图标、成长徽章和表单控件均可直接辨认，因此无需额外裁切放大。确认弹窗、节点弹窗以及隐藏底部导航后的专注/编辑布局另在浏览器中逐项检查。

## Comparison History

1. 初次对照发现 [P1] 今天页在标题和承诺之间插入迷你专注条，改变参考稿的首屏层级；修复为今天页隐藏迷你条，其他页面仍保留进行中任务提示。
2. 初次对照发现 [P2] 任务行过高，第三项任务和成长卡被挤出首屏；压缩移动端任务内边距、操作区间距、花径高度和成长卡尺寸。修复后完整三行任务、成长卡和悬浮导航同时进入 375 × 811 首屏。
3. 初次对照发现 [P2] 待开始任务误用实心绿色按钮；修复为绿色描边按钮，与参考稿一致。
4. 初次对照发现 [P2] 花径资产使用 contain 后石头过小；修复为按槽位居中适配，三块石头和曲线路径恢复参考稿的视觉重量。
5. 修复后重新生成 `docs/design-qa-implementation-v21.png`，并与参考图合成为 `docs/design-qa-comparison-v21.png`。复查未发现剩余 P0/P1/P2 问题。
6. 次级页面初次检查发现 [P2] 专注页与任务编辑页仍暴露全局底部导航，破坏沉浸式任务流程；修复为依据 `body[data-view]` 隐藏底部导航，并同步隐藏无关的迷你专注条。V23 浏览器复查确认两页导航与迷你条均为 `display: none`。
7. 次级页面初次检查发现 [P2] 危险操作确认使用 Ionic 系统样式，与图二视觉语言明显断层；修复为统一调用现有品牌 `<dialog>`，并在浏览器中验证弹窗可打开、取消与确认。
8. 次级页面初次检查发现 [P2] 我的页徽章和自由日图标仍使用文字字形；修复为真实成长徽章图片与 Ionicons 日历图标。页面标题补充现有叶片图片作为统一的植物标记。
9. 修复后在同一 390 × 844 视口重新捕获六个 V23 页面，并生成 `docs/design-qa-secondary-comparison-v23.png`。复查未发现剩余 P0/P1/P2 问题。

## Interaction and Runtime Checks

- 已测试：新增任务、任务开始、专注页、暂停、退出专注、任务状态排序、更多菜单、品牌确认弹窗、节点拆分弹窗、日历、复盘、奖惩、我的、底部导航切页和切页回顶；额外验证专注/编辑页导航隐藏和五个主页面横向溢出。
- 浏览器控制台：0 error，0 warning。
- 自动化测试：37/37 通过。
- 生产构建：通过，`dist/` 已生成。
- `node --check app.js`：通过。
- `git diff --check`：通过（仅 Git 的 LF/CRLF 提示，无空白错误）。

## V24 临时状态与窄屏 QA

- source visual truth path: `docs/design-reference-v3.png`
- implementation screenshot paths:
  - `docs/design-qa-empty-state-v24.png`
  - `docs/design-qa-reward-dialog-v24.png`
  - `docs/design-qa-node-dialog-v24.png`
  - `docs/design-qa-node-dialog-320-v24.png`
  - `docs/design-qa-celebration-v24.png`
- combined comparison evidence: `docs/design-qa-states-comparison-v24.png`
- viewport and density: 390×844 与 320×844 CSS 视口，deviceScaleFactor 1；浏览器滚动条占位后的内容宽度分别为 375px 与 305px。参考图 853×1844 在同屏画布中按比例归一，各实现截图保持原始纵横比。
- state: 全新用户空状态、奖励选择弹窗、节点拆分弹窗、窄屏节点布局、任务完成反馈。

### Findings

当前没有待处理的 P0、P1 或 P2 问题。

- [P3] 图二没有提供弹窗、空状态和完成反馈原稿，本轮以其字体、浅薄荷背景、白色柔光表面、植物徽章、叶线标记和青绿色控件做设计语言迁移，不宣称这些状态为逐像素复刻。

### Required Fidelity Surfaces

- Fonts and typography: 弹窗标题保持 21–24px 粗体中文，说明文字使用 13px/1.7 行高；320px 下长标题自然换行，无截断、重叠或过密字距。
- Spacing and layout rhythm: 弹窗使用 28–30px 圆角、18–26px 内边距和低强度大扩散阴影；320px 时节点表单调整为两行网格，按钮保持 44px 以上触控高度。
- Colors and visual tokens: 空状态、弹窗与完成反馈继续使用浅薄荷背景、深青文字、品牌绿和柔白表面；危险删除控件保留浅红语义，未引入图一的深色横幅。
- Image quality and asset fidelity: 空状态和完成反馈使用真实 `growth-badge.png`，装饰使用真实叶线图片；关闭、添加和删除操作使用 Ionic/现有图标资产，不再用文字字形或 CSS 拼图。
- Copy and content: 空状态说明、奖励选择、节点时长和完成文案均与真实功能对应；没有把动态结果写成静态占位内容。
- Accessibility and responsiveness: 原生 dialog、表单标签、aria-label、alt 与按钮语义保留；320、390、430px 主页面及弹窗均无横向溢出，控制台 0 error、0 warning。

### Comparison History

1. 初次 320px 对照发现 [P2] `body` 的固定最小宽度在桌面滚动条占位环境中造成 15px 横向滚动；修复为允许内容宽度随可用视口收缩。复查 320px 的 `scrollWidth` 与 `clientWidth` 均为 305px。
2. 初次节点弹窗对照发现 [P2] Ionic 的 `close-outline.svg` 依赖组件内部描边样式，作为外部图片时显示为空；替换为同一图标库的实心 `close.svg`。复查 320px 与 390px 截图均正常显示关闭图标。
3. 初次状态盘点发现 [P2] 完成反馈使用多色 CSS 彩纸，空状态和增删按钮使用文字字形，与图二的克制植物风格不一致；修复为植物徽章反馈、真实成长徽章和统一图标库。
4. 修复后生成 `docs/design-qa-states-comparison-v24.png`，将图二基线和五个实现状态放入同一对照画布。复查未发现剩余 P0/P1/P2 问题。

## V25 最终交互与可访问性 QA

- source visual truth path: `docs/design-reference-v3.png`
- implementation screenshot path: `docs/design-qa-final-v25.png`
- combined comparison evidence: `docs/design-qa-final-comparison-v25.png`
- viewport and density: 最终截图请求 390×844 CSS 视口，页面实际可见内容为 375×811px，deviceScaleFactor 1；对比画布将参考图与实现图等高归一，只用于检查构图、层级、色彩、图像与表面语言，不把浏览器滚动条或动态内容差异误判为设计偏差。
- state: 最终截图为今天页全新用户空状态；任务三状态、奖励、节点、完成反馈和六个次级页面继续使用 V21–V24 的同视口证据。参考图是 3 项任务状态，因此最终对照明确区分动态内容差异和视觉系统一致性。

### Findings

当前没有待处理的 P0、P1 或 P2 问题。

- [P3] 最终空状态截图与参考图的任务数据不同；三状态任务卡已由 `docs/design-qa-comparison-v21.png` 单独完成同状态对照，空状态仅用于验证首次使用体验与图二设计语言的一致性。
- [P3] 浏览器截图包含右侧原生滚动条，参考图没有浏览器界面；滚动条不属于产品视觉，不纳入保真度判断。

### Required Fidelity Surfaces

- Fonts and typography: 标题、承诺、区块标题、正文与按钮维持同一中文系统字体回退链和清晰光学层级；长内容使用安全换行，320–430px 无截断、重叠或异常压缩。
- Spacing and layout rhythm: 最终首页保持“日期/标题 → 承诺 → 花径 → 任务 → 成长反馈 → 导航”的图二顺序；卡片圆角、留白、阴影和垂直节奏在空状态与任务状态间一致。
- Colors and visual tokens: 浅薄荷背景、柔白表面、深青正文、品牌绿行动色和低强度阴影均映射 DESIGN.md 令牌；焦点轮廓继续使用品牌绿，不依赖颜色以外的隐藏状态。
- Image quality and asset fidelity: 标题叶线、三阶段花径与成长徽章均为真实位图资产，清晰度、裁切和比例稳定；方向、关闭、导航与操作图标来自正式图标库，没有使用文字箭头、乘号、emoji、CSS 图形或手绘 SVG 冒充图标。
- Copy and content: 空状态说明和主按钮明确引导第一次创建任务；任务、专注、奖励与节点文案均由真实状态驱动，不写死参考图数据。
- Icons and controls: 任务编辑返回与日历上/下月按钮改为可见的 Ionic 实心 caret 图标；图像自然尺寸 150×150px、opacity 1，容器实测 44×44px。
- Accessibility and responsiveness: `summary:focus-visible` 有 2px 品牌色轮廓；返回、月份切换、节点删除和移动端主要任务操作达到 44px 触控尺寸，紧凑删除芯片至少 32px；320px 实测 `innerWidth=320`、`scrollWidth=305`，390px 实测 `innerWidth=390`、`scrollWidth=375`，430px 实测 `innerWidth=430`、`scrollWidth=415`，均无横向溢出。

### Full-view Comparison Evidence

`docs/design-qa-final-comparison-v25.png` 把图二目标与 V25 今天页空状态放在同一画布；可直接核对标题比例、叶线、承诺、花径、绿色数量提示、柔白卡片、成长图像与悬浮式五栏导航。由于动态内容状态不同，任务卡的同状态保真度继续以 `docs/design-qa-comparison-v21.png` 为准，临时状态和弹窗以 `docs/design-qa-states-comparison-v24.png` 为准。

### Focused Region Comparison Evidence

返回图标和日历方向图标已在 390px 浏览器渲染中单独查看，并读取真实 DOM 尺寸与图像自然尺寸；日历 320px 和 430px 视口另做布局宽度检查。图标、触控区、长文案换行和焦点样式均可在全尺寸截图或量化结果中判断，因此无需额外裁切放大。

### Comparison History

1. V25 复查发现 [P2] 任务编辑返回与日历月份切换仍使用文字箭头，不符合真实图标资产规则；替换为 Ionic `caret-back.svg` / `caret-forward.svg`，并同步加入 Service Worker 缓存。
2. 初次替换使用 outline 版本时，外部 `<img>` 无法继承 Ionicons 组件内部描边样式，方向图标不可见；立即替换为实心 caret 资源。浏览器复查确认自然尺寸 150×150px、opacity 1，三个方向按钮均清晰可见。
3. 复查发现 [P2] 多个紧凑交互入口未统一到移动端触控标准；为返回/月切换/节点删除/主要任务操作补齐 44px 触控区，为建议池移除入口保留至少 32px，并补齐键盘 `focus-visible` 状态。
4. 修复后在 320、390、430px 量化复查页面宽度，均无横向溢出；生成 `docs/design-qa-final-v25.png` 与 `docs/design-qa-final-comparison-v25.png`。未发现剩余 P0/P1/P2 问题。

### Interaction and Runtime Checks

- 浏览器测试：今天页、添加任务页、返回操作、日历切页、上/下月图标、空状态、页面滚动与五栏底部导航。
- 视口测试：320×700、390×844、430×900；无横向溢出，关键控件 44×44px。
- 自动化测试：37/37 通过（受限环境出现预期的 `spawn EPERM` 后，已在外部权限环境完整重跑）。
- 生产构建：通过，`dist/` 已生成。
- `node --check app.js`：通过。
- `git diff --check`：通过（仅 Git 的 LF/CRLF 提示，无空白错误）。

## Implementation Checklist

- [x] 图二作为唯一视觉基线写入 DESIGN.md。
- [x] 所有 MVP 页面统一为“兑现花径”视觉语言。
- [x] 关键图像资产、图标、状态与响应式规则落地。
- [x] 核心交互、持久化接线、PWA 构建与自动化测试通过。
- [x] 320–430px 响应式、44px 触控尺寸、键盘焦点与正式方向图标通过最终验收。

final result: passed
