---
name: data-scientist
description: Covers data science responsibilities: problem definition, hypothesis and experiment design, EDA and visualization, feature engineering, statistical and ML modeling, evaluation and A/B testing, and insight storytelling. Use when defining analysis questions, metrics, models, or recommendations.
---

# Data Scientist (Vibe Semantic)

## What Data Scientists Actually Do

- **문제 정의·가설**: 비즈니스 질문을 측정 가능한 문제로 바꾼다. 가설을 세우고(예: "채널 A가 전환에 기여한다"), 검증할 지표와 대상을 정한다.
- **탐색적 분석(EDA)·시각화**: 데이터 분포, 결측, 이상치, 상관을 탐색한다. 차트·테이블로 패턴을 보여주고, 추가로 필요한 데이터·정제 작업을 식별한다.
- **특징 공학·모델링**: 분석·예측에 쓸 특징(feature)을 정의·가공한다. 통계 모델(회귀, 시계열) 또는 ML 모델(분류, 추천 등)을 선택하고, 학습·검증 데이터로 훈련·평가한다.
- **평가·실험**: 지표(정확도, 재현율, MAE, 비즈니스 KPI 등)를 정하고, 홀드아웃·크로스밸리데이션·A/B 테스트로 검증한다. 통계적 유의성과 실용적 효과를 구분한다.
- **인사이트·스토리텔링**: 결과를 비개발자에게 전달한다. "무엇이 나왔는지 → 왜 중요한지 → 무엇을 할 수 있는지" 순으로 요약하고, 시각화와 권고안을 붙인다.
- **재현성·실험 추적**: 코드·데이터 버전·하이퍼파라미터·실험 결과를 기록해 재현 가능하게 한다. 실험 로그·대시보드로 비교·선택할 수 있게 한다.
- **비즈니스와의 연결**: 분석·모델 결과가 지표(매출, 전환, 리텐션 등)와 어떻게 연결되는지 명시한다. "지표 개선"이 아니라 "어떤 액션으로 어떤 지표가 어떻게 변할 수 있는지"를 구체화한다.

## 인사이트 발굴 방식

- **가설 → 검증**: 비즈니스 질문을 가설로 바꾸고(예: "채널 A가 전환에 기여한다"), 검증 방법(EDA·A/B·모델)과 지표를 정한 뒤 데이터로 검증한다.
- **EDA·시각화**: 분포·상관·트렌드를 차트·테이블로 보고, 패턴·이상·추가 필요 데이터를 식별한다. 가설 수정·세분화에 활용한다.
- **실험·평가**: A/B·홀드아웃 결과를 통계적 유의성과 효과 크기로 해석하고, 승자·권고안을 도출한다. 재현성(시드·기간·세그먼트)을 남긴다.
- **피드백 루프**: 배포·권고 적용 후 실제 지표 변화를 추적하고, 모델·가설을 업데이트한다.

## When to Use This Skill

- Defining what the AI agent or report should answer (questions, metrics, recommendations).
- Designing evaluation for agent output (quality, relevance, actionability).
- Adding or refining metrics, dimensions, or analysis templates.
- Connecting mart/semantic layer to analysis and storytelling.

## Principles

- **Question first**: 분석·에이전트는 "무슨 질문에 답하는가"가 명확해야 한다. 지표와 차원은 그 질문을 답할 수 있게 정의한다.
- **Evidence and interpretation**: 숫자·차트만 나열하지 말고, 해석(트렌드, 원인 추정, 불확실성)과 다음 액션 제안을 함께 준다.
- **Reproducibility**: 동일 입력·기간·설정이면 동일 결과가 나오도록 데이터·로직을 고정한다. 샘플·시드가 쓰이면 문서화한다.
- **Bias and limits**: 데이터 한계(선택 편향, 기간, 샘플 크기)와 모델 한계를 언급하고, 과한 일반화를 피한다.

## Extensibility

- **New analysis type**: 질문·필요 데이터·출력 형식(요약, 표, 차트, 권고)을 정의한다. 에이전트 프롬프트와 UI가 그 형식을 따르게 한다.
- **Evaluation framework**: 에이전트 답변 품질을 사람 평가·자동 지표(완전성, 일관성)로 측정하고, 실험으로 개선 방향을 정한다.
- **Model or heuristic**: 예측·추천이 필요하면 모델 후보와 평가 지표를 정하고, 재현 가능한 파이프라인으로 넣는다.
- **새 질문·새 분석 도입 시**: 1) 문제 정의·가설 2) 필요 데이터·지표 3) 검증 방법(EDA/A/B/모델) 4) 출력 형식(요약·표·차트·권고) 5) 에이전트/리포트 프롬프트·UI와의 정렬.

## Reference (Current)

- Analysis output: report/chat markdown structure, metric citations, recommendations. Semantic layer: metric_definitions, mart summary to LLM. Evaluation: ad-hoc; consider explicit quality criteria and experiment logging. See data-analyst for metrics/semantic layer, ai-agent-developer for prompt and output design.
