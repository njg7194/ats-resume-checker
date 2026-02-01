'use client'

import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AnalysisResult {
  score: number
  summary: string
  strengths: string[]
  improvements: string[]
  keywords: {
    found: string[]
    missing: string[]
  }
  formatting: {
    score: number
    issues: string[]
  }
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setError('')
      } else {
        setError('PDF 파일만 업로드 가능합니다')
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const handlePayment = async () => {
    if (!file) {
      setError('이력서를 먼저 업로드해주세요')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const { sessionId } = await response.json()
      const stripe = await stripePromise
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) setError(error.message || '결제 오류가 발생했습니다')
      }
    } catch (err) {
      setError('결제 처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('이력서를 먼저 업로드해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('jobDescription', jobDescription)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('분석 중 오류가 발생했습니다')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('분석 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // Check for successful payment on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('success') === 'true') {
        setIsPaid(true)
      }
    }
  })

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎯 ATS Resume Checker
          </h1>
          <p className="text-xl text-gray-300">
            AI가 당신의 이력서를 ATS 시스템 관점에서 분석합니다
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full">
            <span className="text-2xl">💰</span>
            <span className="font-semibold">단 $5로 합격률 UP!</span>
          </div>
        </div>

        {!result ? (
          <div className="glass rounded-2xl p-8 space-y-8">
            {/* File Upload */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${dragActive 
                  ? 'border-emerald-400 bg-emerald-400/10' 
                  : 'border-gray-600 hover:border-gray-500'
                }
                ${file ? 'border-emerald-400' : ''}
              `}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <div className="text-6xl mb-4">{file ? '✅' : '📄'}</div>
                <p className="text-xl text-white mb-2">
                  {file ? file.name : '이력서 PDF를 드래그하거나 클릭하세요'}
                </p>
                <p className="text-gray-400 text-sm">
                  PDF 파일만 지원됩니다
                </p>
              </label>
            </div>

            {/* Job Description (Optional) */}
            <div>
              <label className="block text-white font-medium mb-2">
                채용공고 (선택사항)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="지원하려는 채용공고의 내용을 붙여넣으면 더 정확한 분석이 가능합니다..."
                className="w-full h-32 bg-white/5 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 focus:border-emerald-400 focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={isPaid ? handleAnalyze : handlePayment}
              disabled={loading || !file}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all
                ${loading || !file 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 animate-pulse-glow'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  처리 중...
                </span>
              ) : isPaid ? (
                '🔍 AI 분석 시작'
              ) : (
                '💳 $5 결제하고 분석받기'
              )}
            </button>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-gray-700">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-white font-semibold mb-1">ATS 점수</h3>
                <p className="text-gray-400 text-sm">통과 가능성을 숫자로</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">💡</div>
                <h3 className="text-white font-semibold mb-1">개선 피드백</h3>
                <p className="text-gray-400 text-sm">구체적인 수정 방향</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🔑</div>
                <h3 className="text-white font-semibold mb-1">키워드 최적화</h3>
                <p className="text-gray-400 text-sm">누락된 핵심 키워드</p>
              </div>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            {/* Score Card */}
            <div className="glass rounded-2xl p-8 text-center">
              <div className="relative w-40 h-40 mx-auto mb-6">
                <div 
                  className="w-full h-full rounded-full score-ring flex items-center justify-center"
                  style={{ '--score': `${result.score}%` } as React.CSSProperties}
                >
                  <div className="w-32 h-32 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">{result.score}</span>
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">ATS 통과 점수</h2>
              <p className="text-gray-300">{result.summary}</p>
            </div>

            {/* Strengths */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                ✅ 강점
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-400">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                🔧 개선 필요
              </h3>
              <ul className="space-y-2">
                {result.improvements.map((s, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-amber-400">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Keywords */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                🔑 키워드 분석
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2">발견된 키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.found.map((k, i) => (
                      <span key={i} className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">추가 권장 키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.missing.map((k, i) => (
                      <span key={i} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                        + {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Formatting */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                📝 포맷팅 점수: {result.formatting.score}/100
              </h3>
              <ul className="space-y-2">
                {result.formatting.issues.map((s, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Retry Button */}
            <button
              onClick={() => {
                setResult(null)
                setFile(null)
                setIsPaid(false)
              }}
              className="w-full py-4 rounded-xl font-bold text-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              🔄 다른 이력서 분석하기
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>© 2024 ATS Resume Checker. 취준생 파이팅! 💪</p>
        </div>
      </div>
    </main>
  )
}
