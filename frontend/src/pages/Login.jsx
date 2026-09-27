import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Rocket, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg-base">
      {/* ── Left Panel: Brand & Geometric Background ── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar-bg relative overflow-hidden">
        {/* Subtle Gradient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
        {/* Geometric Dot Pattern */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Rocket className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-text-hover tracking-tight">ERM Workspace</span>
        </div>
        
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-sidebar-text-hover leading-tight">
            Organize work.<br />Deliver results.
          </h1>
          <p className="text-base text-sidebar-text max-w-sm leading-relaxed">
            A clean, focused kanban board that helps your team stay aligned and ship faster.
          </p>
        </div>
        
        <div className="relative z-10 text-xs text-sidebar-text-muted">
          © 2026 ERM Workspace. All rights reserved.
        </div>
      </div>

      {/* ── Right Panel: Form ── */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-text-1 tracking-tight">ERM Workspace</span>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-xs">Sign in to your workspace to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-xs font-medium text-error-text bg-error-bg border border-error/20 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-text-2">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@company.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="bg-bg-base"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-text-2">Password</Label>
                    <a href="#" className="text-[11px] font-medium text-primary hover:underline">Forgot?</a>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      className="bg-bg-base pr-10"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              <p className="text-xs text-text-3 text-center mt-6">
                Don't have an account?{' '}
                <Link to="/signup" className="font-semibold text-primary hover:underline">Create one</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}