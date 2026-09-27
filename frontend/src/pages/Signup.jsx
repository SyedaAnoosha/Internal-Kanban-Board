import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Rocket, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Fixed: Destructure 'signup' instead of 'login'
  const { signup } = useAuth() 
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    // Added: Client-side validation before hitting the API
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      // Fixed: Call 'signup' and pass the fullName
      await signup(email, password, fullName)
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
            Start organizing<br />in minutes.
          </h1>
          <p className="text-base text-sidebar-text max-w-sm leading-relaxed">
            Join teams who use ERM Kanban to stay focused, collaborate better, and deliver work that matters.
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

          {/* Fixed: Removed the stray comment that was breaking the JSX */}
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold tracking-tight">Create your account</CardTitle>
              <CardDescription className="text-xs">Get started with your free workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 text-xs font-medium text-error-text bg-error-bg border border-error/20 rounded-md">{error}</div>}
                
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs font-semibold text-text-2">Full name</Label>
                  <Input id="full_name" placeholder="Jane Doe" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-bg-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-text-2">Work email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" required value={email} onChange={e => setEmail(e.target.value)} className="bg-bg-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold text-text-2">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" required value={password} onChange={e => setPassword(e.target.value)} className="bg-bg-base pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-xs font-semibold text-text-2">Confirm password</Label>
                  <Input id="confirm_password" type={showPassword ? 'text' : 'password'} placeholder="Re-enter your password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-bg-base" />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
              <p className="text-xs text-text-3 text-center mt-6">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}