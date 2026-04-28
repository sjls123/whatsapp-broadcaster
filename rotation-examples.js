/**
 * 轮番发送 - 使用示例
 * 展示如何在代码中使用轮番群发功能
 */

const MultiClientManager = require('./MultiClientManager');
const RotationBroadcastManager = require('./RotationBroadcastManager');

async function example1_BasicRotation() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例1: 基础轮番发送');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 创建客户端
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');

    // 等待就绪
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 定义接收人（群聊）
    const groups = [
        { id: 'group1@g.us', name: '测试群1', type: 'group' },
        { id: 'group2@g.us', name: '测试群2', type: 'group' },
        { id: 'group3@g.us', name: '测试群3', type: 'group' }
    ];

    // 执行轮番发送
    await rotationManager.rotationBroadcast({
        recipients: groups,
        message: '大家好！这是来自轮番系统的消息。',
        accountIds: ['account1', 'account2'],
        rotationMode: 'round-robin',
        intervalBetweenMessages: 500,      // 账号之间500ms
        intervalBetweenRecipients: 1000,   // 群之间1000ms
        intervalBetweenRounds: 2000,       // 轮之间2000ms
        encrypt: true
    });

    // 获取统计
    const stats = rotationManager.getStatistics();
    console.log('\n📊 统计结果:');
    console.log(`   成功: ${stats.totalSent}`);
    console.log(`   失败: ${stats.totalFailed}`);

    // 断开连接
    await clientManager.disconnectAll();
}

async function example2_QuickGroupBroadcast() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例2: 快速群发给多个群');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 初始化
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');
    await clientManager.createClient('account3');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 使用简化接口
    const groupIds = [
        '123456-7890@g.us',
        '987654-3210@g.us',
        '555666-7777@g.us'
    ];

    const result = await rotationManager.broadcastToGroups(
        '🎉 特别通知：系统已就绪！',
        groupIds,
        ['account1', 'account2', 'account3'],
        {
            rotationMode: 'round-robin',
            intervalBetweenMessages: 1000,
            intervalBetweenRecipients: 1500,
            encrypt: true
        }
    );

    console.log(`\n✅ 群发完成: ${result.config.recipients.length}个群`);
    console.log(`📊 发送记录: ${result.results.length}条`);

    // 断开连接
    await clientManager.disconnectAll();
}

async function example3_QuickFriendBroadcast() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例3: 快速群发给多个好友');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 初始化
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 好友列表（手机号格式）
    const friendIds = [
        '8613800000001@c.us',
        '8613800000002@c.us',
        '8613800000003@c.us'
    ];

    const result = await rotationManager.broadcastToFriends(
        '你好，这是一条来自轮番系统的个人消息！',
        friendIds,
        ['account1', 'account2'],
        {
            rotationMode: 'sequential',
            intervalBetweenMessages: 800,
            intervalBetweenRecipients: 1200,
            encrypt: true,
            retryCount: 2
        }
    );

    console.log(`\n✅ 发送完成: ${result.config.recipients.length}个好友`);

    // 断开连接
    await clientManager.disconnectAll();
}

async function example4_MixedBroadcast() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例4: 混合广播（群+好友）');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 初始化
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');
    await clientManager.createClient('account3');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 混合接收人
    const groups = [
        'group1@g.us',
        'group2@g.us'
    ];

    const friends = [
        '8613800000001@c.us',
        '8613800000002@c.us',
        '8613800000003@c.us'
    ];

    const result = await rotationManager.broadcastMixed(
        '📢 重要公告：混合广播测试',
        groups,
        friends,
        ['account1', 'account2', 'account3'],
        {
            rotationMode: 'round-robin',
            intervalBetweenMessages: 600,
            intervalBetweenRecipients: 1000,
            intervalBetweenRounds: 3000,
            encrypt: true
        }
    );

    console.log(`\n✅ 混合广播完成`);
    console.log(`   群数: ${groups.length}`);
    console.log(`   好友数: ${friends.length}`);
    console.log(`   总记录: ${result.results.length}`);

    // 断开连接
    await clientManager.disconnectAll();
}

async function example5_AdvancedConfiguration() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例5: 高级配置 - 自定义所有参数');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 初始化
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 自定义接收人配置
    const recipients = [
        { id: 'group1@g.us', name: 'VIP群', type: 'group' },
        { id: 'group2@g.us', name: '普通群', type: 'group' },
        { id: '8613800000001@c.us', name: '张三', type: 'friend' },
        { id: '8613800000002@c.us', name: '李四', type: 'friend' }
    ];

    // 高级配置
    const task = await rotationManager.rotationBroadcast({
        recipients,
        message: '这是一条高度定制的轮番消息！包含群聊和私聊。',
        accountIds: ['account1', 'account2'],
        rotationMode: 'random',              // 随机模式
        intervalBetweenMessages: 1500,       // 账号消息间隔
        intervalBetweenRecipients: 2000,    // 接收人间隔
        intervalBetweenRounds: 5000,        // 轮间隔
        retryCount: 3,                       // 重试3次
        encrypt: true,
        masterSecret: 'your-custom-secret'
    });

    console.log(`\n✅ 高级配置发送完成`);
    console.log(`   任务ID: ${task.id}`);
    console.log(`   状态: ${task.status}`);
    console.log(`   接收人: ${task.config.recipients.length}个`);
    console.log(`   结果: ${task.results.length}条`);

    // 详细结果
    console.log('\n📊 详细结果:');
    for (const result of task.results) {
        console.log(`   ${result.accountId} → ${result.recipient.substring(0, 20)}... (${result.status})`);
    }

    // 断开连接
    await clientManager.disconnectAll();
}

async function example6_ExportResults() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('示例6: 导出和分析结果');
    console.log('═══════════════════════════════════════════════════════════\n');

    const clientManager = new MultiClientManager();
    const rotationManager = new RotationBroadcastManager(clientManager);

    // 初始化
    console.log('初始化账号...');
    await clientManager.createClient('account1');
    await clientManager.createClient('account2');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 执行发送
    const result = await rotationManager.broadcastToGroups(
        '测试消息 - 用于导出演示',
        ['group1@g.us', 'group2@g.us', 'group3@g.us'],
        ['account1', 'account2'],
        { encrypt: true }
    );

    const taskId = result.id;

    // 导出为JSON
    console.log('📤 导出为JSON格式:\n');
    const jsonResult = rotationManager.exportResults(taskId, 'json');
    console.log(jsonResult.substring(0, 300) + '...\n');

    // 导出为CSV
    console.log('📤 导出为CSV格式:\n');
    const csvResult = rotationManager.exportResults(taskId, 'csv');
    console.log(csvResult);

    // 统计分析
    console.log('\n📊 统计分析:');
    const stats = rotationManager.getStatistics();
    console.log(`   总成功: ${stats.totalSent}`);
    console.log(`   总失败: ${stats.totalFailed}`);
    console.log(`   成功率: ${((stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100).toFixed(1)}%`);

    // 断开连接
    await clientManager.disconnectAll();
}

/**
 * 主函数 - 选择要运行的示例
 */
async function main() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         轮番群发系统 - 完整使用示例                          ║
╚═══════════════════════════════════════════════════════════════╝

可用示例:

1. 基础轮番发送 (round-robin 模式)
2. 快速群发给多个群
3. 快速群发给多个好友
4. 混合广播 (群+好友)
5. 高级配置 (自定义所有参数)
6. 导出和分析结果

⚠️ 注意: 这些是演示代码，实际使用前需要:
   - 修改接收人ID为真实的群/好友ID
   - 配置正确的账号
   - 确保网络连接正常

`);

    // 这里可以选择运行某个示例
    // 为了演示，我们列出所有可用的示例

    console.log('💡 使用方法:');
    console.log('  node rotation-examples.js         (显示此信息)');
    console.log('  node rotation-broadcast-app.js    (交互式应用)\n');

    // 也可以直接运行某个示例（取消注释）:
    // await example1_BasicRotation();
    // await example2_QuickGroupBroadcast();
    // await example3_QuickFriendBroadcast();
    // await example4_MixedBroadcast();
    // await example5_AdvancedConfiguration();
    // await example6_ExportResults();
}

// 启动
if (require.main === module) {
    main().catch(err => {
        console.error('❌ 错误:', err);
        process.exit(1);
    });
}

module.exports = {
    example1_BasicRotation,
    example2_QuickGroupBroadcast,
    example3_QuickFriendBroadcast,
    example4_MixedBroadcast,
    example5_AdvancedConfiguration,
    example6_ExportResults
};
