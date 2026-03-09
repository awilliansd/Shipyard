import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { TabsProvider } from '@/hooks/useTabs'

export function Layout() {
  return (
    <TabsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TabBar />
          <Outlet />
        </main>
      </div>
    </TabsProvider>
  )
}
