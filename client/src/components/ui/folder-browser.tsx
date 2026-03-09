import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Folder, ChevronRight, ArrowUp, Loader2, HardDrive, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface FolderBrowserSingleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  multiSelect?: false
  title?: string
}

interface FolderBrowserMultiProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectMultiple: (paths: string[]) => void
  multiSelect: true
  title?: string
}

type FolderBrowserProps = FolderBrowserSingleProps | FolderBrowserMultiProps

const DRIVES = ['C:\\', 'D:\\', 'E:\\']

export function FolderBrowser(props: FolderBrowserProps) {
  const { open, onOpenChange, title = 'Select Folder', multiSelect } = props

  const [currentPath, setCurrentPath] = useState('C:\\')
  const [directories, setDirectories] = useState<{ name: string; path: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pathInput, setPathInput] = useState('C:\\')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const loadDir = async (path: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.browse(path)
      setDirectories(data.directories)
      setCurrentPath(path)
      setPathInput(path)
    } catch (err: any) {
      setError(err.message)
      setDirectories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSelected(new Set())
      loadDir(currentPath)
    }
  }, [open])

  const goUp = () => {
    const parent = currentPath.replace(/\\[^\\]+\\?$/, '\\')
    if (parent !== currentPath && parent.length >= 3) {
      loadDir(parent)
    }
  }

  const handlePathSubmit = () => {
    const trimmed = pathInput.trim()
    if (trimmed) loadDir(trimmed)
  }

  const toggleSelected = (path: string) => {
    const next = new Set(selected)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    setSelected(next)
  }

  const removeSelected = (path: string) => {
    const next = new Set(selected)
    next.delete(path)
    setSelected(next)
  }

  const handleConfirm = () => {
    if (multiSelect) {
      const paths = Array.from(selected)
      if (paths.length > 0) {
        (props as FolderBrowserMultiProps).onSelectMultiple(paths)
      }
    } else {
      (props as FolderBrowserSingleProps).onSelect(currentPath)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Path bar */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goUp} title="Go up">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Input
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePathSubmit()}
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Quick drives */}
          <div className="flex gap-1">
            {DRIVES.map(d => (
              <Button
                key={d}
                variant={currentPath.startsWith(d) ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => loadDir(d)}
              >
                <HardDrive className="h-3 w-3" />
                {d.replace('\\', '')}
              </Button>
            ))}
          </div>

          {/* Directory listing */}
          <div className="border rounded-lg h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-sm text-destructive px-4 text-center">
                {error}
              </div>
            ) : directories.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No subfolders
              </div>
            ) : (
              directories.map(dir => {
                const isChecked = selected.has(dir.path)

                return (
                  <div
                    key={dir.path}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-sm"
                  >
                    {multiSelect && (
                      <button
                        onClick={() => toggleSelected(dir.path)}
                        className={cn(
                          'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                          isChecked ? 'bg-primary border-primary' : 'border-input'
                        )}
                      >
                        {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                    )}
                    <button
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                      onDoubleClick={() => loadDir(dir.path)}
                      onClick={() => {
                        if (!multiSelect) {
                          setCurrentPath(dir.path)
                          setPathInput(dir.path)
                        }
                      }}
                    >
                      <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{dir.name}</span>
                    </button>
                    <button
                      onClick={() => loadDir(dir.path)}
                      className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                      title="Open folder"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Selected items (multi) or current path (single) */}
          {multiSelect ? (
            selected.size > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Selected ({selected.size}):</span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {Array.from(selected).map(p => {
                    const name = p.split('\\').filter(Boolean).pop() || p
                    return (
                      <Badge key={p} variant="secondary" className="gap-1 text-xs pr-1">
                        {name}
                        <button onClick={() => removeSelected(p)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Click checkboxes to select folders. Double-click to navigate into.</p>
            )
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-mono">{currentPath}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={multiSelect && selected.size === 0}
          >
            {multiSelect
              ? `Add ${selected.size} folder${selected.size !== 1 ? 's' : ''}`
              : 'Select this folder'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
