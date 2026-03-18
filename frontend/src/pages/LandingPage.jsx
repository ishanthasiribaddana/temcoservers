import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Server, Code, Zap, Shield, ChevronRight, Monitor, Cpu, Globe, Building2, Landmark, Check, Workflow } from 'lucide-react'

function LandingPage() {
  const [lkrRate, setLkrRate] = useState(null)

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success' && data.rates?.LKR) {
          // Add ~2% markup to approximate bank selling rate
          setLkrRate(Math.round(data.rates.LKR * 1.02))
        }
      })
      .catch(() => {})
  }, [])

  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      price: '$4',
      period: '/month',
      description: 'Perfect for beginners',
      features: [
        'Cloud VPS Instance',
        '4 vCPUs / 8 GB RAM / 75 GB NVMe',
        'Pre-installed Dev Tools',
        'SSH & Web Terminal Access',
        'Community Support',
      ],
      highlight: false,
    },
    {
      name: 'AI Basic',
      slug: 'ai-basic',
      price: '$8',
      period: '/month',
      description: 'AI-powered coding assistant',
      features: [
        'Everything in Starter',
        '4 vCPUs / 8 GB RAM / 75 GB NVMe',
        'AI Code Generator (500 req/mo)',
        'Code Explanation & Debugging',
        'Email Support',
      ],
      highlight: true,
    },
    {
      name: 'AI Pro',
      slug: 'ai-pro',
      price: '$15',
      period: '/month',
      description: 'For serious developers',
      features: [
        'Everything in AI Basic',
        '6 vCPUs / 16 GB RAM / 200 GB NVMe',
        'AI Code Generator (2000 req/mo)',
        'Jupyter Notebooks',
        'Database Tools & Priority Support',
      ],
      highlight: false,
    },
    {
      name: 'AI Unlimited',
      slug: 'ai-unlimited',
      price: '$25',
      period: '/month',
      description: 'Full power, no limits',
      features: [
        'Everything in AI Pro',
        '6 vCPUs / 16 GB RAM / 200 GB NVMe',
        'Unlimited AI Requests',
        'GPU Access',
        'All Tools & Dedicated Support',
      ],
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-end gap-0.5">
            <img src="/images/temco-logo-sm.png" alt="Temco" className="h-9 w-auto" />
            <span className="text-xl font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-primary-500 transition">Features</a>
            <a href="#pricing" className="hover:text-primary-500 transition">Pricing</a>
            <a href="#ai" className="hover:text-primary-500 transition">AI Tools</a>
            <Link to="/workflows" className="hover:text-accent-500 transition font-medium">Workflows</Link>
            <a href="#partners" className="hover:text-primary-500 transition">Partners</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-gray-600 hover:text-primary-500 transition">
              Log In
            </Link>
            <Link to="/login" className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-primary-100 via-primary-50 to-gray-100 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-temco-500/15 border border-temco-500/30 rounded-full text-temco-700 text-sm mb-6 font-medium">
            <Zap className="w-4 h-4 text-temco-600" />
            AI-Powered Cloud Hosting for Students
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-gray-900">
            Code Smarter with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-accent-500 to-temco-600"> 5.5 GEN AI-Integrated </span>
            Cloud Servers
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            Get your own VPS with pre-installed development tools and an AI coding assistant.
            Built for students, starting at just <span className="text-primary-500 font-semibold">$4/month</span>.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/login" className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition flex items-center gap-2 shadow-lg shadow-primary-500/25">
              Start Free Trial <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="#pricing" className="px-6 py-3 border border-gray-300 hover:border-primary-400 text-gray-700 hover:text-primary-500 rounded-lg font-medium transition">
              View Pricing
            </a>
          </div>

          {/* Partner badges under hero */}
          <div className="flex items-center justify-center gap-6 mt-12 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-500" />
              Partnered with <span className="text-primary-600 font-medium">JRIRC</span>
            </span>
            <span className="w-px h-4 bg-gray-300" />
            <span className="flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-accent-500" />
              Partnered with <span className="text-accent-600 font-medium">TEMCO Bank</span>
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">
            Everything You Need to Learn & Build
          </h2>
          <div className="w-16 h-1 bg-temco-500 mx-auto rounded-full mb-12" />
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Monitor, title: 'Web Terminal', desc: 'Access your server directly from the browser. No SSH client needed.', gradient: 'from-primary-500 to-primary-600', iconBg: 'bg-primary-500', hoverBorder: 'hover:border-primary-300' },
              { icon: Code, title: 'AI Code Assistant', desc: 'Generate, explain, and debug code with DeepSeek & OpenAI models.', gradient: 'from-temco-500 to-temco-600', iconBg: 'bg-temco-500', hoverBorder: 'hover:border-temco-300' },
              { icon: Cpu, title: 'Dev Tools Pre-installed', desc: 'Node.js, Python, Java, PHP, MySQL — ready to go from day one.', gradient: 'from-accent-500 to-accent-600', iconBg: 'bg-accent-500', hoverBorder: 'hover:border-accent-300' },
              { icon: Shield, title: 'Isolated Environment', desc: 'Your own VPS. Full root access. Break things without worry.', gradient: 'from-accent-400 to-primary-500', iconBg: 'bg-primary-500', hoverBorder: 'hover:border-primary-300' },
              { icon: Globe, title: 'Global Data Centers', desc: 'Servers in EU, US, Asia — choose the region closest to you.', gradient: 'from-primary-400 to-temco-500', iconBg: 'bg-temco-500', hoverBorder: 'hover:border-temco-300' },
              { icon: Zap, title: 'Instant Provisioning', desc: 'Server ready in under 2 minutes. Start coding immediately.', gradient: 'from-temco-400 to-accent-500', iconBg: 'bg-accent-500', hoverBorder: 'hover:border-accent-300' },
              { icon: Workflow, title: 'AI Workflow Automation', desc: 'Automate tasks across 400+ apps with a visual builder. Powered by n8n.', gradient: 'from-accent-500 to-temco-500', iconBg: 'bg-temco-500', hoverBorder: 'hover:border-temco-300', link: '/workflows' },
            ].map((feature, i) => {
              const card = (
                <div key={i} className={`rounded-xl overflow-hidden border border-gray-200 ${feature.hoverBorder} hover:shadow-lg transition group shadow-sm bg-white ${feature.link ? 'cursor-pointer' : ''}`}>
                  <div className={`h-1.5 bg-gradient-to-r ${feature.gradient}`} />
                  <div className="p-6">
                    <div className={`w-11 h-11 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                    {feature.link && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-600 font-semibold mt-3">Learn more <ChevronRight className="w-3 h-3" /></span>
                    )}
                  </div>
                </div>
              )
              return feature.link ? <Link key={i} to={feature.link}>{card}</Link> : card
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">Simple, Student-Friendly Pricing</h2>
          <div className="w-16 h-1 bg-temco-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12">Start small, scale up when you need more power.</p>
          <div className="grid md:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const gradients = [
                'from-primary-400 to-primary-600',
                'from-primary-500 via-accent-500 to-temco-500',
                'from-accent-400 to-accent-600',
                'from-temco-500 via-accent-400 to-primary-500',
              ]
              return (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden border transition ${
                    plan.highlight
                      ? 'border-primary-300 ring-2 ring-primary-100 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm'
                  } bg-white`}
                >
                  <div className={`h-2 bg-gradient-to-r ${gradients[i]}`} />
                  <div className="p-6">
                    {plan.highlight && (
                      <div className="inline-block text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-accent-500 px-2.5 py-0.5 rounded-full uppercase tracking-wide mb-3">Most Popular</div>
                    )}
                    <h3 className="text-xl font-bold mb-1 text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                    <div className="mb-6">
                      <span className={`text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradients[i]}`}>{plan.price}</span>
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                      {lkrRate && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-primary-500 to-accent-500 rounded-full px-3 py-1 shadow-sm">
                            🇱🇰 LKR {(parseInt(plan.price.replace('$', '')) * lkrRate).toLocaleString()}
                            <span className="font-normal text-white/70 text-xs">{plan.period}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={`/payment?plan=${plan.slug}`}
                      className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                        plan.highlight
                          ? 'bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white shadow-md'
                          : 'bg-gray-100 hover:bg-gradient-to-r hover:from-primary-500 hover:to-primary-600 hover:text-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Price Comparison Section */}
      <section id="compare" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">How We Compare</h2>
          <div className="w-16 h-1 bg-temco-500 mx-auto rounded-full mb-4" />
          <p className="text-gray-500 text-center mb-12">AI-integrated cloud hosting at a fraction of the cost</p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Provider</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Cloud VPS</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">AI Assistant</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Dev Tools</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Student Plan</th>
                  <th className="text-right py-4 px-5 font-semibold text-gray-700">Price/mo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'TemcoServers', sub: 'AI Basic Plan', price: '$8', vps: true, ai: true, dev: true, student: true, highlight: true, save: null },
                  { name: 'GitHub Copilot', sub: '+ DigitalOcean Droplet', price: '$22', vps: true, ai: true, dev: false, student: false, highlight: false, save: '64%' },
                  { name: 'AWS', sub: 'CodeWhisperer + EC2', price: '$25', vps: true, ai: true, dev: false, student: false, highlight: false, save: '68%' },
                  { name: 'Google Cloud', sub: 'Gemini + Compute Engine', price: '$40', vps: true, ai: true, dev: false, student: false, highlight: false, save: '80%' },
                  { name: 'Azure', sub: 'Copilot + VM B1s', price: '$30', vps: true, ai: true, dev: false, student: false, highlight: false, save: '73%' },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${
                      row.highlight
                        ? 'bg-gradient-to-r from-primary-50 to-accent-50'
                        : i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className={`font-bold ${row.highlight ? 'text-primary-600' : 'text-gray-800'}`}>
                          {row.name}
                        </div>
                        {row.highlight && (
                          <span className="text-[10px] font-bold text-white bg-accent-500 rounded-full px-2 py-0.5 uppercase">You</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{row.sub}</div>
                    </td>
                    {[row.vps, row.ai, row.dev, row.student].map((val, j) => (
                      <td key={j} className="text-center py-4 px-4">
                        {val ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400 text-xs font-bold">✕</span>
                        )}
                      </td>
                    ))}
                    <td className="text-right py-4 px-5">
                      <div className={`font-bold text-base ${row.highlight ? 'text-primary-600' : 'text-gray-800'}`}>
                        {row.price}
                      </div>
                      {row.save && (
                        <div className="text-[10px] font-semibold text-green-600 bg-green-50 rounded-full px-2 py-0.5 inline-block mt-1">
                          Save {row.save}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            * Prices based on publicly available pricing as of 2026. Competitor prices include VPS + AI tool subscription combined.
          </p>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Our Partners</h2>
          <div className="w-16 h-1 bg-temco-500 mx-auto rounded-full mb-12" />
          <div className="grid md:grid-cols-2 gap-8">
            {/* JRIRC */}
            <div className="rounded-xl overflow-hidden border border-primary-100 hover:border-primary-300 hover:shadow-lg transition shadow-sm bg-white">
              <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />
              <div className="p-8">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-2 overflow-hidden">
                <img src="/images/java-institute-logo.png" alt="Java Institute" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold text-primary-600 mb-2">JRIRC</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="text-gray-700 font-medium">Java Robotics and Intelligence Systems Research Center</span>
                — Driving innovation in AI, robotics, and intelligent computing systems for next-generation technology solutions.
              </p>
              </div>
            </div>
            {/* TEMCO Bank */}
            <div className="rounded-xl overflow-hidden border border-accent-100 hover:border-accent-300 hover:shadow-lg transition shadow-sm bg-white">
              <div className="h-1.5 bg-gradient-to-r from-accent-400 via-accent-500 to-temco-500" />
              <div className="p-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img src="/images/temco-logo.png" alt="TEMCO Bank" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-bold text-accent-600 mb-2">TEMCO Bank</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="text-gray-700 font-medium">Technology Entrepreneurship and Management Cooperative Development Banking Society Ltd</span>
                — Empowering student entrepreneurs with cooperative banking and financial solutions.
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6">
            <div className="flex items-end gap-0.5 mb-4 md:mb-0">
              <img src="/images/temco-logo-sm.png" alt="Temco" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#features" className="hover:text-primary-500 transition">Features</a>
              <a href="#pricing" className="hover:text-primary-500 transition">Pricing</a>
              <Link to="/workflows" className="hover:text-accent-500 transition">Workflows</Link>
              <a href="#partners" className="hover:text-primary-500 transition">Partners</a>
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

export default LandingPage
