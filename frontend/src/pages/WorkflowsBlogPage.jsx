import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Zap, Mail, MessageSquare, FileText, BarChart3, Globe, Database,
  Bot, Brain, Sparkles, CheckCircle2, ArrowRight, Workflow, Shield, Clock,
  Users, Code, Layers, Search, Bell, CalendarDays, ShoppingCart, Share2,
  ChevronRight, Play, Star, User
} from 'lucide-react'

function WorkflowsBlogPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try { setUser(JSON.parse(userData)) } catch (e) { /* ignore */ }
    }
  }, [])

  const integrations = [
    { name: 'Gmail', category: 'Email', icon: Mail },
    { name: 'Slack', category: 'Messaging', icon: MessageSquare },
    { name: 'Google Sheets', category: 'Productivity', icon: FileText },
    { name: 'OpenAI / ChatGPT', category: 'AI', icon: Brain },
    { name: 'Telegram', category: 'Messaging', icon: MessageSquare },
    { name: 'WhatsApp', category: 'Messaging', icon: MessageSquare },
    { name: 'Notion', category: 'Productivity', icon: FileText },
    { name: 'GitHub', category: 'Dev Tools', icon: Code },
    { name: 'Salesforce', category: 'CRM', icon: Users },
    { name: 'Google Drive', category: 'Storage', icon: Database },
    { name: 'MySQL / PostgreSQL', category: 'Database', icon: Database },
    { name: 'Shopify', category: 'E-Commerce', icon: ShoppingCart },
    { name: 'X / Twitter', category: 'Social', icon: Share2 },
    { name: 'Discord', category: 'Messaging', icon: MessageSquare },
    { name: 'HubSpot', category: 'CRM', icon: Users },
    { name: 'Google Calendar', category: 'Productivity', icon: CalendarDays },
  ]

  const useCases = [
    {
      icon: Mail,
      title: 'Smart Email Management',
      description: 'AI reads your incoming emails, classifies them as complaints, questions, or compliments, and automatically routes them to the right team. Negative feedback triggers an instant Slack alert.',
      tags: ['Gmail', 'OpenAI', 'Slack'],
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      icon: FileText,
      title: 'Automated Content Generation',
      description: 'Give it a topic — get back a full blog post draft. AI generates an outline, writes each section, and saves the finished draft to your Google Docs. Hours of writing done in minutes.',
      tags: ['OpenAI', 'Google Docs', 'Notion'],
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      icon: BarChart3,
      title: 'Customer Feedback Analysis',
      description: 'Every time a new row is added to your feedback sheet, AI extracts sentiment, key topics, and a summary. Negative reviews instantly alert your support team on Slack.',
      tags: ['Google Sheets', 'Gemini', 'Slack'],
      gradient: 'from-temco-500 to-temco-600',
    },
    {
      icon: Globe,
      title: 'AI-Powered Web Scraping',
      description: 'Automatically monitor competitor websites daily. AI extracts company names, technologies mentioned, and creates structured summaries — stored in your database for easy searching.',
      tags: ['HTTP', 'OpenAI', 'Airtable'],
      gradient: 'from-primary-400 to-accent-500',
    },
    {
      icon: ShoppingCart,
      title: 'E-Commerce Automation',
      description: 'New order on Shopify? Automatically send a personalized thank-you email, update your inventory spreadsheet, notify your warehouse on Slack, and create an invoice.',
      tags: ['Shopify', 'Gmail', 'Slack', 'Sheets'],
      gradient: 'from-accent-400 to-temco-500',
    },
    {
      icon: Users,
      title: 'CRM Lead Scoring',
      description: 'When a new lead arrives in Salesforce, AI analyzes their company, job title, and interaction history to assign a quality score and route hot leads directly to your sales team.',
      tags: ['Salesforce', 'OpenAI', 'Slack'],
      gradient: 'from-temco-400 to-primary-500',
    },
    {
      icon: Bell,
      title: 'Social Media Monitoring',
      description: 'Track mentions of your brand on Twitter/X. AI analyzes sentiment in real-time, alerts you to negative mentions, and even drafts suggested responses for your approval.',
      tags: ['Twitter/X', 'OpenAI', 'Telegram'],
      gradient: 'from-primary-500 to-temco-500',
    },
    {
      icon: Database,
      title: 'Database Sync & Backup',
      description: 'Keep your MySQL database, Google Sheets, and Notion pages in perfect sync. Changes in one automatically propagate to all others. Set up automated daily backups to Google Drive.',
      tags: ['MySQL', 'Sheets', 'Notion', 'Drive'],
      gradient: 'from-accent-500 to-primary-500',
    },
    {
      icon: CalendarDays,
      title: 'Meeting Notes & Follow-ups',
      description: 'After every Google Calendar meeting, AI generates structured meeting notes, extracts action items, assigns them to team members on Notion, and sends a summary via email.',
      tags: ['Calendar', 'OpenAI', 'Notion', 'Gmail'],
      gradient: 'from-temco-500 to-accent-500',
    },
  ]

  const aiCapabilities = [
    {
      icon: Brain,
      title: 'Connect Any AI Model',
      description: 'Use OpenAI GPT-4, Google Gemini, Claude, Mistral, LLaMA, or any LLM with an API. Switch models per workflow step — use the best AI for each task.',
    },
    {
      icon: Search,
      title: 'RAG — Ask Questions About Your Data',
      description: 'Upload your PDFs, documents, or databases. AI searches through your private data to answer questions accurately — like having a personal research assistant who has read everything you own.',
    },
    {
      icon: Bot,
      title: 'Autonomous AI Agents',
      description: 'Create AI agents that can reason, make decisions, and use tools independently. Ask it to "plan a marketing campaign" — it researches competitors, drafts copy, and schedules posts.',
    },
    {
      icon: Layers,
      title: 'Long-Term Memory',
      description: 'Your AI remembers previous conversations and context. It learns your preferences, recalls past decisions, and gets smarter the more you use it.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-end gap-0.5">
            <img src="/images/temco-logo-sm.png" alt="Temco" className="h-9 w-auto" />
            <span className="text-xl font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <Link to="/" className="hover:text-primary-500 transition">Home</Link>
            <a href="#capabilities" className="hover:text-primary-500 transition">What It Can Do</a>
            <a href="#use-cases" className="hover:text-primary-500 transition">Use Cases</a>
            <a href="#integrations" className="hover:text-primary-500 transition">Integrations</a>
            <a href="#pricing" className="hover:text-primary-500 transition">Add to Plan</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === 'Super Admin' || user.role === 'System Admin' ? '/admin' : '/dashboard'}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition"
              >
                <User className="w-4 h-4" />
                {user.firstName || user.username}
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-primary-500 transition">Log In</Link>
                <Link to="/billing" className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-accent-100 via-accent-50 to-gray-100 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-500/15 border border-accent-500/30 rounded-full text-accent-700 text-sm mb-6 font-medium">
            <Workflow className="w-4 h-4 text-accent-600" />
            New Add-on for AI Pro & AI Unlimited Plans
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-gray-900">
            Automate Everything with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-500 via-temco-500 to-primary-600"> AI 5.5 Gen Workflow </span>
            Automation
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-4">
            Connect 400+ apps. Build powerful automations visually. Let AI handle your repetitive work.
            <span className="text-accent-600 font-semibold"> No configuration needed</span> — it's pre-installed and ready on your server.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Powered by n8n — the open-source workflow automation platform trusted by 50,000+ companies worldwide.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/billing" className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-semibold transition flex items-center gap-2 shadow-lg shadow-accent-500/25">
              Add to My Plan <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="#use-cases" className="px-6 py-3 border border-gray-300 hover:border-accent-400 text-gray-700 hover:text-accent-600 rounded-lg font-medium transition flex items-center gap-2">
              <Play className="w-4 h-4" /> See What's Possible
            </a>
          </div>
        </div>
      </section>

      {/* Zero Config Banner */}
      <section className="py-12 px-6 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-accent-50 to-primary-50 border border-accent-200 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-accent-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Zero Configuration. Just Use It.</h3>
              <p className="text-gray-600">
                Unlike other platforms where you spend hours setting up servers and installing software,
                TemcoServers gives you a <span className="font-semibold text-accent-600">fully configured, ready-to-use</span> workflow automation engine.
                Subscribe, click "Open Workflows", and start automating. That's it.
              </p>
            </div>
            <div className="flex items-center gap-2 text-accent-600 text-sm font-semibold flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" /> Pre-installed
              <CheckCircle2 className="w-5 h-5 ml-3" /> Pre-configured
              <CheckCircle2 className="w-5 h-5 ml-3" /> Managed
            </div>
          </div>
        </div>
      </section>

      {/* How It's Different */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Why This Is Different</h2>
          <div className="w-16 h-1 bg-accent-500 mx-auto rounded-full mb-12" />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Your Data, Your Server', desc: 'Unlike Zapier or Make, your workflows run on YOUR dedicated server. Your data never passes through third-party clouds. Complete privacy.' },
              { icon: Clock, title: 'No Limits on Executions', desc: 'Zapier charges per task. Make charges per operation. With TemcoServers, your workflows run on your own server — no per-execution fees.' },
              { icon: Zap, title: 'AI Built Right In', desc: 'Connect OpenAI, Gemini, Claude, or any AI model directly in your workflows. No separate subscriptions needed for the automation engine.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-accent-300 hover:shadow-md transition">
                <div className="w-11 h-11 bg-accent-500 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Capabilities */}
      <section id="capabilities" className="py-20 px-6 bg-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">AI Superpowers for Your Workflows</h2>
          <div className="w-16 h-1 bg-temco-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            Go beyond simple if-this-then-that. Your workflow engine understands language, reasons about data, and makes intelligent decisions.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {aiCapabilities.map((cap, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 hover:border-temco-300 hover:shadow-lg transition p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-temco-500 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <cap.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">{cap.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">What You Can Automate Today</h2>
          <div className="w-16 h-1 bg-primary-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            These are real workflows you can build in minutes using the visual drag-and-drop editor. No coding required.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((uc, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-200 hover:border-primary-300 hover:shadow-lg transition bg-white group">
                <div className={`h-1.5 bg-gradient-to-r ${uc.gradient}`} />
                <div className="p-6">
                  <div className={`w-11 h-11 bg-gradient-to-r ${uc.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <uc.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{uc.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{uc.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {uc.tags.map((tag, j) => (
                      <span key={j} className="text-[11px] font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Grid */}
      <section id="integrations" className="py-20 px-6 bg-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">400+ App Integrations</h2>
          <div className="w-16 h-1 bg-accent-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12">Connect to the tools your team already uses. Here are just a few.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {integrations.map((app, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 hover:border-accent-300 hover:shadow-md transition p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <app.icon className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{app.name}</div>
                  <div className="text-[11px] text-gray-400">{app.category}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            ...and 380+ more including Jira, GitLab, Outlook, Teams, LinkedIn, Instagram, Stripe, Twilio, AWS, and more.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">How It Works</h2>
          <div className="w-16 h-1 bg-primary-500 mx-auto rounded-full mb-12" />
          <div className="space-y-8">
            {[
              { step: '1', title: 'Subscribe to AI Pro or AI Unlimited', desc: 'Add the Workflow Automation add-on when selecting your plan. It takes one click.', color: 'bg-primary-500' },
              { step: '2', title: 'Open Your Workflow Dashboard', desc: 'Click "Workflows" in your TemcoServers Dashboard. Your automation engine opens instantly — fully configured, no setup required.', color: 'bg-accent-500' },
              { step: '3', title: 'Build Visually, No Code Needed', desc: 'Drag and drop apps, connect them with lines, set triggers. The visual editor makes complex automations simple.', color: 'bg-temco-500' },
              { step: '4', title: 'Let AI Do the Heavy Lifting', desc: 'Add AI steps to your workflows. Classify emails, generate content, analyze data, make decisions — all powered by your choice of AI model.', color: 'bg-primary-600' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-5">
                <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg`}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-b from-gray-100 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">Add Workflow Automation to Your Plan</h2>
          <div className="w-16 h-1 bg-accent-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 mb-12">Available as an add-on for AI Pro and AI Unlimited plans.</p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* AI Pro + Workflows */}
            <div className="rounded-xl overflow-hidden border border-gray-200 hover:border-accent-300 hover:shadow-lg transition bg-white">
              <div className="h-2 bg-gradient-to-r from-accent-400 to-accent-600" />
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">AI Pro</h3>
                <p className="text-sm text-gray-500 mb-4">+ Workflow Automation</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-accent-600">$20</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <div className="text-xs text-gray-400 mb-4">$15 base + $5 add-on</div>
                <ul className="space-y-2 mb-6 text-sm text-left">
                  {[
                    '6 vCPUs / 16 GB RAM / 200 GB NVMe',
                    'AI Code Generator (2,000 req/mo)',
                    '1,000 workflow executions/mo',
                    '400+ app integrations',
                    'Visual workflow builder',
                    'AI nodes (OpenAI, Gemini, etc.)',
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/billing" className="block text-center py-2.5 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gradient-to-r hover:from-accent-500 hover:to-accent-600 hover:text-white text-gray-700 border border-gray-200 transition">
                  Get AI Pro + Workflows
                </Link>
              </div>
            </div>

            {/* AI Unlimited + Workflows */}
            <div className="rounded-xl overflow-hidden border-2 border-temco-300 ring-2 ring-temco-100 shadow-lg bg-white relative">
              <div className="h-2 bg-gradient-to-r from-temco-500 via-accent-500 to-primary-500" />
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-temco-500 to-accent-500 px-2.5 py-1 rounded-full">
                  <Star className="w-3 h-3" /> Best Value
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">AI Unlimited</h3>
                <p className="text-sm text-gray-500 mb-4">+ Workflow Automation</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-temco-500 to-accent-500">$33</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <div className="text-xs text-gray-400 mb-4">$25 base + $8 add-on</div>
                <ul className="space-y-2 mb-6 text-sm text-left">
                  {[
                    '6 vCPUs / 16 GB RAM / 200 GB NVMe',
                    'Unlimited AI Requests',
                    'Unlimited workflow executions',
                    '400+ app integrations',
                    'Visual workflow builder',
                    'AI nodes (OpenAI, Gemini, etc.)',
                    'GPU Access & Dedicated Support',
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-temco-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/billing" className="block text-center py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-temco-500 to-accent-500 hover:from-temco-600 hover:to-accent-600 text-white shadow-md transition">
                  Get AI Unlimited + Workflows
                </Link>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-8">
            Workflow Automation is available for AI Pro ($5/mo add-on, 1,000 executions) and AI Unlimited ($8/mo add-on, unlimited executions).
            Starter and AI Basic plans can upgrade anytime.
          </p>
        </div>
      </section>

      {/* Comparison with competitors */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">How We Compare</h2>
          <div className="w-16 h-1 bg-primary-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12">Why TemcoServers Workflows beats the big names</p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-accent-600">TemcoServers</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Zapier</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Make.com</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Genspark</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Monthly Price', ts: '$5-8', zap: '$20+', make: '$9+', gen: '$20+' },
                  { feature: 'Execution Limits', ts: '1K-Unlimited', zap: '750 tasks', make: '1K ops', gen: 'Unknown' },
                  { feature: 'Dedicated Server', ts: true, zap: false, make: false, gen: true },
                  { feature: 'Data Privacy', ts: 'Your server', zap: 'Their cloud', make: 'Their cloud', gen: 'Their cloud' },
                  { feature: 'AI Integration', ts: true, zap: 'Extra $', make: 'Extra $', gen: true },
                  { feature: 'Visual Builder', ts: true, zap: true, make: true, gen: false },
                  { feature: '400+ Integrations', ts: true, zap: true, make: true, gen: '~20' },
                  { feature: 'Cloud VPS Included', ts: true, zap: false, make: false, gen: true },
                  { feature: 'Zero Configuration', ts: true, zap: false, make: false, gen: true },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="py-3 px-5 font-medium text-gray-700">{row.feature}</td>
                    {[row.ts, row.zap, row.make, row.gen].map((val, j) => (
                      <td key={j} className={`text-center py-3 px-4 ${j === 0 ? 'font-semibold text-accent-600' : 'text-gray-600'}`}>
                        {val === true ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </span>
                        ) : val === false ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400 text-xs font-bold">✕</span>
                        ) : (
                          <span>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-accent-500 via-temco-500 to-primary-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Doing It Manually</h2>
          <p className="text-gray-200 text-lg mb-8 max-w-xl mx-auto">
            Every hour you spend on repetitive tasks is an hour you're not building your business.
            Let AI workflows do the busywork.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/billing" className="px-8 py-3 bg-white text-accent-600 hover:bg-gray-100 rounded-lg font-bold transition shadow-lg flex items-center gap-2">
              Add Workflows to My Plan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="px-6 py-3 border border-white/30 hover:border-white/60 text-white rounded-lg font-medium transition">
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <Link to="/" className="flex items-end gap-0.5 mb-4 md:mb-0">
              <img src="/images/temco-logo-sm.png" alt="Temco" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/" className="hover:text-primary-500 transition">Home</Link>
              <a href="#use-cases" className="hover:text-primary-500 transition">Use Cases</a>
              <a href="#pricing" className="hover:text-primary-500 transition">Pricing</a>
              <Link to="/login" className="hover:text-primary-500 transition">Log In</Link>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400">
            <span>TemcoServers &copy; {new Date().getFullYear()} — All rights reserved.</span>
            <span className="mt-2 md:mt-0">
              Powered by <span className="text-primary-500">Java Institute of Advanced Technology</span> &bull; JRIRC &bull; TEMCO Bank
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default WorkflowsBlogPage
