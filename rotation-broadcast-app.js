/**
 * 轮番群发应用 - 完整的交互式界面
 * 支持轮番发送、群聊、好友、灵活间隔
 * 运行: node rotation-broadcast-app.js
 */

const MultiClientManager = require('./MultiClientManager');
const RotationBroadcastManager = require('./RotationBroadcastManager');
const CryptoUtils = require('./CryptoUtils');
const config = require('./config');
const readline = require('readline');

class RotationBroadcastApp {
    constructor() {
        this.multiClientManager = new MultiClientManager();
        this.rotationManager = new RotationBroadcastManager(this.multiClientManager);
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log(`\n🚀 WhatsApp 轮番群发系统 v2.0\n`);
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

        await this.waitForReady();
    }

    /**
     * 等待账号就绪
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
     * 主菜单
     */
    async showMenu() {
        console.log('═══════════════════════════════════════');
        console.log('   📱 WhatsApp 轮番群发系统');
        console.log('═══════════════════════════════════════\n');
        console.log('请选择操作:');
        console.log('  1 - 群发给多个群（轮番）');
        console.log('  2 - 群发给多个好友（轮番）');
        console.log('  3 - 混合广播（群+好友）');
        console.log('  4 - 自定义轮番配置');
        console.log('  5 - 查看系统状态');
        console.log('  6 - 查看任务列表');
        console.log('  7 - 查看统计信息');
        console.log('  8 - 导出结果');
        console.log('  9 - 查看帮助');
        console.log('  0 - 退出\n');

        return new Promise((resolve) => {
            this.rl.question('请输入选项 (0-9): ', (choice) => {
                resolve(choice.trim());
            });
        });
    }

    /**
     * 选择要使用的账号
     */
    async selectAccounts() {
        console.log('\n👥 选择要使用的账号:\n');
        const allClients = this.multiClientManager.getAllClients();
        const readyClients = this.multiClientManager.getReadyClients();
        
        if (readyClients.size === 0) {
            console.log('❌ 没有就绪的账号\n');
            return null;
        }

        let i = 1;
        const accountList = Array.from(readyClients.keys());
        for (const accountId of accountList) {
            console.log(`  ${i} - ${accountId}`);
            i++;
        }
        console.log(`  ${i} - 全部账号\n`);

        const choice = await this.prompt(`选择 (1-${i}, 默认${i}): `);
        const selected = parseInt(choice) || i;
        
        if (selected === i) {
            return Array.from(readyClients.keys());
        } else if (selected > 0 && selected < i) {
            return [accountList[selected - 1]];
        }
        return null;
    }

    /**
     * 群发给多个群
     */
    async broadcastToGroups() {
        console.log('\n📢 群发给多个群\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const groupsStr = await this.prompt('请输入群ID(逗号分隔): ');
        const groupIds = groupsStr.split(',').map(g => g.trim()).filter(g => g);

        if (groupIds.length === 0) {
            console.log('❌ 没有输入群ID\n');
            return;
        }

        // 选择账号
        const accountIds = await this.selectAccounts();
        if (!accountIds) return;

        // 获取配置
        const config = await this.getIntervalConfig();
        const encrypt = await this.prompt('是否加密? (y/n, 默认: y): ');

        console.log(`\n✅ 配置确认:`);
        console.log(`   消息: ${message.substring(0, 50)}...`);
        console.log(`   目标群数: ${groupIds.length}`);
        console.log(`   使用账号: ${accountIds.join(', ')}`);
        console.log(`   轮番模式: ${config.rotationMode}`);
        console.log(`   消息间隔: ${config.intervalBetweenMessages}ms`);
        console.log(`   群间隔: ${config.intervalBetweenRecipients}ms`);
        console.log(`   轮间隔: ${config.intervalBetweenRounds}ms`);
        console.log(`   加密: ${encrypt.toLowerCase() !== 'n' ? '✅' : '❌'}\n`);

        const confirm = await this.prompt('确认执行? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('已取消\n');
            return;
        }

        try {
            await this.rotationManager.broadcastToGroups(message, groupIds, accountIds, {
                ...config,
                encrypt: encrypt.toLowerCase() !== 'n'
            });
        } catch (err) {
            console.error('❌ 错误:', err.message);
        }
    }

    /**
     * 群发给多个好友
     */
    async broadcastToFriends() {
        console.log('\n👥 群发给多个好友\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const friendsStr = await this.prompt('请输入好友ID(逗号分隔): ');
        const friendIds = friendsStr.split(',').map(f => f.trim()).filter(f => f);

        if (friendIds.length === 0) {
            console.log('❌ 没有输入好友ID\n');
            return;
        }

        // 选择账号
        const accountIds = await this.selectAccounts();
        if (!accountIds) return;

        const config = await this.getIntervalConfig();
        const encrypt = await this.prompt('是否加密? (y/n, 默认: y): ');

        console.log(`\n✅ 配置确认:`);
        console.log(`   消息: ${message.substring(0, 50)}...`);
        console.log(`   目标好友数: ${friendIds.length}`);
        console.log(`   使用账号: ${accountIds.join(', ')}`);
        console.log(`   轮番模式: ${config.rotationMode}`);
        console.log(`   消息间隔: ${config.intervalBetweenMessages}ms`);
        console.log(`   好友间隔: ${config.intervalBetweenRecipients}ms`);
        console.log(`   轮间隔: ${config.intervalBetweenRounds}ms`);
        console.log(`   加密: ${encrypt.toLowerCase() !== 'n' ? '✅' : '❌'}\n`);

        const confirm = await this.prompt('确认执行? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('已取消\n');
            return;
        }

        try {
            await this.rotationManager.broadcastToFriends(message, friendIds, accountIds, {
                ...config,
                encrypt: encrypt.toLowerCase() !== 'n'
            });
        } catch (err) {
            console.error('❌ 错误:', err.message);
        }
    }

    /**
     * 混合广播
     */
    async mixedBroadcast() {
        console.log('\n🎯 混合广播（群+好友）\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const groupsStr = await this.prompt('请输入群ID(逗号分隔): ');
        const groups = groupsStr.split(',').map(g => g.trim()).filter(g => g);

        const friendsStr = await this.prompt('请输入好友ID(逗号分隔): ');
        const friends = friendsStr.split(',').map(f => f.trim()).filter(f => f);

        if (groups.length === 0 && friends.length === 0) {
            console.log('❌ 没有输入接收人\n');
            return;
        }

        // 选择账号
        const accountIds = await this.selectAccounts();
        if (!accountIds) return;

        const config = await this.getIntervalConfig();
        const encrypt = await this.prompt('是否加密? (y/n, 默认: y): ');

        console.log(`\n✅ 配置确认:`);
        console.log(`   消息: ${message.substring(0, 50)}...`);
        console.log(`   目标群数: ${groups.length}`);
        console.log(`   目标好友数: ${friends.length}`);
        console.log(`   总接收人: ${groups.length + friends.length}`);
        console.log(`   使用账号: ${accountIds.join(', ')}`);
        console.log(`   轮番模式: ${config.rotationMode}`);
        console.log(`   消息间隔: ${config.intervalBetweenMessages}ms`);
        console.log(`   接收人间隔: ${config.intervalBetweenRecipients}ms`);
        console.log(`   轮间隔: ${config.intervalBetweenRounds}ms`);
        console.log(`   加密: ${encrypt.toLowerCase() !== 'n' ? '✅' : '❌'}\n`);

        const confirm = await this.prompt('确认执行? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('已取消\n');
            return;
        }

        try {
            await this.rotationManager.broadcastMixed(message, groups, friends, accountIds, {
                ...config,
                encrypt: encrypt.toLowerCase() !== 'n'
            });
        } catch (err) {
            console.error('❌ 错误:', err.message);
        }
    }

    /**
     * 自定义配置
     */
    async customConfiguration() {
        console.log('\n⚙️ 自定义轮番配置\n');

        const message = await this.prompt('请输入消息内容: ');
        if (!message) return;

        const recipientsStr = await this.prompt('请输入所有接收人ID(逗号分隔): ');
        const recipients = recipientsStr.split(',').map(r => r.trim()).filter(r => r);

        if (recipients.length === 0) {
            console.log('❌ 没有输入接收人\n');
            return;
        }

        // 收集接收人类型
        const recipientObjects = [];
        for (const id of recipients) {
            const type = await this.prompt(`请输入接收人 ${id} 的类型 (group/friend, 默认: group): `);
            recipientObjects.push({
                id,
                name: id.substring(0, 20),
                type: type.toLowerCase() === 'friend' ? 'friend' : 'group'
            });
        }

        // 获取所有参数
        console.log('\n⏱️ 配置时间间隔:\n');
        const intervalBetweenMessages = await this.promptNumber(
            '同账号两条消息间隔(毫秒, 默认500): ',
            500
        );
        const intervalBetweenRecipients = await this.promptNumber(
            '不同接收人间隔(毫秒, 默认1000): ',
            1000
        );
        const intervalBetweenRounds = await this.promptNumber(
            '一轮完成后的间隔(毫秒, 默认2000): ',
            2000
        );

        console.log('\n🔄 轮番配置:\n');
        console.log('  1 - round-robin (轮询)');
        console.log('  2 - sequential (顺序)');
        console.log('  3 - random (随机)\n');
        
        const modeChoice = await this.prompt('选择轮番模式 (1-3, 默认1): ');
        const modeMap = { '1': 'round-robin', '2': 'sequential', '3': 'random' };
        const rotationMode = modeMap[modeChoice] || 'round-robin';

        const retryCount = await this.promptNumber('失败重试次数(默认3): ', 3);
        const encrypt = await this.prompt('是否加密? (y/n, 默认: y): ');

        // 显示配置确认
        console.log(`\n✅ 配置确认:`);
        console.log(`   消息: ${message.substring(0, 50)}...`);
        console.log(`   接收人: ${recipientObjects.length}个`);
        console.log(`   轮番模式: ${rotationMode}`);
        console.log(`   消息间隔: ${intervalBetweenMessages}ms`);
        console.log(`   接收人间隔: ${intervalBetweenRecipients}ms`);
        console.log(`   轮间隔: ${intervalBetweenRounds}ms`);
        console.log(`   重试次数: ${retryCount}`);
        console.log(`   加密: ${encrypt.toLowerCase() !== 'n' ? '✅' : '❌'}\n`);

        const confirm = await this.prompt('确认执行? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('已取消\n');
            return;
        }

        try {
            await this.rotationManager.rotationBroadcast({
                recipients: recipientObjects,
                message,
                intervalBetweenMessages,
                intervalBetweenRecipients,
                intervalBetweenRounds,
                rotationMode,
                retryCount,
                encrypt: encrypt.toLowerCase() !== 'n'
            });
        } catch (err) {
            console.error('❌ 错误:', err.message);
        }
    }

    /**
     * 获取间隔配置
     */
    async getIntervalConfig() {
        console.log('\n⏱️ 配置间隔时间:\n');
        
        const intervalBetweenMessages = await this.promptNumber(
            '同账号两条消息间隔(毫秒, 默认500): ',
            500
        );
        const intervalBetweenRecipients = await this.promptNumber(
            '不同接收人间隔(毫秒, 默认1000): ',
            1000
        );
        const intervalBetweenRounds = await this.promptNumber(
            '一轮完成后的间隔(毫秒, 默认2000): ',
            2000
        );

        console.log('\n🔄 选择轮番模式:\n');
        console.log('  1 - round-robin (轮询)');
        console.log('  2 - sequential (顺序)');
        console.log('  3 - random (随机)\n');
        
        const modeChoice = await this.prompt('选择 (1-3, 默认1): ');
        const modeMap = { '1': 'round-robin', '2': 'sequential', '3': 'random' };
        const rotationMode = modeMap[modeChoice] || 'round-robin';

        return {
            intervalBetweenMessages,
            intervalBetweenRecipients,
            intervalBetweenRounds,
            rotationMode
        };
    }

    /**
     * 查看任务列表
     */
    showTaskList() {
        console.log('\n📋 任务列表\n');
        const tasks = this.rotationManager.getAllTasks();

        if (tasks.length === 0) {
            console.log('没有任务\n');
            return;
        }

        for (const task of tasks) {
            console.log(`任务ID: ${task.id}`);
            console.log(`  状态: ${task.status}`);
            console.log(`  接收人: ${task.recipients}个`);
            console.log(`  账号: ${task.accounts}个`);
            console.log(`  结果: ${task.results}条`);
            console.log(`  创建时间: ${task.createdAt.toLocaleString()}`);
            console.log('---');
        }

        console.log();
    }

    /**
     * 查看统计信息
     */
    showStatistics() {
        console.log('\n📊 统计信息\n');
        const stats = this.rotationManager.getStatistics();

        console.log(`✅ 成功: ${stats.totalSent}条`);
        console.log(`❌ 失败: ${stats.totalFailed}条`);
        console.log(`🔄 运行中: ${stats.isRunning ? '是' : '否'}`);
        console.log(`📋 总任务: ${stats.totalTasks}个`);
        
        if (stats.startTime) {
            console.log(`⏱️ 开始时间: ${new Date(stats.startTime).toLocaleString()}`);
        }

        console.log();
    }

    /**
     * 导出结果
     */
    async exportResults() {
        console.log('\n📤 导出结果\n');
        const tasks = this.rotationManager.getAllTasks();

        if (tasks.length === 0) {
            console.log('没有任务结果\n');
            return;
        }

        console.log('最近任务:');
        for (let i = 0; i < Math.min(5, tasks.length); i++) {
            console.log(`  ${i + 1}. ${tasks[i].id.substring(0, 30)}...`);
        }

        const taskIdInput = await this.prompt('\n输入要导出的任务ID (或回车取消): ');
        if (!taskIdInput) return;

        const format = await this.prompt('选择格式 (json/csv, 默认json): ');

        try {
            const result = this.rotationManager.exportResults(
                taskIdInput,
                format.toLowerCase() === 'csv' ? 'csv' : 'json'
            );

            if (result) {
                console.log('\n导出结果:\n');
                console.log(result);
                console.log();
            } else {
                console.log('❌ 任务不存在\n');
            }
        } catch (err) {
            console.error('❌ 导出失败:', err.message);
        }
    }

    /**
     * 显示帮助
     */
    showHelp() {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              📚 轮番群发系统使用帮助                           ║
╚═══════════════════════════════════════════════════════════════╝

【功能说明】

1️⃣ 群发给多个群
   - 一条消息同时发给多个群
   - 每个账号轮番发送
   - 可配置时间间隔

2️⃣ 群发给多个好友
   - 一条消息同时发给多个好友
   - 轮番账号发送
   - 支持加密

3️⃣ 混合广播
   - 同时发给群和好友
   - 灵活的间隔设置

4️⃣ 自定义配置
   - 完全自定义所有参数
   - 指定每个接收人的类型

【轮番模式】

🔄 round-robin (轮询)
   account1 → recipient1
   account2 → recipient2
   account3 → recipient3

🔄 sequential (顺序)
   account1 → recipient1
   account1 → recipient2
   account2 → recipient3
   ...

🔄 random (随机)
   随机选择账号发送

【时间间隔】

⏱️ 消息间隔
   - 同一账号发送两条消息之间的等待时间
   - 推荐: 500-1000ms

⏱️ 接收人间隔
   - 发给不同接收人之间的等待时间
   - 推荐: 1000-2000ms

⏱️ 轮完成间隔
   - 一轮发送完后到下一轮的等待时间
   - 推荐: 2000-5000ms

【加密特性】

🔐 每个账号独立加密
   - 同一消息，不同账号不同加密
   - 提高安全性

📝 消息签名
   - 防止消息篡改
   - 可以验证完整性

【ID格式】

👥 好友ID: 8613800000000@c.us
📢 群ID: 12345-67890@g.us 或 120363xxx@g.us

【常见问题】

Q: 如何获取群ID?
A: 在WhatsApp中打开群聊，从链接或开发者工具中提取

Q: 发送速度太快被限制怎么办?
A: 增加时间间隔，建议消息间隔至少1000ms

Q: 消息发送失败怎么办?
A: 系统会自动重试，检查ID格式是否正确

Q: 加密消息是什么格式?
A: 包含原始消息、加密内容和签名

【技巧和最佳实践】

✅ 先用少量接收人测试
✅ 逐步增加时间间隔
✅ 启用加密提高安全性
✅ 定期检查发送统计
✅ 导出结果进行归档

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
                        await this.broadcastToGroups();
                        break;
                    case '2':
                        await this.broadcastToFriends();
                        break;
                    case '3':
                        await this.mixedBroadcast();
                        break;
                    case '4':
                        await this.customConfiguration();
                        break;
                    case '5':
                        this.showStatus();
                        break;
                    case '6':
                        this.showTaskList();
                        break;
                    case '7':
                        this.showStatistics();
                        break;
                    case '8':
                        await this.exportResults();
                        break;
                    case '9':
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
     * 工具方法
     */
    prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    promptNumber(question, defaultValue) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                const num = parseInt(answer) || defaultValue;
                resolve(Math.max(0, num));
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 启动应用
if (require.main === module) {
    const app = new RotationBroadcastApp();
    app.run().catch(err => {
        console.error('❌ 启动失败:', err);
        process.exit(1);
    });
}

module.exports = RotationBroadcastApp;
