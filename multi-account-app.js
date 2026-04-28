/**
 * 多账号群发系统 - 主应用入口
 * 支持多账号登录、加密消息、群发功能
 */

const MultiClientManager = require('./MultiClientManager');
const BroadcastManager = require('./BroadcastManager');
const CryptoUtils = require('./CryptoUtils');
const config = require('./config');
const readline = require('readline');

class MultiAccountBroadcaster {
    constructor() {
        this.multiClientManager = new MultiClientManager();
        this.broadcastManager = new BroadcastManager(this.multiClientManager);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log(`\n🚀 ${config.app.name} v${config.app.version}\n`);
    }

    /**
     * 初始化系统
     */
    async initialize() {
        console.log('📱 正在初始化账号...\n');

        const enabledAccounts = config.accounts.filter(a => a.enabled);
        
        for (const account of enabledAccounts) {
            try {
                await this.multiClientManager.createClient(account.id);
                console.log(`✅ 账号 ${account.name} (${account.id}) 初始化成功\n`);
            } catch (err) {
                console.error(`❌ 账号 ${account.name} 初始化失败:`, err.message);
            }
        }

        // 等待所有账号就绪
        await this.waitForReady();
    }

    /**
     * 等待所有账号就绪
     */
    async waitForReady(timeout = 300000) {
        console.log('⏳ 等待所有账号就绪...\n');
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const allClients = this.multiClientManager.getAllClients();
            const readyClients = this.multiClientManager.getReadyClients();

            if (allClients.size === readyClients.size && allClients.size > 0) {
                console.log(`\n✅ 所有 ${readyClients.size} 个账号已就绪！\n`);
                this.showStatus();
                return true;
            }

            await this.sleep(2000);
        }

        console.warn('\n⚠️ 超时：部分账号未能就绪\n');
        this.showStatus();
        return false;
    }

    /**
     * 显示系统状态
     */
    showStatus() {
        console.log('📊 系统状态:\n');
        const status = this.multiClientManager.getStatus();
        
        for (const account of status) {
            const icon = account.ready ? '✅' : '❌';
            console.log(`  ${icon} ${account.accountId}: ${account.phoneNumber}`);
        }
        
        console.log('\n');
    }

    /**
     * 交互式命令菜单
     */
    async showMenu() {
        console.log('═══════════════════════════════════════');
        console.log('       📱 WhatsApp 多账号群发系统');
        console.log('═══════════════════════════════════════\n');
        console.log('请选择操作:');
        console.log('  1 - 快速群发 (基础模式)');
        console.log('  2 - 加密群发 (每个账号不同加密)');
        console.log('  3 - 测试加密功能');
        console.log('  4 - 查看系统状态');
        console.log('  5 - 查看队列');
        console.log('  6 - 清空队列');
        console.log('  7 - 查看帮助');
        console.log('  0 - 退出\n');

        return new Promise((resolve) => {
            this.rl.question('请输入选项 (0-7): ', (choice) => {
                resolve(choice.trim());
            });
        });
    }

    /**
     * 快速群发
     */
    async quickBroadcast() {
        console.log('\n📨 快速群发模式\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const recipientsStr = await this.prompt('请输入接收人(逗号分隔，如: 8613800000000,群ID): ');
        const recipients = recipientsStr.split(',').map(r => r.trim()).filter(r => r);
        
        if (recipients.length === 0) {
            console.log('❌ 没有输入接收人\n');
            return;
        }

        const encrypt = await this.prompt('是否加密? (y/n, 默认: y): ');
        const shouldEncrypt = encrypt.toLowerCase() !== 'n';

        // 添加任务
        this.broadcastManager.addTask({
            message,
            recipients,
            encrypt: shouldEncrypt,
            delay: 1000,
            retryCount: 3
        });

        // 处理任务
        await this.broadcastManager.processTasks();
    }

    /**
     * 加密群发
     */
    async encryptedBroadcast() {
        console.log('\n🔐 加密群发模式\n');
        console.log('每个账号将使用独立的加密密钥发送消息\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const recipientsStr = await this.prompt('请输入接收人(逗号分隔): ');
        const recipients = recipientsStr.split(',').map(r => r.trim()).filter(r => r);

        if (recipients.length === 0) {
            console.log('❌ 没有输入接收人\n');
            return;
        }

        // 为每个账号生成不同的加密版本
        const accountIds = Array.from(this.multiClientManager.getReadyClients().keys());
        const encryptedVersions = CryptoUtils.encryptForMultipleAccounts(
            message,
            accountIds,
            config.crypto.masterSecret
        );

        console.log('\n🔒 加密信息已生成:\n');
        for (const [accountId, encryptedData] of encryptedVersions) {
            console.log(`账号: ${accountId}`);
            console.log(`方法: ${encryptedData.method}`);
            console.log(`签名: ${encryptedData.signature.substring(0, 32)}...`);
            console.log('---');
        }

        // 添加任务
        this.broadcastManager.addTask({
            message,
            recipients,
            encrypt: true,
            delay: 1500,
            accountIds,
            retryCount: 3
        });

        // 处理任务
        await this.broadcastManager.processTasks();
    }

    /**
     * 测试加密功能
     */
    async testEncryption() {
        console.log('\n🧪 加密功能测试\n');

        const testMessage = '这是一条测试消息 - 你好世界！';
        const accountIds = Array.from(this.multiClientManager.getReadyClients().keys());

        if (accountIds.length === 0) {
            console.log('❌ 没有就绪的账号\n');
            return;
        }

        console.log(`原始消息: "${testMessage}"\n`);

        // 为每个账号生成加密版本
        const encryptedVersions = CryptoUtils.encryptForMultipleAccounts(
            testMessage,
            accountIds,
            config.crypto.masterSecret
        );

        console.log('✅ 加密结果:\n');
        for (const [accountId, encryptedData] of encryptedVersions) {
            console.log(`账号: ${accountId}`);
            console.log(`加密消息: ${encryptedData.encrypted.substring(0, 60)}...`);
            console.log(`签名: ${encryptedData.signature.substring(0, 32)}...`);
            
            // 验证签名
            const isValid = CryptoUtils.verifySignature(testMessage, accountId, encryptedData.signature);
            console.log(`签名验证: ${isValid ? '✅ 有效' : '❌ 无效'}`);
            console.log('---');
        }

        console.log();
    }

    /**
     * 查看队列
     */
    showQueue() {
        console.log('\n📋 任务队列\n');
        const tasks = this.broadcastManager.getQueuedTasks();

        if (tasks.length === 0) {
            console.log('队列为空\n');
            return;
        }

        for (const task of tasks) {
            console.log(`任务ID: ${task.id}`);
            console.log(`状态: ${task.status}`);
            console.log(`账号: ${task.accounts}`);
            console.log(`接收人: ${task.recipients}`);
            console.log('---');
        }

        console.log();
    }

    /**
     * 清空队列
     */
    clearQueue() {
        this.broadcastManager.clearQueue();
    }

    /**
     * 显示帮助
     */
    showHelp() {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    📚 使用帮助                                 ║
╚═══════════════════════════════════════════════════════════════╝

【主要功能】

1️⃣ 快速群发
   - 使用单一加密方式发送相同消息
   - 适合简单的群发任务

2️⃣ 加密群发
   - 每个账号使用独立的加密密钥
   - 消息内容相同，但加密方式不同
   - 提高安全性

3️⃣ 加密测试
   - 测试加密/解密功能
   - 验证消息完整性

【账号管理】

- 自动加载 config.js 中的所有账号
- 支持多个独立的WhatsApp会话
- 每个账号自动生成唯一的加密密钥

【消息发送】

- 支持批量发送到多个接收人
- 失败自动重试 (默认3次)
- 发送间隔可配置，避免被限制

【加密特性】

- AES-256-CBC 加密算法
- 为每个账号生成独立密钥
- 支持消息签名和验证
- 防重复、防篡改

【重要提示】

⚠️ 修改 config.js 中的 crypto.masterSecret
⚠️ 合法使用，遵守WhatsApp服务条款
⚠️ 不要过度发送，避免被限制

【常见问题】

Q: 如何添加新账号?
A: 在 config.js 的 accounts 数组中添加新条目

Q: 加密消息可以被解密吗?
A: 需要相同的 masterSecret 和 accountId 才能解密

Q: 消息发送失败怎么办?
A: 系统会自动重试，检查接收人ID是否正确

Q: 如何修改发送延迟?
A: 修改 config.js 中的 broadcast.messageDelay

╔════════════════════════════════════════════════════════════════╗
`);
    }

    /**
     * 运行主程序
     */
    async run() {
        try {
            await this.initialize();

            let running = true;
            while (running) {
                const choice = await this.showMenu();

                switch (choice) {
                    case '1':
                        await this.quickBroadcast();
                        break;
                    case '2':
                        await this.encryptedBroadcast();
                        break;
                    case '3':
                        await this.testEncryption();
                        break;
                    case '4':
                        this.showStatus();
                        break;
                    case '5':
                        this.showQueue();
                        break;
                    case '6':
                        this.clearQueue();
                        break;
                    case '7':
                        this.showHelp();
                        break;
                    case '0':
                        running = false;
                        console.log('\n👋 正在关闭系统...\n');
                        await this.multiClientManager.disconnectAll();
                        this.rl.close();
                        process.exit(0);
                        break;
                    default:
                        console.log('\n❌ 无效选项，请重试\n');
                }
            }
        } catch (err) {
            console.error('❌ 程序错误:', err);
            process.exit(1);
        }
    }

    /**
     * 工具方法: 提示输入
     */
    prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    /**
     * 工具方法: 睡眠
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== 应用启动 =====
if (require.main === module) {
    const app = new MultiAccountBroadcaster();
    app.run().catch(err => {
        console.error('❌ 启动失败:', err);
        process.exit(1);
    });
}

module.exports = MultiAccountBroadcaster;
