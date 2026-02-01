---
name: marketer
description: Principles for landing page, messaging, lead capture, conversion, and positioning of a data-analysis product. Use when writing or changing copy, CTAs, pricing, or product narrative.
---

# Marketer (Vibe Semantic)

## What Marketers Actually Do

- **포지셔닝·메시지**: 제품이 누구에게 어떤 가치를 주는지 정의하고, 헤드라인·서브카피·증거(사례·수치)로 전달한다.
- **퍼널·전환**: 인지→관심→시도→유지 단계별 콘텐츠·CTA·채널을 설계하고, 전환율을 측정·개선한다.
- **세그먼트·타겟팅**: 페르소나·세그먼트별 메시지·오퍼를 나누고, 채널(랜딩·이메일·광고)에 맞춘다.
- **캠페인·실험**: A/B·다변량 테스트로 헤드라인·폼·레이아웃을 검증하고, 승자 기준·통계적 유의성을 적용한다.
- **마케팅 분석**: 유입·전환·이탈 지표를 추적하고, UTM·소스·캠페인별 성과를 보고한다.

## 인사이트 발굴 방식

- **퍼널·전환 분석**: 단계별 전환율·이탈 구간을 보고, 메시지·폼·채널을 개선할 포인트로 삼는다.
- **캠페인·채널 성과**: UTM·소스별 유입·전환·CPA를 비교하고, 채널·메시지·타깃 조합을 조정한다.
- **A/B·실험 결과**: 테스트별 승자·유의성·효과 크기를 해석하고, 승자 적용·추가 실험을 결정한다. 리드 품질·이탈률도 함께 본다.

## When to Use This Skill

- Writing or updating landing copy, value proposition, or feature descriptions.
- Designing or changing lead capture (forms, CTAs, segments).
- Aligning pricing, plans, or benefits with positioning.
- Measuring or optimizing conversion and engagement.

## Principles

- **Message hierarchy**: One clear value proposition (headline); supporting points (problems, features, proof) in order of impact. Avoid jargon; use terms the audience already uses. For a data/BI product: outcomes (e.g. "지표 해석", "다음 액션") over implementation ("AI", "자연어").
- **Lead capture**: Ask only what you need; reduce friction. Explain why you need contact info (e.g. "출시 시 알림"). Segment by intent (e.g. plan choice) so follow-up and messaging stay relevant. Respect privacy and consent in copy and flow.
- **Trust and proof**: Use social proof, logos, or short case hints where available. Security and compliance (e.g. 데이터 보안, 접근 제어) should be stated clearly for B2B/early adopters.
- **Consistency**: Tone (e.g. respectful, direct Korean) and product name/positioning should be consistent across landing, login, in-app copy, and errors. When adding new strings, match existing tone and terminology.

## Extensibility

- **New segments or plans**: Define benefit bullets and differentiators clearly; keep pricing and plan structure easy to compare. CTAs should reflect the segment (e.g. "Early Access" vs "문의하기").
- **New channels or campaigns**: Landing and forms should support UTM or source so attribution is possible. Avoid hardcoding campaign-specific copy in the app; use config or copy keys where feasible.
- **Localization**: If expanding language, keep value proposition and key CTAs aligned; adapt tone and examples to the locale. Marketer and frontend-developer/designer skills together cover copy placement and layout.
- **Experiments**: Structure headlines, CTAs, and form fields so A/B or multivariate tests can swap copy or layout without changing logic. Prefer content-driven variants over code forks.
- **새 채널/세그먼트 시**: UTM·소스 파라미터, 메시지·오퍼, 측정 지표(전환·품질)를 미리 정의하고, 랜딩·폼에서 소스 추적이 가능하게 둔다.

## Reference (Current)

- Landing: `src/app/(marketing)/`, `src/widgets/` (Hero, Pricing, FAQ, etc.). Lead capture: e.g. LeadCaptureForm, pricing/request-access flows. Copy and CTAs live in page and widget components; consider centralizing key strings for consistency and experiments. PRD and positioning: PRD.md, SERVICE_POSITIONING.md if present.
