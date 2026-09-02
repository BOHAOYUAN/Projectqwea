# MS BEAUTY Review Studio

一个面向美容与护理商家的多门店评价运营平台。首个测试商家为 **MS BEAUTY**（Baltimore），同时保留了可扩展的多商家、成员隔离和跨设备数据模型。

## 当前入口

- 顾客公开页：`/r/ms-beauty/baltimore`
- Google 英文评价助手：`/r/ms-beauty/baltimore/review/google`
- 小红书中文笔记助手：`/r/ms-beauty/baltimore/review/xiaohongshu`
- 商家运营中台：`/dashboard`

顾客页不会自动发布任何内容。它只根据顾客输入、所选服务和体验标签起草文案；发布前必须由顾客核对和编辑。

## MS BEAUTY 默认数据

- 地址：1006 Eastern Ave, Baltimore, MD 21202
- 行业：美容 / 头疗
- 服务：面部 SPA、头疗 SPA、背部 SPA
- Google Maps：已配置真实的 MS BEAUTY Maps 链接
- 小红书：后台可配置发布/主页链接；未配置时仅在已启用的情况下使用搜索兜底，不会伪造发布链接

## 功能边界

- Google 页面输出自然、克制的英文草稿；小红书页面输出中文标题、正文和话题标签。
- 没有 `GROQ_API_KEY` 时，服务端使用本地保守模板，优先保留顾客原话，不补写价格、疗效、技师姓名或未提供的到店细节。
- 有 `GROQ_API_KEY` 时，服务端自动使用 Groq；密钥从不发送到浏览器。
- 后台支持商家、门店、服务、公开页、平台链接、内容偏好、匿名生成统计，以及手工/演示评价与回复草稿的数据模型。
- 当前不抓取 Google、Yelp 或其他第三方评价；后台的评价运营数据只能是手工录入或明确标为演示数据。

## 本地运行

```bash
npm install
npm run dev
```

没有云端配置时，MS BEAUTY 的公开客户页和本地文案模式可直接使用。后台会显示本地体验数据，便于演示信息架构。

## 启用跨设备数据与登录

1. 创建 Supabase 项目，开启 Email magic link，并将以下地址加入 Redirect URLs：
   - `http://localhost:3000/auth/callback`
   - 生产域名的 `/auth/callback`
2. 复制 `.env.example` 为 `.env.local`，填写 Supabase URL、publishable/anon key、`DATABASE_URL` 和 `DIRECT_URL`。
3. 生成并应用数据库结构：

   ```bash
   npm run prisma:generate
   npm run db:push
   npm run db:seed
   ```

4. 在 Supabase SQL Editor 执行 [`prisma/supabase-rls.sql`](prisma/supabase-rls.sql)。它会禁止浏览器直接读取租户表；公开页与后台都通过服务端 DTO 和成员权限读取数据。
5. 将运营者邮箱填入 `INITIAL_OWNER_EMAIL`，该邮箱首次登录时会获得已初始化 **MS BEAUTY** 商家的 `OWNER` 成员关系。其他用户不会自动取得该商家数据；他们需要获邀成为成员，或通过后台 API 创建自己的工作区。

生产环境使用 Supabase pooler URL 作为 `DATABASE_URL`，使用直连数据库 URL 作为 `DIRECT_URL`。不要提交 `.env.local`，也不要将 `SUPABASE_SERVICE_ROLE_KEY`、Groq key 或第三方平台密钥放入任何客户端代码。

## 验证

```bash
npm run prisma:validate
npm run lint
npm run build
```

关键手工流程：打开公开页、分别进入 Google/小红书页面、选择服务和标签、生成并编辑草稿、复制后打开平台。再以不同成员身份调用后台接口，确认其只能读取自己 Membership 所属的商家。
