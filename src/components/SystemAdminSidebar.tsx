import { Shield, Users, FileText, Building, Gift, Settings, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

interface SystemAdminSidebarProps {
  user: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettings: () => void;
  onLogout: () => void;
  pendingCounts: {
    users: number;
    applications: number;
    villages: number;
  };
}

export function SystemAdminSidebar({ 
  user, 
  activeTab, 
  onTabChange, 
  onSettings, 
  onLogout,
  pendingCounts 
}: SystemAdminSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">System Administrator</span>
            <span className="text-xs text-muted-foreground">NOC Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* User Info Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-3">
              <p className="text-sm font-medium">{user?.fullName || user?.username || 'System Admin'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="mt-2">System Admin</Badge>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Navigation Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleTabChange('dashboard')}
                  isActive={activeTab === 'dashboard'}
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleTabChange('users')}
                  isActive={activeTab === 'users'}
                >
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                  {pendingCounts.users > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {pendingCounts.users}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleTabChange('applications')}
                  isActive={activeTab === 'applications'}
                >
                  <FileText className="h-4 w-4" />
                  <span>Applications</span>
                  {pendingCounts.applications > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {pendingCounts.applications}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleTabChange('villages')}
                  isActive={activeTab === 'villages'}
                >
                  <Building className="h-4 w-4" />
                  <span>Villages</span>
                  {pendingCounts.villages > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {pendingCounts.villages}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleTabChange('points')}
                  isActive={activeTab === 'points'}
                >
                  <Gift className="h-4 w-4" />
                  <span>Point Management</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSettings}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
