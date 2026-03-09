import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Star, FolderOpen, RefreshCw, Settings, ListTodo, Loader, Inbox, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjects, useRefreshProjects } from '@/hooks/useProjects'
import { useAllTasks } from '@/hooks/useTasks'
import { useTabs } from '@/hooks/useTabs'

export function Sidebar() {
  const location = useLocation()
  const { data: projects } = useProjects()
  const { data: tasks } = useAllTasks()
  const refreshProjects = useRefreshProjects()
  const { openTab } = useTabs()
  const [search, setSearch] = useState('')

  const favorites = projects?.filter(p => p.favorite) || []
  const filtered = search
    ? projects?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || []
    : []

  const inboxCount = tasks?.filter(t => t.status === 'backlog' || t.status === 'todo').length || 0
  const inProgressCount = tasks?.filter(t => t.status === 'in_progress').length || 0

  // Projects with in-progress tasks
  const activeProjects = projects?.filter(p =>
    tasks?.some(t => t.projectId === p.id && t.status === 'in_progress')
  ) || []

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-4 border-b">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          DevDash
        </Link>
      </div>

      <div className="p-3">
        <div className="flex gap-1">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => refreshProjects.mutate()}
            disabled={refreshProjects.isPending}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshProjects.isPending && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            location.pathname === '/'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          All Projects
        </Link>

        {/* Tasks link */}
        <Link
          to="/tasks"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            location.pathname === '/tasks'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50'
          )}
        >
          <ClipboardList className="h-4 w-4" />
          All Tasks
          {(inboxCount > 0 || inProgressCount > 0) && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium ml-auto">
              {inboxCount + inProgressCount}
            </span>
          )}
        </Link>

        {/* Task counters */}
        {(inboxCount > 0 || inProgressCount > 0) && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tasks
            </div>
            {inboxCount > 0 && (
              <Link
                to="/tasks"
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  location.pathname === '/tasks'
                    ? 'text-blue-500'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Inbox className="h-3.5 w-3.5 text-blue-500" />
                <span className="flex-1">Inbox</span>
                <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full font-medium">
                  {inboxCount}
                </span>
              </Link>
            )}
            {inProgressCount > 0 && (
              <Link
                to="/tasks"
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                  location.pathname === '/tasks'
                    ? 'text-yellow-500'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Loader className="h-3.5 w-3.5 text-yellow-500" />
                <span className="flex-1">In Progress</span>
                <span className="text-xs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded-full font-medium">
                  {inProgressCount}
                </span>
              </Link>
            )}
          </>
        )}

        {/* Active projects (with in-progress tasks) */}
        {activeProjects.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active
            </div>
            {activeProjects.map(p => (
              <button
                key={p.id}
                onClick={() => openTab(p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors w-full text-left',
                  location.pathname === `/project/${p.id}`
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Loader className="h-3.5 w-3.5 text-yellow-500" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Favorites
            </div>
            {favorites.map(p => (
              <button
                key={p.id}
                onClick={() => openTab(p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors w-full text-left',
                  location.pathname === `/project/${p.id}`
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </>
        )}

        {/* Search results */}
        {search && filtered.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Search Results
            </div>
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => openTab(p.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors w-full text-left',
                  location.pathname === `/project/${p.id}`
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{projects?.length || 0} projects</span>
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Link>
      </div>
    </aside>
  )
}
