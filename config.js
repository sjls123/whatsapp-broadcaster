/**
 * 配置文件 - 多账号群发系统配置
 */

module.exports = {
    // ===== 基本配置 =====
    app: {
        name: 'WhatsApp 多账号群发机器人',
        version: '1.0.0',
        debug: true
    },

    // ===== 账号配置 =====
    accounts: [
        {
            id: 'account1',
            name: '账号1',
            enabled: true
        },
        {
            id: 'account2',
            name: '账号2',
            enabled: true
        },
        // 可添加更多账号
        // {
        //     id: 'account3',
        //     name: '账号3',
        //     enabled: true
        // }
    ],

    // ===== 浏览器配置 =====
    browser: {
        headless: false, // 是否无头模式
        slowMo: 0, // 减速模式（毫秒）
        devtools: false, // 是否打开开发工具
        width: 1920,
        height: 1080,
        defaultViewport: null
    },

    // ===== 加密配置 =====
    crypto: {
        masterSecret: 'whatsapp-bot-secret', // 主加密密钥，改为强密钥！
        algorithm: 'aes-256-cbc',
        enableEncryption: true, // 是否启用加密
        hashAlgorithm: 'sha256'
    },

    // ===== 群发配置 =====
    broadcast: {
        messageDelay: 1000, // 消息间隔（毫秒）
        retryCount: 3, // 失败重试次数
        retryDelay: 2000, // 重试延迟（毫秒）
        rateLimit: {
            enabled: true,
            messagesPerMinute: 20 // 每分钟最多发送消息数
        },
        batchSize: 10 // 单次批处理数量
    },

    // ===== 日志配置 =====
    logging: {
        level: 'info', // debug|info|warn|error
        logFile: './logs/broadcast.log',
        maxFileSize: 10485760, // 10MB
        maxFiles: 5
    },

    // ===== 存储配置 =====
    storage: {
        sessionDir: './.wwebjs_auth', // 会话保存目录
        cacheDir: './.cache',
        enableDiskCache: true
    },

    // ===== API服务器配置 =====
    server: {
        enabled: true,
        host: 'localhost',
        port: 3000,
        cors: {
            origin: '*',
            credentials: true
        }
    },

    // ===== 模板消息 =====
    templates: {
        welcome: '👋 欢迎使用WhatsApp群发机器人！',
        error: '❌ 发生错误: {error}',
        success: '✅ 消息已发送！',
        encrypted: '🔒 加密消息已发送'
    },

    // ===== 定时任务配置 =====
    scheduler: {
        enabled: false,
        tasks: [
            // 示例定时任务
            // {
            //     id: 'daily_broadcast',
            //     schedule: '0 9 * * *', // Cron表达式: 每天9点
            //     message: '早上好！',
            //     recipients: ['8613800000000@c.us'],
            //     encrypt: true
            // }
        ]
    }
};
