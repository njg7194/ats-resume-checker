import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('resume') as File
    const jobDescription = formData.get('jobDescription') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read PDF content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Dynamic import for pdf-parse (CommonJS module)
    const pdf = (await import('pdf-parse')).default
    const pdfData = await pdf(buffer)
    const resumeText = pdfData.text

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze resumes and provide detailed feedback in JSON format.

Your response must be valid JSON with this exact structure:
{
  "score": <number 0-100>,
  "summary": "<brief summary in Korean>",
  "strengths": ["<strength 1 in Korean>", "<strength 2>", ...],
  "improvements": ["<improvement 1 in Korean>", "<improvement 2>", ...],
  "keywords": {
    "found": ["<keyword 1>", "<keyword 2>", ...],
    "missing": ["<missing keyword 1>", "<missing keyword 2>", ...]
  },
  "formatting": {
    "score": <number 0-100>,
    "issues": ["<formatting issue 1 in Korean>", "<formatting issue 2>", ...]
  }
}

Analyze based on:
1. Keyword optimization for ATS systems
2. Proper formatting (avoid tables, images, headers/footers)
3. Clear section headings
4. Quantifiable achievements
5. Action verbs
6. Industry-specific terminology
7. Contact information presence
8. Consistent date formatting
9. Appropriate length
10. No spelling/grammar errors`

    const userPrompt = `Analyze this resume for ATS compatibility:

RESUME:
${resumeText}

${jobDescription ? `JOB DESCRIPTION:
${jobDescription}` : ''}

Provide a comprehensive ATS analysis in JSON format. All feedback should be in Korean.`

    const genAI = getGemini()
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    })

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ])

    const response = result.response
    const text = response.text()
    const analysisResult = JSON.parse(text)

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze resume' },
      { status: 500 }
    )
  }
}
