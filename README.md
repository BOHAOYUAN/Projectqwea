# MS BEAUTY Review Studio

一个面向美容、头疗和 SPA 商家的多门店评价运营平台。它把顾客侧的「真实体验整理」和商家侧的「内容与转化运营」放在同一套安全的数据模型中；首个已初始化商家是 Baltimore 的 **MS BEAUTY**。

## 这版能做什么

- 顾客可通过每家门店独立、可跨设备访问的公开链接进入评价页。
- Google、Yelp 输出英文评价草稿；小红书输出中文笔记；Instagram 输出英文 caption。
- 顾客先选择服务、可多选体验标签、输入自己的感受，再选择三种口吻：**自然口吻 / 简洁一点 / 温暖叙事**。
- 文案只取材于顾客提供的事实、服务和标签，不补写价格、疗效、技师姓名、到店细节或虚构人物。生成后始终可编辑、换一版、复制，再由顾客自己打开目标平台发布。
- 商家后台可维护多商家、多门店、服务、公开页、平台跳转链接、内容偏好和匿名转化漏斗（Generated → Copied → Platform opened）。
- Google、Yelp 和 Instagram 已是完整的配置与内容生成通道，但 **MS BEAUTY 默认保持未启用**，直到运营者填入已验证的真实去向；不会生成或暴露假链接。
- 没有 AI Key 也可完整演示：服务端会使用带轮换的本地模板；配置 DeepSeek 后使用 DeepSeek V4 Flash，未配置 DeepSeek 时可使用 Groq 兼容模式，密钥不会出现在浏览器中。

## 当前入口

| 场景 | 地址 |
| --- | --- |
| 顾客公开页 | `/r/ms-beauty/baltimore` |
| Google 英文评价助手 | `/r/ms-beauty/baltimore/review/google`（配置商家生成的评价链接后开放） |
| 小红书中文笔记助手 | `/r/ms-beauty/baltimore/review/xiaohongshu` |
| Yelp 英文评价助手 | `/r/ms-beauty/baltimore/review/yelp`（配置链接后开放） |
| Instagram caption 助手 | `/r/ms-beauty/baltimore/review/instagram`（配置链接后开放） |
| 商家运营中台 | `/dashboard` |

公开页不会自动发布任何内容。顾客输入不会沉淀为可识别个人档案；数据库仅记录匿名的生成、复制和平台跳转统计。

## MS BEAUTY 初始化数据

- 地址：1006 Eastern Ave, Baltimore, MD 21202
- 行业：美容 / 头疗
- 服务：面部 SPA、头疗 SPA、背部 SPA
- Google：已建好后台配置位，等待商家从 Google Business Profile 复制“Get more reviews”链接
- 小红书：复制文案后由顾客点击唤起 App；唤起失败时提供网页搜索兜底
- Yelp / Instagram：已建好后台配置位和顾客端体验，默认关闭，等待真实商家链接

## 平台与文案策略

| 平台 | 顾客端产物 | 默认语言 | 发布方式 |
| --- | --- | --- |
| Google Maps | 简洁、自然的评价草稿 | English | 复制后打开商家已验证的评价链接 |
| 小红书 | 标题、分段正文、自然话题标签 | 中文 | 复制后由顾客点击唤起 App；失败时打开网页搜索兜底 |
| Yelp | 清晰、具体的评价草稿 | English | 复制后打开已验证的 Yelp 商家链接 |
| Instagram | 基于真实体验的 caption 与话题标签 | English | 复制后打开已配置的 Instagram 去向 |

这不是“自动刷好评”工具：界面明确提示用户核对、修改并自主决定是否发布。系统不抓取 Google、Yelp 或其他第三方评价；后台的评价运营数据只接受手工录入，或清楚标为演示数据。

## 技术与数据边界

- **Next.js + React**：公开顾客页、评价生成页、运营后台。
- **Supabase Auth**：邮箱 magic link 登录。
- **PostgreSQL + Prisma**：商家、成员关系、门店、服务、平台链接、公开配置、匿名指标和回复草稿。
- **成员隔离**：后台请求按 Membership 校验商家范围；公开页只读取已发布门店的安全展示字段。
- **Supabase RLS**：浏览器不能绕过服务端 DTO 直接读取租户数据。RLS 脚本位于 [`prisma/supabase-rls.sql`](prisma/supabase-rls.sql)。
- **内容生成**：`deepseek`、`groq` 和 `local` 三种服务端生成器。配置 `DEEPSEEK_API_KEY` 时使用 DeepSeek V4 Flash；未配置 DeepSeek 时可使用 Groq；所有远端输出不满足语言与事实约束时，都会回退到本地保守模板。

## 本地运行

```bash
npm install
npm run dev
```

未配置云端变量时，MS BEAUTY 的公开页和本地模板模式仍可用于产品演示。要启用跨设备数据、后台保存和 magic link，请继续完成下面的 Supabase 配置。

## Supabase 与数据库初始化

1. 在 Supabase 创建项目并启用 **Email magic link**。
2. 将 [`.env.example`](.env.example) 复制为 `.env.local`，填写 Supabase 和 PostgreSQL 变量。`.env.local` 绝不能提交到 Git。
3. 在 Supabase Auth 的 Redirect URLs 中加入：

   ```text
   http://localhost:3000/auth/callback
   https://你的生产域名/auth/callback
   ```

4. 生成 Prisma Client、应用正式迁移并写入首个商家数据：

   ```bash
   npm run prisma:generate
   npm run db:migrate
   npm run db:seed
   ```

   - `db:migrate` 使用仓库中的可追踪迁移，适用于生产环境和已存在的数据库。
   - `db:push` 仅适合本地快速试验；不要用它代替生产迁移。
   - `db:seed` 可重复运行，会更新/补齐 MS BEAUTY 的服务、Google、小红书、Yelp 和 Instagram 平台配置，不会伪造 Yelp/Instagram 地址。

5. 在 Supabase SQL Editor 执行 [`prisma/supabase-rls.sql`](prisma/supabase-rls.sql)。
6. 如要让首位运营者自动取得 MS BEAUTY 的 OWNER 权限，在 `INITIAL_OWNER_EMAIL` 填写该运营者邮箱。其他用户仍需被邀请为成员，或创建自己的工作区。

## Vercel 部署

1. 在 Vercel 导入 GitHub 仓库，框架选择 Next.js。
2. 在 Vercel 的 Environment Variables 配置以下变量（Production / Preview 依需要分别填写）：

   | 变量 | 用途 |
   | --- | --- |
   | `NEXT_PUBLIC_APP_URL` | 当前 Vercel 生产域名，例如 `https://app.example.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser-safe publishable key；老项目可改用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端使用的 Supabase service-role key |
   | `DATABASE_URL` | Supabase **pooler** PostgreSQL URL，供运行时使用 |
   | `DIRECT_URL` | Supabase **direct** PostgreSQL URL，供 Prisma migration 使用 |
   | `INITIAL_OWNER_EMAIL` | 可选：首位 MS BEAUTY 运营者邮箱 |
   | `DEEPSEEK_API_KEY` | 可选：优先使用的服务端 DeepSeek API Key |
   | `DEEPSEEK_MODEL` | 可选：DeepSeek 模型名，默认 `deepseek-v4-flash` |
   | `GROQ_API_KEY` | 可选：未配置 DeepSeek 时使用的服务端兼容模式 |
   | `GROQ_MODEL` / `DEFAULT_MODEL` | 可选：服务端 Groq 模型名 |

3. 建议将 Vercel Build Command 设为：

   ```bash
   npm run prisma:generate && npm run build
   ```

4. 使用带有生产环境变量的本地终端或 CI **一次性**执行 `npm run db:migrate`，随后首次执行 `npm run db:seed`。不要把迁移和 seed 放进每次 Vercel 构建，以免并发部署重复执行。
5. 把最终 Vercel 域名同步填入 Supabase 的 Site URL 和 Redirect URLs，并将同一个域名写回 `NEXT_PUBLIC_APP_URL` 后重新部署。

不要将 `SUPABASE_SERVICE_ROLE_KEY`、`DEEPSEEK_API_KEY`、`GROQ_API_KEY`、数据库密码或任何第三方平台密钥以 `NEXT_PUBLIC_` 变量、前端表单或客户端存储的方式暴露，更不要提交到 Git。

## 验证清单

```bash
npm run prisma:validate
npm run lint
npm run build
```

发布前还应手工确认：

1. 打开 MS BEAUTY 的公开链接，小红书入口可进入对应页面；Google 配置真实评价链接后才开放。
2. 未配置 URL 的 Google、Yelp / Instagram 卡和直达页显示不可用状态，不会跳到伪造地址。
3. 选择服务、多个体验标签和不同口吻后，生成、编辑、复制、跳转流程均可用。
4. 无 `DEEPSEEK_API_KEY` / `GROQ_API_KEY` 时可以正常生成；配置任一 Key 后仍不会将 Key 传给浏览器。
5. 以不同成员或不同商家测试后台，确认商家、门店、服务、链接和运营数据彼此隔离。

## 常用命令

```bash
npm run dev              # 本地开发
npm run lint             # ESLint
npm run build            # 生产构建
npm run prisma:validate  # 校验 Prisma schema
npm run prisma:generate  # 生成 Prisma Client
npm run db:migrate       # 应用正式 Prisma migration
npm run db:seed          # 初始化/更新 MS BEAUTY 数据
```
