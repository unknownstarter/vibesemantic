---
name: qa-engineer
description: Guides test design, test code, test cases, direct API verification, and result judgment (pass or improvement) for a full-stack product. Use when writing or running tests, verifying API behavior, or evaluating change outcomes and giving improvement feedback.
---

# QA Engineer (Vibe Semantic)

## What QA Engineers Actually Do

- **테스트 전략·설계**: 기능·회귀·성능·보안 등 무엇을 언제 어떻게 검증할지 정한다. 위험도·우선순위에 따라 케이스를 나눈다.
- **테스트 케이스·시나리오**: 입력·조건·기대 결과를 명시한 케이스를 작성한다. 정상·경계·예외·인증 실패 등을 포함한다.
- **자동화·CI 연동**: 반복 검증은 스크립트·테스트 러너로 자동화하고, CI에서 커밋·PR마다 실행되게 한다.
- **회귀·릴리스 기준**: 변경 후 기존 동작이 깨지지 않았는지 확인하고, 릴리스 전 통과 기준(테스트·체크리스트)을 적용한다.
- **결과 판단·피드백**: 실행 결과를 통과/미통과로 판단하고, 실패 시 원인·재현 절차·구체적 수정 제안을 전달한다.

## 개선·이슈 발굴 방식

- **실패·회귀 패턴**: 자주 실패하는 케이스·회귀 원인(변경 파일·도메인)을 분석하고, 테스트 커버리지·우선순위를 조정한다.
- **커버리지 갭**: 새 코드·엔드포인트·엣지 케이스 중 테스트가 없는 구간을 찾아 케이스를 추가한다.
- **릴리스·배포 검증**: 배포 후 스모크·핵심 시나리오를 실행해 프로덕션 동작을 확인하고, 실패 시 롤백·수정 기준을 적용한다.

## When to Use This Skill

- Writing or modifying test code (unit, integration, API).
- Defining test cases for a feature or endpoint.
- Verifying API behavior with direct calls (curl, script).
- Judging run/response results and deciding pass vs improvement.
- Giving concrete improvement feedback and re-running verification.

## Principles

- **Test what changed**: Every logic or API change should be covered by at least one test case or one verification step. Prefer automated tests where the project has a runner; otherwise document a repeatable manual procedure (e.g. curl + expected status/body).
- **Explicit test cases**: Each case states: input (or scenario), expected outcome (status, body shape, key fields), and optional edge (auth missing, invalid body, empty list). Write cases before or with the code so expectations are clear.
- **Result judgment**: After running tests or API calls, state clearly: **Pass** (behavior matches expectation) or **Fail** (with cause and fix). For Pass, optionally note improvement ideas (edge cases, messages, performance). For Fail, give **concrete improvement items**: file/function to change, condition to fix, expected value.
- **Feedback loop**: If improvement items are given, apply them (or ask the user to), then re-run the same verification and confirm Pass. Do not leave failures without a follow-up check.

## Test Code

- **Unit**: Pure functions, parsers, validators—input → expected output. Use project test runner (e.g. Jest, Vitest) if present; same naming and structure as existing tests.
- **Integration / API**: Route handlers or Brain endpoints—request (method, path, headers, body) → expected status and response shape. Prefer integration tests over only manual curl when the project supports it.
- **Auth-dependent routes**: Use a test token or test user if available; otherwise document how to obtain a token and run one manual curl example. Assert 401/403 for missing or invalid auth.
- **When no runner exists**: Propose adding a runner (e.g. Vitest for Next.js) or provide a small script (Node/ts-node or curl one-liners) that can be run to verify the critical path. Document expected stdout or response.

## Direct API Calls

- **Purpose**: Confirm real HTTP behavior (status, headers, body) after API changes. Complements unit tests when integration tests are not run.
- **Format**: Prefer curl or a single script. Example:
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/...`
  - Or script that `fetch`es and checks `res.status` and `res.json()`.
- **Scenarios**: Success (200/201, expected body), client error (400/401/404, error message), server error (500, no leak of internals). Document base URL (e.g. localhost:3000) and any env (e.g. auth cookie).
- **Judgment**: Compare actual vs expected; report Pass or Fail with diff or excerpt. If Fail, state what to change (e.g. "return 400 when body is missing X").

## Result Judgment & Improvement

- **Pass**: "검증 통과. (선택) 개선 제안: …"
- **Fail**: "검증 미통과. 원인: …. 개선 사항: 1) … 2) …" — improvement items must be actionable (file, condition, expected value).
- **Re-run**: After improvements, run the same test/call again and confirm Pass. If still Fail, refine improvement items and repeat.

## Extensibility

- **New feature**: Add test cases for happy path and at least one failure path (e.g. invalid input, unauthorized). If API, add one direct call or integration test.
- **New endpoint**: Document request/response contract; add cases for success, 400, 401/403, 500. Prefer automated integration test; fallback to curl/script + judgment.
- **Refactor**: Ensure existing tests still pass; add tests for new behavior. If tests are missing, add minimal cases for critical paths first.
- **CI**: When CI exists, ensure new tests run there and failure blocks merge. Document how to run tests locally (e.g. `npm run test`).
- **새 기능/엔드포인트 시**: 요구사항·계약과 함께 테스트 케이스(성공·실패·경계)·자동화 여부·릴리스 통과 기준을 정의한다.

## Reference (Current)

- No test runner in package.json yet. Propose Vitest or Jest for Next.js when adding tests. API routes under `src/app/api/`; Brain API under `python-brain/`. Manual verification: `npm run dev` then curl or browser; document expected status and body for changed routes.
