/**
 * 多客户端管理器 - 管理多个WhatsApp Web连接
 */

const { Client, LocalAuth } = require('./index');
const path = require('path');
const fs = require('fs');

class MultiClientManager {
    constructor() {
        this.clients = new Map(); // {accountId: client}
        this.sessionDir = path.join(__dirname, '.wwebjs_auth');
        this.ensureSessionDir();
    }

    ensureSessionDir() {
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }

    /**
     * 创建并初始化新客户端
     * @param {string} accountId - 账号唯一标识（如：account1, account2）
     * @param {object} options - 额外配置
     * @returns {Promise<Client>}
     */
    async createClient(accountId, options = {}) {
        if (this.clients.has(accountId)) {
            console.warn(`⚠️ 账号 ${accountId} 已存在，直接返回`);
            return this.clients.get(accountId);
        }

        const sessionPath = path.join(this.sessionDir, accountId);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: accountId, dataPath: this.sessionDir }),
            puppeteer: {
                headless: options.headless !== undefined ? options.headless : false,
                args: options.puppeteerArgs || [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            },
            ...options
        });

        // 事件监听
        client.on('qr', (qr) => {
            console.log(`\n📱 账号 ${accountId} 二维码:\n${qr}\n`);
        });

        client.on('authenticated', () => {
            console.log(`✅ 账号 ${accountId} 已认证`);
        });

        client.on('ready', () => {
            console.log(`🎉 账号 ${accountId} 已就绪！`);
        });

        client.on('disconnected', (reason) => {
            console.log(`❌ 账号 ${accountId} 已断开连接：${reason}`);
        });

        client.on('auth_failure', (msg) => {
            console.error(`❌ 账号 ${accountId} 认证失败：${msg}`);
        });

        client.on('error', (err) => {
            console.error(`❌ 账号 ${accountId} 错误：`, err);
        });

        // 保存客户端实例
        this.clients.set(accountId, client);

        // 初始化客户端
        console.log(`🚀 正在初始化账号 ${accountId}...`);
        await client.initialize();

        return client;
    }

    /**
     * 获取客户端
     * @param {string} accountId - 账号标识
     * @returns {Client|null}
     */
    getClient(accountId) {
        return this.clients.get(accountId) || null;
    }

    /**
     * 获取所有就绪的客户端
     * @returns {Map<string, Client>}
     */
    getReadyClients() {
        const readyClients = new Map();
        for (const [accountId, client] of this.clients.entries()) {
            if (client.info) { // client.info 表示客户端已就绪
                readyClients.set(accountId, client);
            }
        }
        return readyClients;
    }

    /**
     * 获取所有客户端
     * @returns {Map<string, Client>}
     */
    getAllClients() {
        return this.clients;
    }

    /**
     * 获取账号信息
     * @param {string} accountId - 账号标识
     * @returns {Promise<object>}
     */
    async getAccountInfo(accountId) {
        const client = this.getClient(accountId);
        if (!client) return null;

        try {
            return {
                accountId,
                info: client.info,
                ready: !!client.info
            };
        } catch (err) {
            console.error(`获取账号 ${accountId} 信息失败:`, err);
            return null;
        }
    }

    /**
     * 断开客户端连接
     * @param {string} accountId - 账号标识
     */
    async disconnectClient(accountId) {
        const client = this.getClient(accountId);
        if (client) {
            await client.destroy();
            this.clients.delete(accountId);
            console.log(`✅ 账号 ${accountId} 已断开`);
        }
    }

    /**
     * 断开所有客户端
     */
    async disconnectAll() {
        for (const [accountId] of this.clients.entries()) {
            await this.disconnectClient(accountId);
        }
        console.log('✅ 所有账号已断开');
    }

    /**
     * 获取客户端状态
     * @returns {Array}
     */
    getStatus() {
        const status = [];
        for (const [accountId, client] of this.clients.entries()) {
            status.push({
                accountId,
                ready: !!client.info,
                phoneNumber: client.info?.wid?.user || '未知'
            });
        }
        return status;
    }
}

module.exports = MultiClientManager;
