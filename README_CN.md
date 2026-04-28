**WhatsApp 多账号群发系统**

🚀 功能特性

✅ **多账号支持** - 同时登录和管理多个WhatsApp账号
✅ **加密消息** - 每个账号使用独立的AES-256加密密钥
✅ **群发功能** - 一次向多个接收人群发消息
✅ **失败重试** - 自动重试失败的消息
✅ **任务队列** - 支持异步任务处理
✅ **消息签名** - 防止消息篡改

---

📋 快速开始

**安装依赖**

```bash
npm install
```

**配置账号**

编辑 `config.js`，在 `accounts` 数组中添加账号：

```javascript
accounts: [
    {
        id: 'account1',
        name: '我的账号1',
        enabled: true
    },
    {
        id: 'account2',
        name: '我的账号2',
        enabled: true
    }
]
```

**启动应用**

```bash
node multi-account-app.js
```

首次启动时需要扫描二维码登录每个账号。

---

🎯 使用场景

**场景1：简单群发**

1. 选择菜单选项 `1 - 快速群发`
2. 输入消息内容
3. 输入接收人（可多个，用逗号分隔）
4. 选择是否加密
5. 系统自动发送

**场景2：加密群发**

1. 选择菜单选项 `2 - 加密群发`
2. 每个账号会生成独立的加密版本
3. 同样的内容，不同的加密方式
4. 提高消息安全性

**场景3：测试加密**

1. 选择菜单选项 `3 - 测试加密功能`
2. 查看加密消息生成过程
3. 验证消息签名和完整性

---

🔐 加密工作原理

**密钥生成**

- 基于账号ID和masterSecret生成唯一密钥
- 不同账号 = 不同密钥
- 使用HMAC-SHA256算法

**加密流程**

```
原始消息 
  ↓
[账号1] → 密钥1 → 加密消息1 → 发送
         签名1
  ↓
[账号2] → 密钥2 → 加密消息2 → 发送
         签名2
```

**消息格式**

```json
{
    "encrypted": "base64加密内容",
    "signature": "消息签名",
    "accountId": "account1",
    "timestamp": "2024-01-01T12:00:00Z",
    "method": "aes-256-cbc"
}
```

---

🔧 配置说明

**config.js 重要配置**

```javascript
// 加密配置 - 修改为强密钥！
crypto: {
    masterSecret: 'your-strong-secret-here', // 改成复杂的密钥
    algorithm: 'aes-256-cbc',
    enableEncryption: true
}

// 群发配置
broadcast: {
    messageDelay: 1000,      // 消息间隔(毫秒)
    retryCount: 3,           // 重试次数
    rateLimit: {
        enabled: true,
        messagesPerMinute: 20 // 每分钟消息数
    }
}
```

---

📚 API使用示例

**程序化调用（代码中使用）**

```javascript
const MultiAccountBroadcaster = require('./multi-account-app');

// 创建实例
const app = new MultiAccountBroadcaster();

// 初始化
await app.initialize();

// 快速群发
await app.broadcastManager.quickBroadcast(
    '你好，这是一条测试消息',
    ['8613800000000@c.us', '群ID'],
    { encrypt: true, delay: 1000 }
);

// 查看状态
app.showStatus();

// 获取统计
const stats = app.broadcastManager.getStatistics();
console.log(stats);
```

**多客户端管理**

```javascript
const MultiClientManager = require('./MultiClientManager');

const manager = new MultiClientManager();

// 创建客户端
const client1 = await manager.createClient('account1');
const client2 = await manager.createClient('account2');

// 获取就绪的客户端
const readyClients = manager.getReadyClients();

// 发送消息
await client1.sendMessage(chatId, '消息内容');

// 获取状态
const status = manager.getStatus();
```

**加密工具**

```javascript
const CryptoUtils = require('./CryptoUtils');

// 为账号生成密钥
const { key, iv } = CryptoUtils.generateKeyForAccount('account1', 'secret');

// 加密消息
const encrypted = CryptoUtils.encrypt('原始消息', key, iv);

// 解密消息
const decrypted = CryptoUtils.decrypt(encrypted, key);

// 生成签名
const signature = CryptoUtils.generateSignature('消息内容', 'account1');

// 验证签名
const isValid = CryptoUtils.verifySignature('消息内容', 'account1', signature);
```

---

⚠️ 重要提示

1. **遵守服务条款** - 合法使用WhatsApp API
2. **修改密钥** - 修改config.js中的masterSecret为复杂密钥
3. **速率限制** - 不要过度发送，避免账号被限制
4. **会话保存** - 会话文件保存在`.wwebjs_auth`目录
5. **隐私保护** - 不要在日志中打印敏感信息

---

🐛 故障排除

**问题：账号无法登录**

- 检查网络连接
- 清除`.wwebjs_auth`目录并重新登录
- 检查是否被WhatsApp限制

**问题：消息发送失败**

- 检查接收人ID是否正确（格式: `手机号@c.us` 或 `群ID`）
- 检查账号是否被限制
- 查看详细错误日志

**问题：加密消息无法解密**

- 确保masterSecret相同
- 确保accountId一致
- 检查消息是否被损坏

**问题：发送速度慢**

- 增加messageDelay会更慢，减少会加快
- 但不要太快，避免被限制
- 建议1000-2000毫秒

---

📞 联系方式

有问题或建议？

- 检查文档中的常见问题
- 查看错误日志获取详细信息
- 调整配置文件设置

---

📄 文件结构

```
whatsapp-web.js-main/
├── multi-account-app.js        # 主应用入口
├── MultiClientManager.js       # 多客户端管理
├── BroadcastManager.js         # 群发管理
├── CryptoUtils.js              # 加密工具
├── config.js                   # 配置文件
├── README_CN.md                # 中文文档（本文件）
├── index.js                    # whatsapp-web.js入口
├── src/                        # whatsapp-web.js源码
├── .wwebjs_auth/               # 会话保存目录
└── logs/                       # 日志目录
```

---

🎓 版本历史

**v1.0.0** (2024-01-01)
- ✅ 多账号支持
- ✅ AES-256加密
- ✅ 群发功能
- ✅ 任务队列
- ✅ 消息签名

---

📝 许可证

基于Apache-2.0许可证

---

**祝你使用愉快！🎉**
