# 🚀 GitHub Actions 快速指南 (5 分钟完成)

## 就这 4 步！

### 1️⃣ 创建 GitHub 账户
```
网址: https://github.com/signup
邮箱、用户名、密码
完成！
```

### 2️⃣ 创建新仓库
```
登录后点右上角 + → New repository
Repository name: whatsapp-broadcaster
勾选: Add a README file
Create repository
```

### 3️⃣ 上传项目文件
```
点击 Add file → Upload files
拖拽或选择这个文件夹中的所有文件：
c:\Users\Administrator\Desktop\1\whatsapp-web.js-main\

所有文件都要上传！
Commit changes
```

### 4️⃣ 添加自动构建脚本

**第 1 步:** 点击 **Actions** 标签

**第 2 步:** 点击 **set up a workflow yourself**

**第 3 步:** 删除默认代码，复制这段代码进去：

```yaml
name: Build EXE

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: 安装 Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: 安装依赖
      run: npm install
    
    - name: 安装 pkg
      run: npm install -g pkg
    
    - name: 打包成 EXE
      run: pkg gui-app.js --targets win-x64 --output "./dist/WhatsApp-Broadcaster-GUI.exe" --compress Brotli
    
    - name: 上传 EXE 文件
      uses: actions/upload-artifact@v3
      with:
        name: WhatsApp-Broadcaster
        path: dist/WhatsApp-Broadcaster-GUI.exe
```

**第 4 步:** 点击 **Commit changes**

---

## ⏳ 等待构建完成

1. 点击 **Actions** 标签
2. 看到工作流运行中
3. 等待完成 (通常 5-10 分钟)

---

## 💾 下载 EXE

1. 构建完成后，点击工作流名称
2. 向下找 **Artifacts** 部分
3. 点击 **WhatsApp-Broadcaster** 下载
4. 解压 ZIP
5. 得到 **WhatsApp-Broadcaster-GUI.exe**

---

## ✅ 完成！

现在你可以：
- 在任何 Windows 电脑上运行 EXE
- 无需任何依赖或安装
- 双击即用！

---

## 需要帮助？

如果卡住了，查看 **GITHUB_ACTIONS_GUIDE.md** 获取详细说明。

