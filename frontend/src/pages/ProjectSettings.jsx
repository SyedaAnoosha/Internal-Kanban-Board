import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/context/AuthContext'
import { useProject } from '@/context/ProjectContext'
import { useToast } from '@/components/Toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
})

export default function ProjectSettings({ projectId, project }) {
  const { user } = useAuth()
  const { fetchProjects } = useProject()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const isOwner = !!user && !!project && String(user.id) === String(project.owner_id)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name || '',
      description: project.description || '',
    },
  })

  async function onSubmit(values) {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
      await fetchProjects()
      showToast('Project settings saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure? This action cannot be undone.')) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok || res.status === 204) {
        await fetchProjects()
        navigate('/dashboard')
      } else {
        throw new Error('Delete failed')
      }
    } catch (err) {
      showToast(err.message, 'error')
      setDeleting(false)
    }
  }

  if (!isOwner) {
    return (
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="p-4 bg-c-progress-bg border border-c-progress-text/20 rounded-lg text-c-progress-text text-sm flex items-center gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>Only the project owner can edit settings. You can view them below.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-3 uppercase tracking-wider">Project Name</label>
            <p className="mt-1 text-sm font-medium text-text-1">{project.name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-3 uppercase tracking-wider">Description</label>
            <p className="mt-1 text-sm text-text-2">{project.description || 'No description'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      {/* General Settings */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-text-1 mb-4">General Settings</h2>
        <div className="border border-border rounded-lg p-6 bg-surface">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-2 font-semibold">Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Website Redesign" className="bg-bg-base" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-2 font-semibold">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a short description..." 
                        className="bg-bg-base min-h-[100px] resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-error mb-4">Danger Zone</h2>
        <div className="border border-error/30 rounded-lg p-6 bg-error-bg/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-1">Delete Project</h3>
              <p className="text-xs text-text-3 mt-1 max-w-md">
                Once you delete a project, there is no going back. All tasks, history, and member associations will be permanently removed.
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleting}
              className="shrink-0"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}