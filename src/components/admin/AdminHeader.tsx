import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, ChevronDown, Users, Building2, FileText, Eye, KeyRound, UserPlus } from 'lucide-react';

interface AdminHeaderProps {
  villageName: string;
  isPrimary?: boolean;
  onShowProfile: () => void;
  onShowVillageInfo: () => void;
  onShowDocuments: () => void;
  onShowTemplate: () => void;
  onShowChangePin: () => void;
  onShowSubAdminManager?: () => void;
  onLogout: () => void;
}

export const AdminHeader = ({
  villageName,
  isPrimary = false,
  onShowProfile,
  onShowVillageInfo,
  onShowDocuments,
  onShowTemplate,
  onShowChangePin,
  onShowSubAdminManager,
  onLogout,
}: AdminHeaderProps) => {
  return (
    <header className="bg-primary text-primary-foreground py-4 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-primary-foreground/80">
              {villageName || 'Village'} - Certificate Management
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onShowProfile}>
                  <Users className="h-4 w-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowChangePin}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change PIN
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowVillageInfo}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Village Information
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowDocuments}>
                  <FileText className="h-4 w-4 mr-2" />
                  Documents & Seals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowTemplate}>
                  <Eye className="h-4 w-4 mr-2" />
                  Certificate Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
