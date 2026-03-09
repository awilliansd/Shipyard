import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdateProject, type Project } from '@/hooks/useProjects'

interface ProjectSettingsProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSettings({ project, open, onOpenChange }: ProjectSettingsProps) {
  const [name, setName] = useState(project.name)
  const updateProject = useUpdateProject()

  const handleSave = () => {
    updateProject.mutate(
      { id: project.id, name },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Path</label>
            <p className="text-sm mt-1">{project.path}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateProject.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
