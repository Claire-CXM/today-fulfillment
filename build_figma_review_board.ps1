Add-Type -AssemblyName System.Drawing

function Get-JpegDataUri {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$Width,
        [Parameter(Mandatory = $true)][int]$Height
    )

    $sourceImage = [System.Drawing.Image]::FromFile($Path)
    try {
        $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($sourceImage, 0, 0, $Width, $Height)
            }
            finally {
                $graphics.Dispose()
            }

            $stream = New-Object System.IO.MemoryStream
            try {
                $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg)
                return 'data:image/jpeg;base64,' + [Convert]::ToBase64String($stream.ToArray())
            }
            finally {
                $stream.Dispose()
            }
        }
        finally {
            $bitmap.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}

$generatedRoot = 'C:\Users\a\.codex\generated_images\01a0398a-f0a5-7a02-ab85-f8a2803020ea'
$downloadsRoot = 'C:\Users\a\AppData\Local\Packages\Microsoft.MicrosoftEdge_8wekyb3d8bbwe\TempState\Downloads'

$imageA = Get-JpegDataUri -Path (Join-Path $generatedRoot 'exec-afd064e9-5241-4f15-8342-9bf3db2e4da7.png') -Width 960 -Height 640
$style1Reward = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (8).png') -Width 300 -Height 533
$style1Today = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (6).png') -Width 300 -Height 533
$style1Focus = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (7).png') -Width 300 -Height 533
$style2Reward = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (1).png') -Width 430 -Height 764
$style2Focus = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案.png') -Width 430 -Height 764
$style3Focus = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (10).png') -Width 300 -Height 533
$style3Today = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (9).png') -Width 300 -Height 533
$style3Reward = Get-JpegDataUri -Path (Join-Path $downloadsRoot '产品UI视觉参考图设计方案 (11).png') -Width 300 -Height 533
$fusion = Get-JpegDataUri -Path (Join-Path $generatedRoot 'exec-911d6d7c-bd42-496b-824c-c63439062135.png') -Width 620 -Height 1340

$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="5400" height="4900" viewBox="0 0 5400 4900">
  <title>今日兑现｜四版UI视觉评审与融合方向</title>
  <defs>
    <style>
      .t{font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;fill:#173E35}
      .h1{font-size:68px;font-weight:700}
      .h2{font-size:38px;font-weight:700}
      .h3{font-size:28px;font-weight:700}
      .body{font-size:22px;font-weight:400;fill:#365A51}
      .meta{font-size:20px;font-weight:500;fill:#55756D}
      .small{font-size:18px;font-weight:500;fill:#55756D}
      .score{font-size:24px;font-weight:700;fill:#176650}
    </style>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#123F36" flood-opacity="0.09"/>
    </filter>
    <linearGradient id="fusionBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E8F7EE"/>
      <stop offset="1" stop-color="#F8F7E9"/>
    </linearGradient>
    <clipPath id="aClip"><rect x="240" y="770" width="960" height="640" rx="26"/></clipPath>
    <clipPath id="s1a"><rect x="1500" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="s1b"><rect x="1830" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="s1c"><rect x="2160" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="s2a"><rect x="2760" y="770" width="430" height="764" rx="22"/></clipPath>
    <clipPath id="s2b"><rect x="3220" y="770" width="430" height="764" rx="22"/></clipPath>
    <clipPath id="s3a"><rect x="4020" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="s3b"><rect x="4350" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="s3c"><rect x="4680" y="770" width="300" height="533" rx="22"/></clipPath>
    <clipPath id="fusionClip"><rect x="300" y="2830" width="620" height="1340" rx="36"/></clipPath>
  </defs>

  <rect width="5400" height="4900" fill="#F7F7EF"/>
  <text class="t h1" x="180" y="205">今日兑现｜UI 视觉方案评审</text>
  <text class="t" x="184" y="270" font-size="28" fill="#55756D">以核心流程、任务可读性、游戏化克制度和产品一致性为共同标准</text>
  <rect x="4070" y="145" width="1150" height="62" rx="31" fill="#DDF3E6"/>
  <text class="t score" x="4140" y="186">推荐基线：A 青柠任务岛</text>

  <rect x="180" y="350" width="5040" height="170" rx="30" fill="#E7F4ED" stroke="#B8DDCF" stroke-width="2"/>
  <text class="t h3" x="222" y="412" fill="#176650">综合排序</text>
  <text class="t" x="460" y="414" font-size="34" font-weight="700">A  8.5  →  样式一  7.5  →  样式三  6.7  →  样式二  6.2</text>
  <text class="t body" x="460" y="470">结论：以 A 的任务旅程为骨架，吸收三版的长处，但不增加未经确认的经济系统。</text>
  <rect x="4420" y="402" width="650" height="62" rx="31" fill="#1A8165"/>
  <text class="t" x="4500" y="443" font-size="22" font-weight="700" fill="#FFFFFF">融合方向：兑现花径</text>

  <!-- A card -->
  <rect x="180" y="610" width="1080" height="1830" rx="34" fill="#FFFFFF" stroke="#C8DED5" stroke-width="2" filter="url(#shadow)"/>
  <text class="t h2" x="240" y="690">A｜青柠任务岛</text>
  <text class="t meta" x="240" y="735">最佳基础方向</text>
  <rect x="1020" y="650" width="180" height="60" rx="30" fill="#DDF3E6"/>
  <text class="t score" x="1050" y="689">8.5 / 10</text>
  <image href="$imageA" x="240" y="770" width="960" height="640" clip-path="url(#aClip)"/>
  <rect x="240" y="1460" width="960" height="170" rx="24" fill="#EEF8F2" stroke="#B8DDCF" stroke-width="2"/>
  <text class="t h3" x="270" y="1510" fill="#176650">保留</text>
  <text class="t body" x="410" y="1508"><tspan x="410">任务旅程叙事、清新配色、核心闭环可见；</tspan><tspan x="410" dy="38">“完成—反馈—奖励”关系最完整。</tspan></text>
  <rect x="240" y="1650" width="960" height="170" rx="24" fill="#FFF8E8" stroke="#E8D5A4" stroke-width="2"/>
  <text class="t h3" x="270" y="1700" fill="#9A6A19">优化</text>
  <text class="t body" x="410" y="1698"><tspan x="410">降低大面积岛屿插画占比，把任务列表前置；</tspan><tspan x="410" dy="38">装饰只做品牌签名，不抢操作焦点。</tspan></text>
  <rect x="240" y="1840" width="960" height="170" rx="24" fill="#FFF1ED" stroke="#EBC0B4" stroke-width="2"/>
  <text class="t h3" x="270" y="1890" fill="#B84D3B">风险</text>
  <text class="t body" x="410" y="1888"><tspan x="410">插画持续加码会偏低龄；路线节点过多，</tspan><tspan x="410" dy="38">也会让每日任务变成“看图找入口”。</tspan></text>
  <rect x="240" y="2040" width="960" height="330" rx="26" fill="#143F36"/>
  <text class="t meta" x="275" y="2095" fill="#AEE4D1">结论</text>
  <text class="t" x="275" y="2160" font-size="30" font-weight="700" fill="#FFFFFF"><tspan x="275">作为融合稿骨架：</tspan><tspan x="275" dy="48">保留旅程，压缩顶部叙事区。</tspan></text>

  <!-- Style 1 card -->
  <rect x="1440" y="610" width="1080" height="1830" rx="34" fill="#FFFFFF" stroke="#D8E7E0" stroke-width="2" filter="url(#shadow)"/>
  <text class="t h2" x="1500" y="690">样式一｜手绘清新</text>
  <text class="t meta" x="1500" y="735">温度最高，但控件精确度不足</text>
  <rect x="2280" y="650" width="180" height="60" rx="30" fill="#EAF5EF"/>
  <text class="t score" x="2310" y="689">7.5 / 10</text>
  <image href="$style1Reward" x="1500" y="770" width="300" height="533" clip-path="url(#s1a)"/>
  <image href="$style1Today" x="1830" y="770" width="300" height="533" clip-path="url(#s1b)"/>
  <image href="$style1Focus" x="2160" y="770" width="300" height="533" clip-path="url(#s1c)"/>
  <text class="t small" x="1615" y="1340">奖励</text><text class="t small" x="1945" y="1340">今日</text><text class="t small" x="2275" y="1340">专注</text>
  <line x1="1500" y1="1380" x2="2460" y2="1380" stroke="#D9E6E0" stroke-width="2"/>
  <circle cx="1514" cy="1448" r="9" fill="#21775F"/><text class="t h3" x="1545" y="1458" fill="#21775F">保留</text>
  <text class="t body" x="1685" y="1457">手绘线条与叶片有温度，容易形成品牌记忆。</text>
  <circle cx="1514" cy="1558" r="9" fill="#A36B16"/><text class="t h3" x="1545" y="1568" fill="#A36B16">优化</text>
  <text class="t body" x="1685" y="1567"><tspan x="1685">控制装饰数量；主按钮、进度与状态</tspan><tspan x="1685" dy="38">必须回到统一组件规则。</tspan></text>
  <circle cx="1514" cy="1700" r="9" fill="#B84D3B"/><text class="t h3" x="1545" y="1710" fill="#B84D3B">风险</text>
  <text class="t body" x="1685" y="1709"><tspan x="1685">手绘边框会降低控件精确感，</tspan><tspan x="1685" dy="38">且三页信息密度不稳定。</tspan></text>
  <rect x="1500" y="1870" width="960" height="350" rx="26" fill="#F0F8F4"/>
  <text class="t meta" x="1535" y="1925" fill="#176650">推荐吸收</text>
  <text class="t" x="1535" y="1990" font-size="30" font-weight="700"><tspan x="1535">叶片、花径、手绘短线</tspan><tspan x="1535" dy="50">只用于标题、奖励和空状态。</tspan></text>

  <!-- Style 2 card -->
  <rect x="2700" y="610" width="1080" height="1830" rx="34" fill="#FFFFFF" stroke="#D8E7E0" stroke-width="2" filter="url(#shadow)"/>
  <text class="t h2" x="2760" y="690">样式二｜清透渐变</text>
  <text class="t meta" x="2760" y="735">最干净，但游戏感和品牌记忆偏弱</text>
  <rect x="3540" y="650" width="180" height="60" rx="30" fill="#F1F3F2"/>
  <text class="t score" x="3570" y="689">6.2 / 10</text>
  <image href="$style2Reward" x="2760" y="770" width="430" height="764" clip-path="url(#s2a)"/>
  <image href="$style2Focus" x="3220" y="770" width="430" height="764" clip-path="url(#s2b)"/>
  <text class="t small" x="2938" y="1570">奖励</text><text class="t small" x="3398" y="1570">专注</text>
  <line x1="2760" y1="1610" x2="3720" y2="1610" stroke="#D9E6E0" stroke-width="2"/>
  <text class="t h3" x="2760" y="1680" fill="#21775F">保留</text>
  <text class="t body" x="2895" y="1679">留白充足、布局实现成本低、焦点集中。</text>
  <text class="t h3" x="2760" y="1780" fill="#A36B16">优化</text>
  <text class="t body" x="2895" y="1779"><tspan x="2895">圆环应服务计时，不应挤压节点和操作；</tspan><tspan x="2895" dy="38">渐变强度控制在关键反馈。</tspan></text>
  <text class="t h3" x="2760" y="1920" fill="#B84D3B">风险</text>
  <text class="t body" x="2895" y="1919"><tspan x="2895">过度清透会变成通用效率 App，</tspan><tspan x="2895" dy="38">缺少“兑现承诺”的独特叙事。</tspan></text>
  <rect x="2760" y="2080" width="960" height="210" rx="26" fill="#F3F5F4"/>
  <text class="t meta" x="2795" y="2135">推荐吸收</text>
  <text class="t" x="2795" y="2200" font-size="28" font-weight="700">留白、分组、低成本组件骨架。</text>

  <!-- Style 3 card -->
  <rect x="3960" y="610" width="1080" height="1830" rx="34" fill="#FFFFFF" stroke="#E8DFC5" stroke-width="2" filter="url(#shadow)"/>
  <text class="t h2" x="4020" y="690">样式三｜游戏成长</text>
  <text class="t meta" x="4020" y="735">反馈最强，但机制与视觉负担过重</text>
  <rect x="4800" y="650" width="180" height="60" rx="30" fill="#FFF3D2"/>
  <text class="t score" x="4830" y="689" fill="#8C6518">6.7 / 10</text>
  <image href="$style3Focus" x="4020" y="770" width="300" height="533" clip-path="url(#s3a)"/>
  <image href="$style3Today" x="4350" y="770" width="300" height="533" clip-path="url(#s3b)"/>
  <image href="$style3Reward" x="4680" y="770" width="300" height="533" clip-path="url(#s3c)"/>
  <text class="t small" x="4135" y="1340">专注</text><text class="t small" x="4465" y="1340">今日</text><text class="t small" x="4795" y="1340">奖励</text>
  <line x1="4020" y1="1380" x2="4980" y2="1380" stroke="#E5DDC8" stroke-width="2"/>
  <text class="t h3" x="4020" y="1460" fill="#21775F">保留</text>
  <text class="t body" x="4155" y="1459"><tspan x="4155">阶段奖励预告能增强期待感，</tspan><tspan x="4155" dy="38">完成反馈也足够明确。</tspan></text>
  <text class="t h3" x="4020" y="1600" fill="#A36B16">优化</text>
  <text class="t body" x="4155" y="1599"><tspan x="4155">游戏感要来自进度与结果，</tspan><tspan x="4155" dy="38">不来自同时堆叠多套数值。</tspan></text>
  <text class="t h3" x="4020" y="1740" fill="#B84D3B">舍弃</text>
  <text class="t body" x="4155" y="1739"><tspan x="4155">金币、EXP、等级、角色、连击</tspan><tspan x="4155" dy="38">均未被当前 PRD 确认。</tspan></text>
  <rect x="4020" y="1910" width="960" height="320" rx="26" fill="#FFF8E8"/>
  <text class="t meta" x="4055" y="1965" fill="#8C6518">产品判断</text>
  <text class="t" x="4055" y="2030" font-size="28" font-weight="700"><tspan x="4055">只借“奖励即将到来”的期待感，</tspan><tspan x="4055" dy="48">不复制经济系统。</tspan></text>

  <!-- Fusion section -->
  <rect x="180" y="2600" width="4860" height="2050" rx="42" fill="url(#fusionBg)" stroke="#B8DDCF" stroke-width="3"/>
  <text class="t" x="300" y="2715" font-size="52" font-weight="700">融合方向｜兑现花径</text>
  <text class="t" x="300" y="2775" font-size="25" fill="#55756D">清新极简是底，轻游戏反馈是节奏；所有装饰都必须服务任务兑现。</text>
  <rect x="300" y="2830" width="620" height="1340" rx="36" fill="#FFFFFF" stroke="#C8DED5" stroke-width="3" filter="url(#shadow)"/>
  <image href="$fusion" x="300" y="2830" width="620" height="1340" clip-path="url(#fusionClip)"/>
  <rect x="300" y="4200" width="620" height="250" rx="30" fill="#143F36"/>
  <text class="t meta" x="340" y="4260" fill="#AEE4D1">推荐程度</text>
  <text class="t" x="340" y="4330" font-size="36" font-weight="700" fill="#FFFFFF">进入全站视觉深化</text>
  <text class="t" x="340" y="4385" font-size="22" fill="#DFF3EA">先验证首页密度，再延展其他页面。</text>

  <rect x="1030" y="2830" width="1180" height="720" rx="30" fill="#FFFFFF" stroke="#D4E6DE" stroke-width="2"/>
  <text class="t h2" x="1090" y="2920">四版融合原则</text>
  <rect x="1090" y="2970" width="1060" height="96" rx="24" fill="#EAF6EF"/><text class="t h3" x="1130" y="3030" fill="#176650">A：任务旅程作为信息骨架</text>
  <rect x="1090" y="3088" width="1060" height="96" rx="24" fill="#F3F8F5"/><text class="t h3" x="1130" y="3148">样式一：手绘仅做品牌签名</text>
  <rect x="1090" y="3206" width="1060" height="96" rx="24" fill="#F3F8F5"/><text class="t h3" x="1130" y="3266">样式二：吸收留白与分组秩序</text>
  <rect x="1090" y="3324" width="1060" height="150" rx="24" fill="#FFF8E8"/><text class="t h3" x="1130" y="3384" fill="#8C6518"><tspan x="1130">样式三：只保留阶段奖励预告</tspan><tspan x="1130" dy="44">不引入金币、EXP、等级与角色</tspan></text>

  <rect x="2280" y="2830" width="1180" height="720" rx="30" fill="#FFFFFF" stroke="#D4E6DE" stroke-width="2"/>
  <text class="t h2" x="2340" y="2920">产品规则锁定</text>
  <text class="t h3" x="2340" y="3020" fill="#176650">01</text><text class="t body" x="2420" y="3020">任务排序：进行中 → 待开始 → 已结束 → 已完成</text>
  <line x1="2340" y1="3065" x2="3400" y2="3065" stroke="#E1EAE6" stroke-width="2"/>
  <text class="t h3" x="2340" y="3145" fill="#176650">02</text><text class="t body" x="2420" y="3145">无节点任务不显示手动进度条</text>
  <line x1="2340" y1="3190" x2="3400" y2="3190" stroke="#E1EAE6" stroke-width="2"/>
  <text class="t h3" x="2340" y="3270" fill="#176650">03</text><text class="t body" x="2420" y="3270">完成历史不可编辑、不可删除</text>
  <line x1="2340" y1="3315" x2="3400" y2="3315" stroke="#E1EAE6" stroke-width="2"/>
  <text class="t h3" x="2340" y="3395" fill="#176650">04</text><text class="t body" x="2420" y="3395">五栏导航与新版 PRD 保持一致</text>

  <rect x="3530" y="2830" width="1390" height="720" rx="30" fill="#143F36"/>
  <text class="t h2" x="3590" y="2920" fill="#FFFFFF">为什么这版更好</text>
  <text class="t" x="3590" y="3020" font-size="27" font-weight="700" fill="#AEE4D1">清晰</text>
  <text class="t body" x="3710" y="3020" fill="#E6F2EE">任务始终是视觉主角，首屏即可行动。</text>
  <text class="t" x="3590" y="3130" font-size="27" font-weight="700" fill="#AEE4D1">克制</text>
  <text class="t body" x="3710" y="3130" fill="#E6F2EE">游戏感来自进度、状态和奖励预期。</text>
  <text class="t" x="3590" y="3240" font-size="27" font-weight="700" fill="#AEE4D1">一致</text>
  <text class="t body" x="3710" y="3240" fill="#E6F2EE">不扩展尚未定义的经济系统。</text>
  <text class="t" x="3590" y="3350" font-size="27" font-weight="700" fill="#AEE4D1">可落地</text>
  <text class="t body" x="3710" y="3350" fill="#E6F2EE">可复用现有 MVP 结构逐页换肤。</text>
  <rect x="3590" y="3410" width="1270" height="82" rx="24" fill="#286653"/>
  <text class="t" x="3630" y="3463" font-size="24" font-weight="700" fill="#FFFFFF">核心判断：先建立日常使用习惯，再逐步加深成长系统。</text>

  <rect x="1030" y="3650" width="3890" height="800" rx="30" fill="#FFFFFF" stroke="#D4E6DE" stroke-width="2"/>
  <text class="t h2" x="1090" y="3740">下一步视觉深化</text>
  <rect x="1090" y="3800" width="880" height="510" rx="28" fill="#EEF8F2"/>
  <text class="t h3" x="1140" y="3870" fill="#176650">首页密度校准</text>
  <text class="t body" x="1140" y="3930"><tspan x="1140">顶部花径区再压缩约 10%</tspan><tspan x="1140" dy="42">确保 390×844 首屏看见</tspan><tspan x="1140" dy="42">至少两条任务和主要操作。</tspan></text>
  <rect x="2020" y="3800" width="880" height="510" rx="28" fill="#F6F7F4"/>
  <text class="t h3" x="2070" y="3870">组件统一</text>
  <text class="t body" x="2070" y="3930"><tspan x="2070">统一按钮、状态标签、卡片</tspan><tspan x="2070" dy="42">和进度表达；手绘装饰不得</tspan><tspan x="2070" dy="42">进入高频操作控件边界。</tspan></text>
  <rect x="2950" y="3800" width="880" height="510" rx="28" fill="#FFF8E8"/>
  <text class="t h3" x="3000" y="3870" fill="#8C6518">全流程延展</text>
  <text class="t body" x="3000" y="3930"><tspan x="3000">按“今日 → 专注 → 日历 →</tspan><tspan x="3000" dy="42">复盘 → 奖惩 → 我的”扩展，</tspan><tspan x="3000" dy="42">逐页验证信息优先级。</tspan></text>
  <rect x="3880" y="3800" width="980" height="510" rx="28" fill="#143F36"/>
  <text class="t h3" x="3930" y="3870" fill="#AEE4D1">验收重点</text>
  <text class="t body" x="3930" y="3930" fill="#E6F2EE"><tspan x="3930">不出现页面卡死与内容不可滚动；</tspan><tspan x="3930" dy="42">刷新后本地数据仍然存在；</tspan><tspan x="3930" dy="42">通知、计时和状态排序可验证。</tspan></text>

  <text class="t small" x="180" y="4820">评审产物｜2026-08-27　　范围：视觉方向，不新增产品机制　　建议：批准融合方向后再进入全页面高保真设计</text>
</svg>
"@

$outputPath = Join-Path $PSScriptRoot '今日兑现_UI视觉方案评审画板.svg'
[System.IO.File]::WriteAllText($outputPath, $svg, [System.Text.UTF8Encoding]::new($false))
Write-Output $outputPath
