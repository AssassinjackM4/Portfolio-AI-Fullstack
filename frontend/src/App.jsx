import { useRef, useState } from 'react'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  ArrowUp,
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Sparkles,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import './App.css'

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '')
const API_CONFIGURATION_ERROR =
  'Backend URL is not configured. Set VITE_API_URL to your Render backend URL in Vercel, then redeploy.'

const suggestedQuestions = [
  'Tell me about the candidate\'s strongest technical skills.',
  'What experience does the candidate have in backend development?',
  'Summarize the candidate\'s education and projects.',
  'What are the candidate\'s top achievements in their career?',
]

const focusAreas = [
  { label: 'AI Interviewing', value: 'Resume + Chat' },
  { label: 'Core Stack', value: 'React + FastAPI' },
  { label: 'Hiring Focus', value: 'Skills & Experience' },
]

const starterMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hi! Upload a resume PDF and ask any hiring or skills question. I can explain experience, projects, skills, and fit for a role.',
  },
]

function App() {
  const fileInputRef = useRef(null)
  const [messages, setMessages] = useState(starterMessages)
  const [question, setQuestion] = useState('')
  const [resumeName, setResumeName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const handleResumeUpload = async (file) => {
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF resume file.')
      return
    }

    if (!API_URL) {
      setError(API_CONFIGURATION_ERROR)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setIsUploading(true)
      setError('')
      const { data } = await axios.post(`${API_URL}/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const nextName = data.filename || file.name
      setResumeName(nextName)
      setMessages((current) => [
        ...current,
        {
          id: `upload-${Date.now()}`,
          role: 'assistant',
          content: `Resume uploaded successfully: **${nextName}**. You can now ask questions about the profile.`,
        },
      ])
    } catch (uploadError) {
      setError(uploadError?.response?.data?.detail || 'Unable to upload the resume right now.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) return
    if (!API_URL) {
      setError(API_CONFIGURATION_ERROR)
      return
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedQuestion,
    }

    const loadingMessage = {
      id: `typing-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    }

    setMessages((current) => [...current, userMessage, loadingMessage])
    setQuestion('')
    setIsSending(true)
    setError('')

    try {
      const payload = {
        question: trimmedQuestion,
        ...(resumeName ? { resume_file: resumeName } : {}),
      }

      const { data } = await axios.post(`${API_URL}/chat`, payload)
      const answer = data.answer || 'I could not generate an answer for that question.'

      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id ? { ...message, content: answer, isLoading: false } : message,
        ),
      )
    } catch (chatError) {
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                ...message,
                content:
                  'I hit a connection issue while contacting the AI backend. Please try again in a moment.',
                isLoading: false,
              }
            : message,
        ),
      )
      setError(chatError?.response?.data?.detail || chatError.message || 'Unable to get a response.')
    } finally {
      setIsSending(false)
    }
  }

  const onFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      handleResumeUpload(selectedFile)
    }
    event.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-panel flex flex-col gap-4 rounded-[28px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-glow">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/80">Portfolio AI</p>
              <h1 className="text-xl font-semibold text-white">HireMe AI Recruiter</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="secondary-btn"
            >
              <UploadCloud className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Resume'}
            </button>

            <div className="status-pill">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {resumeName ? 'Resume ready' : 'Default profile'}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="glass-panel rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Profile</p>
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-lg font-semibold text-white">Candidate Resume</p>
                  <p className="text-sm text-slate-400">{resumeName || 'Using default backend resume'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="metric-card">
                <p className="text-slate-400">AI model</p>
                <p className="mt-1 text-base font-semibold text-white">Grok / Groq GPT OSS</p>
              </div>

              <div className="metric-card">
                <p className="text-slate-400">Mode</p>
                <p className="mt-1 text-base font-semibold text-white">HR Interview Assistant</p>
              </div>

              <div className="metric-card">
                <p className="text-slate-400">Use case</p>
                <p className="mt-1 text-base font-semibold text-white">Career screening</p>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              {focusAreas.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                  <div className="mt-1 text-sm font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Suggested prompts</p>

              <div className="mt-3 space-y-2">
                {suggestedQuestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="prompt-chip"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="glass-panel flex min-h-[720px] flex-col rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
                  <Bot className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-slate-400">AI recruiter</p>
                  <p className="font-semibold text-white">Portfolio Insight Agent</p>
                </div>
              </div>

              <div className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                Live
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300">Brand</div>
                <div className="mt-2 text-lg font-semibold text-white">AI Portfolio</div>
              </div>

              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Workflow</div>
                <div className="mt-2 text-lg font-semibold text-white">Upload → Ask → Hire</div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">Status</div>
                <div className="mt-2 text-lg font-semibold text-white">Production Ready</div>
              </div>
            </div>

            <div className="chat-scroll mt-4 flex-1 space-y-4 pr-1">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        message.role === 'user'
                          ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                          : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      }`}
                    >
                      {message.role === 'user' ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-7 ${
                        message.role === 'user'
                          ? 'border-violet-500/20 bg-violet-500/10 text-violet-50'
                          : 'border-white/10 bg-slate-900/70 text-slate-100'
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2 text-cyan-200">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Thinking...
                        </div>
                      ) : (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div
                className={`flex flex-col gap-3 sm:flex-row sm:items-end ${isDragging ? 'ring-2 ring-cyan-400/60' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  const file = event.dataTransfer.files?.[0]
                  if (file) handleResumeUpload(file)
                }}
              >
                <div className="flex-1">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-slate-400">
                    Ask about the candidate
                  </label>

                  <textarea
                    rows={3}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder={
                      resumeName
                        ? 'Ask a focused question about the uploaded resume...'
                        : 'Ask about the resume, skills, education, or experience...'
                    }
                    className="input-area"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="secondary-btn"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Resume PDF
                  </button>

                  <button type="submit" disabled={isSending} className="primary-btn">
                    {isSending ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                className="hidden"
              />

              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {resumeName ? `Loaded: ${resumeName}` : 'No resume uploaded yet — default resume will be used if present.'}
                </span>
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                  Secure AI chat
                </span>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
