/**
 * 群发管理器 - 管理多账号群发和加密消息
 */

const CryptoUtils = require('./CryptoUtils');

class BroadcastManager {
    constructor(multiClientManager) {
        this.multiClientManager = multiClientManager;
        this.taskQueue = []; // 任务队列
        this.isProcessing = false;
        this.masterSecret = 'whatsapp-bot-secret'; // 主密钥
        this.sentMessages = new Map(); // 记录已发送消息 {hash: {count, timestamp}}
    }

    /**
     * 设置主密钥
     * @param {string} secret - 新密钥
     */
    setMasterSecret(secret) {
        this.masterSecret = secret;
    }

    /**
     * 添加群发任务
     * @param {object} task - 任务对象
     *   - message: 消息内容
     *   - recipients: 接收人列表 (手机号、群ID或聊天ID)
     *   - encrypt: 是否加密 (默认true)
     *   - delay: 发送延迟(毫秒，默认1000)
     *   - accountIds: 指定账号列表(不指定则使用所有)
     *   - retryCount: 重试次数(默认3)
     */
    addTask(task) {
        const normalizedTask = {
            message: task.message,
            recipients: task.recipients || [],
            encrypt: task.encrypt !== false,
            delay: task.delay || 1000,
            accountIds: task.accountIds || Array.from(this.multiClientManager.getAllClients().keys()),
            retryCount: task.retryCount || 3,
            id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            status: 'pending',
            startTime: null,
            endTime: null,
            results: []
        };

        this.taskQueue.push(normalizedTask);
        console.log(`📝 已添加任务: ${normalizedTask.id}\n消息: ${task.message.substring(0, 50)}...\n接收者: ${normalizedTask.recipients.length}\n账号: ${normalizedTask.accountIds.length}`);

        return normalizedTask.id;
    }

    /**
     * 处理所有待发送任务
     */
    async processTasks() {
        if (this.isProcessing) {
            console.warn('⚠️ 正在处理任务中...');
            return;
        }

        this.isProcessing = true;
        console.log(`🚀 开始处理 ${this.taskQueue.length} 个任务\n`);

        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            await this.executeTask(task);
        }

        this.isProcessing = false;
        console.log('\n✅ 所有任务处理完成！');
    }

    /**
     * 执行单个任务
     * @param {object} task - 任务
     */
    async executeTask(task) {
        task.status = 'processing';
        task.startTime = new Date();

        console.log(`\n📤 执行任务: ${task.id}`);
        console.log(`   消息: ${task.message.substring(0, 50)}...`);
        console.log(`   账号数: ${task.accountIds.length}`);
        console.log(`   接收者数: ${task.recipients.length}`);
        console.log(`   加密: ${task.encrypt ? '✅' : '❌'}`);

        // 为每个账号准备加密消息
        const encryptedMessages = task.encrypt 
            ? CryptoUtils.encryptForMultipleAccounts(task.message, task.accountIds, this.masterSecret)
            : null;

        // 为每个账号发送消息
        for (const accountId of task.accountIds) {
            const client = this.multiClientManager.getClient(accountId);
            if (!client || !client.info) {
                console.warn(`⚠️ 账号 ${accountId} 未就绪，跳过`);
                task.results.push({
                    accountId,
                    status: 'failed',
                    reason: '账号未就绪'
                });
                continue;
            }

            // 为该账号准备消息
            let messageContent = task.message;
            let messageMetadata = null;

            if (task.encrypt) {
                const encryptedData = encryptedMessages.get(accountId);
                messageContent = this.formatMessageWithEncryption(task.message, encryptedData);
                messageMetadata = encryptedData;
            }

            // 向所有接收者发送
            for (const recipient of task.recipients) {
                let retries = 0;
                let success = false;

                while (retries < task.retryCount && !success) {
                    try {
                        await this.sendMessage(client, recipient, messageContent, messageMetadata);
                        success = true;

                        task.results.push({
                            accountId,
                            recipient,
                            status: 'success',
                            encrypted: task.encrypt
                        });

                        console.log(`✅ [${accountId}] → ${recipient} 发送成功`);
                    } catch (err) {
                        retries++;
                        console.warn(`⚠️ [${accountId}] → ${recipient} 失败 (重试 ${retries}/${task.retryCount}): ${err.message}`);

                        if (retries >= task.retryCount) {
                            task.results.push({
                                accountId,
                                recipient,
                                status: 'failed',
                                error: err.message
                            });
                        }

                        // 等待后重试
                        if (retries < task.retryCount) {
                            await this.sleep(2000);
                        }
                    }
                }

                // 延迟以避免被限制
                await this.sleep(task.delay);
            }
        }

        task.status = 'completed';
        task.endTime = new Date();

        // 统计
        const successCount = task.results.filter(r => r.status === 'success').length;
        const failureCount = task.results.filter(r => r.status === 'failed').length;
        const duration = (task.endTime - task.startTime) / 1000;

        console.log(`\n📊 任务完成统计:`);
        console.log(`   成功: ${successCount}/${task.results.length}`);
        console.log(`   失败: ${failureCount}/${task.results.length}`);
        console.log(`   耗时: ${duration}秒`);
    }

    /**
     * 发送单条消息
     * @param {Client} client - WhatsApp客户端
     * @param {string} chatId - 聊天ID
     * @param {string} message - 消息内容
     * @param {object} metadata - 消息元数据（加密信息）
     */
    async sendMessage(client, chatId, message, metadata = null) {
        try {
            const result = await client.sendMessage(chatId, message);
            return {
                success: true,
                messageId: result.id,
                metadata
            };
        } catch (err) {
            throw new Error(`发送消息失败: ${err.message}`);
        }
    }

    /**
     * 格式化加密消息
     * @param {string} originalMessage - 原始消息
     * @param {object} encryptedData - 加密数据
     * @returns {string} 格式化后的消息
     */
    formatMessageWithEncryption(originalMessage, encryptedData) {
        return `📨 **加密消息**\n方法: ${encryptedData.method}\n账号: ${encryptedData.accountId}\n\n原始消息:\n${originalMessage}\n\n🔐 加密内容:\n\`\`\`\n${encryptedData.encrypted}\n\`\`\`\n\n签名: ${encryptedData.signature.substring(0, 32)}`;
    }

    /**
     * 快速群发（简化版）
     * @param {string} message - 消息
     * @param {Array} recipients - 接收者
     * @param {object} options - 选项
     */
    async quickBroadcast(message, recipients, options = {}) {
        const taskId = this.addTask({
            message,
            recipients,
            encrypt: options.encrypt !== false,
            delay: options.delay || 1000,
            accountIds: options.accountIds || undefined,
            retryCount: options.retryCount || 3
        });

        await this.processTasks();
        return taskId;
    }

    /**
     * 获取任务状态
     * @param {string} taskId - 任务ID
     * @returns {object}
     */
    getTaskStatus(taskId) {
        const allTasks = [...this.taskQueue];
        return allTasks.find(t => t.id === taskId) || null;
    }

    /**
     * 获取所有待处理任务
     * @returns {Array}
     */
    getQueuedTasks() {
        return this.taskQueue.map(t => ({
            id: t.id,
            status: t.status,
            recipients: t.recipients.length,
            accounts: t.accountIds.length
        }));
    }

    /**
     * 清空队列
     */
    clearQueue() {
        const count = this.taskQueue.length;
        this.taskQueue = [];
        console.log(`✅ 已清空 ${count} 个待处理任务`);
    }

    /**
     * 睡眠函数
     * @param {number} ms - 毫秒
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 导出发送统计
     * @returns {object}
     */
    getStatistics() {
        const stats = {
            totalTasks: this.taskQueue.length,
            isProcessing: this.isProcessing,
            sentMessages: this.sentMessages.size,
            messageHashes: Array.from(this.sentMessages.entries()).map(([hash, data]) => ({
                hash: hash.substring(0, 16),
                count: data.count,
                timestamp: data.timestamp
            }))
        };
        return stats;
    }
}

module.exports = BroadcastManager;
