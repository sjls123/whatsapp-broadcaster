/**
 * REST API 服务器 - 通过HTTP调用群发功能
 * 运行: node api-server.js
 */

const express = require('express');
const MultiClientManager = require('./MultiClientManager');
const BroadcastManager = require('./BroadcastManager');
const CryptoUtils = require('./CryptoUtils');
const config = require('./config');

class BroadcastAPIServer {
    constructor() {
        this.app = express();
        this.clientManager = null;
        this.broadcastManager = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        
        // 日志中间件
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });

        // 错误处理
        this.app.use((err, req, res, next) => {
            console.error('错误:', err);
            res.status(500).json({
                success: false,
                message: err.message
            });
        });
    }

    setupRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString()
            });
        });

        // 获取账号状态
        this.app.get('/api/accounts', (req, res) => {
            const status = this.clientManager.getStatus();
            res.json({
                success: true,
                data: status
            });
        });

        // 获取账号详情
        this.app.get('/api/accounts/:accountId', (req, res) => {
            const { accountId } = req.params;
            const client = this.clientManager.getClient(accountId);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: `账号 ${accountId} 不存在`
                });
            }

            res.json({
                success: true,
                data: {
                    accountId,
                    ready: !!client.info,
                    info: client.info || null
                }
            });
        });

        // 群发消息
        this.app.post('/api/broadcast', async (req, res) => {
            try {
                const { message, recipients, encrypt, delay, accountIds } = req.body;

                // 验证输入
                if (!message) {
                    return res.status(400).json({
                        success: false,
                        message: 'message 必填'
                    });
                }

                if (!Array.isArray(recipients) || recipients.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'recipients 必填且必须是数组'
                    });
                }

                // 添加任务
                const taskId = this.broadcastManager.addTask({
                    message,
                    recipients,
                    encrypt: encrypt !== false,
                    delay: delay || 1000,
                    accountIds: accountIds || undefined,
                    retryCount: 3
                });

                res.json({
                    success: true,
                    taskId,
                    message: '任务已添加到队列'
                });

                // 异步处理任务（不阻塞响应）
                setTimeout(() => {
                    this.broadcastManager.processTasks().catch(err => {
                        console.error('处理任务失败:', err);
                    });
                }, 0);

            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });

        // 快速群发
        this.app.post('/api/broadcast/quick', async (req, res) => {
            try {
                const { message, recipients, encrypt, delay } = req.body;

                if (!message || !recipients) {
                    return res.status(400).json({
                        success: false,
                        message: 'message 和 recipients 必填'
                    });
                }

                const taskId = await this.broadcastManager.quickBroadcast(
                    message,
                    Array.isArray(recipients) ? recipients : [recipients],
                    { encrypt: encrypt !== false, delay: delay || 1000 }
                );

                res.json({
                    success: true,
                    taskId,
                    message: '群发已完成'
                });

            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });

        // 加密消息
        this.app.post('/api/encrypt', (req, res) => {
            try {
                const { message, accountId } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        message: 'message 必填'
                    });
                }

                if (!accountId) {
                    return res.status(400).json({
                        success: false,
                        message: 'accountId 必填'
                    });
                }

                const { key, iv } = CryptoUtils.generateKeyForAccount(
                    accountId,
                    config.crypto.masterSecret
                );

                const encrypted = CryptoUtils.encryptMessage(message, accountId, key, iv);

                res.json({
                    success: true,
                    data: encrypted
                });

            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });

        // 解密消息
        this.app.post('/api/decrypt', (req, res) => {
            try {
                const { encryptedText, accountId } = req.body;

                if (!encryptedText || !accountId) {
                    return res.status(400).json({
                        success: false,
                        message: 'encryptedText 和 accountId 必填'
                    });
                }

                const { key } = CryptoUtils.generateKeyForAccount(
                    accountId,
                    config.crypto.masterSecret
                );

                const decrypted = CryptoUtils.decrypt(encryptedText, key);

                res.json({
                    success: true,
                    data: {
                        decrypted,
                        original: encryptedText.substring(0, 50) + '...'
                    }
                });

            } catch (err) {
                res.status(500).json({
                    success: false,
                    message: err.message
                });
            }
        });

        // 获取任务队列
        this.app.get('/api/queue', (req, res) => {
            const tasks = this.broadcastManager.getQueuedTasks();
            res.json({
                success: true,
                data: tasks
            });
        });

        // 获取统计信息
        this.app.get('/api/statistics', (req, res) => {
            const stats = this.broadcastManager.getStatistics();
            res.json({
                success: true,
                data: stats
            });
        });

        // 清空队列
        this.app.delete('/api/queue', (req, res) => {
            this.broadcastManager.clearQueue();
            res.json({
                success: true,
                message: '队列已清空'
            });
        });
    }

    async initialize() {
        this.clientManager = new MultiClientManager();
        this.broadcastManager = new BroadcastManager(this.clientManager);

        console.log('📱 初始化账号...\n');

        for (const account of config.accounts) {
            if (account.enabled) {
                try {
                    await this.clientManager.createClient(account.id);
                } catch (err) {
                    console.error(`初始化 ${account.id} 失败:`, err.message);
                }
            }
        }
    }

    async start() {
        try {
            await this.initialize();

            const port = config.server.port;
            this.app.listen(port, () => {
                console.log(`\n✅ API服务器启动成功！\n`);
                console.log(`🌐 服务地址: http://localhost:${port}\n`);
                console.log(`📚 API文档:\n`);
                console.log(`  GET  /health                    - 健康检查`);
                console.log(`  GET  /api/accounts              - 获取账号列表`);
                console.log(`  GET  /api/accounts/:accountId   - 获取账号详情`);
                console.log(`  POST /api/broadcast             - 群发消息`);
                console.log(`  POST /api/broadcast/quick       - 快速群发`);
                console.log(`  POST /api/encrypt               - 加密消息`);
                console.log(`  POST /api/decrypt               - 解密消息`);
                console.log(`  GET  /api/queue                 - 获取任务队列`);
                console.log(`  DELETE /api/queue               - 清空队列`);
                console.log(`  GET  /api/statistics            - 获取统计信息\n`);
                console.log(`💡 示例请求:\n`);
                console.log(`curl -X POST http://localhost:${port}/api/broadcast \\\n  -H "Content-Type: application/json" \\\n  -d '{"message":"你好","recipients":["8613800000000@c.us"],"encrypt":true}'\n`);
            });

        } catch (err) {
            console.error('❌ 启动失败:', err);
            process.exit(1);
        }
    }
}

// 启动服务器
if (require.main === module) {
    const server = new BroadcastAPIServer();
    server.start();
}

module.exports = BroadcastAPIServer;
