import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mail, Shield, LogOut, Bell, Calendar } from 'lucide-react'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-1">Settings</h1>
        <p className="text-sm text-text-3 mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information and account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-text-1">{user?.email?.split('@')[0] || 'User'}</h3>
              <p className="text-sm text-text-3">{user?.email}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-bg-subtle/50 rounded-lg border border-border">
              <Mail className="h-4 w-4 text-text-3" />
              <div>
                <p className="text-xs font-medium text-text-3">Email Address</p>
                <p className="text-sm font-semibold text-text-1">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-subtle/50 rounded-lg border border-border">
              <Shield className="h-4 w-4 text-text-3" />
              <div>
                <p className="text-xs font-medium text-text-3">Account Type</p>
                <p className="text-sm font-semibold text-text-1">Standard User</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Configure how you receive notifications and updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceToggle 
            icon={Mail}
            label="Email Notifications" 
            description="Receive email updates for task assignments and mentions." 
            defaultChecked={true} 
          />
          <PreferenceToggle 
            icon={Bell}
            label="In-App Notifications" 
            description="Show real-time notifications within the application." 
            defaultChecked={true} 
          />
          <PreferenceToggle 
            icon={Calendar}
            label="Weekly Summary" 
            description="Receive a weekly digest of your team's progress." 
            defaultChecked={false} 
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-error/20 bg-error-bg/30">
        <CardHeader>
          <CardTitle className="text-error">Account Actions</CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-text-1">Sign Out</h4>
              <p className="text-xs text-text-3 mt-0.5">Sign out of your account on this device.</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

// ── Sub-component for Toggles ──
function PreferenceToggle({ icon: Icon, label, description, defaultChecked }) {
  return (
    <div className="flex items-center justify-between p-4 bg-bg-subtle/30 border border-border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <Label htmlFor={label} className="text-sm font-semibold text-text-1 cursor-pointer">{label}</Label>
          <p className="text-xs text-text-3 mt-0.5">{description}</p>
        </div>
      </div>
      <Switch id={label} defaultChecked={defaultChecked} />
    </div>
  )
}