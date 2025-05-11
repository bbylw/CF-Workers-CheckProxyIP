import { connect } from "cloudflare:sockets";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const hostname = url.hostname;

    // 不区分大小写检查路径
    if (path.toLowerCase() === '/check') {
      if (!url.searchParams.has('proxyip')) return new Response('Missing proxyip parameter', { status: 400 });
      if (url.searchParams.get('proxyip') === '') return new Response('Invalid proxyip parameter', { status: 400 });
      if (!url.searchParams.get('proxyip').includes('.') && !(url.searchParams.get('proxyip').includes('[') && url.searchParams.get('proxyip').includes(']'))) return new Response('Invalid proxyip format', { status: 400 });
      // 获取参数中的IP或使用默认IP
      const proxyIP = url.searchParams.get('proxyip').toLowerCase();

      // 调用CheckProxyIP函数
      const result = await CheckProxyIP(proxyIP);

      // 返回JSON响应，根据检查结果设置不同的状态码
      return new Response(JSON.stringify(result, null, 2), {
        status: result.success ? 200 : 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      return await HTML(hostname);
    }
  }
};

// 封装成CheckProxyIP函数
async function CheckProxyIP(proxyIP) {
  //const portRemote = proxyIP.includes('.tp') ? parseInt(proxyIP.split('.tp')[1].split('.')[0]) || 443 : 443;
  let portRemote = 443;
  if (proxyIP.includes('.tp')) {
    const portMatch = proxyIP.match(/\.tp(\d+)\./);
    if (portMatch) portRemote = parseInt(portMatch[1]);
  } else if (proxyIP.includes(':')) {
    portRemote = parseInt(proxyIP.split(':')[1]);
    proxyIP = proxyIP.split(':')[0];
  }

  const tcpSocket = connect({
    hostname: proxyIP,
    port: portRemote,
  });

  try {
    // 构建HTTP GET请求
    const httpRequest =
      "GET /cdn-cgi/trace HTTP/1.1\r\n" +
      "Host: speed.cloudflare.com\r\n" +
      "User-Agent: CheckProxyIP/cmliu\r\n" +
      "Connection: close\r\n\r\n";

    // 发送HTTP请求
    const writer = tcpSocket.writable.getWriter();
    await writer.write(new TextEncoder().encode(httpRequest));
    writer.releaseLock();

    // 读取HTTP响应
    const reader = tcpSocket.readable.getReader();
    let responseData = new Uint8Array(0);

    // 读取所有可用数据
    while (true) {
      const { value, done } = await Promise.race([
        reader.read(),
        new Promise(resolve => setTimeout(() => resolve({ done: true }), 5000)) // 5秒超时
      ]);

      if (done) break;
      if (value) {
        // 合并数据
        const newData = new Uint8Array(responseData.length + value.length);
        newData.set(responseData);
        newData.set(value, responseData.length);
        responseData = newData;

        // 检查是否接收到完整响应
        const responseText = new TextDecoder().decode(responseData);
        if (responseText.includes("\r\n\r\n") &&
          (responseText.includes("Connection: close") || responseText.includes("content-length"))) {
          break;
        }
      }
    }
    reader.releaseLock();

    // 解析HTTP响应
    const responseText = new TextDecoder().decode(responseData);

    // 判断是否成功
    const isSuccessful = responseText.toLowerCase().includes('cloudflare');

    // 构建JSON响应
    const jsonResponse = {
      success: isSuccessful,
      proxyIP: isSuccessful ? proxyIP : -1,
      portRemote: isSuccessful ? portRemote : -1,
      //statusCode: statusCode || null,
      //responseSize: responseData.length,
      //responseData: responseText,
      timestamp: new Date().toISOString(),
    };

    // 关闭连接
    await tcpSocket.close();

    return jsonResponse;
  } catch (error) {
    // 连接失败，返回失败的JSON
    return {
      success: false,
      proxyIP: -1,
      portRemote: -1,
      timestamp: new Date().toISOString(),
      error: error.message || error.toString()
    };
  }
}

async function HTML(hostname) {
  // 首页 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CheckProxyIP - 代理IP检测</title>
  <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZmlsbD0iI2ZmOTAwMCIgZD0iTTE2IDJDOCAyIDIgOCAyIDE2czYgMTQgMTQgMTQgMTQtNiAxNC0xNC02LTE0LTE0LTE0em0wIDI2QzkuNCAxOCA0IDEyLjYgNCAxNlM5LjQgNCAxNiA0czEyIDUuNCAxMiAxMi01LjQgMTItMTIgMTJ6Ii8+PHBhdGggZmlsbD0iI2ZmOTAwMCIgZD0iTTE2IDZjLTUuNSAwLTEwIDQuNS0xMCAxMHM0LjUgMTAgMTAgMTAgMTAtNC41IDEwLTEwLTQuNS0xMC0xMC0xMHptMCAxOGMtNC40IDAtOC0zLjYtOC04czMuNi04IDgtOCA4IDMuNiA4IDgtMy42IDgtOCA4eiIvPjxwYXRoIGZpbGw9IiNmZjkwMDAiIGQ9Ik0xNiAxMGMtMy4zIDAtNiAyLjctNiA2czIuNyA2IDYgNiA2LTIuNyA2LTYtMi43LTYtNi02em0wIDEwYy0yLjIgMC00LTEuOC00LTRzMS44LTQgNC00IDQgMS44IDQgNC0xLjggNC00IDR6Ii8+PC9zdmc+" type="image/x-icon">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #ffffff;
      background-color: #0a0a0a;
      position: relative;
    }

    h1, h2, h3 {
      color: #ffffff;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      font-weight: bold;
      text-transform: uppercase;
    }
    h1 span.ph-style {
      background-color: #000000;
      color: #ffffff;
      padding: 5px 10px;
      border-radius: 5px;
    }
    h1 span.ph-highlight {
      background-color: #ff9000;
      color: #000000;
      padding: 5px 10px;
      border-radius: 5px;
      margin-left: 5px;
    }
    .container {
      background-color: #1a1a1a;
      border-radius: 5px;
      padding: 25px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      margin-bottom: 30px;
      border: 1px solid #333333;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 20px;
    }
    .form-label {
      flex: 0 0 100%;
      margin-bottom: 10px;
      font-weight: bold;
      font-size: 1.1em;
      color: #ffffff;
    }
    .input-wrapper {
      flex: 1;
      margin-right: 15px;
    }
    input[type="text"] {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #333333;
      border-radius: 6px;
      box-sizing: border-box;
      font-size: 16px;
      transition: border-color 0.3s, box-shadow 0.3s;
      background-color: #2a2a2a;
      color: #ffffff;
    }
    input[type="text"]:focus {
      border-color: #ff9000;
      box-shadow: 0 0 8px rgba(255, 144, 0, 0.5);
      outline: none;
    }
    .btn-check {
      background-color: #ff9000;
      color: #000000;
      border: none;
      padding: 12px 25px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      text-transform: uppercase;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .btn-check:hover {
      background-color: #ffa31a;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(255, 144, 0, 0.3);
    }
    .btn-check:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(255, 144, 0, 0.2);
    }
    .btn-check::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5px;
      height: 5px;
      background: rgba(255, 255, 255, 0.5);
      opacity: 0;
      border-radius: 100%;
      transform: scale(1, 1) translate(-50%);
      transform-origin: 50% 50%;
    }
    .btn-check:focus:not(:active)::after {
      animation: ripple 0.6s ease-out;
    }
    @keyframes ripple {
      0% {
        transform: scale(0, 0);
        opacity: 1;
      }
      20% {
        transform: scale(25, 25);
        opacity: 0.8;
      }
      100% {
        transform: scale(50, 50);
        opacity: 0;
      }
    }
    #result {
      margin-top: 20px;
      padding: 20px;
      border-radius: 6px;
      display: none;
    }
    .success {
      background-color: #1a1a1a;
      color: #ff9000;
      border-left: 5px solid #ff9000;
    }
    .error {
      background-color: #1a1a1a;
      color: #ff5555;
      border-left: 5px solid #ff5555;
    }
    .loader {
      border: 4px solid #333333;
      border-top: 4px solid #ff9000;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      display: none;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .copy-value {
      display: inline-block;
      padding: 5px 12px;
      background-color: #2a2a2a;
      border: 1px solid #444444;
      border-radius: 4px;
      cursor: pointer;
      margin: 3px 0;
      transition: all 0.2s;
      position: relative;
      font-weight: 500;
      color: #ff9000;
    }
    .copy-value:hover {
      background-color: #333333;
      border-color: #ff9000;
    }
    .copy-value::after {
      content: "已复制!";
      position: absolute;
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      background-color: #ff9000;
      color: #000000;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      white-space: nowrap;
      z-index: 100;
    }
    .copy-value.copied::after {
      opacity: 1;
    }
    .api-docs {
      margin-top: 30px;
    }
    .code-block {
      background-color: #2a2a2a;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      border-left: 4px solid #ff9000;
      color: #ffffff;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #999999;
      font-size: 14px;
      padding: 10px 0;
      border-top: 1px solid #333333;
    }
    .section-title {
      color: #ffffff;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333333;
    }
    .highlight-red {
        color: #ff5555;
        font-weight: bold;
    }
    .github-corner svg {
      fill: #ff9000;
      color: #000000;
      position: fixed;
      top: 0;
      right: 0;
      border: 0;
      width: 80px;
      height: 80px;
    }

    .github-corner:hover .octo-arm {
      animation: octocat-wave 560ms ease-in-out;
    }

    /* 添加章鱼猫挥手动画关键帧 */
    @keyframes octocat-wave {
      0%, 100% { transform: rotate(0); }
      20%, 60% { transform: rotate(-25deg); }
      40%, 80% { transform: rotate(10deg); }
    }
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
      }
      .input-wrapper {
        margin-right: 0;
        margin-bottom: 15px;
        width: 100%;
      }
      .btn-check {
        width: 100%;
      }
      .github-corner:hover .octo-arm {
        animation: none;
      }

      .github-corner .octo-arm {
        animation: octocat-wave 560ms ease-in-out;
      }
    }
  </style>
</head>
<body>
  <a href="https://github.com/cmliu/CF-Workers-CheckProxyIP" target="_blank" class="github-corner" aria-label="View source on Github">
    <svg viewBox="0 0 250 250" aria-hidden="true">
      <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
      <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path>
      <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
    </svg>
  </a>
  <h1><span class="ph-style">Check</span><span class="ph-highlight">ProxyIP</span></h1>

  <div class="container">
    <div class="form-row">
      <label for="proxyip" class="form-label">请输入 ProxyIP 地址:</label>
      <div class="input-wrapper">
        <input type="text" id="proxyip" name="proxyip" placeholder="例如: 1.2.3.4 或 example.com:443">
      </div>
      <button id="checkBtn" class="btn-check" onclick="checkProxyIP()">检查</button>
    </div>
    <div class="loader" id="loader"></div>
    <div id="result"></div>
  </div>

  <div class="container api-docs">
    <h2 class="section-title">API 文档</h2>
    <p>您可以通过以下 API 直接检查代理 IP 是否有效:</p>
    <h3>请求格式</h3>
    <div class="code-block">
      <strong>GET</strong> /check?proxyip=<span style="color: #ff9000;">YOUR_PROXY_IP</span>
    </div>
    <h3>参数说明</h3>
    <ul>
      <li><strong>proxyip</strong>: 待检查的 ProxyIP 地址 (必填，不带端口默认443)</li>
    </ul>
    <h3>响应Json格式</h3>
    <div class="code-block">
{<br>
  &nbsp;&nbsp;<span style="color: #ff9000;">"success"</span>: <span style="color: #00aaff;">true|false</span>,     <span style="color: #999999;">// 代理 IP 是否有效</span><br>
  &nbsp;&nbsp;<span style="color: #ff9000;">"proxyIP"</span>: <span style="color: #00aaff;">"1.2.3.4"</span>,      <span style="color: #999999;">// 如果有效,返回代理 IP,否则为 -1</span><br>
  &nbsp;&nbsp;<span style="color: #ff9000;">"portRemote"</span>: <span style="color: #00aaff;">443</span>,         <span style="color: #999999;">// 如果有效,返回端口,否则为 -1</span><br>
  &nbsp;&nbsp;<span style="color: #ff9000;">"timestamp"</span>: <span style="color: #00aaff;">"2025-05-10T14:44:30.597Z"</span>  <span style="color: #999999;">// 检查时间</span><br>
}<br>
    </div>
    <h3>示例</h3>
    <div class="code-block">
<span style="color: #00aaff;">curl</span> <span style="color: #ffffff;">"https://${hostname}/check?proxyip=</span><span style="color: #ff9000;">1.2.3.4:443</span><span style="color: #ffffff;">"</span>
    </div>
  </div>

  <div class="footer">
    &copy; 2025 Check ProxyIP - 基于 Cloudflare Workers 构建的高性能 ProxyIP 验证服务 | by cmliu
  </div>

  <script>
    async function checkProxyIP() {
      const proxyipInput = document.getElementById('proxyip');
      const resultDiv = document.getElementById('result');
      const loader = document.getElementById('loader');
      const checkBtn = document.getElementById('checkBtn');

      const proxyip = proxyipInput.value.trim();
      if (!proxyip) {
        resultDiv.className = 'error';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '请输入代理IP地址';
        return;
      }

      // 显示加载状态
      loader.style.display = 'block';
      checkBtn.disabled = true;
      resultDiv.style.display = 'none';

      try {
        const response = await fetch(\`./check?proxyip=\${encodeURIComponent(proxyip)}\`);
        const data = await response.json();

        // 处理结果
        if (data.success) {
          resultDiv.className = 'success';
          resultDiv.innerHTML = \`
            <b>ProxyIP 有效!</b>
            <br><br>
            <b>代理IP:</b> <span class="copy-value" onclick="copyToClipboard(this)">\${data.proxyIP}</span>
            <br>
            <b>端口:</b> <span class="copy-value" onclick="copyToClipboard(this)">\${data.portRemote}</span>
            <br>
            <b>检测时间:</b> \${new Date(data.timestamp).toLocaleString()}
          \`;
        } else {
          resultDiv.className = 'error';
          resultDiv.innerHTML = \`
            <b>ProxyIP 失效!</b>
            <br><br>
            \${data.error ? \`<b>错误信息:</b> \${data.error}<br>\` : ''}
            <b>检测时间:</b> \${new Date(data.timestamp).toLocaleString()}
          \`;
        }
      } catch (err) {
        resultDiv.className = 'error';
        resultDiv.innerHTML = \`检查过程中发生错误: \${err.message}\`;
      } finally {
        loader.style.display = 'none';
        checkBtn.disabled = false;
        resultDiv.style.display = 'block';
      }
    }

    function copyToClipboard(element) {
      const text = element.textContent;
      navigator.clipboard.writeText(text).then(() => {
        // 添加"已复制"效果
        element.classList.add('copied');
        setTimeout(() => {
          element.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('复制失败:', err);
      });
    }

    // 支持回车键提交
    document.getElementById('proxyip').addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('checkBtn').click();
      }
    });
  </script>
</body>
</html>
`;

  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8" }
  });
}
