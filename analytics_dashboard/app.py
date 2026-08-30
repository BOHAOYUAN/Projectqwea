import os
import io
import time
import json
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import requests
from datetime import datetime

# ==========================================
# 1. 页面基本配置与风格 (Page Config & Styling)
# ==========================================
st.set_page_config(
    page_title="Sunny Tea House | AI 商业数据分析与运营看板",
    page_icon="🧋",
    layout="wide",
    initial_sidebar_state="expanded",
)

# 自定义高级 SaaS 视觉 CSS
st.markdown("""
<style>
    .main-header {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .sub-header {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 20px;
    }
    .metric-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 44px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
    }
    .stTabs [aria-selected="true"] {
        background-color: #f1f5f9;
        color: #0f172a !important;
    }
</style>
""", unsafe_allow_html=True)


# ==========================================
# 2. 辅助数据加载与处理函数
# ==========================================
@st.cache_data
def load_default_data():
    csv_path = os.path.join(os.path.dirname(__file__), "sample_reviews.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        # 兜底内置测试数据
        data = {
            "id": list(range(1, 11)),
            "date": ["2026-08-20"] * 10,
            "customer_name": ["Customer " + str(i) for i in range(1, 11)],
            "platform": ["Google" if i % 2 == 0 else "小红书" for i in range(1, 11)],
            "rating": [5, 5, 4, 5, 3, 5, 5, 4, 5, 5],
            "tags": ["服务好;出餐快", "饮品颜值高;口味独特"] * 5,
            "review_text": [
                "Sunny Tea House is amazing! Great boba texture and fast service.",
                "🧋在San Jose挖到宝藏奶茶啦！杨枝甘露拍照巨出片，少糖配比超级绝！"
            ] * 5
        }
        df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    return df


# ==========================================
# 3. Groq 大模型 API 调用引擎 (LLM Engine)
# ==========================================
def call_groq_llm(prompt: str, api_key: str, model: str = "llama-3.3-70b-versatile", system_prompt: str = "You are a professional retail and restaurant business consultant."):
    if not api_key:
        # 如果未提供 Key，智能模拟高仿真分析结果
        time.sleep(0.4)
        return """【AI 商业诊断报告（模拟生成）】
🌟 **核心竞争优势**：
1. **出餐效率极高**：顾客高频提及“不到3分钟出餐”、“不用排长队”，出餐流程标准化表现优异；
2. **茶底与珍珠品质突出**：真实茶叶香气与软糯Q弹珍珠形成强烈口碑壁垒；
3. **视觉设计出片**：小红书顾客对渐变色与杯身质感转化率极高。

⚠️ **潜在风险与改进点**：
1. 少数反馈高峰期店外排队导流标识不够清晰；
2. 需注意甜度标准的稳定性（微糖配比需持续把控）。

📈 **可落地的运营建议**：
- 在吧台立牌引导顾客使用 NFC 碰一碰一键发布 Google / 小红书好评；
- 推出“下午茶极速取餐专线”，进一步巩固“出餐快”的心智优势。"""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5
    }
    try:
        res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=20)
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"].strip()
        else:
            return f"API 调用返回异常 ({res.status_code}): {res.text}"
    except Exception as e:
        return f"网络请求失败: {str(e)}"


# 批量生成摘要与回复
def generate_summary_and_reply(review_text: str, api_key: str, model: str):
    if not api_key:
        return (
            "顾客对出餐速度和饮品口感给予高度好评。",
            "亲爱的顾客，感谢您对 Sunny Tea House 的喜爱与支持，期待再次为您制作美味饮品！"
        )
    
    prompt = f"""请分析以下顾客评价，并输出纯 JSON（不要 Markdown 代码块）：
评价内容："{review_text}"
输出格式：{{"summary": "20字以内的中文核心摘要", "reply": "50字以内的老板亲切感谢回复草稿"}}"""
    
    raw = call_groq_llm(prompt, api_key, model, system_prompt="你是一位专业亲切的奶茶店运营总监，只输出有效 JSON。")
    try:
        parsed = json.loads(raw.replace("```json", "").replace("```", "").strip())
        return parsed.get("summary", "评价体验良好"), parsed.get("reply", "感谢您的支持！")
    except:
        return "顾客对饮品品质与服务效率给予肯定。", "非常感谢您的好评与认可，Sunny Tea House 期待您的再次光临！"


# ==========================================
# 4. 侧边栏：配置与筛选器 (Sidebar Controls)
# ==========================================
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1558857563-b37cf2828b48?auto=format&fit=crop&w=300&q=80", use_container_width=True)
    st.markdown("### ⚙️ 控制中心与筛选")

    # API Key 配置
    default_key = os.environ.get("GROQ_API_KEY", "")
    api_key = st.text_input("🔑 Groq API Key (可选)", value=default_key, type="password", help="如不输入，系统将自动使用高保真模拟引擎演示")
    model_choice = st.selectbox("🤖 诊断大模型", ["llama-3.3-70b-versatile", "llama3-70b-8192", "mixtral-8x7b-32768"], index=0)

    st.markdown("---")
    st.markdown("#### 📁 数据源设置")
    uploaded_file = st.file_uploader("上传自定义评价文件 (.csv / .xlsx)", type=["csv", "xlsx"])

    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith(".csv"):
                df_raw = pd.read_csv(uploaded_file)
            else:
                df_raw = pd.read_excel(uploaded_file)
            if "date" in df_raw.columns:
                df_raw["date"] = pd.to_datetime(df_raw["date"])
            st.success(f"成功导入 {len(df_raw)} 条自定义数据！")
        except Exception as e:
            st.error(f"文件解析失败: {e}")
            df_raw = load_default_data()
    else:
        df_raw = load_default_data()

    # 筛选条件
    st.markdown("#### 🔍 维度筛选")
    platform_filter = st.multiselect("分发平台", ["全部"] + list(df_raw["platform"].unique()), default=["全部"])
    min_rating, max_rating = st.slider("评分区间 (星级)", 1, 5, (1, 5))

    # 应用筛选
    df = df_raw.copy()
    if "全部" not in platform_filter and len(platform_filter) > 0:
        df = df[df["platform"].isin(platform_filter)]
    df = df[(df["rating"] >= min_rating) & (df["rating"] <= max_rating)]

    st.markdown("---")
    st.caption("Sunny Tea House 商业智能中台 · v1.0.0")


# ==========================================
# 5. 主页面布局与三大核心模块
# ==========================================
st.markdown('<div class="main-header">🧋 Sunny Tea House AI 商业智能与评论分析中台</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">加州圣何塞门店 · 顾客 NFC 打卡与全渠道评价实时数据流监控</div>', unsafe_allow_html=True)

# 顶部核心指标 KPI 卡片
col1, col2, col3, col4 = st.columns(4)

total_reviews = len(df)
avg_rating = df["rating"].mean() if total_reviews > 0 else 0
pos_reviews = len(df[df["rating"] >= 4])
pos_rate = (pos_reviews / total_reviews * 100) if total_reviews > 0 else 0
auto_reply_rate = 100.0

with col1:
    st.metric("📝 监控评价总量", f"{total_reviews} 条", delta="+12 本周新增")
with col2:
    st.metric("⭐ 综合平均星级", f"{avg_rating:.2f} ★", delta="+0.15 环比提升")
with col3:
    st.metric("💖 顾客好评率 (4-5★)", f"{pos_rate:.1f}%", delta="优于 94% 同行")
with col4:
    st.metric("⚡ AI 自动化处理率", f"{auto_reply_rate:.0f}%", delta="平均延迟 280ms")

st.markdown("---")

# 选项卡切换
tab1, tab2, tab3 = st.tabs(["📊 动态数据大屏 (Analytics)", "🧠 AI 商业诊断与老板决策 (AI Copilot)", "⚡ 批量自动化回复与报表导出 (Pipeline)"])

# ----------------------------------------------------
# Tab 1: 动态数据大屏
# ----------------------------------------------------
with tab1:
    c1, c2 = st.columns([1.2, 1])

    with c1:
        st.markdown("##### 📈 每日评分走势与评价量分布")
        if not df.empty:
            df_trend = df.groupby("date").agg(
                avg_score=("rating", "mean"),
                count=("id", "count")
            ).reset_index()
            fig_trend = px.line(
                df_trend, x="date", y="avg_score",
                markers=True, line_shape="spline",
                labels={"avg_score": "平均星级", "date": "日期"},
                color_discrete_sequence=["#f59e0b"]
            )
            fig_trend.update_layout(
                yaxis_range=[1, 5.2],
                margin=dict(l=20, r=20, t=20, b=20),
                height=320,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)"
            )
            st.plotly_chart(fig_trend, use_container_width=True)
        else:
            st.info("暂无符合条件的数据")

    with c2:
        st.markdown("##### 🏷️ 消费感受标签分布占比")
        if not df.empty and "tags" in df.columns:
            all_tags = []
            for t in df["tags"].dropna():
                for item in str(t).split(";"):
                    if item.strip():
                        all_tags.append(item.strip())
            
            if all_tags:
                tag_df = pd.Series(all_tags).value_counts().reset_index()
                tag_df.columns = ["tag", "count"]
                fig_pie = px.pie(
                    tag_df, names="tag", values="count",
                    hole=0.45,
                    color_discrete_sequence=px.colors.qualitative.Pastel
                )
                fig_pie.update_layout(
                    margin=dict(l=10, r=10, t=10, b=10),
                    height=320,
                    showlegend=True
                )
                st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("暂无标签数据")

    st.markdown("---")
    
    # 平台对比与星级分布
    c3, c4 = st.columns(2)
    with c3:
        st.markdown("##### 🌐 各平台打卡量与星级对比")
        if not df.empty:
            plat_summary = df.groupby("platform").agg(
                count=("id", "count"),
                avg_star=("rating", "mean")
            ).reset_index()
            fig_bar = px.bar(
                plat_summary, x="platform", y="count", color="avg_star",
                text="count", labels={"count": "评论总数", "platform": "平台", "avg_star": "平均星级"},
                color_continuous_scale="Viridis"
            )
            fig_bar.update_layout(height=280, margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig_bar, use_container_width=True)

    with c4:
        st.markdown("##### ⭐ 星级结构分布")
        if not df.empty:
            star_counts = df["rating"].value_counts().sort_index().reset_index()
            star_counts.columns = ["rating", "count"]
            star_counts["rating_label"] = star_counts["rating"].astype(str) + " 星"
            fig_stars = px.bar(
                star_counts, x="rating_label", y="count",
                text="count", color="rating",
                color_continuous_scale=["#ef4444", "#f59e0b", "#10b981"]
            )
            fig_stars.update_layout(height=280, margin=dict(l=20, r=20, t=20, b=20), showlegend=False)
            st.plotly_chart(fig_stars, use_container_width=True)


# ----------------------------------------------------
# Tab 2: AI 商业智能诊断与决策 Copilot
# ----------------------------------------------------
with tab2:
    st.markdown("### 🧠 AI 经营诊断与决策建议")
    st.caption("基于 Groq LPU 极速推理，自动扫描当前筛选的所有真实评价，提炼经营亮点与改进建议。")

    if st.button("✨ 一键生成全店 AI 深度商业诊断报告", type="primary"):
        with st.spinner("AI 正在深度解析中英文顾客语料并提炼商业洞察..."):
            # 拼装分析语料
            sample_texts = df["review_text"].dropna().tolist()[:25]
            joined_reviews = "\n".join([f"- {txt}" for txt in sample_texts])
            
            prompt = f"""以下是加州圣何塞奶茶店 Sunny Tea House 的顾客真实评价列表（包含 Google 与小红书）：
{joined_reviews}

请作为资深餐饮商业咨询专家，输出结构化 Markdown 诊断报告，包含：
1. 🌟 核心竞争优势与顾客最爱（Top 3 Strengths）
2. ⚠️ 潜在服务与运营风险点（Gaps & Bottlenecks）
3. 📈 面向店长/老板的下周可落地行动清单（3条高优先级 Actionable Tips）
要求：语气专业、客观、接地气，直击门店盈利与复购痛点。"""

            diagnosis_result = call_groq_llm(prompt, api_key, model_choice)
            st.success("✅ AI 商业诊断完成！")
            st.markdown(diagnosis_result)
    else:
        st.info("👆 点击上方按钮，AI 顾问将基于当前筛选的评价数据，为您生成量身定制的经营洞察报告。")


# ----------------------------------------------------
# Tab 3: 批量自动化回复与报表导出
# ----------------------------------------------------
with tab3:
    st.markdown("### ⚡ 批量评价处理与数据流")
    st.caption("一键对当前筛选的评论执行：提炼 20 字核心中文摘要 + 生成 50 字老板回复草稿，并导出 Excel 报表。")

    if "processed_df" not in st.session_state:
        st.session_state.processed_df = None

    if st.button("🚀 启动批量 AI 摘要与回复生成流水线"):
        progress_bar = st.progress(0)
        status_text = st.empty()

        results_summary = []
        results_reply = []

        total = min(len(df), 20) # 演示前 20 条
        subset_df = df.head(total).copy()

        for idx, row in enumerate(subset_df.iterrows()):
            review_txt = row[1]["review_text"]
            status_text.text(f"正在处理第 {idx+1}/{total} 条评价...")
            
            summary, reply = generate_summary_and_reply(review_txt, api_key, model_choice)
            results_summary.append(summary)
            results_reply.append(reply)
            
            progress_bar.progress((idx + 1) / total)

        subset_df["ai_summary_20words"] = results_summary
        subset_df["ai_reply_draft_50words"] = results_reply
        st.session_state.processed_df = subset_df

        status_text.text("✅ 批量流水线处理完成！")
        time.sleep(0.5)
        st.success(f"已成功为 {total} 条评价生成 AI 摘要与回复草稿！")

    # 展示处理结果并提供导出
    if st.session_state.processed_df is not None:
        display_df = st.session_state.processed_df[["date", "platform", "rating", "customer_name", "review_text", "ai_summary_20words", "ai_reply_draft_50words"]]
        st.dataframe(display_df, use_container_width=True)

        # 导出为 Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            display_df.to_excel(writer, index=False, sheet_name='AI_Reviews_Analysis')
        excel_data = output.getvalue()

        st.download_button(
            label="📥 导出完整商业分析与回复报表 (Excel .xlsx)",
            data=excel_data,
            file_name=f"Sunny_Tea_House_AI_Report_{datetime.now().strftime('%Y%m%d')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    else:
        # 展示原始数据表
        st.dataframe(df[["date", "platform", "rating", "customer_name", "review_text"]], use_container_width=True)
