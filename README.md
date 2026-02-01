# 🎯 ATS Resume Checker

AI 기반 이력서 ATS 통과 점수 분석 서비스

## 기능

- 📄 PDF 이력서 업로드
- 🤖 GPT-4o AI가 ATS 관점에서 분석
- 📊 통과 점수 (0-100)
- ✅ 강점 분석
- 🔧 개선점 피드백
- 🔑 키워드 최적화 제안
- 📝 포맷팅 점수

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI GPT-4o
- Stripe (결제)

## 환경 변수

```env
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 배포 (Vercel)

1. GitHub에 푸시
2. Vercel에 연결
3. 환경 변수 설정
4. 자동 배포!

## 로컬 개발

```bash
npm install
npm run dev
```

## 라이선스

MIT

---

취준생 파이팅! 💪
