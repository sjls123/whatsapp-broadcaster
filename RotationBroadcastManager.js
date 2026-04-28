/**
 * 轮番群发管理器 - 支持多账号轮流发送消息
 * 支持群聊、好友、轮番策略、灵活间隔配置
 */

const CryptoUtils = require('./CryptoUtils');

class RotationBroadcastManager {
    constructor(multiClientManager) {
        this.multiClientManager = multiClientManager;
        this.tasks = []; // 任务列表
        this.isRunning = false;
        this.currentTask = null;
        this.statistics = {
            totalSent: 0,
            totalFailed: 0,
            startTime: null,
            endTime: null,
            details: []
        };
    }

    /**
     * 创建轮番发送任务
     * @param {object} config - 任务配置
     *   - recipients: [{id, name, type}, ...]  type: 'group'|'friend'
     *   - message: 消息内容
     *   - accountIds: 账号列表
     *   - rotationMode: 'round-robin'|'sequential'|'random'
     *   - intervalBetweenMessages: 同账号两条消息间隔(毫秒)
     *   - intervalBetweenRounds: 一轮完成后到下一轮间隔(毫秒)
     *   - intervalBetweenRecipients: 不同接收人间隔(毫秒)
     *   - retryCount: 失败重试次数
     *   - encrypt: 是否加密
     *   - masterSecret: 加密密钥
     */
    createTask(config) {
        const task = {
            id: `rotation_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            config: {
                recipients: config.recipients || [],
                message: config.message,
                accountIds: config.accountIds || Array.from(this.multiClientManager.getAllClients().keys()),
                rotationMode: config.rotationMode || 'round-robin',
                intervalBetweenMessages: config.intervalBetweenMessages || 500,      // 同账号消息间隔
                intervalBetweenRounds: config.intervalBetweenRounds || 2000,          // 轮完成间隔
                intervalBetweenRecipients: config.intervalBetweenRecipients || 1000, // 接收人间隔
                retryCount: config.retryCount || 3,
                encrypt: config.encrypt !== false,
                masterSecret: config.masterSecret || 'whatsapp-bot-secret'
            },
            status: 'pending',
            results: [],
            createdAt: new Date(),
            startTime: null,
            endTime: null
        };

        this.tasks.push(task);
        return task;
    }

    /**
     * 获取轮番顺序
     */
    getRotationOrder(accountIds, mode = 'round-robin') {
        const accountList = accountIds || Array.from(this.multiClientManager.getAllClients().keys());

        switch (mode) {
            case 'round-robin':
                return this.getRoundRobinOrder(accountList);
            case 'sequential':
                return accountList;
            case 'random':
                return this.shuffleArray(accountList);
            default:
                return accountList;
        }
    }

    /**
     * 轮询顺序
     */
    getRoundRobinOrder(accounts) {
        // 返回轮询顺序
        return accounts;
    }

    /**
     * 随机顺序
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 执行单个任务 - 轮番发送
     */
    async executeTask(task) {
        task.status = 'running';
        task.startTime = new Date();
        this.currentTask = task;
        this.statistics.startTime = new Date();

        const { config } = task;
        const recipients = config.recipients;
        const rotationOrder = this.getRotationOrder(config.accountIds, config.rotationMode);

        console.log(`\n${'═'.repeat(80)}`);
        console.log(`📤 执行轮番发送任务: ${task.id}`);
        console.log(`${'═'.repeat(80)}`);
        console.log(`📝 消息: ${config.message.substring(0, 50)}${config.message.length > 50 ? '...' : ''}`);
        console.log(`👥 接收人: ${recipients.length}个`);
        console.log(`🔄 账号: ${config.accountIds.length}个`);
        console.log(`🎯 轮番模式: ${config.rotationMode}`);
        console.log(`⏱️  配置间隔:`);
        console.log(`   - 消息间隔: ${config.intervalBetweenMessages}ms`);
        console.log(`   - 轮完成间隔: ${config.intervalBetweenRounds}ms`);
        console.log(`   - 接收人间隔: ${config.intervalBetweenRecipients}ms`);
        console.log(`🔐 加密: ${config.encrypt ? '✅' : '❌'}\n`);

        let roundCount = 0;

        // 外层循环：多轮发送（为了演示轮番效果）
        for (let round = 0; round < 1; round++) {
            roundCount++;
            console.log(`\n🔄 第 ${roundCount} 轮:`);
            console.log('─'.repeat(80));

            // 中层循环：每个接收人
            for (let recipientIndex = 0; recipientIndex < recipients.length; recipientIndex++) {
                const recipient = recipients[recipientIndex];
                console.log(`\n📍 接收人 ${recipientIndex + 1}/${recipients.length}: ${recipient.name || recipient.id}`);

                // 内层循环：轮番账号发送
                for (let accountIndex = 0; accountIndex < rotationOrder.length; accountIndex++) {
                    const accountId = rotationOrder[accountIndex];
                    const client = this.multiClientManager.getClient(accountId);

                    if (!client || !client.info) {
                        console.warn(`   ⚠️ [${accountId}] 未就绪，跳过`);
                        task.results.push({
                            recipient: recipient.id,
                            accountId,
                            status: 'skipped',
                            reason: '账号未就绪'
                        });
                        continue;
                    }

                    // 为该账号生成消息
                    let messageContent = config.message;
                    if (config.encrypt) {
                        const { key, iv } = CryptoUtils.generateKeyForAccount(
                            accountId,
                            config.masterSecret
                        );
                        const encrypted = CryptoUtils.encryptMessage(config.message, accountId, key, iv);
                        messageContent = this.formatEncryptedMessage(config.message, encrypted);
                    }

                    // 发送消息
                    let success = false;
                    for (let retry = 0; retry < config.retryCount; retry++) {
                        try {
                            await client.sendMessage(recipient.id, messageContent);
                            success = true;

                            console.log(`   ✅ [${accountId}] 发送成功`);

                            task.results.push({
                                recipient: recipient.id,
                                accountId,
                                status: 'success',
                                type: recipient.type,
                                sentAt: new Date(),
                                encrypted: config.encrypt
                            });

                            this.statistics.totalSent++;
                            break;
                        } catch (err) {
                            console.warn(`   ⚠️ [${accountId}] 失败 (重试 ${retry + 1}/${config.retryCount}): ${err.message}`);
                            
                            if (retry === config.retryCount - 1) {
                                console.log(`   ❌ [${accountId}] 最终失败`);
                                task.results.push({
                                    recipient: recipient.id,
                                    accountId,
                                    status: 'failed',
                                    error: err.message,
                                    type: recipient.type
                                });
                                this.statistics.totalFailed++;
                            }

                            // 重试延迟
                            if (retry < config.retryCount - 1) {
                                await this.sleep(2000);
                            }
                        }
                    }

                    // 账号间隔
                    if (accountIndex < rotationOrder.length - 1) {
                        await this.sleep(config.intervalBetweenMessages);
                    }
                }

                // 接收人间隔
                if (recipientIndex < recipients.length - 1) {
                    console.log(`   ⏳ 等待 ${config.intervalBetweenRecipients}ms...`);
                    await this.sleep(config.intervalBetweenRecipients);
                }
            }

            // 轮完成间隔
            if (round < 1 - 1) {
                console.log(`\n⏳ 一轮完成，等待 ${config.intervalBetweenRounds}ms 后继续下一轮...`);
                await this.sleep(config.intervalBetweenRounds);
            }
        }

        task.status = 'completed';
        task.endTime = new Date();
        this.statistics.endTime = new Date();

        this.printTaskSummary(task);
    }

    /**
     * 打印任务总结
     */
    printTaskSummary(task) {
        const duration = (task.endTime - task.startTime) / 1000;
        const successCount = task.results.filter(r => r.status === 'success').length;
        const failureCount = task.results.filter(r => r.status === 'failed').length;

        console.log(`\n${'═'.repeat(80)}`);
        console.log('📊 任务完成统计');
        console.log(`${'═'.repeat(80)}`);
        console.log(`✅ 成功: ${successCount}条`);
        console.log(`❌ 失败: ${failureCount}条`);
        console.log(`⏭️  跳过: ${task.results.filter(r => r.status === 'skipped').length}条`);
        console.log(`⏱️  耗时: ${duration}秒`);
        console.log(`📨 总计: ${task.results.length}条消息\n`);

        // 按账号统计
        const byAccount = {};
        for (const result of task.results) {
            if (!byAccount[result.accountId]) {
                byAccount[result.accountId] = { success: 0, failed: 0, total: 0 };
            }
            byAccount[result.accountId].total++;
            if (result.status === 'success') {
                byAccount[result.accountId].success++;
            } else if (result.status === 'failed') {
                byAccount[result.accountId].failed++;
            }
        }

        console.log('📱 按账号统计:');
        for (const [accountId, stats] of Object.entries(byAccount)) {
            const rate = ((stats.success / stats.total) * 100).toFixed(1);
            console.log(`   ${accountId}: ${stats.success}/${stats.total} (${rate}%)`);
        }

        console.log();
    }

    /**
     * 执行所有待处理任务
     */
    async processTasks() {
        if (this.isRunning) {
            console.warn('⚠️ 正在处理任务中...');
            return;
        }

        this.isRunning = true;

        try {
            for (const task of this.tasks) {
                if (task.status === 'pending') {
                    await this.executeTask(task);
                }
            }
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 轮番发送 - 简化接口
     */
    async rotationBroadcast(config) {
        const task = this.createTask(config);
        await this.executeTask(task);
        return task;
    }

    /**
     * 快速轮番群发给多个群
     */
    async broadcastToGroups(message, groupIds, accountIds, options = {}) {
        const recipients = groupIds.map(id => ({
            id,
            name: `群 ${id.substring(0, 10)}...`,
            type: 'group'
        }));

        return await this.rotationBroadcast({
            recipients,
            message,
            accountIds,
            ...options
        });
    }

    /**
     * 快速轮番群发给多个好友
     */
    async broadcastToFriends(message, friendIds, accountIds, options = {}) {
        const recipients = friendIds.map(id => ({
            id,
            name: `好友 ${id.substring(0, 10)}...`,
            type: 'friend'
        }));

        return await this.rotationBroadcast({
            recipients,
            message,
            accountIds,
            ...options
        });
    }

    /**
     * 混合广播（既有群，也有好友）
     */
    async broadcastMixed(message, groups, friends, accountIds, options = {}) {
        const recipients = [
            ...groups.map(id => ({ id, name: `群 ${id.substring(0, 10)}...`, type: 'group' })),
            ...friends.map(id => ({ id, name: `好友 ${id.substring(0, 10)}...`, type: 'friend' }))
        ];

        return await this.rotationBroadcast({
            recipients,
            message,
            accountIds,
            ...options
        });
    }

    /**
     * 格式化加密消息
     */
    formatEncryptedMessage(originalMessage, encryptedData) {
        return `📨 **轮番加密消息**\n方法: ${encryptedData.method}\n账号: ${encryptedData.accountId}\n\n原始:\n${originalMessage}\n\n🔐:\n\`\`\`\n${encryptedData.encrypted}\n\`\`\``;
    }

    /**
     * 获取任务信息
     */
    getTaskInfo(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }

    /**
     * 获取所有任务
     */
    getAllTasks() {
        return this.tasks.map(t => ({
            id: t.id,
            status: t.status,
            recipients: t.config.recipients.length,
            accounts: t.config.accountIds.length,
            results: t.results.length,
            createdAt: t.createdAt
        }));
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        return {
            ...this.statistics,
            currentTask: this.currentTask ? this.currentTask.id : null,
            isRunning: this.isRunning,
            totalTasks: this.tasks.length
        };
    }

    /**
     * 睡眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清除已完成的任务
     */
    clearCompletedTasks() {
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        this.tasks = this.tasks.filter(t => t.status !== 'completed');
        return completed;
    }

    /**
     * 导出任务结果
     */
    exportResults(taskId, format = 'json') {
        const task = this.getTaskInfo(taskId);
        if (!task) return null;

        if (format === 'json') {
            return JSON.stringify(task, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(task.results);
        }
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(results) {
        const headers = ['接收人', '账号', '状态', '类型', '时间'];
        const rows = results.map(r => [
            r.recipient || '',
            r.accountId,
            r.status,
            r.type || '',
            r.sentAt || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csv;
    }
}

module.exports = RotationBroadcastManager;
