/**
 * 快速开始脚本 - 简单示例
 * 运行: node quick-start.js
 */

const MultiClientManager = require('./MultiClientManager');
const BroadcastManager = require('./BroadcastManager');
const CryptoUtils = require('./CryptoUtils');
const config = require('./config');

async function quickStart() {
    console.log(`\n🚀 ${config.app.name}\n`);

    // 1. 创建客户端管理器
    const clientManager = new MultiClientManager();
    const broadcastManager = new BroadcastManager(clientManager);

    try {
        // 2. 初始化账号
        console.log('📱 初始化账号...\n');
        
        for (const account of config.accounts) {
            if (account.enabled) {
                console.log(`正在初始化 ${account.name}...`);
                await clientManager.createClient(account.id);
            }
        }

        // 3. 等待账号就绪
        console.log('\n⏳ 等待账号就绪，请根据需要扫描二维码...\n');
        await sleep(10000);

        // 4. 检查状态
        const status = clientManager.getStatus();
        console.log('\n📊 账号状态:\n');
        for (const acc of status) {
            console.log(`  ${acc.ready ? '✅' : '❌'} ${acc.accountId} - ${acc.phoneNumber}`);
        }

        // 5. 示例群发
        console.log('\n\n📨 开始群发示例...\n');
        
        const testMessage = '你好！这是来自群发系统的测试消息。';
        const recipients = [
            // 替换为你的接收人ID
            // '8613800000000@c.us',  // 手机号格式
            // '12345-67890@g.us'     // 群组ID
        ];

        if (recipients.length === 0) {
            console.log('⚠️ 未配置接收人，跳过群发测试\n');
            console.log('💡 编辑此文件，修改 recipients 数组来指定接收人\n');
        } else {
            // 6. 加密群发
            console.log('🔐 执行加密群发...\n');
            
            const readyAccounts = Array.from(clientManager.getReadyClients().keys());
            
            // 为每个账号生成加密版本
            const encrypted = CryptoUtils.encryptForMultipleAccounts(
                testMessage,
                readyAccounts,
                config.crypto.masterSecret
            );

            console.log('✅ 加密版本已生成:\n');
            for (const [accountId, data] of encrypted) {
                console.log(`  账号: ${accountId}`);
                console.log(`  加密消息: ${data.encrypted.substring(0, 40)}...`);
                console.log(`  签名: ${data.signature.substring(0, 20)}...\n`);
            }

            // 7. 添加任务
            broadcastManager.addTask({
                message: testMessage,
                recipients,
                encrypt: true,
                delay: 2000,
                retryCount: 2
            });

            // 8. 执行任务
            await broadcastManager.processTasks();
        }

        console.log('\n✅ 快速开始完成！\n');
        console.log('💡 要使用完整功能，请运行: node multi-account-app.js\n');

    } catch (err) {
        console.error('\n❌ 错误:', err);
    } finally {
        // 9. 清理
        console.log('🔌 正在断开连接...\n');
        await clientManager.disconnectAll();
        process.exit(0);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行
quickStart();
