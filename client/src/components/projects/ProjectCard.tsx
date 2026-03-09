import { GitBranch, Star, Terminal, Code2, Play, Monitor, Clock, AlertCircle, FolderOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLaunchTerminal, useLaunchVSCode, useOpenFolder, useUpdateProject, type Project } from '@/hooks/useProjects'
import { useTabs } from '@/hooks/useTabs'
import { toast } from 'sonner'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { openTab } = useTabs()
  const launchTerminal = useLaunchTerminal()
  const launchVSCode = useLaunchVSCode()
  const openFolder = useOpenFolder()
  const updateProject = useUpdateProject()

  const handleLaunch = (e: React.MouseEvent, type: string) => {
    e.stopPropagation()
    launchTerminal.mutate(
      { projectId: project.id, type },
      { onSuccess: () => toast.success(`Launched ${type}`) }
    )
  }

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateProject.mutate({ id: project.id, favorite: !project.favorite })
  }

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={() => openTab(project.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
              <button onClick={toggleFavorite} className="shrink-0">
                <Star className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  project.favorite
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-muted-foreground/30 hover:text-yellow-500'
                )} />
              </button>
            </div>
            {project.category !== 'root' && (
              <span className="text-xs text-muted-foreground">{project.category}/</span>
            )}
          </div>
          {project.gitDirty && (
            <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
          )}
        </div>

        {project.isGitRepo && project.gitBranch && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span className="truncate">{project.gitBranch}</span>
          </div>
        )}

        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.techStack.slice(0, 4).map(tech => (
              <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tech}
              </Badge>
            ))}
            {project.techStack.length > 4 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{project.techStack.length - 4}
              </Badge>
            )}
          </div>
        )}

        {project.lastCommitDate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(project.lastCommitDate), { addSuffix: true })}</span>
          </div>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => handleLaunch(e, 'claude')} title="Claude Code">
            <Terminal className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => handleLaunch(e, 'dev')} title="Dev Server">
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => handleLaunch(e, 'shell')} title="Shell">
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              launchVSCode.mutate(project.id, { onSuccess: () => toast.success('Opened VS Code') })
            }}
            title="VS Code"
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={e => {
              e.stopPropagation()
              openFolder.mutate(project.id, { onSuccess: () => toast.success('Opened folder') })
            }}
            title="Open Folder"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
