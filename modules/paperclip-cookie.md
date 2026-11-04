# Paperclip Cookie 抓取合集（Surge）

来源：MaYIHEI/paperclip 的 `loon/paperclip-cookie/paperclip-cookie.lpx`，2026-11-04 获取。
保留原作者署名，许可见同目录 `paperclip-LICENSE.txt`。

将原合集的 33 条 Loon 规则适配为 31 条 Surge 规则，不包含定时签到。
普通规则继续引用上游脚本；两个共享 URL 使用随仓库发布的分流脚本，内嵌原脚本快照：

- 龙湖：按 `x-lf-channel=L0/C2` 分流 App 和小程序；其他通道直接放行。
- 商场：Referer 含 `wx1b1dda695dff82c8` 使用北京华联，否则按原合集顺序使用龙德广场。

Surge 每个请求只执行首个匹配脚本，因此共享 URL 不能简单转换成两条规则。
分流脚本保留各自存储键、校验、通知与异常处理；原脚本仅包在函数作用域内，未改业务代码。
原 Loon 正则的忽略大小写标志转为 Surge 的 `(?i)`。
MITM 域名使用 `%APPEND%`，不覆盖已有域名。

## 安装与使用

1. 在 Surge → 模块 → 安装新模块，粘贴：
   `https://raw.githubusercontent.com/silentoy/surge/main/modules/paperclip-cookie.sgmodule`
2. 关闭旧版「Paperclip · Cookie 抓取合集」，开启「Paperclip · Cookie 抓取合集（Surge）」。
   成功标志：脚本列表能看到三条中国移动 Cookie 规则，MITM、脚本和重写总开关已开启，CA 已信任。
3. 后台划掉中国移动 App，重新打开，进入「签到赢好礼」手动点一次签到。
   成功标志：收到「中国移动 Cookie 获取成功」通知；凭证不变时上游可能不重复通知。
4. 抓取成功后关闭模块，避免持续解密合集域名。

## 验证

在仓库根目录运行 `node tests/paperclip-cookie.test.cjs`。
成功标志：三组 PASS。使用虚构凭证，不访问业务服务器。
覆盖中国移动路由/请求体、龙湖通道隔离、商场分流、无效及未变更凭证。
未逐个实测合集内全部 App；普通脚本跟随上游，分流脚本是当前快照，需按需同步上游更新。
