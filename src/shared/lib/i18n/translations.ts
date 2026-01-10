export type Language = "ko" | "en";

export const translations = {
  ko: {
    // Header
    nav: {
      product: "Product",
      howItWorks: "How it works",
      security: "Security",
      faq: "FAQ",
      earlyAccess: "Early Access",
      language: "언어",
    },
    // Hero
    hero: {
      badge: "Private Preview · Jan 2026",
      title: "Vibe Semantic",
      subtitle: "Your Product's Data Analyst Agent",
      description:
        "SQL 없이도, 지금 봐야 할 지표와 다음 액션을 제안합니다. PO, 창업가, 마케터를 위한 AI 기반 데이터 분석 도구로 DAU, 리텐션, 전환율 등 핵심 지표를 자연어로 질문하고 인사이트를 얻으세요.",
      earlyAccessButton: "Early Access 신청하기",
      howItWorksButton: "How it works",
      demoButton: "데모 체험",
    },
    // Problem
    problem: {
      title: "이런 고민 있으신가요?",
      description:
        "데이터 분석가가 없어도, SQL을 몰라도 제품 지표를 분석하고 의사결정할 수 있습니다.",
      items: [
        {
          title: "지표는 보이는데 해석이 없다",
          description:
            "숫자만 나열되어 있어서 무엇이 문제인지, 왜 변했는지 알 수 없습니다.",
        },
        {
          title: "SQL/쿼리 비용이 너무 크다",
          description:
            "매번 데이터팀에 요청하거나 복잡한 쿼리를 작성해야 합니다.",
        },
        {
          title: "데이터팀이 없거나 기다려야 한다",
          description:
            "작은 팀에서는 데이터 분석 인력이 없거나, 대기 시간이 길어집니다.",
        },
      ],
    },
    // How it works
    howItWorks: {
      badge: "• Workflow Simplified",
      title: "Turn Data into Decisions in 3 Steps",
      description:
        "스프레드시트와 씨름하지 마세요. 데이터 소스를 연결하고 목표를 정의하면, 시맨틱 엔진이 실제로 도움이 되는 인사이트를 찾아드립니다.",
      demoButton: "데모 체험",
      steps: [
        {
          number: "01",
          title: "Connect Your Universe",
          description:
            "데이터 소스를 즉시 통합하세요. Supabase, Google Sheets, GA4, BigQuery 등 주요 데이터 소스를 제로 설정으로 지원합니다.",
          dataSources: ["Supabase", "Google Sheets", "GA4", "BigQuery"],
          uiExample: {
            title: "Data Sources",
            addButton: "+ Add New",
            sources: [
              {
                name: "Production DB",
                type: "Supabase",
                status: "active",
                lastSync: "Last sync 2m ago",
              },
              {
                name: "Analytics Data",
                type: "GA4",
                status: "syncing",
                lastSync: "Syncing...",
              },
              {
                name: "Q3 Sales Sheet",
                type: "Google Sheets",
                status: "paused",
                lastSync: "Paused",
              },
            ],
          },
        },
        {
          number: "02",
          title: "Define Your Goals",
          description:
            "자연어를 사용하여 Vibe Semantic에게 가장 중요한 KPI를 알려주세요. 복잡한 쿼리 언어가 필요 없습니다—데이터 분석가와 대화하듯 질문하세요.",
          uiExample: {
            prompts: [
              "What insights are you looking for today?",
              "Analyzing revenue streams...",
            ],
            userMessage: "Show me the customer churn rate for Q3 broken down by region.",
            inputPlaceholder: "Ask follow up...",
          },
        },
        {
          number: "03",
          title: "AI-Driven Strategy",
          description:
            "원시 데이터가 아닌 실행 가능한 전략을 얻으세요. 우리 엔진은 이상 징후를 강조하고 비즈니스를 위한 최적화된 경로를 제안합니다.",
          uiExample: {
            title: "CHURN ANALYSIS",
            period: "Last 30 Days",
            metric: "4.2%",
            change: "+0.8%",
            recommendation:
              "High churn detected in the 'Enterprise' segment. Consider launching a re-engagement campaign offering extended support.",
            buttonText: "Generate Campaign",
          },
        },
      ],
    },
    // Pricing
    pricing: {
      title: "Pricing",
      description: "원하는 플랜을 선택하세요",
      plans: {
        basic: {
          title: "기본",
          badge: "기본",
          heading: "출시 알림",
          price: "무료",
          features: [
            { text: "출시 시 알림 받기", included: true },
            { text: "Early Access 우선 초대", included: false },
          ],
          buttonText: "이메일 남기기",
        },
        popular: {
          title: "인기",
          badge: "인기",
          heading: "Early Access 우선 초대",
          price: "$0",
          features: [
            { text: "출시 즉시 우선 초대", included: true },
            { text: "자연어 질문 50회 제공", included: true },
            { text: "자동 원인 분석", included: true },
            { text: "다음 액션 제안", included: true },
            { text: "기본 리포트 생성", included: true },
          ],
          buttonText: "Early Access",
        },
        premium: {
          title: "추천",
          badge: "추천",
          heading: "평생 프리미엄",
          price: "평생 $49",
          originalPrice: "연 $199",
          discountBanner: "75% 할인 100명 한정",
          features: [
            { text: "출시 즉시 사용", included: true },
            { text: "모든 프리미엄 기능 평생 무료", included: true },
            { text: "자연어 질문 하루 최대 200회", included: true },
            { text: "고급 분석 기능 (트렌드 예측)", included: true },
            { text: "커스텀 리포트 & 공유", included: true },
            { text: "우선 지원 & 피드백 반영", included: true },
            { text: "창립 멤버 배지", included: true },
          ],
          buttonText: "지금 결제하기",
        },
      },
      modal: {
        email: "이메일",
        phoneNumber: "전화번호",
        contactName: "담당자 이름",
        companyName: "회사명",
        required: "*",
        cancel: "취소",
        submit: "제출하기",
        submitting: "제출 중...",
        success: {
          title: "신청 완료",
          message: "신청이 완료되었습니다",
          premiumNote:
            "남겨주신 이메일로 별도 결제 안내를 드리겠습니다.",
          thankYou: "감사합니다.",
        },
        premiumNote:
          "남겨주신 이메일로 별도 결제 안내를 드리겠습니다.",
        errors: {
          email: "이메일을 입력해주세요.",
          phoneNumber: "전화번호를 입력해주세요.",
          contactName: "담당자 이름을 입력해주세요.",
          companyName: "회사명을 입력해주세요.",
        },
        placeholders: {
          email: "your@email.com",
          phoneNumber: "010-1234-5678",
          contactName: "홍길동",
          companyName: "회사명",
        },
      },
    },
    // FAQ
    faq: {
      title: "FAQ",
      description: "자주 묻는 질문들",
      items: [
        {
          question: "정말 SQL 없이도 가능한가요?",
          answer:
            "네, 가능합니다. Vibe Semantic은 자연어 질문을 이해하고 자동으로 쿼리를 생성합니다. 복잡한 SQL 지식 없이도 데이터 인사이트를 얻을 수 있습니다. 예를 들어 '지난 7일 리텐션이 왜 떨어졌어?'와 같은 자연어 질문으로 데이터를 분석할 수 있습니다.",
        },
        {
          question: "데이터를 저장하나요?",
          answer:
            "아니요, Vibe Semantic은 데이터를 저장하지 않습니다. 읽기 전용으로 연결하여 쿼리 결과만 일시적으로 처리하며, 원본 데이터는 그대로 유지됩니다. 모든 데이터는 사용자의 데이터베이스에만 저장되며, Vibe Semantic은 분석 결과만 제공합니다.",
        },
        {
          question: "Supabase/GA4/BigQuery 셋 다 되나요?",
          answer:
            "네, Supabase, GA4, BigQuery를 모두 지원합니다. 읽기 전용 연결을 통해 안전하게 데이터에 접근하며, 추후 더 많은 데이터베이스를 지원할 예정입니다. 현재는 PostgreSQL 기반 데이터베이스와 BigQuery를 지원합니다.",
        },
        {
          question: "오픈 일정은 어떻게 되나요?",
          answer:
            "2026년 1월 Private Preview를 시작합니다. Early Access 신청을 통해 소수의 서비스 운영자와 함께 테스트하며 개선해 나갈 예정입니다. 정식 출시는 2026년 상반기 중 예정되어 있습니다.",
        },
        {
          question: "가격은 어떻게 되나요?",
          answer:
            "Private Preview 기간 동안은 무료로 제공됩니다. 정식 출시 후 가격 정책은 추후 공개될 예정입니다. Early Access 신청자에게는 특별 가격 혜택이 제공될 예정입니다.",
        },
        {
          question: "데이터 분석가가 없어도 사용할 수 있나요?",
          answer:
            "네, 맞습니다. Vibe Semantic은 PO, 창업가, 마케터 등 데이터 분석 전문 지식이 없는 사용자도 쉽게 사용할 수 있도록 설계되었습니다. 자연어로 질문하면 자동으로 분석 결과와 인사이트를 제공합니다.",
        },
        {
          question: "어떤 지표를 분석할 수 있나요?",
          answer:
            "DAU(일일 활성 사용자), 리텐션, 전환율, 클릭률(CTR), 구매 전환율(CVR), 장바구니 추가율 등 다양한 제품 지표를 분석할 수 있습니다. 서비스의 목적과 핵심 지표를 입력하면 자동으로 관련 지표를 추적하고 분석합니다.",
        },
        {
          question: "보안은 어떻게 보장되나요?",
          answer:
            "Vibe Semantic은 읽기 전용 연결만 사용하며, 데이터를 저장하지 않습니다. 또한 Allowlist를 통해 특정 스키마나 뷰에만 접근할 수 있도록 제한할 수 있으며, 쿼리 제한 및 타임아웃 설정을 통해 보안을 강화합니다.",
        },
      ],
    },
    // Security
    security: {
      title: "Security & Trust",
      description: "데이터 보안은 최우선입니다",
      items: [
        {
          title: "Read-only access",
          description:
            "데이터베이스에 읽기 전용으로만 연결합니다. 데이터 수정이나 삭제는 불가능합니다.",
          badge: "🔒",
        },
        {
          title: "Allowlist",
          description:
            "analytics schema/view만 접근 가능하도록 제한합니다. 민감한 데이터는 접근하지 않습니다.",
          badge: "📋",
        },
        {
          title: "Query limit/timeout",
          description:
            "쿼리 실행 시간과 리소스 사용량을 제한하여 데이터베이스 부하를 방지합니다.",
          badge: "⏱️",
        },
        {
          title: "PII 최소화 가이드",
          description:
            "개인정보 식별 가능 데이터(PII)는 최소화하고, 필요시 익명화 처리를 안내합니다.",
          badge: "🛡️",
        },
      ],
    },
    // Dashboard
    dashboard: {
      title: "대시보드",
      subtitle: "이커머스 · 실시간 모니터링",
      live: "Live",
      recommendedActions: "추천 액션",
      actions: {
        conversion: "전환율 올리기",
        retention: "리텐션 개선",
        engagement: "참여도 증가",
      },
      insights: {
        for: "를 위한 인사이트",
        conversion: "지난 7일간의 데이터 분석 결과, 관련 기능 적용으로 전환율이",
        retention: "지난 7일간의 데이터 분석 결과, 관련 기능 적용으로 리텐션이",
        engagement: "지난 7일간의 데이터 분석 결과, 관련 기능 적용으로 참여도가",
        increased: "상승했습니다.",
      },
      chart: {
        daysAgo7: "7일 전",
        daysAgo5: "5일 전",
        daysAgo3: "3일 전",
        today: "오늘",
      },
    },
    // Success Case
    successCase: {
      title: "Success Cases",
      description: "실제 데이터로 확인하는 인사이트와 액션",
      clickHint: "카드를 클릭하면 상세 인사이트를 확인할 수 있습니다",
      cases: [
        {
          id: "ecommerce",
          industry: "이커머스",
          metric: "CVR (전환율)",
          value: "2.8%",
          change: "+0.5%",
          period: "14일",
          action: "Add to Cart 버튼 위치 최적화",
          result: "전환율이 14일 이내에 +0.5%p 상승했습니다. 동기간에 적용된 'Add to Cart 버튼 위치 최적화' 기능으로 인한 전환율 개선입니다.",
        },
        {
          id: "dau",
          industry: "모바일 앱",
          metric: "DAU",
          value: "15.2K",
          change: "+10.3%",
          period: "7일",
          action: "푸시 알림 타이밍 개선",
          result: "DAU가 7일 이내에 +10.3% 증가했습니다. 동기간에 적용된 '푸시 알림 타이밍 개선' 기능으로 인한 사용자 참여도 증가입니다.",
        },
        {
          id: "ctr",
          industry: "콘텐츠 플랫폼",
          metric: "CTR",
          value: "4.2%",
          change: "+0.8%",
          period: "10일",
          action: "추천 알고리즘 개선",
          result: "CTR이 10일 이내에 +0.8%p 상승했습니다. 동기간에 적용된 '추천 알고리즘 개선' 기능으로 인한 클릭률 증가입니다.",
        },
      ],
    },
    // Bento
    bento: {
      title: "Features",
      description:
        "SQL 없이도 데이터 인사이트를 얻을 수 있는 모든 기능. 데이터 분석가 없어도 제품 지표를 분석하고 의사결정할 수 있습니다.",
    },
    // Footer
    footer: {
      company: "Company: Dropdown",
      messageUs: "Message us:",
      copyright: "All rights reserved.",
    },
    // Lead Capture Form
    leadCapture: {
      intro:
        "Vibe Semantic은 소수의 서비스 운영자와 함께 만드는 Private Preview입니다.",
      fields: {
        companyName: "회사명",
        contactName: "담당자 이름",
        jobRole: "직책/직무",
        serviceName: "서비스 이름",
        dau: "서비스 DAU",
        purpose: "사용 목적",
        painPoint: "지금 가장 답답한 점",
        currentTool: "현재 사용 중인 분석 도구",
        expectedFeature: "Early Access에서 가장 기대하는 기능",
        email: "이메일",
        phoneNumber: "전화번호",
      },
      placeholders: {
        select: "선택해주세요",
        email: "your@email.com",
        phoneNumber: "010-1234-5678",
      },
      purposes: [
        "지금 봐야 할 핵심 지표 파악",
        "지표 변화 원인 분석",
        "실험/AB 테스트 인사이트",
        "SQL 없이 데이터 확인",
        "데이터 팀 없이 의사결정하기",
      ],
      jobRoles: ["PO/PM", "Founder/CEO", "Marketer/Growth", "Developer", "Data Analyst", "Sales", "CS", "Other"],
      analyticsTools: [
        "없음",
        "GA/Firebase",
        "Metabase/Looker",
        "직접 SQL",
        "기타",
      ],
      expectedFeatures: [
        "지표 자동 추천",
        "변화 원인 분석",
        "다음 액션 제안",
        "자연어 질문",
        "자동 리포트",
      ],
      submit: "Early Access 신청하기",
      submitting: "제출 중...",
      success: {
        title: "신청이 접수되었습니다",
        message: "곧 연락드리겠습니다. 감사합니다.",
        newApplication: "새로 신청하기",
      },
      errors: {
        companyName: "회사명을 입력해주세요.",
        contactName: "담당자 이름을 입력해주세요.",
        jobRole: "직책/직무를 선택해주세요.",
        serviceName: "서비스 이름을 입력해주세요.",
        dau: "서비스 DAU를 선택해주세요.",
        purposes: "사용 목적을 최소 1개 이상 선택해주세요.",
        painPoint: "답답한 점을 입력해주세요.",
        currentTool: "현재 사용 중인 분석 도구를 선택해주세요.",
        expectedFeature:
          "가장 기대하는 기능을 선택해주세요.",
        email: "이메일을 입력해주세요.",
        phoneNumber: "전화번호를 입력해주세요.",
      },
    },
    demo: {
      step0: {
        badge: "Private Preview",
        title: "Your Product's",
        titleHighlight: "Personal Data Analyst",
        description: "지표는 보이는데 '왜 변했는지', '다음엔 뭘 해야 하는지' 모를 때,\n전담 분석가처럼 데이터를 해석하고 액션을 제안합니다.",
        beforeTitle: "❌ Before",
        beforeItems: [
          { text: "리텐션이 떨어졌는데\n어떤 기능이 원인인지\n알 수 없어요" },
          { text: "GA4, DB, 시트 데이터가\n각각 다른 곳에 있어서\n종합 분석이 어려워요" },
          { text: "지표는 보이는데\n다음에 뭘 해야 할지\n모르겠어요" },
        ],
        startButton: "데모 체험하기",
        disclaimer: "⚠️ 이것은 Private Preview 데모입니다. 실제 데이터는 연결되지 않습니다.",
      },
      step1: {
        title: "데이터 연결하기",
        description: "Supabase 프로젝트를 연결해주세요 (데모용 목업)",
        connected: "연결 성공",
        serviceName: "서비스 이름",
        serviceNamePlaceholder: "예: 숏폼 동영상 플랫폼",
        funnel: "주요 퍼널 정의",
        funnelPlaceholder: "예: 방문 → 회원가입 → 온보딩 → 첫 영상 시청 → 활성화",
        conversion: "핵심 전환 이벤트",
        conversionPlaceholder: "예: video_watched, comment_posted, share_completed",
        nextButton: "다음 단계",
      },
      step2: {
        title: "데이터 분석 요청하기",
        description: "분석가에게 질문하듯 편하게 물어보세요",
        agentTitle: "Vibe Semantic Agent",
        agentSubtitle: "Your Personal Data Analyst",
        suggestionTitle: "💡 이런 질문을 해보세요:",
        questions: [
          "최근 리텐션이 떨어진 이유를 분석해줘",
          "전환율을 높이려면 어떤 액션을 취해야 할까?",
          "이번 주 주요 지표 변화를 요약해줘",
        ],
        analyzing: "데이터 수집을 시작합니다...",
        analyzing2: "📊 지난 30일간 데이터 분석 중...",
        analyzing3: "🔍 주요 이슈를 발견했습니다.",
        viewResults: "분석 결과 보기",
      },
      step3: {
        title: "분석 결과 및 액션 아이템",
        subtitle: "지난 30일간 데이터 분석 완료",
        keyIssues: "핵심 이슈",
        retentionTitle: "리텐션 추이",
        funnelTitle: "전환 퍼널",
        actionItems: "추천 액션 아이템",
        action1: {
          title: "1. 온보딩 프로세스 단순화",
          impact: "High Impact",
          description: "현재 5단계 온보딩을 3단계로 축소하고, 필수 입력 항목을 줄이세요. 예상 전환율 개선: +8%p",
          testPeriod: "A/B 테스트 기간: 2주",
          resources: "예상 리소스: 개발 3일",
        },
        action2: {
          title: "2. 리마인더 푸시 알림 추가",
          impact: "Medium Impact",
          description: "D3, D7 시점에 맞춤 콘텐츠 추천 푸시를 발송하세요. 예상 D7 리텐션 개선: +3%p",
          testPeriod: "A/B 테스트 기간: 2주",
          resources: "예상 리소스: 개발 1일 + 카피 작성",
        },
        action3: {
          title: "3. 첫 액션 가이드 툴팁 개선",
          impact: "Quick Win",
          description: "첫 영상 시청 유도를 위한 인터랙티브 가이드를 추가하세요. 예상 활성화율 개선: +5%p",
          testPeriod: "A/B 테스트 기간: 1주",
          resources: "예상 리소스: 개발 2일",
        },
        ctaTitle: "실제 서비스로 시작해보세요",
        ctaDescription: "이 데모는 목업 데이터입니다. 실제 데이터로 더 정확한 인사이트를 받아보세요.",
        ctaButton: "Early Access 신청하기",
      },
      step4: {
        title: "체험 완료!",
        description: "Vibe Semantic이 어떻게 작동하는지 확인하셨나요?",
        disclaimer: "⚠️ 이것은 Private Preview 데모입니다.\n실제 서비스는 1월 말 오픈 예정이며, 이 데모는 문제 검증 및 Early Access 안내 목적입니다.",
        companyName: "회사명",
        jobRole: "직무 (예: Founder, PM, Marketer)",
        dau: "서비스 DAU (대략적으로)",
        painPoint: "현재 데이터 분석에서 가장 답답한 점을 자유롭게 적어주세요",
        applyButton: "Early Access 신청하기",
        applyNote: "신청하시면 서비스 오픈 시 우선 안내드립니다.",
      },
    },
  },
  en: {
    // Header
    nav: {
      product: "Product",
      howItWorks: "How it works",
      security: "Security",
      faq: "FAQ",
      earlyAccess: "Early Access",
      language: "Language",
    },
    // Hero
    hero: {
      badge: "Private Preview · Jan 2026",
      title: "Vibe Semantic",
      subtitle: "Your Product's Data Analyst Agent",
      description:
        "Get insights and action recommendations without SQL. An AI-powered data analytics tool for Product managers, founders, and marketers. Ask questions in natural language about key metrics like DAU, retention, and conversion rates to gain actionable insights.",
      earlyAccessButton: "Apply for Early Access",
      howItWorksButton: "How it works",
      demoButton: "Try Demo",
    },
    // Problem
    problem: {
      title: "Do you face these challenges?",
      description:
        "Analyze product metrics and make data-driven decisions without a data analyst or SQL knowledge.",
      items: [
        {
          title: "Metrics without interpretation",
          description:
            "Numbers are just listed without context—you can't tell what's wrong or why things changed.",
        },
        {
          title: "SQL/query costs are too high",
          description:
            "You have to request help from the data team every time or write complex queries yourself.",
        },
        {
          title: "No data team or long wait times",
          description:
            "Small teams lack data analysis resources, or waiting times are too long.",
        },
      ],
    },
    // How it works
    howItWorks: {
      badge: "• Workflow Simplified",
      title: "Turn Data into Decisions in 3 Steps",
      description:
        "Stop wrestling with spreadsheets. Connect your sources, define your goals, and let our semantic engine surface the insights that actually move the needle.",
      demoButton: "Try Demo",
      steps: [
        {
          number: "01",
          title: "Connect Your Universe",
          description:
            "Integrate your data sources instantly. We support Supabase, Google Sheets, GA4, BigQuery, and more with zero-config setup.",
          dataSources: ["Supabase", "Google Sheets", "GA4", "BigQuery"],
          uiExample: {
            title: "Data Sources",
            addButton: "+ Add New",
            sources: [
              {
                name: "Production DB",
                type: "Supabase",
                status: "active",
                lastSync: "Last sync 2m ago",
              },
              {
                name: "Analytics Data",
                type: "GA4",
                status: "syncing",
                lastSync: "Syncing...",
              },
              {
                name: "Q3 Sales Sheet",
                type: "Google Sheets",
                status: "paused",
                lastSync: "Paused",
              },
            ],
          },
        },
        {
          number: "02",
          title: "Define Your Goals",
          description:
            "Tell Vibe Semantic what KPIs matter most using natural language. No complex query languages needed—just ask as if you were talking to a data analyst.",
          uiExample: {
            prompts: [
              "What insights are you looking for today?",
              "Analyzing revenue streams...",
            ],
            userMessage: "Show me the customer churn rate for Q3 broken down by region.",
            inputPlaceholder: "Ask follow up...",
          },
        },
        {
          number: "03",
          title: "AI-Driven Strategy",
          description:
            "Get actionable strategies, not just raw numbers. Our engine highlights anomalies and suggests optimized paths forward for your business.",
          uiExample: {
            title: "CHURN ANALYSIS",
            period: "Last 30 Days",
            metric: "4.2%",
            change: "+0.8%",
            recommendation:
              "High churn detected in the 'Enterprise' segment. Consider launching a re-engagement campaign offering extended support.",
            buttonText: "Generate Campaign",
          },
        },
      ],
    },
    // Pricing
    pricing: {
      title: "Pricing",
      description: "Choose your plan",
      plans: {
        basic: {
          title: "Basic",
          badge: "Basic",
          heading: "Launch notification",
          price: "Free",
          features: [
            { text: "Get notified on launch", included: true },
            { text: "Early Access priority invite", included: false },
          ],
          buttonText: "Leave email",
        },
        popular: {
          title: "Popular",
          badge: "Popular",
          heading: "Early Access priority invite",
          price: "$0",
          features: [
            { text: "Priority invite on launch", included: true },
            { text: "50 natural language queries", included: true },
            { text: "Automatic root cause analysis", included: true },
            { text: "Next action recommendations", included: true },
            { text: "Basic report generation", included: true },
          ],
          buttonText: "Early Access",
        },
        premium: {
          title: "Recommended",
          badge: "Recommended",
          heading: "Lifetime Premium",
          price: "Lifetime $49",
          originalPrice: "Annual $199",
          discountBanner: "75% off - Limited to 100 applications",
          features: [
            { text: "Use immediately on launch", included: true },
            { text: "All premium features free for life", included: true },
            { text: "Up to 200 natural language queries per day", included: true },
            { text: "Advanced analytics (trend prediction)", included: true },
            { text: "Custom reports & sharing", included: true },
            { text: "Priority support & feedback integration", included: true },
            { text: "Founding member badge", included: true },
          ],
          buttonText: "Pay now",
        },
      },
      modal: {
        email: "Email",
        phoneNumber: "Phone number",
        contactName: "Contact name",
        companyName: "Company name",
        required: "*",
        cancel: "Cancel",
        submit: "Submit",
        submitting: "Submitting...",
        success: {
          title: "Application complete",
          message: "Your application has been submitted",
          premiumNote:
            "We will send separate payment instructions to the email you provided.",
          thankYou: "Thank you.",
        },
        premiumNote:
          "We will send separate payment instructions to the email you provided.",
        errors: {
          email: "Please enter your email.",
          phoneNumber: "Please enter your phone number.",
          contactName: "Please enter the contact name.",
          companyName: "Please enter the company name.",
        },
        placeholders: {
          email: "your@email.com",
          phoneNumber: "+Country Code-Numbers-Numbers",
          contactName: "Name",
          companyName: "Company Name",
        },
      },
    },
    // FAQ
    faq: {
      title: "FAQ",
      description: "Frequently asked questions",
      items: [
        {
          question: "Is it really possible without SQL?",
          answer:
            "Yes, absolutely. Vibe Semantic understands natural language questions and automatically generates queries. You can gain data insights without complex SQL knowledge. For example, you can analyze data by asking questions like 'Why did retention drop over the last 7 days?' in natural language.",
        },
        {
          question: "Do you store data?",
          answer:
            "No, Vibe Semantic does not store data. We connect in read-only mode and only process query results temporarily, keeping your original data intact. All data remains stored only in your database, and Vibe Semantic only provides analysis results.",
        },
        {
          question: "Does it work with both Supabase, GA4, and BigQuery?",
          answer:
            "Yes, we support both Supabase, GA4, and BigQuery. We safely access data through read-only connections, and plan to support more databases in the future. Currently, we support PostgreSQL-based databases and BigQuery.",
        },
        {
          question: "What's the launch schedule?",
          answer:
            "We're starting Private Preview in January 2026. We'll test and improve with a small number of service operators through Early Access applications. Official launch is scheduled for the first half of 2026.",
        },
        {
          question: "What are the pricing plans?",
          answer:
            "It will be free during the Private Preview period. Pricing policy after official launch will be announced later. Special pricing benefits will be provided to Early Access applicants.",
        },
        {
          question: "Can I use it without a data analyst?",
          answer:
            "Yes, exactly. Vibe Semantic is designed to be easy to use for Product managers, founders, marketers, and others without specialized data analysis knowledge. Just ask questions in natural language and get automatic analysis results and insights.",
        },
        {
          question: "What metrics can I analyze?",
          answer:
            "You can analyze various product metrics including DAU (Daily Active Users), retention, conversion rates, click-through rates (CTR), purchase conversion rates (CVR), and cart addition rates. When you enter your service's purpose and key metrics, we automatically track and analyze related metrics.",
        },
        {
          question: "How is security ensured?",
          answer:
            "Vibe Semantic only uses read-only connections and does not store data. You can also restrict access to specific schemas or views through allowlists, and enhance security through query limits and timeout settings.",
        },
      ],
    },
    // Security
    security: {
      title: "Security & Trust",
      description: "Data security is our top priority",
      items: [
        {
          title: "Read-only access",
          description:
            "We only connect to your database in read-only mode. Data modification or deletion is not possible.",
          badge: "🔒",
        },
        {
          title: "Allowlist",
          description:
            "Access is restricted to analytics schema/view only. We do not access sensitive data.",
          badge: "📋",
        },
        {
          title: "Query limit/timeout",
          description:
            "Query execution time and resource usage are limited to prevent database overload.",
          badge: "⏱️",
        },
        {
          title: "PII minimization guide",
          description:
            "Personally Identifiable Information (PII) is minimized, and anonymization guidance is provided when necessary.",
          badge: "🛡️",
        },
      ],
    },
    // Dashboard
    dashboard: {
      title: "Dashboard",
      subtitle: "E-commerce · Real-time Monitoring",
      live: "Live",
      recommendedActions: "Recommended Actions",
      actions: {
        conversion: "Increase Conversion Rate",
        retention: "Improve Retention",
        engagement: "Increase Engagement",
      },
      insights: {
        for: "Insights for",
        conversion: "As a result of data analysis over the past 7 days, the conversion rate has",
        retention: "As a result of data analysis over the past 7 days, retention has",
        engagement: "As a result of data analysis over the past 7 days, engagement has",
        increased: "increased due to the application of relevant features.",
      },
      chart: {
        daysAgo7: "7 days ago",
        daysAgo5: "5 days ago",
        daysAgo3: "3 days ago",
        today: "Today",
      },
    },
    // Success Case
    successCase: {
      title: "Success Cases",
      description: "Insights and actions verified with real data",
      clickHint: "Click a card to view detailed insights",
      cases: [
        {
          id: "ecommerce",
          industry: "E-commerce",
          metric: "CVR (Conversion Rate)",
          value: "2.8%",
          change: "+0.5%",
          period: "14 days",
          action: "Add to Cart button position optimization",
          result: "The conversion rate increased by +0.5%p within 14 days. This is a conversion rate improvement due to the 'Add to Cart button position optimization' feature applied during the same period.",
        },
        {
          id: "dau",
          industry: "Mobile App",
          metric: "DAU",
          value: "15.2K",
          change: "+10.3%",
          period: "7 days",
          action: "Push notification timing improvement",
          result: "DAU increased by +10.3% within 7 days. This is an increase in user engagement due to the 'Push notification timing improvement' feature applied during the same period.",
        },
        {
          id: "ctr",
          industry: "Content Platform",
          metric: "CTR",
          value: "4.2%",
          change: "+0.8%",
          period: "10 days",
          action: "Recommendation algorithm improvement",
          result: "CTR increased by +0.8%p within 10 days. This is an increase in click-through rate due to the 'Recommendation algorithm improvement' feature applied during the same period.",
        },
      ],
    },
    // Bento
    bento: {
      title: "Features",
      description:
        "All features to gain data insights without SQL. Analyze product metrics and make decisions even without a data analyst.",
    },
    // Footer
    footer: {
      company: "Company: Dropdown",
      messageUs: "Message us:",
      copyright: "All rights reserved.",
    },
    // Lead Capture Form
    leadCapture: {
      intro:
        "Vibe Semantic is a Private Preview built with a small number of service operators.",
      fields: {
        companyName: "Company name",
        contactName: "Contact name",
        jobRole: "Job role",
        serviceName: "Service name",
        dau: "Service DAU",
        purpose: "Purpose of use",
        painPoint: "Biggest pain point right now",
        currentTool: "Current analytics tool",
        expectedFeature: "Most expected feature in Early Access",
        email: "Email",
        phoneNumber: "Phone number",
      },
      placeholders: {
        select: "Please select",
        email: "your@email.com",
        phoneNumber: "+Country Code-Numbers-Numbers",
      },
      purposes: [
        "Identify key metrics to monitor now",
        "Analyze causes of metric changes",
        "Experiment/AB test insights",
        "Check data without SQL",
        "Make decisions without a data team",
      ],
      jobRoles: ["PO/PM", "Founder/CEO", "Marketer/Growth", "Developer", "Data Analyst", "Sales", "CS", "Other"],
      analyticsTools: [
        "None",
        "GA/Firebase",
        "Metabase/Looker",
        "Direct SQL",
        "Other",
      ],
      expectedFeatures: [
        "Automatic metric recommendations",
        "Root cause analysis",
        "Next action suggestions",
        "Natural language queries",
        "Automatic reports",
      ],
      submit: "Apply for Early Access",
      submitting: "Submitting...",
      success: {
        title: "Application received",
        message: "We'll contact you soon. Thank you.",
        newApplication: "New application",
      },
      errors: {
        companyName: "Please enter your company name.",
        contactName: "Please enter the contact name.",
        jobRole: "Please select a job role.",
        serviceName: "Please enter your service name.",
        dau: "Please select your service DAU.",
        purposes: "Please select at least one purpose.",
        painPoint: "Please enter your pain point.",
        currentTool: "Please select your current analytics tool.",
        expectedFeature: "Please select your most expected feature.",
        email: "Please enter your email.",
        phoneNumber: "Please enter your phone number.",
      },
    },
    demo: {
      step0: {
        badge: "Private Preview",
        title: "Your Product's",
        titleHighlight: "Personal Data Analyst",
        description: "When you see metrics but don't know 'why they changed' or 'what to do next',\nit interprets data and suggests actions like a dedicated analyst.",
        beforeTitle: "❌ Before",
        beforeItems: [
          { text: "Retention dropped but\ncan't identify which\nfeature caused it" },
          { text: "GA4, DB, Sheets data\nare scattered—hard to\nsynthesize insights" },
          { text: "Metrics are visible but\ndon't know what action\nto take next" },
        ],
        startButton: "Try Demo",
        disclaimer: "⚠️ This is a Private Preview demo. No real data is connected.",
      },
      step1: {
        title: "Connect Your Data",
        description: "Connect your Supabase project (mockup for demo)",
        connected: "Connected",
        serviceName: "Service Name",
        serviceNamePlaceholder: "e.g., Short-form Video Platform",
        funnel: "Main Funnel Definition",
        funnelPlaceholder: "e.g., Visit → Signup → Onboarding → First Video Watch → Activation",
        conversion: "Key Conversion Events",
        conversionPlaceholder: "e.g., video_watched, comment_posted, share_completed",
        nextButton: "Next Step",
      },
      step2: {
        title: "Request Data Analysis",
        description: "Ask questions naturally, as if talking to an analyst",
        agentTitle: "Vibe Semantic Agent",
        agentSubtitle: "Your Personal Data Analyst",
        suggestionTitle: "💡 Try asking:",
        questions: [
          "Analyze why retention has dropped recently",
          "What actions should I take to improve conversion rate?",
          "Summarize this week's key metric changes",
        ],
        analyzing: "Starting data collection...",
        analyzing2: "📊 Analyzing last 30 days of data...",
        analyzing3: "🔍 Found key issues.",
        viewResults: "View Analysis Results",
      },
      step3: {
        title: "Analysis Results & Action Items",
        subtitle: "Last 30 days data analysis completed",
        keyIssues: "Key Issues",
        retentionTitle: "Retention Trend",
        funnelTitle: "Conversion Funnel",
        actionItems: "Recommended Action Items",
        action1: {
          title: "1. Simplify Onboarding Process",
          impact: "High Impact",
          description: "Reduce current 5-step onboarding to 3 steps and minimize required inputs. Expected conversion improvement: +8%p",
          testPeriod: "A/B test period: 2 weeks",
          resources: "Expected resources: 3 days development",
        },
        action2: {
          title: "2. Add Reminder Push Notifications",
          impact: "Medium Impact",
          description: "Send personalized content recommendation pushes at D3 and D7. Expected D7 retention improvement: +3%p",
          testPeriod: "A/B test period: 2 weeks",
          resources: "Expected resources: 1 day development + copywriting",
        },
        action3: {
          title: "3. Improve First Action Guide Tooltip",
          impact: "Quick Win",
          description: "Add interactive guide to encourage first video watch. Expected activation improvement: +5%p",
          testPeriod: "A/B test period: 1 week",
          resources: "Expected resources: 2 days development",
        },
        ctaTitle: "Start with the Real Service",
        ctaDescription: "This demo uses mock data. Get more accurate insights with real data.",
        ctaButton: "Apply for Early Access",
      },
      step4: {
        title: "Demo Complete!",
        description: "Did you see how Vibe Semantic works?",
        disclaimer: "⚠️ This is a Private Preview demo.\nThe actual service will open at the end of January, and this demo is for problem validation and Early Access guidance.",
        companyName: "Company Name",
        jobRole: "Role (e.g., Founder, PM, Marketer)",
        dau: "Service DAU (approximately)",
        painPoint: "Please freely describe the most frustrating point in your current data analysis",
        applyButton: "Apply for Early Access",
        applyNote: "We'll notify you when the service opens.",
      },
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.ko;

