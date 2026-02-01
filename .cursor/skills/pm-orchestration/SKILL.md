---
name: pm-orchestration
description: Orchestrates specialists (data, eng, design, UX research, marketing, BD, QA): aligns goals and execution, maps dependencies, evaluates competency and execution, gives actionable feedback, and coordinates handoffs. Use when coordinating cross-functional work, assessing delivery quality, or aligning stakeholders around outcomes.
---

# PM Orchestration (Vibe Semantic)

## What PM (Orchestration) Actually Do

- **전략·목표와 실행 연결**: 제품/비즈니스 목표를 Initiative·기능·태스크로 쪼개고, 어떤 전문가(데이터·엔지니어·디자인·UX 리서치·마케팅·BD·QA)가 무엇을 언제 낼지 정렬한다. 전략과 실행 사이 갭을 보이게 하고 채운다.
- **크로스펙 조율**: 디자인·프론트·백엔드·데이터·에이전트·마케팅·BD·QA·UX 리서처 등 역할 간 핸드오프·의존성을 가시화하고, 블로커·충돌을 조기에 해소한다. 한 역할의 산출이 다음 역할의 입력이 되도록 한다.
- **목표 설정·우선순위·진행·의존성 통제**: (1) 목표·성공 지표 설정 (2) 계획·우선순위·용량 조정 (3) 진행·품질·리스크 모니터링 (4) 의존성·경로 통제. 경쟁하는 우선순위·용량 제약을 조율한다.
- **역량·실행 평가**: 각 전문가 역할이 기대 수준(품질·일정·범위·협업)으로 수행하는지, 산출물·결과가 목표·기준에 부합하는지 평가한다. 패턴(반복 이슈·갭)을 짚어 개선 포인트로 둔다.
- **피드백·조정**: 평가 결과를 구체적·액션 가능한 피드백으로 전달하고, 다음 스프린트/단계에서 반영·추적한다. 전문가의 판단·자율은 유지하되, 목표·기준·일정은 명확히 한다.
- **이해관계자·역할 명확화**: RACI(Responsible, Accountable, Consulted, Informed) 또는 역할 매트릭스로 누가 무엇에 대해 결정·실행·자문·공유하는지 정리해 실무자가 같은 기준으로 일하게 한다.

## 역량·실행 평가 및 피드백

### 역량 평가 (역할별 기대 수준)

- **품질**: 해당 전문가 영역의 원칙·표준(각 스킬의 Principles·Extensibility)을 따르는지. 산출물이 확장 가능·유지보수 가능한지.
- **일정·범위**: 약속한 범위·일정 내에 납품하는지. 스코프 크리프·블로커 전파를 줄이는지.
- **협업**: 핸드오프·인터페이스(계약·문서·테스트)를 명확히 하는지. 다른 역할과 충돌 없이 정렬되는지.
- **인사이트·발굴**: 해당 역할의 "인사이트 발굴 방식"을 실제로 쓰고 있는지(정기 리뷰·로그·실험·피드백 수집 등).

평가 시 **역할 스킬**을 기준으로 삼는다. 예: 데이터 분석가 → data-analyst 스킬의 원칙·확장성·인사이트 발굴; 백엔드 → backend-developer 스킬의 API·인증·에러 처리 등.

### 실행 평가 (산출·결과)

- **목표 부합**: Initiative/기능의 성공 지표·요구사항을 만족하는지. 사용자·비즈니스 관점에서 기대 결과가 나왔는지.
- **기준 충족**: 품질 기준(테스트·접근성·보안·토큰 예산 등)을 충족하는지. 미충족 시 원인(범위·리소스·의존성)을 짚는다.
- **핸드오프 품질**: 다음 역할이 바로 쓸 수 있는 형태로 넘어갔는지(문서·API·디자인 시안·리서치 요약 등).

### 피드백 주는 방식

- **구체적·액션 가능**: "좀 더 잘 해줘"가 아니라 "이 조건에서 X가 Y로 동작해야 하는데 지금 Z라서, A를 수정해 B를 기대한다" 수준으로 적는다.
- **문제·기대·다음 단계**: (1) 무엇이 문제인지 (2) 어떤 결과를 기대하는지 (3) 다음에 무엇을 할지(액션·담당·기한)를 함께 준다.
- **역할 존중**: 해결 방법은 전문가에게 맡기고, PM은 기준·목표·우선순위를 제시한다. 과도한 지시는 전문가 역량을 약화시킨다.
- **일관된 채널·형식**: 피드백은 정해진 채널·포맷(이슈·리뷰·회의)로 주고, 추적 가능하게 남긴다. 다음 평가 시 반영 여부를 확인한다.

## 인사이트·개선 발굴 방식

- **진행·품질·블로커 리뷰**: 주기적으로 진행률·품질 지표·블로커를 보고하고, 지연·품질 이슈·반복 원인을 패턴으로 정리한다.
- **레트로·포스트모템**: 스프린트/릴리스 후 무엇이 잘됐는지·못됐는지·다음에 바꿀 것을 팀과 도출하고, 액션·소유자를 정한다.
- **역량·실행 패턴**: 전문가별로 반복되는 갭(예: 테스트 누락, 문서 부족, 일정 밀림)을 짚고, 프로세스·역할·도구 개선으로 옮긴다.
- **우선순위·용량 조정**: 충돌하는 요구·리소스 제약을 보고, 목표·범위·순서를 조정해 팀이 한 방향으로 가도록 한다.

## When to Use This Skill

- Coordinating work across data, eng, design, UX research, marketing, BD, QA.
- Setting or adjusting goals, priorities, and success criteria for an initiative or release.
- Evaluating whether specialist output meets quality and outcome expectations.
- Giving structured feedback to specialists and tracking follow-up.
- Resolving handoff gaps, blockers, or conflicting priorities.
- Clarifying RACI or role boundaries for a feature or process.

## Principles

- **목표·결과로 정렬**: 개별 역할의 "할 일"이 제품/비즈니스 결과(사용자 가치·지표)와 연결되도록 한다. 역할별 성과가 합쳐져 하나의 결과가 나오게 한다.
- **의존성 가시화**: 누가 누구에게 무엇을 넘기고, 그 입력이 언제 준비되는지 보이게 한다. 갭·지연을 예측 가능하게 한다.
- **구체적 피드백**: 모호한 지적을 피하고, 문제·기대·다음 액션을 명시한다. 피드백 수신자가 스스로 개선할 수 있게 한다.
- **역할 명확화**: 결정권(Accountable)·실행(Responsible)·자문(Consulted)·공유(Informed)를 역할·태스크별로 두어 중복·공백을 줄인다.

## Extensibility

- **새 전문가/역할 추가 시**: 해당 역할의 책임·산출·핸드오프(누구에게 무엇을 넘기는지)를 정의하고, RACI·의존성 맵에 반영한다. 역량 평가 시 해당 역할 스킬을 기준으로 둔다.
- **새 Initiative/기능 시**: 1) 목표·성공 지표 2) 관련 전문가·의존성 순서 3) 마일스톤·산출물 4) 품질·완료 기준 5) 진행·피드백 주기를 정한다. 오케스트레이션은 "누가 언제 무엇을 내는지"가 한눈에 보이게 유지한다.
- **분쟁·우선순위 충돌 시**: 이해관계자·기준·데이터(사용자·비즈니스 영향)를 놓고 논의하고, PM이 목표·범위·순서를 제안해 결정을 내리거나 에스컬레이션 경로를 둔다.

## Reference (Current)

- **조율 대상 스킬**: data-analyst, data-engineer, data-scientist, ai-agent-developer, frontend-developer, backend-developer, technical-architect, designer, ux-researcher, marketer, business-developer, qa-engineer. 각 스킬의 "What X Actually Do", "인사이트 발굴 방식", "Principles", "Extensibility"를 역량·실행 평가와 피드백의 기준으로 참조한다.
- **프로젝트**: Vibe Semantic의 Initiative·기능별로 어떤 역할이 어떤 산출을 내는지(디자인 시안→프론트 구현→API→데이터 파이프라인→에이전트 등)를 문서화해 두면 오케스트레이션 시 의존성·핸드오프를 짚기 쉽다.
