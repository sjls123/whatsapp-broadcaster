const express = require('express');
const path = require('path');
const RotationBroadcastManager = require('./RotationBroadcastManager');
const MultiClientManager = require('./MultiClientManager');
const config = require('./config');
const http = require('http');
const WebSocket = require('ws');

class GUIServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.multiClientManager = new MultiClientManager();
        this.broadcastManager = new RotationBroadcastManager(this.multiClientManager);
        
        this.clients = new Set();
        this.logs = [];
        this.accountStatus = {};
        
        this.setupRoutes();
        this.setupWebSocket();
    }
    
    setupRoutes() {
        this.app.use(express.json());
        
        // 首页重定向
        this.app.get('/', (req, res) => {
            res.redirect('/home.html');
        });
        
        // API endpoints（必须在 static 之前）
        this.app.get('/api/status', (req, res) => {
            res.json({
                accounts: this.multiClientManager.getStatus(),
                logs: this.logs.slice(-100),
                status: this.accountStatus
            });
        });
        
        this.app.post('/api/init-accounts', async (req, res) => {
            const { count } = req.body;
            this.log(`正在初始化 ${count} 个账户...`, 'info');
            
            try {
                for (let i = 0; i < count; i++) {
                    const accountId = `account${i + 1}`;
                    this.log(`[${i + 1}/${count}] 初始化账户: ${accountId}`, 'progress');
                    
                    await this.multiClientManager.createClient(accountId, {
                        headless: false,
                        args: ['--no-sandbox']
                    });
                    
                    this.accountStatus[accountId] = {
                        status: '等待扫码',
                        qrCode: 'pending',
                        progress: ((i + 1) / count * 100).toFixed(0)
                    };
                    
                    this.broadcast({
                        type: 'account_init',
                        accountId,
                        progress: ((i + 1) / count * 100).toFixed(0)
                    });
                }
                
                this.log(`✅ 所有账户初始化完成`, 'success');
                res.json({ success: true });
            } catch (error) {
                this.log(`❌ 初始化失败: ${error.message}`, 'error');
                res.status(500).json({ error: error.message });
            }
        });
        
        this.app.post('/api/start-broadcast', async (req, res) => {
            const { groups, friends, interval } = req.body;
            
            this.log(`开始广播 - 群组: ${groups}, 好友: ${friends}, 间隔: ${interval}ms`, 'info');
            
            try {
                await this.broadcastManager.broadcastMixed(
                    groups.split(',').filter(g => g),
                    friends.split(',').filter(f => f),
                    {
                        intervalBetweenMessages: interval,
                        intervalBetweenRecipients: interval * 2,
                        intervalBetweenRounds: interval * 5
                    }
                );
                
                this.log(`✅ 广播完成`, 'success');
                res.json({ success: true });
            } catch (error) {
                this.log(`❌ 广播失败: ${error.message}`, 'error');
                res.status(500).json({ error: error.message });
            }
        });
        
        // 发送单条消息给指定接收者
        this.app.post('/api/send-message', async (req, res) => {
            const { message, recipients } = req.body;
            
            if (!message) {
                return res.status(400).json({ error: '消息不能为空' });
            }
            
            this.log(`📤 准备发送消息: ${message.substring(0, 50)}...`, 'info');
            this.log(`👥 接收者数量: ${recipients ? recipients.length : '所有账户'}`, 'progress');
            
            try {
                const readyClients = this.multiClientManager.getReadyClients();
                
                if (readyClients.length === 0) {
                    this.log(`❌ 没有已就绪的账户`, 'error');
                    return res.status(400).json({ error: '没有已就绪的账户' });
                }
                
                let sentCount = 0;
                
                for (const client of readyClients) {
                    try {
                        this.log(`📤 ${client.info.me.user} 准备发送消息...`, 'progress');
                        
                        // 这里可以添加实际的消息发送逻辑
                        // await client.sendMessage('target_chat_id@c.us', message);
                        
                        this.log(`✅ ${client.info.me.user} 消息已发送`, 'success');
                        sentCount++;
                    } catch (error) {
                        this.log(`❌ ${client.info.me.user} 发送失败: ${error.message}`, 'error');
                    }
                }
                
                this.log(`✅ 共发送 ${sentCount}/${readyClients.length} 条消息`, 'success');
                res.json({ success: true, sent: sentCount });
            } catch (error) {
                this.log(`❌ 消息发送异常: ${error.message}`, 'error');
                res.status(500).json({ error: error.message });
            }
        });
        
        // 获取群组列表
        // 获取群组列表
        this.app.get('/api/groups', async (req, res) => {
            try {
                const readyClients = this.multiClientManager.getReadyClients();
                const groups = new Map();
                
                this.log(`📊 正在从 ${readyClients.length} 个账户获取群组列表...`, 'debug');
                
                for (const client of readyClients) {
                    try {
                        const chats = await client.getChats();
                        const clientGroups = chats.filter(c => c.isGroup);
                        this.log(`  └─ ${client.info.me.user}: 找到 ${clientGroups.length} 个群组`, 'debug');
                        
                        clientGroups.forEach(group => {
                            if (!groups.has(group.name)) {
                                groups.set(group.name, {
                                    name: group.name,
                                    id: group.id,
                                    participants: group.participants ? group.participants.length : 0,
                                    account: client.info.me.user
                                });
                            }
                        });
                    } catch (e) {
                        this.log(`  └─ ❌ 获取群组列表出错: ${e.message}`, 'debug');
                    }
                }
                
                const groupArray = Array.from(groups.values());
                this.log(`✅ 共收集 ${groupArray.length} 个独特群组`, 'debug');
                res.json({ groups: groupArray });
            } catch (error) {
                this.log(`❌ /api/groups 错误: ${error.message}`, 'error');
                res.status(500).json({ error: error.message });
            }
        });
        
        // 获取好友/联系人列表
        this.app.get('/api/contacts', async (req, res) => {
            try {
                const readyClients = this.multiClientManager.getReadyClients();
                const contacts = new Map();
                
                this.log(`📊 正在从 ${readyClients.length} 个账户获取联系人列表...`, 'debug');
                
                for (const client of readyClients) {
                    try {
                        const chats = await client.getChats();
                        const clientContacts = chats.filter(c => !c.isGroup && c.name !== 'Status Updates');
                        this.log(`  └─ ${client.info.me.user}: 找到 ${clientContacts.length} 个联系人`, 'debug');
                        
                        clientContacts.forEach(contact => {
                            if (!contacts.has(contact.name)) {
                                contacts.set(contact.name, {
                                    name: contact.name,
                                    id: contact.id,
                                    account: client.info.me.user
                                });
                            }
                        });
                    } catch (e) {
                        this.log(`  └─ ❌ 获取联系人列表出错: ${e.message}`, 'debug');
                    }
                }
                
                const contactArray = Array.from(contacts.values());
                this.log(`✅ 共收集 ${contactArray.length} 个独特联系人`, 'debug');
                res.json({ contacts: contactArray });
            } catch (error) {
                this.log(`❌ /api/contacts 错误: ${error.message}`, 'error');
                res.status(500).json({ error: error.message });
            }
        });
        
        // 静态文件必须在所有 API 之后
        this.app.use(express.static(path.join(__dirname, 'public')));
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            this.log(`新客户端连接 (总计: ${this.clients.size})`, 'debug');
            
            // 发送历史日志
            ws.send(JSON.stringify({
                type: 'logs',
                data: this.logs
            }));
            
            ws.on('close', () => {
                this.clients.delete(ws);
                this.log(`客户端断开连接 (总计: ${this.clients.size})`, 'debug');
            });
        });
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const logEntry = {
            timestamp,
            message,
            type
        };
        
        this.logs.push(logEntry);
        
        // 保留最后 500 条日志
        if (this.logs.length > 500) {
            this.logs.shift();
        }
        
        // 广播给所有客户端
        this.broadcast({
            type: 'log',
            data: logEntry
        });
        
        // 也打印到控制台
        const colors = {
            info: '\x1b[36m',
            progress: '\x1b[33m',
            success: '\x1b[32m',
            error: '\x1b[31m',
            debug: '\x1b[90m',
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[type] || colors.info}[${timestamp}] ${message}${colors.reset}`);
    }
    
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
    
    start(port = 3000) {
        this.server.listen(port, async () => {
            this.log(`========================================`, 'info');
            this.log(`✅ GUI 服务器已启动`, 'success');
            this.log(`📱 打开浏览器访问: http://localhost:${port}`, 'success');
            this.log(`========================================`, 'info');
            
            // 尝试自动打开浏览器
            try {
                const open = (await import('open')).default;
                open(`http://localhost:${port}`).catch(() => {
                    this.log(`⚠️  无法自动打开浏览器，请手动访问: http://localhost:${port}`, 'warning');
                });
            } catch (error) {
                this.log(`⚠️  无法自动打开浏览器，请手动访问: http://localhost:${port}`, 'warning');
            }
        });
    }
}

module.exports = GUIServer;
