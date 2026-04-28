/**
 * 轮番群发系统演示脚本
 * 快速演示所有主要功能
 * 运行: node demo.js
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
    console.log();
    log('═'.repeat(70), 'cyan');
    log(`  ${title}`, 'bright');
    log('═'.repeat(70), 'cyan');
    console.log();
}

function printFeature(title, description) {
    log(`✨ ${title}`, 'green');
    log(`   ${description}`, 'dim');
}

function printExample(title, code) {
    log(`📌 ${title}`, 'yellow');
    console.log(code);
}

function main() {
    printSection('🚀 WhatsApp 轮番群发系统 v2.0 演示');

    // 功能概述
    log('📋 核心功能:\n', 'bright');
    printFeature('轮番发送', '多账号轮流发送，自动负载均衡');
    printFeature('群聊广播', '一条消息发给多个群，自动轮番');
    printFeature('好友群发', '个性化消息发送给多个好友');
    printFeature('混合模式', '同时发给群和好友，灵活配置');
    printFeature('时间控制', '三层间隔配置，精细化控制');
    printFeature('加密支持', '每个账号独立加密，消息签名');
    printFeature('智能重试', '自动失败重试，可配置重试次数');
    printFeature('结果统计', '详细统计信息，JSON/CSV导出');

    // 轮番模式演示
    printSection('🔄 轮番模式演示');

    printExample(
        'Round-Robin (轮询) - 推荐',
        `群1 ← account1
群2 ← account2
群3 ← account3
群4 ← account1
...

优点: 负载均匀，最常用`
    );

    printExample(
        'Sequential (顺序)',
        `群1 ← account1
群2 ← account1
群3 ← account2
...

优点: 简单直观`
    );

    printExample(
        'Random (随机)',
        `群1 ← account2
群2 ← account1
群3 ← account3
...

优点: 更隐蔽`
    );

    // 时间间隔演示
    printSection('⏱️ 时间间隔配置');

    printExample(
        '快速模式 (风险中等)',
        `消息间隔: 500ms
接收人间隔: 800ms
轮间隔: 1500ms
→ 10个群约8分钟`
    );

    printExample(
        '标准模式 (推荐) ⭐',
        `消息间隔: 1000ms
接收人间隔: 1500ms
轮间隔: 3000ms
→ 10个群约15分钟`
    );

    printExample(
        '保守模式 (最安全)',
        `消息间隔: 2000ms
接收人间隔: 3000ms
轮间隔: 5000ms
→ 10个群约30分钟`
    );

    // 使用场景演示
    printSection('🎯 使用场景');

    printExample(
        '场景1: 营销通知',
        `- 消息: 产品宣传
- 目标: 3个群
- 账号: 2个
- 模式: round-robin
- 间隔: 标准
→ 结果: 安全有效`
    );

    printExample(
        '场景2: 重要通知',
        `- 消息: 系统通知
- 目标: 5个群+10个好友
- 账号: 3个
- 模式: random
- 间隔: 保守
→ 结果: 覆盖全面，隐蔽性好`
    );

    printExample(
        '场景3: 大规模发送',
        `- 消息: 营销内容
- 目标: 100个接收人
- 账号: 5个
- 分批: 每批10个
- 策略: 分批发送
→ 结果: 稳定高效`
    );

    // 代码示例
    printSection('💻 代码示例');

    printExample(
        '快速群发代码',
        `const RotationBroadcastManager = require('./RotationBroadcastManager');

// 群发给多个群
await rotationManager.broadcastToGroups(
    '大家好！',
    ['group1@g.us', 'group2@g.us', 'group3@g.us'],
    ['account1', 'account2'],
    {
        rotationMode: 'round-robin',
        intervalBetweenMessages: 1000,
        encrypt: true
    }
);`
    );

    // 启动方式
    printSection('🚀 启动方式');

    log('交互式应用 (推荐):\n', 'bright');
    log('  $ node rotation-broadcast-app.js\n', 'yellow');
    log('  菜单选项:');
    log('    1 - 群发给多个群');
    log('    2 - 群发给多个好友');
    log('    3 - 混合广播');
    log('    4 - 自定义配置');
    log('    5-9 - 其他功能\n', 'dim');

    log('原有程序 (仍可用):\n', 'bright');
    log('  $ node multi-account-app.js\n', 'yellow');
    log('  保持所有原有功能\n', 'dim');

    log('查看示例:\n', 'bright');
    log('  $ node rotation-examples.js\n', 'yellow');
    log('  6个完整示例代码\n', 'dim');

    // 快速开始
    printSection('⚡ 快速开始（5分钟）');

    log('步骤1: 启动应用\n', 'bright');
    log('  $ node rotation-broadcast-app.js\n', 'yellow');

    log('步骤2: 首次登录\n', 'bright');
    log('  扫描二维码登录账号\n', 'yellow');

    log('步骤3: 选择功能\n', 'bright');
    log('  菜单 → 1 (群发给多个群)\n', 'yellow');

    log('步骤4: 输入信息\n', 'bright');
    log('  消息: 你的消息内容\n', 'yellow');
    log('  群ID: group1@g.us,group2@g.us\n', 'yellow');
    log('  间隔: 使用默认值\n', 'yellow');

    log('步骤5: 确认执行\n', 'bright');
    log('  输入 y 确认\n', 'yellow');

    log('\n✅ 完成！轮番发送开始\n', 'green');

    // ID获取
    printSection('📱 如何获取账号和群ID?');

    printExample(
        '获取好友ID',
        `方法:
1. 在WhatsApp中打开与该好友的聊天
2. 按F12打开开发者工具
3. 在Console执行: window.WAPI.getChatId()
4. 复制结果，格式: 8613800000000@c.us

示例:
  个人号: 8613800000001@c.us
  国际: 14155552671@c.us`
    );

    printExample(
        '获取群ID',
        `方法:
1. 在WhatsApp中打开群聊
2. 按F12打开开发者工具
3. 在Console执行: window.WAPI.getChatId()
4. 复制结果，格式: 120363xxx@g.us

示例:
  新群: 120363012345678@g.us
  旧群: 12345-67890@g.us`
    );

    // 常见问题
    printSection('❓ 常见问题');

    printExample(
        'Q: 发送速度太快被限制怎么办?',
        'A: 在菜单中增加时间间隔\n   或切换到保守模式\n   建议消息间隔至少1000ms'
    );

    printExample(
        'Q: 消息发送失败怎么办?',
        'A: 系统会自动重试\n   检查ID格式是否正确\n   确认账号是否就绪\n   增加重试次数'
    );

    printExample(
        'Q: 可以一次发多少个?',
        'A: 推荐10-20个\n   分批处理更安全\n   每批间隔足够长\n   监控成功率'
    );

    printExample(
        'Q: 如何导出发送结果?',
        'A: 菜单 → 8 (导出结果)\n   选择格式 (json/csv)\n   结果保存为文件'
    );

    // 功能对比
    printSection('📊 v1.0 vs v2.0 功能对比');

    log('┌────────────────────────────────────────────────────────────┐', 'dim');
    log('│ 功能                    │ v1.0   │ v2.0   │ 改进          │', 'dim');
    log('├────────────────────────────────────────────────────────────┤', 'dim');
    log('│ 基础群发              │ ✅     │ ✅     │ 保留          │', 'dim');
    log('│ 加密支持              │ ✅     │ ✅     │ 增强          │', 'dim');
    log('│ 轮番发送              │ ❌     │ ✅     │ 新增 ⭐       │', 'dim');
    log('│ 群聊广播              │ ✅     │ ✅     │ 优化          │', 'dim');
    log('│ 好友群发              │ ✅     │ ✅     │ 优化          │', 'dim');
    log('│ 混合模式              │ ❌     │ ✅     │ 新增 ⭐       │', 'dim');
    log('│ 时间控制              │ 基础   │ 精细   │ 三层间隔      │', 'dim');
    log('│ 轮番模式              │ 1种    │ 3种    │ 更灵活        │', 'dim');
    log('│ 结果统计              │ 简单   │ 详细   │ 更全面        │', 'dim');
    log('│ 导出功能              │ ❌     │ ✅     │ 新增 ⭐       │', 'dim');
    log('│ 文档                  │ 基础   │ 完整   │ 150+页        │', 'dim');
    log('└────────────────────────────────────────────────────────────┘', 'dim');

    // 文档
    printSection('📚 完整文档');

    log('ROTATION_GUIDE.md', 'bright');
    log('  完整的使用指南，包括:\n', 'dim');
    log('  • 功能说明和使用场景', 'dim');
    log('  • 详细的时间间隔配置', 'dim');
    log('  • 轮番模式对比分析', 'dim');
    log('  • ID格式和获取方法', 'dim');
    log('  • 完整代码示例', 'dim');
    log('  • 最佳实践和技巧', 'dim');
    log('  • 故障排除指南\n', 'dim');

    log('QUICK_REFERENCE.md', 'bright');
    log('  快速参考卡片，包括:\n', 'dim');
    log('  • 启动命令', 'dim');
    log('  • 快速操作步骤', 'dim');
    log('  • 常用配置预设', 'dim');
    log('  • ID获取方法', 'dim');
    log('  • 常见问题答案', 'dim');
    log('  • 故障排查表\n', 'dim');

    log('rotation-examples.js', 'bright');
    log('  6个完整示例:\n', 'dim');
    log('  1. 基础轮番发送', 'dim');
    log('  2. 快速群发', 'dim');
    log('  3. 好友群发', 'dim');
    log('  4. 混合广播', 'dim');
    log('  5. 高级配置', 'dim');
    log('  6. 结果导出\n', 'dim');

    // 总结
    printSection('🎊 总结');

    log('v2.0 轮番群发系统提供:\n', 'bright');
    log('✨ 强大的轮番机制 - 智能调度多账号', 'green');
    log('✨ 灵活的时间控制 - 三层间隔配置', 'green');
    log('✨ 完整的文档 - 150+页参考资料', 'green');
    log('✨ 丰富的示例 - 6个完整代码示例', 'green');
    log('✨ 详细的统计 - 完全可视化结果', 'green');
    log('✨ 向后兼容 - 旧功能完全保留\n', 'green');

    log('立即启动体验:', 'bright');
    log('  $ node rotation-broadcast-app.js\n', 'yellow');

    log('🚀 祝你使用愉快！\n', 'green');
}

// 运行演示
if (require.main === module) {
    main();
}

module.exports = main;
