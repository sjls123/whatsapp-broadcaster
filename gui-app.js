#!/usr/bin/env node

/**
 * WhatsApp Broadcaster - GUI Version
 * 可视化界面用于管理多账户和群发
 */

const GUIServer = require('./GUIServer');

const PORT = process.env.PORT || 3000;

const server = new GUIServer();
server.start(PORT);

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n正在关闭应用...');
    process.exit(0);
});
