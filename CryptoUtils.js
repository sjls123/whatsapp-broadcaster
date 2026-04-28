/**
 * 加密工具模块 - 为每个账号提供不同的加密方式
 */

const crypto = require('crypto');

class CryptoUtils {
    /**
     * 为账号生成唯一的加密密钥
     * @param {string} accountId - 账号标识
     * @param {string} masterSecret - 主密钥（可选，用于生成一致的密钥）
     * @returns {object} { key, iv, algorithm }
     */
    static generateKeyForAccount(accountId, masterSecret = 'whatsapp-bot-secret') {
        // 基于账号ID和主密钥生成唯一的加密密钥
        const hash = crypto
            .createHmac('sha256', masterSecret)
            .update(accountId)
            .digest();

        return {
            key: hash, // 32字节，用于aes-256
            iv: crypto.randomBytes(16), // 初始化向量
            algorithm: 'aes-256-cbc'
        };
    }

    /**
     * AES加密
     * @param {string} text - 要加密的文本
     * @param {Buffer} key - 加密密钥
     * @param {Buffer} iv - 初始化向量
     * @returns {string} base64编码的密文
     */
    static encrypt(text, key, iv) {
        try {
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // 返回 IV + 密文（base64编码）
            const result = iv.toString('hex') + ':' + encrypted;
            return Buffer.from(result).toString('base64');
        } catch (err) {
            console.error('加密失败:', err);
            return null;
        }
    }

    /**
     * AES解密
     * @param {string} encryptedText - base64编码的密文
     * @param {Buffer} key - 加密密钥
     * @returns {string} 原始文本
     */
    static decrypt(encryptedText, key) {
        try {
            const result = Buffer.from(encryptedText, 'base64').toString('hex');
            const [iv, encrypted] = result.split(':');
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (err) {
            console.error('解密失败:', err);
            return null;
        }
    }

    /**
     * 生成签名（用于验证消息完整性）
     * @param {string} text - 文本
     * @param {string} accountId - 账号ID
     * @returns {string} 签名（hex）
     */
    static generateSignature(text, accountId) {
        return crypto
            .createHmac('sha256', accountId)
            .update(text)
            .digest('hex');
    }

    /**
     * 验证签名
     * @param {string} text - 文本
     * @param {string} accountId - 账号ID
     * @param {string} signature - 签名
     * @returns {boolean}
     */
    static verifySignature(text, accountId, signature) {
        const expectedSignature = this.generateSignature(text, accountId);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * 为消息生成加密版本（带标记）
     * @param {string} message - 原始消息
     * @param {string} accountId - 账号ID
     * @param {Buffer} key - 加密密钥
     * @param {Buffer} iv - 初始化向量
     * @returns {object} { encrypted, signature, accountId }
     */
    static encryptMessage(message, accountId, key, iv) {
        const encrypted = this.encrypt(message, key, iv);
        const signature = this.generateSignature(message, accountId);
        
        return {
            encrypted,
            signature,
            accountId,
            timestamp: new Date().toISOString(),
            method: 'aes-256-cbc'
        };
    }

    /**
     * 为多个账号生成不同的加密消息
     * @param {string} message - 原始消息
     * @param {Array<string>} accountIds - 账号列表
     * @param {string} masterSecret - 主密钥
     * @returns {Map<string, object>} { accountId: encryptedMessage }
     */
    static encryptForMultipleAccounts(message, accountIds, masterSecret = 'whatsapp-bot-secret') {
        const result = new Map();

        for (const accountId of accountIds) {
            const { key, iv } = this.generateKeyForAccount(accountId, masterSecret);
            result.set(accountId, this.encryptMessage(message, accountId, key, iv));
        }

        return result;
    }

    /**
     * 生成消息哈希（用于去重）
     * @param {string} message - 消息内容
     * @returns {string} SHA256哈希
     */
    static hashMessage(message) {
        return crypto
            .createHash('sha256')
            .update(message)
            .digest('hex');
    }

    /**
     * 将加密消息转换为可发送的格式
     * @param {object} encryptedData - 加密数据
     * @returns {string} 格式化的消息
     */
    static formatEncryptedMessage(encryptedData) {
        const header = `🔒 [${encryptedData.accountId}] [${encryptedData.method}]`;
        const body = `消息: ${encryptedData.encrypted.substring(0, 50)}...`;
        const signature = `签名: ${encryptedData.signature.substring(0, 16)}...`;
        
        return `${header}\n${body}\n${signature}`;
    }
}

module.exports = CryptoUtils;
