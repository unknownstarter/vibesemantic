# GitHub에 배포하기

터미널에서 다음 명령어를 순서대로 실행하세요:

## 1. Git 초기화 및 원격 저장소 연결

```bash
cd /Users/noahs/vibesemantic

# Git 초기화
git init

# 원격 저장소 추가
git remote add origin https://github.com/unknownstarter/vibesemantic.git
```

## 2. 파일 추가 및 커밋

```bash
# 모든 파일 추가 (민감한 파일은 .gitignore에 의해 제외됨)
git add .

# 커밋
git commit -m "Initial commit: Vibe Semantic landing page with Google Sheets integration"
```

## 3. GitHub에 푸시

```bash
# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

## 주의사항

다음 파일들은 `.gitignore`에 의해 자동으로 제외됩니다:
- `.env.local` (환경 변수)
- `google-credentials.json` (Google 인증 정보)
- `data/` (로컬 데이터 파일)
- `node_modules/` (의존성)
- `.next/` (빌드 파일)

## 확인

푸시가 완료되면 https://github.com/unknownstarter/vibesemantic 에서 확인할 수 있습니다.

