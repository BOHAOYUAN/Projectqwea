# 🧋 Sunny Tea House · AI 智能评价生成与自动化流转系统

> 专为圣何塞奶茶店 **Sunny Tea House** 打造的移动端 H5 AI 评价助手，涵盖多平台精调 Prompt、毫秒级流式生成、一键复制跳转以及企业微信机器人自动化工作流。

---

## ✨ 核心特性

- 📱 **移动端极简高对比度体验**：针对手机端优化，自适应视觉留白与微动效。
- ⚡ **Groq LPU 毫秒级极速推理**：首字响应（TTFT）仅 200~300ms，500+ Tokens/s 流式涌现。
- 🎯 **去 AI 化的地道双平台 Prompt 矩阵**：
  - 🌐 **Google Review**：地道北美本地食客口吻，英文 50-70 字，杜绝机器翻译腔。
  - 📕 **小红书 (RED)**：中文爆款种草排版，灵动 Emoji，空行呼吸感排版与热门话题 Tag。
- 🚀 **一键复制与智能深度唤起（Deep Linking）**：自动复制剪贴板 + 彩蛋动效 + 尝试唤起 App / Google Maps。
- 🤖 **附加题：企业微信群机器人工作流（Webhook）**：后台自动提取中文摘要 + 撰写店长回复草稿并推送到群。
- 🔒 **服务端密钥隔离（Zero Key Leakage）**：Next.js Serverless 代理调用，彻底解决前端 Key 暴露隐患。

---

## 🚀 本地快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量 (.env.local)
# GROQ_API_KEY=your_groq_api_key

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## 🌐 部署上线指南 (Vercel)

本项目完全适配 Vercel 一键零配置部署：

1. 将代码推送到 GitHub 仓库；
2. 导入 Vercel 项目；
3. 在 Vercel 后台 Environment Variables 添加：
   - `GROQ_API_KEY`: `your_groq_api_key_here`
   - `DEFAULT_MODEL`: `openai/gpt-oss-120b`
4. 点击 **Deploy**，30 秒即可获得公开可访问的线上体验 URL！

---

## 📄 交付文档

- 完整项目设计与技术结项文档：[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
- 导出打印版网页文档：[PROJECT_DOCUMENTATION.html](./PROJECT_DOCUMENTATION.html)
