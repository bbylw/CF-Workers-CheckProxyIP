# CF-Workers-CheckProxyIP

验证CF ProxyIP可用性的Cloudflare Workers项目

## 项目介绍

该项目使用 Cloudflare Workers 来检查代理 IP 是否可用。UI设计采用了类似Pornhub的黑橙配色方案，提供直观且美观的用户体验。

### 特色功能

- 快速检测代理IP的可用性
- 支持带端口和不带端口的IP格式
- 提供简洁的API接口
- 美观的用户界面，采用黑色背景和橙色按钮的经典配色

## UI设计

本项目的UI设计灵感来源于Pornhub网站的经典配色方案：
- 黑色背景 (#0a0a0a)
- 橙色按钮和强调色 (#ff9000)
- 黑橙组合的标志性标题样式
- 深灰色内容区域 (#1a1a1a)
- 高对比度的文本和元素

这种配色方案不仅视觉冲击力强，而且提供了良好的可读性和用户体验。

## 使用方法

1. 部署到 Cloudflare Workers 后，在浏览器访问您的Workers URL
2. 在输入框中输入需要检查的代理IP地址（例如：`1.2.3.4:443`）
3. 点击"检查"按钮获取结果
4. 也可以通过API直接调用：

```
GET /check?proxyip=1.2.3.4:443
```

## API接口

### 请求格式

```
GET /check?proxyip=YOUR_PROXY_IP
```

### 参数说明

- **proxyip**: 待检查的ProxyIP地址（必填，不带端口默认443）

### 响应格式

```json
{
  "success": true|false,     // 代理IP是否有效
  "proxyIP": "1.2.3.4",      // 如果有效，返回代理IP，否则为-1
  "portRemote": 443,         // 如果有效，返回端口，否则为-1
  "timestamp": "2023-05-10T14:44:30.597Z"  // 检查时间
}
```

## 示例请求

```bash
curl "https://your-worker-url/check?proxyip=1.2.3.4"
```

## 注意事项

- 不带端口时默认使用443
- 可在本地或其他环境使用fetch、XHR等方式调用接口
- UI设计采用了特定的配色方案，如需修改可编辑HTML函数中的CSS部分
