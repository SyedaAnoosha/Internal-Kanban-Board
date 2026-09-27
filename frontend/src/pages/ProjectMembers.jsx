import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/Toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Trash2, Loader2, UserPlus } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function ProjectMembers({ projectId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [invitingId, setInvitingId] = useState(null)
  const { showToast } = useToast()
  const debounceRef = useRef(null)

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/projects/${projectId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setMembers(await res.json())
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Debounced server-side search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/projects/${projectId}/search-users?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) setSearchResults(await res.json())
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery, projectId])

  async function handleInvite(email) {
    setInvitingId(email)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        showToast('Invitation sent')
        setSearchQuery('')
        setSearchResults([])
        await fetchMembers()
      } else {
        const err = await res.json()
        showToast(err.detail || 'Failed to invite', 'error')
      }
    } catch {
      showToast('Failed to send invitation', 'error')
    } finally {
      setInvitingId(null)
    }
  }

  async function handleRemove(memberId) {
    if (!confirm('Remove this member from the project?')) return
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok || res.status === 204) {
        showToast('Member removed')
        await fetchMembers()
      } else {
        showToast('Failed to remove member', 'error')
      }
    } catch {
      showToast('Failed to remove member', 'error')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      {/* Invite Section */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-text-1 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-text-3" /> Invite Members
        </h2>
        <div className="relative">
          {/* shouldFilter={false} is crucial: it stops cmdk from hiding items client-side 
              so our server-side debounced search results are always visible */}
          <Command shouldFilter={false} className="rounded-lg border border-border shadow-sm bg-surface">
            <CommandInput 
              placeholder="Search by email or name..." 
              onValueChange={setSearchQuery}
              className="h-10"
            />
            <CommandList>
              {searching && <div className="p-4 text-sm text-text-3 text-center flex items-center justify-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</div>}
              {!searching && searchQuery && searchResults.length === 0 && (
                <CommandEmpty>No users found.</CommandEmpty>
              )}
              {!searching && searchResults.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {searchResults.map(u => (
                    <CommandItem 
                      key={u.id} 
                      value={u.email}
                      onSelect={() => handleInvite(u.email)}
                      disabled={invitingId === u.email}
                      className="flex items-center justify-between aria-selected:bg-bg-subtle"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                            {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-text-1">{u.full_name || 'Unnamed'}</span>
                          <span className="text-xs text-text-3 font-mono">{u.email}</span>
                        </div>
                      </div>
                      {invitingId === u.email ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-3" />
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:text-primary-hover font-semibold">
                          Invite
                        </Button>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      </section>

      {/* Members List */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-text-1 mb-4">
          Team Members <span className="text-text-3 font-normal text-sm ml-2 font-mono">({members.length})</span>
        </h2>
        {loading ? (
          <div className="text-center py-8 text-text-3">Loading members...</div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-surface">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 hover:bg-bg-subtle/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-text-1 flex items-center gap-2">
                      {member.user?.full_name || 'Unnamed'}
                      {member.role === 'owner' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-text bg-primary-muted px-1.5 py-0.5 rounded">Owner</span>
                      )}
                      {member.status === 'pending' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-c-progress-text bg-c-progress-bg px-1.5 py-0.5 rounded">Pending</span>
                      )}
                    </p>
                    <p className="text-xs text-text-3 font-mono">{member.user?.email}</p>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-text-3 hover:text-error hover:bg-error-bg"
                    onClick={() => handleRemove(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}