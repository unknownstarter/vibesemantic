"""
LangGraph 노드 로직
TypeScript에서 Python으로 포팅
"""

import os
from typing import Optional, TypedDict, List, Dict, Any
from datetime import datetime, timedelta
from app.services.supabase import get_supabase_client
from app.langgraph.types import AnalysisState, MartSummary, AnalystQuestion, Plan
from app.langgraph.prompts import build_system_prompt, build_user_prompt
import json
import re
import logging

logger = logging.getLogger(__name__)

# Planner node (Epic 4.1): intent, need_* data, mode → plan only (no computation/aggregation)
def planner_node(state: AnalysisState) -> Dict[str, Any]:
    """Planner: output plan (intent, need_ga4, need_csv, need_channels, need_pages, need_events, date_range)."""
    try:
        from app.langgraph.data_source_selector import build_plan

        plan = build_plan(
            user_message=state.get("userMessage"),
            mode=state.get("mode", "report"),
            workspace_purpose=state.get("workspacePurpose", "product"),
            range_value=state.get("range", "7d"),
            chart_context=state.get("chartContext"),
        )
        logger.info(f"[Planner] plan: {plan}")
        return {"plan": plan}
    except Exception as e:
        logger.exception("[Planner] failed")
        return {"error": str(e)[:500]}


# Guard and Route
def guard_and_route(state: AnalysisState) -> Dict[str, Any]:
    """권한 및 프로젝트 상태 체크"""
    try:
        from app.services.auth import verify_project_access
        
        allowed, error = verify_project_access(
            state["userId"],
            state["projectId"],
            state.get("workspaceId")
        )
        
        if not allowed:
            return {"error": error or "Access denied"}
        
        # LangGraph는 노드가 최소 하나의 필드를 업데이트해야 함
        return {"dataAccessed": state.get("dataAccessed", [])}
    except Exception as e:
        import traceback
        error_msg = f"Error in guard_and_route: {str(e)}\n{traceback.format_exc()}"
        return {"error": error_msg[:500]}  # 최대 500자로 제한

# Tool node (Epic 4.2): Planner plan → Summary/Mart/Graph 조회만. 집계는 코드로, LLM 없음.
def tool_node(state: AnalysisState) -> Dict[str, Any]:
    """Tool: plan에 따라 Summary(Mart + Semantic Graph) 조회, conversation_history 로드. LLM 호출 없음."""
    try:
        from app.langgraph.data_source_selector import build_plan
        from app.langgraph.summary_builder import build_summary_from_mart

        plan = state.get("plan")
        if not plan:
            plan = build_plan(
                state.get("userMessage"),
                state.get("mode", "report"),
                state.get("workspacePurpose", "product"),
                state.get("range", "7d"),
            )
        range_value = plan.get("date_range") or state.get("range", "7d")

        supabase = get_supabase_client()
        mart_summary, data_accessed = build_summary_from_mart(
            supabase=supabase,
            project_id=state["projectId"],
            range_value=range_value,
            question_intent=plan,
            mode=state.get("mode", "report"),
            workspace_id=state.get("workspaceId"),
            user_message=state.get("userMessage"),
        )

        conversation_history: List[dict] = []
        if state.get("mode") == "chat" and state.get("threadId"):
            try:
                messages_result = supabase.table("chat_messages") \
                    .select("role, content, created_at") \
                    .eq("workspace_id", state["workspaceId"]) \
                    .eq("thread_id", state["threadId"]) \
                    .order("created_at", desc=False) \
                    .limit(10) \
                    .execute()
                conversation_history = list(messages_result.data or [])
                data_accessed.append("chat_messages")
            except Exception:
                pass

        return {
            "martSummary": mart_summary,
            "conversationHistory": conversation_history,
            "dataAccessed": data_accessed,
        }
    except Exception as e:
        logger.exception("[Tool] failed")
        return {"error": str(e)[:500]}


# Load Context and Mart Summary (legacy: used until graph is switched to planner → tool in Task 4.4)
def load_context_and_mart_summary(state: AnalysisState) -> Dict[str, Any]:
    """컨텍스트 및 Mart 요약 로드. Summary(Semantic Snapshot) 생성 후 state에 채움. 내부적으로 tool_node와 동일 로직이나 plan 없이 intent 분석 호출."""
    try:
        from app.langgraph.data_source_selector import build_plan
        plan = build_plan(
            state.get("userMessage"),
            state.get("mode", "report"),
            state.get("workspacePurpose", "product"),
            state.get("range", "7d"),
        )
        state_with_plan = {**state, "plan": plan}
        return tool_node(state_with_plan)
    except Exception as e:
        return {"error": str(e)}


# Explainer node (Epic 4.3): Tool 결과 + 히스토리 → Report 정형 / Chat 추론+반문 2~3개
def explainer_node(state: AnalysisState) -> Dict[str, Any]:
    """Explainer: martSummary + conversationHistory → analysisMarkdown, analystQuestions. Report: 정형 리포트. Chat: 짧은 추론+반문 2~3개."""
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

        if not state.get("martSummary"):
            return {"error": "No mart summary available"}
        mart_summary = state["martSummary"]
        conversation_history = state.get("conversationHistory") or []
        mode = state.get("mode", "report")
        user_message = state.get("userMessage")
        if mode == "chat" and not user_message:
            return {"error": "User message is required for chat mode"}
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            return {"error": "OPENAI_API_KEY not configured"}

        system_prompt = build_system_prompt(
            language=state.get("language", "ko"),
            purpose=state.get("workspacePurpose", "product"),
            profile=state.get("projectProfile", {}),
            metric_definitions=mart_summary.get("metricDefinitions"),
            mode=mode,
            available_data_sources=mart_summary.get("dataSources"),
        )
        user_prompt = build_user_prompt(
            mode,
            mart_summary,
            user_message,
            chart_context=state.get("chartContext"),
        )
        model = ChatOpenAI(
            model_name="gpt-4o",
            openai_api_key=openai_key,
            temperature=0.3,
        )
        messages = [SystemMessage(content=system_prompt)]
        if mode == "chat" and conversation_history:
            for msg in conversation_history:
                if not isinstance(msg, dict):
                    continue
                role, content = msg.get("role"), msg.get("content", "")
                if not content:
                    continue
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
        messages.append(HumanMessage(content=user_prompt))
        response = model.invoke(messages)
        raw_content = response.content if isinstance(response.content, str) else \
            "".join(getattr(c, "text", str(c)) for c in response.content)
        if not raw_content or not raw_content.strip():
            return {"error": "Empty response from LLM"}

        if mode == "report":
            questions = parse_analyst_questions(raw_content, state)
            cleaned_markdown = remove_analyst_questions_section(raw_content)
        else:
            questions = extract_chat_followup_questions(raw_content)
            # 반문 2~3개 보장 (Epic 4.5)
            if len(questions) < 2:
                default_questions = get_default_questions(state)
                existing = {q["question"].lower().strip() for q in questions}
                for dq in default_questions:
                    if dq["question"].lower().strip() not in existing:
                        questions.append(dq)
                        if len(questions) >= 3:
                            break
            questions = questions[:3]  # 최대 3개
            cleaned_markdown = raw_content
        return {
            "analysisMarkdown": cleaned_markdown or "",
            "analystQuestions": questions or [],
        }
    except Exception as e:
        logger.exception("[Explainer] failed")
        return {"error": str(e)[:500]}


# Parse Analyst Questions
def parse_analyst_questions(markdown: str, state: Optional[Dict[str, Any]] = None) -> List[AnalystQuestion]:
    """마크다운에서 Analyst Questions 추출 (최소 3개)"""
    # Analyst Questions 섹션 찾기
    questions_match = re.search(
        r'#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)',
        markdown,
        re.IGNORECASE
    )
    
    section = questions_match.group(0) if questions_match else ""
    questions = []
    
    # 번호 매긴 질문 찾기 (1. 질문내용?)
    numbered_pattern = r'\d+\.\s*\*?\*?([^\n*]+\?)\*?\*?'
    matches = re.finditer(numbered_pattern, section)
    
    for idx, match in enumerate(matches):
        if idx >= 5:  # 최대 5개까지 찾기 (나중에 3개로 필터링)
            break
        
        question_text = re.sub(r'^\*+|\*+$', '', match.group(1)).strip()
        
        if len(question_text) > 10 and '?' in question_text:
            questions.append({
                "id": f"q{idx + 1}",
                "question": question_text,
                "context": extract_context(section, question_text),
                "quickReplies": generate_quick_replies(question_text)
            })
    
    # 번호 없이 질문만 있는 경우
    if len(questions) < 3:
        bullet_pattern = r'[-•]\s*([^\n]+\?)'
        matches = re.finditer(bullet_pattern, section)
        
        for idx, match in enumerate(matches):
            if len(questions) >= 5:  # 최대 5개까지
                break
            
            question_text = re.sub(r'^\*+|\*+$', '', match.group(1)).strip()
            
            if (len(question_text) > 10 and 
                '?' in question_text and 
                'quick reply' not in question_text.lower() and
                'next_params' not in question_text.lower()):
                questions.append({
                    "id": f"q{len(questions) + 1}",
                    "question": question_text,
                    "context": extract_context(section, question_text),
                    "quickReplies": generate_quick_replies(question_text)
                })
    
    # 최소 3개 보장
    if len(questions) < 3:
        default_questions = get_default_questions(state)
        # 중복 제거하면서 기본 질문 추가
        existing_questions = {q["question"].lower().strip() for q in questions}
        for default_q in default_questions:
            if default_q["question"].lower().strip() not in existing_questions:
                questions.append(default_q)
                if len(questions) >= 3:
                    break
    
    return questions[:3]  # 최대 3개 반환

def extract_context(section: str, question: str) -> str:
    """질문의 컨텍스트 추출"""
    # 간단한 구현: 질문 주변 텍스트
    idx = section.find(question)
    if idx == -1:
        return "분석 결과"
    
    start = max(0, idx - 100)
    end = min(len(section), idx + len(question) + 100)
    context = section[start:end]
    
    # 키워드 추출
    keywords = ["세션", "유저", "채널", "페이지", "전환", "리텐션"]
    found_keywords = [kw for kw in keywords if kw in context]
    
    return ", ".join(found_keywords) if found_keywords else "분석 결과"

def generate_quick_replies(question: str) -> List[Dict[str, Any]]:
    """Quick Replies 자동 생성"""
    replies = []
    
    # Range 관련 질문
    if any(kw in question for kw in ["7일", "30일", "기간", "기간별"]):
        replies.append({
            "label": "7일로 보기",
            "nextParams": {"range": "7d"}
        })
        replies.append({
            "label": "30일로 보기",
            "nextParams": {"range": "30d"}
        })
    
    # 채널 관련 질문
    if any(kw in question for kw in ["채널", "유입", "트래픽"]):
        replies.append({
            "label": "채널 상세 분석",
            "nextParams": {"focus": "channel"}
        })
    
    # 페이지 관련 질문
    if any(kw in question for kw in ["페이지", "화면", "경로"]):
        replies.append({
            "label": "페이지 상세 분석",
            "nextParams": {"focus": "page"}
        })
    
    # 기본 Quick Reply
    if not replies:
        replies.append({
            "label": "더 자세히 보기",
            "nextParams": {"range": "30d"}
        })
    
    return replies

def get_default_questions(state: Optional[Dict[str, Any]] = None) -> List[AnalystQuestion]:
    """기본 질문 반환 (최소 3개)"""
    questions = [
        {
            "id": "q1",
            "question": "이번 기간 가장 큰 변화는 무엇인가요?",
            "context": "분석 결과",
            "quickReplies": [
                {"label": "7일로 보기", "nextParams": {"range": "7d"}},
                {"label": "30일로 보기", "nextParams": {"range": "30d"}}
            ]
        },
        {
            "id": "q2",
            "question": "주요 채널별 성과를 비교해볼까요?",
            "context": "채널 분석",
            "quickReplies": [
                {"label": "채널 상세 분석", "nextParams": {"focus": "channel"}},
                {"label": "30일로 보기", "nextParams": {"range": "30d"}}
            ]
        },
        {
            "id": "q3",
            "question": "트렌드 변화를 더 자세히 분석해볼까요?",
            "context": "트렌드 분석",
            "quickReplies": [
                {"label": "7일로 보기", "nextParams": {"range": "7d"}},
                {"label": "30일로 보기", "nextParams": {"range": "30d"}}
            ]
        }
    ]
    
    # 통계적 분석 결과가 있으면 통계 기반 질문 추가
    if state and state.get("martSummary"):
        statistical_analysis = state.get("martSummary", {}).get("statisticalAnalysis")
        if statistical_analysis:
            metric_corrs = statistical_analysis.get("metric_correlations", [])
            event_rels = statistical_analysis.get("event_kpi_relationships", [])
            
            if metric_corrs and len(metric_corrs) > 0:
                top_corr = metric_corrs[0]
                metric1 = top_corr.get("metric1", "")
                metric2 = top_corr.get("metric2", "")
                if metric1 and metric2:
                    questions.append({
                        "id": "q4",
                        "question": f"{metric1}와 {metric2}의 상관관계를 더 자세히 분석해볼까요?",
                        "context": "통계적 분석",
                        "quickReplies": [
                            {"label": "상관관계 분석", "nextParams": {"focus": "correlation"}},
                            {"label": "30일로 보기", "nextParams": {"range": "30d"}}
                        ]
                    })
    
    return questions[:3]  # 최소 3개 반환

def remove_analyst_questions_section(markdown: str) -> str:
    """마크다운에서 Analyst Questions 섹션 제거"""
    pattern = r'#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)'
    return re.sub(pattern, '', markdown, flags=re.IGNORECASE).strip()

def extract_chat_followup_questions(text: str) -> List[AnalystQuestion]:
    """채팅 모드에서 후속 질문 추출"""
    questions = []
    
    # 답변 끝부분에서 질문 패턴 찾기 (마지막 200자 내)
    # "질문?", "~하시겠어요?", "~보시겠어요?" 등의 패턴
    last_part = text[-200:] if len(text) > 200 else text
    
    # 질문 패턴: "?"로 끝나는 문장
    question_patterns = [
        r'([^.!?]*\?[^.!?]*)',  # 일반 질문
        r'([^.!?]*하시겠어요\?[^.!?]*)',  # "~하시겠어요?"
        r'([^.!?]*보시겠어요\?[^.!?]*)',  # "~보시겠어요?"
        r'([^.!?]*알아보시겠어요\?[^.!?]*)',  # "~알아보시겠어요?"
    ]
    
    found_questions = []
    for pattern in question_patterns:
        matches = re.finditer(pattern, last_part, re.IGNORECASE)
        for match in matches:
            question_text = match.group(1).strip()
            # 너무 짧거나 긴 질문 제외
            if 10 <= len(question_text) <= 100 and '?' in question_text:
                found_questions.append(question_text)
    
    # 중복 제거, 반문 2~3개 (Epic 4.5)
    MIN_CHAT_FOLLOWUP = 2
    MAX_CHAT_FOLLOWUP = 3
    unique_questions = []
    seen = set()
    for q in found_questions:
        q_clean = q.strip().rstrip('?').strip()
        if q_clean not in seen and len(q_clean) > 10:
            seen.add(q_clean)
            unique_questions.append(q)
            if len(unique_questions) >= MAX_CHAT_FOLLOWUP:
                break
    
    # 질문을 AnalystQuestion 형식으로 변환
    for idx, q_text in enumerate(unique_questions):
        questions.append({
            "id": f"chat_q{idx + 1}",
            "question": q_text,
            "context": "채팅 답변",
            "quickReplies": generate_quick_replies(q_text)
        })
    
    return questions

# Persist Results
def persist_results(state: AnalysisState) -> Dict[str, Any]:
    """결과 저장"""
    try:
        supabase = get_supabase_client()
        
        # State에서 필요한 데이터 가져오기
        analysis_markdown = state.get("analysisMarkdown", "")
        analyst_questions = state.get("analystQuestions", []) or []
        mart_summary = state.get("martSummary")
        mode = state.get("mode", "report")
        user_message = state.get("userMessage")
        
        # Chat message 저장 (user message가 있으면)
        if user_message:
            try:
                supabase.table("chat_messages").insert({
                    "workspace_id": state["workspaceId"],
                    "thread_id": state["threadId"],
                    "role": "user",
                    "content": user_message
                }).execute()
            except Exception:
                pass
        
        # Assistant message 저장
        if analysis_markdown:
            try:
                supabase.table("chat_messages").insert({
                    "workspace_id": state["workspaceId"],
                    "thread_id": state["threadId"],
                    "role": "assistant",
                    "content": analysis_markdown,
                    "metadata": {"questions": analyst_questions}
                }).execute()
            except Exception:
                pass
        
        # Report 모드면 reports 테이블에도 저장 (Epic 4.6: 자산으로 range, workspace, 생성 시점 명시)
        if mode == "report" and analysis_markdown:
            try:
                generated_at = datetime.now().isoformat()
                metadata = {
                    "questions": analyst_questions,
                    "range": state.get("range"),
                    "workspace_id": state.get("workspaceId"),
                    "generated_at": generated_at,
                }
                if mart_summary:
                    metadata["martSummary"] = mart_summary
                supabase.table("reports").insert({
                    "workspace_id": state["workspaceId"],
                    "range": state["range"],
                    "report_markdown": analysis_markdown,
                    "metadata": metadata,
                }).execute()
            except Exception:
                pass
        
        # Analysis thread 업데이트
        try:
            supabase.table("analysis_threads").upsert({
                "workspace_id": state["workspaceId"],
                "thread_id": state["threadId"],
                "last_range": state["range"],
                "last_snapshot_at": datetime.now().isoformat()
            }, on_conflict="workspace_id,thread_id").execute()
        except Exception:
            pass
        
        # Audit log
        try:
            supabase.table("audit_logs").insert({
                "user_id": state["userId"],
                "project_id": state["projectId"],
                "workspace_id": state["workspaceId"],
                "action": "agent.report.generate" if mode == "report" else "agent.chat.message",
                "data_accessed": state.get("dataAccessed", []),
                "llm_payload_summary": {
                    "mode": mode,
                    "range": state["range"],
                    "questionsCount": len(analyst_questions),
                    "responseLength": len(analysis_markdown)
                }
            }).execute()
        except Exception:
            pass
        
        # LangGraph는 노드가 최소 하나의 필드를 업데이트해야 함
        return {"dataAccessed": state.get("dataAccessed", [])}
    except Exception as e:
        return {"dataAccessed": state.get("dataAccessed", []), "error": str(e)}
