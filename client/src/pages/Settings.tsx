import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderBrowser } from '@/components/ui/folder-browser'
import { Search, Plus, FolderOpen, Check, Loader2, GitBranch, X, FolderSearch } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProjects } from '@/hooks/useProjects'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface ScannedProject {
  path: string
  name: string
  techStack: string[]
  isGitRepo: boolean
}

export function Settings() {
  const queryClient = useQueryClient()
  const { data: projects } = useProjects()

  const [scanBrowserOpen, setScanBrowserOpen] = useState(false)
  const [addBrowserOpen, setAddBrowserOpen] = useState(false)
  const [scannedProjects, setScannedProjects] = useState<ScannedProject[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [scannedDir, setScannedDir] = useState('')

  const existingPaths = new Set(projects?.map(p => p.path) || [])

  const scanMutation = useMutation({
    mutationFn: (directory: string) => api.scanDirectory(directory),
    onSuccess: (data, directory) => {
      setScannedProjects(data.projects)
      setSelectedPaths(new Set())
      setScannedDir(directory)
      if (data.projects.length === 0) {
        toast.info('No projects found in this directory')
      }
    },
    onError: (err) => toast.error(`Scan failed: ${err.message}`),
  })

  const addMutation = useMutation({
    mutationFn: (paths: string[]) => api.addProjects(paths),
    onSuccess: (data) => {
      queryClient.setQueryData(['projects'], data.projects)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setScannedProjects([])
      setSelectedPaths(new Set())
      setScannedDir('')
      toast.success('Projects added!')
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  })

  const removeMutation = useMutation({
    mutationFn: (path: string) => api.removeProject(path),
    onSuccess: (data) => {
      queryClient.setQueryData(['projects'], data.projects)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project removed')
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  })

  const handleScanFolder = (path: string) => {
    scanMutation.mutate(path)
  }

  const handleAddFolders = (paths: string[]) => {
    addMutation.mutate(paths)
  }

  const toggleSelect = (path: string) => {
    const next = new Set(selectedPaths)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    setSelectedPaths(next)
  }

  const selectAll = () => {
    const available = scannedProjects.filter(p => !existingPaths.has(p.path))
    setSelectedPaths(new Set(available.map(p => p.path)))
  }

  const handleAddSelected = () => {
    if (selectedPaths.size === 0) return
    addMutation.mutate(Array.from(selectedPaths))
  }

  return (
    <>
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <div className="space-y-6">
          {/* Add Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Projects</CardTitle>
              <CardDescription>
                Scan a folder to discover projects inside it, or add a specific project folder directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setScanBrowserOpen(true)}
                  className="gap-2 flex-1"
                  variant="outline"
                >
                  <FolderSearch className="h-4 w-4" />
                  Scan folder for projects
                </Button>
                <Button
                  onClick={() => setAddBrowserOpen(true)}
                  className="gap-2 flex-1"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Add single project folder
                </Button>
              </div>

              {scanMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </div>
              )}

              {scannedProjects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Found {scannedProjects.length} projects in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{scannedDir}</code>
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                        Select all new
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleAddSelected}
                        disabled={selectedPaths.size === 0 || addMutation.isPending}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add {selectedPaths.size > 0 ? `(${selectedPaths.size})` : ''}
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {scannedProjects.map(p => {
                      const alreadyAdded = existingPaths.has(p.path)
                      const isSelected = selectedPaths.has(p.path)

                      return (
                        <button
                          key={p.path}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            alreadyAdded
                              ? 'opacity-50 cursor-default'
                              : isSelected
                                ? 'bg-primary/10'
                                : 'hover:bg-accent/50 cursor-pointer'
                          }`}
                          onClick={() => !alreadyAdded && toggleSelect(p.path)}
                          disabled={alreadyAdded}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            alreadyAdded
                              ? 'bg-muted border-muted-foreground/30'
                              : isSelected
                                ? 'bg-primary border-primary'
                                : 'border-input'
                          }`}>
                            {(alreadyAdded || isSelected) && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{p.name}</span>
                              {p.isGitRepo && <GitBranch className="h-3 w-3 text-muted-foreground" />}
                              {alreadyAdded && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">already added</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{p.path}</p>
                          </div>

                          {p.techStack.length > 0 && (
                            <div className="flex gap-1 shrink-0">
                              {p.techStack.slice(0, 3).map(t => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Projects ({projects?.length || 0})</CardTitle>
              <CardDescription>
                Projects in your dashboard. Remove any you no longer need.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.name}</span>
                        <p className="text-[11px] text-muted-foreground truncate">{p.path}</p>
                      </div>
                      {p.techStack.length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {p.techStack.slice(0, 3).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeMutation.mutate(p.path)}
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No projects yet. Use the buttons above to add some.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FolderBrowser
        open={scanBrowserOpen}
        onOpenChange={setScanBrowserOpen}
        onSelect={handleScanFolder}
        title="Select folder to scan for projects"
      />

      <FolderBrowser
        open={addBrowserOpen}
        onOpenChange={setAddBrowserOpen}
        onSelectMultiple={handleAddFolders}
        multiSelect
        title="Select project folders to add"
      />
    </>
  )
}
