import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface Tab {
  id: string   // projectId
  path: string // /project/:id
}

interface TabsContextType {
  tabs: Tab[]
  activeTabId: string | null
  openTab: (projectId: string) => void
  closeTab: (id: string) => void
  switchTab: (id: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const location = useLocation()
  const navigate = useNavigate()

  const activeTabId = useMemo(() => {
    const match = location.pathname.match(/^\/project\/(.+)$/)
    return match ? match[1] : null
  }, [location.pathname])

  // Auto-add tab when navigating to a project URL directly
  useEffect(() => {
    if (activeTabId && !tabs.some(t => t.id === activeTabId)) {
      setTabs(prev => [...prev, { id: activeTabId, path: `/project/${activeTabId}` }])
    }
  }, [activeTabId, tabs])

  const openTab = useCallback((projectId: string) => {
    setTabs(prev => {
      if (prev.some(t => t.id === projectId)) return prev
      return [...prev, { id: projectId, path: `/project/${projectId}` }]
    })
    navigate(`/project/${projectId}`)
  }, [navigate])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)

      // If closing the active tab, switch to adjacent or go home
      if (id === activeTabId) {
        if (next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1)
          navigate(next[newIdx].path)
        } else {
          navigate('/')
        }
      }

      return next
    })
  }, [activeTabId, navigate])

  const switchTab = useCallback((id: string) => {
    const tab = tabs.find(t => t.id === id)
    if (tab) navigate(tab.path)
  }, [tabs, navigate])

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, switchTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('useTabs must be used within TabsProvider')
  return ctx
}
