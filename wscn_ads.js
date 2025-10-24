// 华尔街见闻广告屏蔽脚本
let body = JSON.stringify({
  code: 20000,
  message: "OK",
  data: {
    items: [],
    item_count: 0,
    click_count: 0,
    impressions_count: 0
  }
});
$done({ body });