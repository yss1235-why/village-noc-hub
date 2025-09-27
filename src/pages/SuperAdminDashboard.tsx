import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, CheckCircle, XCircle, Clock, Crown, Building, Users, Settings, Eye, EyeOff, Trash2, AlertCircle, Key, Gift, TrendingUp, BarChart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
const [isChangingPassword, setIsChangingPassword] = useState(false);

// Delete village state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [villageToDelete, setVillageToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change admin password state
  const [showChangeAdminPassword, setShowChangeAdminPassword] = useState(false);
  const [adminToChangePassword, setAdminToChangePassword] = useState<any>(null);
  const [adminPasswordForm, setAdminPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showAdminPasswords, setShowAdminPasswords] = useState({
    new: false,
    confirm: false
  });
  const [isChangingAdminPassword, setIsChangingAdminPassword] = useState(false);

 const [villageRequests, setVillageRequests] = useState([]);
  const [isLoadingVillages, setIsLoadingVillages] = useState(true);

  // New admin management state
  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Security and monitoring state
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'operational',
    uptime: '99.9%',
    lastBackup: null,
    activeConnections: 0
  });
  const [fraudDetectionSettings, setFraudDetectionSettings] = useState({
    enabled: true,
    alertThreshold: 5,
    autoBlockEnabled: false
  });

 // Audit and analytics state
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemAnalytics, setSystemAnalytics] = useState({
    totalUsers: 0,
    totalApplications: 0,
    approvalRate: 0,
    fraudAttempts: 0
  });

  // Voucher management state
  const [voucherStats, setVoucherStats] = useState({
    quotaUsed: 0,
    quotaTotal: 5,
    totalGenerated: 0,
    activeVouchers: 0,
    redeemedVouchers: 0,
    isLoading: true
  });

  const loadVoucherStatistics = async () => {
    try {
      const response = await fetch('/.netlify/functions/track-vouchers?limit=1', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVoucherStats({
          quotaUsed: data.quota?.used || 0,
          quotaTotal: data.quota?.total || 5,
          totalGenerated: data.quota?.totalGenerated || 0,
          activeVouchers: data.statistics?.active_vouchers || 0,
          redeemedVouchers: data.statistics?.redeemed_vouchers || 0,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Failed to fetch voucher stats:', error);
      setVoucherStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Broadcast messaging state
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    targetRole: 'all',
    priority: 'normal'
  });

  // Create admin form state
  const [createAdminForm, setCreateAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    permissions: {
      approve_user: true,
      manage_points: true,
      view_applications: true,
      fraud_monitoring: false,
      send_message: false,
      view_analytics: true,
      manage_certificates: true
    }
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Computed values for statistics
  const activeAdmins = adminUsers.filter(admin => admin.is_active);
  const inactiveAdmins = adminUsers.filter(admin => !admin.is_active);
  const criticalAlerts = securityAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = securityAlerts.filter(alert => alert.severity === 'warning');
  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "Super admin logged out successfully.",
    });
    navigate("/");
  };

 const handleApproveVillage = async (villageId: string) => {
    try {
      const response = await fetch('/.netlify/functions/approve-village', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ villageId, action: 'approve' })
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setVillageRequests(prev => 
          prev.map(village => 
            village.id === villageId 
              ? { ...village, status: "approved" }
              : village
          )
        );
        toast({
          title: "Village Approved",
          description: "Village registration has been approved.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve village.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve village. Please try again.",
        variant: "destructive",
      });
    }
  };

const handleRejectVillage = async (villageId: string) => {
    try {
      const response = await fetch('/.netlify/functions/approve-village', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ villageId, action: 'reject' })
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setVillageRequests(prev => 
          prev.map(village => 
            village.id === villageId 
              ? { ...village, status: "rejected" }
              : village
          )
        );
        toast({
          title: "Village Rejected",
          description: "Village registration has been rejected.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject village.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject village. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/.netlify/functions/change-super-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
        setShowChangePassword(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password.",
          variant: "destructive",
        });
      }
   } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  const loadVillages = async () => {
    setIsLoadingVillages(true);
    try {
      const response = await fetch('/.netlify/functions/get-all-villages');
      const result = await response.json();
      
      if (response.ok && result.villages) {
        setVillageRequests(result.villages);
      } else {
        console.error('Failed to load villages:', result.error);
        toast({
          title: "Error",
          description: "Failed to load villages.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load villages:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVillages(false);
    }
  };

  const loadSystemAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await fetch('/.netlify/functions/get-system-admins');
      const result = await response.json();
      
      if (response.ok && result.admins) {
        setAdminUsers(result.admins);
      } else {
        console.error('Failed to load system admins:', result.error);
      }
    } catch (error) {
      console.error('Failed to load system admins:', error);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

 useEffect(() => {
    loadVillages();
    loadSystemAdmins();
    loadVoucherStatistics();
  }, []);

  const handleDeleteVillage = (village: any) => {
    setVillageToDelete(village);
    setShowDeleteConfirm(true);
  };

 const confirmDeleteVillage = async () => {
    if (!villageToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/.netlify/functions/delete-village', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: villageToDelete.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Remove from state
        setVillageRequests(prev => 
          prev.filter(village => village.id !== villageToDelete.id)
        );
        
        toast({
          title: "Village Deleted",
          description: result.message || "Village has been deleted successfully.",
        });
        setShowDeleteConfirm(false);
        setVillageToDelete(null);
      } else {
        toast({
          title: "Delete Failed",
          description: result.error || "Failed to delete village.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete village. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeAdminPassword = (village: any) => {
    setAdminToChangePassword(village);
    setShowChangeAdminPassword(true);
  };

  const confirmChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminPasswordForm.newPassword !== adminPasswordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (adminPasswordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingAdminPassword(true);

    try {
      const response = await fetch('/.netlify/functions/change-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: adminToChangePassword.id,
          newPassword: adminPasswordForm.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: `Password for ${adminToChangePassword.adminName} has been updated successfully.`,
        });
        setShowChangeAdminPassword(false);
        setAdminToChangePassword(null);
        setAdminPasswordForm({
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change admin password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change admin password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingAdminPassword(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const pendingVillages = villageRequests.filter(v => v.status === "pending");
  const approvedVillages = villageRequests.filter(v => v.status === "approved");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
                <p className="text-sm text-primary-foreground/80">Multi-Village NOC Management System</p>
              </div>
            </div>
           <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowChangePassword(true)}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
       {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Villages</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{villageRequests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {approvedVillages.length} active, {pendingVillages.length} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminUsers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeAdmins.length} active, {inactiveAdmins.length} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {criticalAlerts.length} critical, {warningAlerts.length} warnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">98%</div>
              <p className="text-xs text-muted-foreground mt-1">
                All systems operational
              </p>
            </CardContent>
          </Card>
       </div>

       {/* Enhanced Management System */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Administration</CardTitle>
                <CardDescription>Comprehensive management of villages, administrators, and security.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowCreateAdmin(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowBroadcastModal(true)}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Broadcast Message
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="villages" className="w-full">
                 <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="villages">
                  Villages ({villageRequests.length})
                </TabsTrigger>
                <TabsTrigger value="admins">
                  Administrators ({adminUsers.length})
                </TabsTrigger>
                <TabsTrigger value="vouchers">
                  Vouchers
                </TabsTrigger>
                <TabsTrigger value="security">
                  Security ({securityAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="audit">
                  Audit Logs
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Villages Tab */}
              <TabsContent value="villages" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Village Management</h3>
                  <Badge variant="outline">
                    {pendingVillages.length} Pending Approval
                  </Badge>
                </div>
                
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">
                      Pending ({pendingVillages.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      Active ({approvedVillages.length})
                    </TabsTrigger>
                  </TabsList>
             <TabsContent value="pending" className="space-y-4">
                {isLoadingVillages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading villages...</div>
                  </div>
                ) : pendingVillages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Village Details</TableHead>
                      <TableHead>Admin Details</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVillages.map((village) => (
                      <TableRow key={village.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{village.villageName}</p>
                            <p className="text-sm text-muted-foreground">{village.district}, {village.state}</p>
                          </div>
                     </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{village.adminName}</p>
                            <p className="text-sm text-muted-foreground">{village.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{village.createdAt ? new Date(village.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(village.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveVillage(village.id)}
                              className="bg-success text-success-foreground hover:bg-success/90"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectVillage(village.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
                </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending villages</p>
                  </div>
                )}
              </TabsContent>

            <TabsContent value="approved" className="space-y-4">
                {isLoadingVillages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading villages...</div>
                  </div>
                ) : approvedVillages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Village Details</TableHead>
                      <TableHead>Admin Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedVillages.map((village) => (
                      <TableRow key={village.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{village.villageName}</p>
                            <p className="text-sm text-muted-foreground">{village.district}, {village.state}</p>
                          </div>
                       </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{village.adminName}</p>
                            <p className="text-sm text-muted-foreground">{village.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(village.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleChangeAdminPassword(village)}
                              className="text-primary hover:text-primary-foreground hover:bg-primary"
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Reset Password
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteVillage(village)}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
                </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No approved villages</p>
                  </div>
                )}
              </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Additional tabs content can go here */}
           <TabsContent value="admins" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Admin management coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="vouchers" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Voucher Management</h3>
                <Button onClick={() => navigate('/admin/vouchers')}>
                  <Gift className="h-4 w-4 mr-2" />
                  Full Voucher Management
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quota Used</p>
                        <p className="text-2xl font-bold">{voucherStats.quotaUsed}/{voucherStats.quotaTotal}</p>
                      </div>
                      <Gift className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Generated</p>
                        <p className="text-2xl font-bold">{voucherStats.totalGenerated}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold">{voucherStats.activeVouchers}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Redeemed</p>
                        <p className="text-2xl font-bold">{voucherStats.redeemedVouchers}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common voucher management tasks for super administrators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => navigate('/admin/vouchers')}
                    >
                      <Gift className="h-6 w-6 mb-2" />
                      Generate Voucher
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => navigate('/admin/vouchers')}
                    >
                      <Eye className="h-6 w-6 mb-2" />
                      Track Vouchers
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => navigate('/admin/vouchers')}
                    >
                      <BarChart className="h-6 w-6 mb-2" />
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="security" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Security monitoring coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Audit logs coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
          </CardContent>
        </Card>

        {/* Change Password Dialog */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your super admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        placeholder="Enter current password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword}
                      className="flex-1"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

       {/* Create Admin Modal */}
        {showCreateAdmin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader>
                <CardTitle>Create System Administrator</CardTitle>
                <CardDescription>
                  Add a new system administrator with specified permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  
                  if (createAdminForm.password !== createAdminForm.confirmPassword) {
                    toast({
                      title: "Error",
                      description: "Passwords do not match.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (createAdminForm.password.length < 6) {
                    toast({
                      title: "Error",
                      description: "Password must be at least 6 characters long.",
                      variant: "destructive",
                    });
                    return;
                  }

                  setIsCreatingAdmin(true);

                  try {
                    const response = await fetch('/.netlify/functions/create-system-admin', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        name: createAdminForm.name,
                        email: createAdminForm.email,
                        password: createAdminForm.password,
                        permissions: createAdminForm.permissions
                      })
                    });

                    const result = await response.json();

                    if (response.ok) {
                      toast({
                        title: "Admin Created",
                        description: `Administrator ${createAdminForm.name} has been created successfully.`,
                      });
                      setShowCreateAdmin(false);
                      setCreateAdminForm({
                        name: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        permissions: {
                          approve_user: true,
                          manage_points: true,
                          view_applications: true,
                          fraud_monitoring: false,
                          send_message: false,
                          view_analytics: true,
                          manage_certificates: true
                        }
                      });
                     // Reload admin users to update the dashboard
                      loadSystemAdmins();
                    } else {
                      toast({
                        title: "Error",
                        description: result.error || "Failed to create administrator.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to create administrator. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsCreatingAdmin(false);
                  }
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="adminName">Administrator Name</Label>
                    <Input
                      id="adminName"
                      type="text"
                      value={createAdminForm.name}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, name: e.target.value})}
                      placeholder="Enter administrator name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={createAdminForm.email}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, email: e.target.value})}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminPassword">Password</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={createAdminForm.password}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, password: e.target.value})}
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmAdminPassword">Confirm Password</Label>
                    <Input
                      id="confirmAdminPassword"
                      type="password"
                      value={createAdminForm.confirmPassword}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, confirmPassword: e.target.value})}
                      placeholder="Confirm password"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(createAdminForm.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={value}
                            onChange={(e) => setCreateAdminForm({
                              ...createAdminForm,
                              permissions: {
                                ...createAdminForm.permissions,
                                [key]: e.target.checked
                              }
                            })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={key} className="text-sm font-normal">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateAdmin(false);
                        setCreateAdminForm({
                          name: '',
                          email: '',
                          password: '',
                          confirmPassword: '',
                          permissions: {
                            approve_user: true,
                            manage_points: true,
                            view_applications: true,
                            fraud_monitoring: false,
                            send_message: false,
                            view_analytics: true,
                            manage_certificates: true
                          }
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isCreatingAdmin}
                      className="flex-1"
                    >
                      {isCreatingAdmin ? "Creating..." : "Create Administrator"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Broadcast Message Modal */}
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader>
                <CardTitle>Broadcast Message</CardTitle>
                <CardDescription>
                  Send a message to all administrators or specific groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Broadcast message:', newMessage);
                  toast({
                    title: "Message Sent",
                    description: "Broadcast message has been sent successfully.",
                  });
                  setShowBroadcastModal(false);
                  setNewMessage({
                    title: '',
                    content: '',
                    targetRole: 'all',
                    priority: 'normal'
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="messageTitle">Message Title</Label>
                    <Input
                      id="messageTitle"
                      type="text"
                      value={newMessage.title}
                      onChange={(e) => setNewMessage({...newMessage, title: e.target.value})}
                      placeholder="Enter message title"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="messageContent">Message Content</Label>
                    <textarea
                      id="messageContent"
                      value={newMessage.content}
                      onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                      placeholder="Enter message content"
                      rows={4}
                      className="w-full px-3 py-2 border border-input rounded-md resize-none"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowBroadcastModal(false);
                        setNewMessage({
                          title: '',
                          content: '',
                          targetRole: 'all',
                          priority: 'normal'
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="flex-1"
                    >
                      Send Message
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

    
        {showChangeAdminPassword && adminToChangePassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Change Admin Password</CardTitle>
                <CardDescription>
                  Set a new password for the village admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <h4 className="font-medium">{adminToChangePassword.villageName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Admin: {adminToChangePassword.adminName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: {adminToChangePassword.email}
                  </p>
                </div>

                <form onSubmit={confirmChangeAdminPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="newAdminPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newAdminPassword"
                        type={showAdminPasswords.new ? "text" : "password"}
                        value={adminPasswordForm.newPassword}
                        onChange={(e) => setAdminPasswordForm({...adminPasswordForm, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowAdminPasswords({...showAdminPasswords, new: !showAdminPasswords.new})}
                      >
                        {showAdminPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmAdminPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmAdminPassword"
                        type={showAdminPasswords.confirm ? "text" : "password"}
                        value={adminPasswordForm.confirmPassword}
                        onChange={(e) => setAdminPasswordForm({...adminPasswordForm, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowAdminPasswords({...showAdminPasswords, confirm: !showAdminPasswords.confirm})}
                      >
                        {showAdminPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowChangeAdminPassword(false);
                        setAdminToChangePassword(null);
                        setAdminPasswordForm({
                          newPassword: "",
                          confirmPassword: ""
                        });
                      }}
                      className="flex-1"
                      disabled={isChangingAdminPassword}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isChangingAdminPassword}
                      className="flex-1"
                    >
                      {isChangingAdminPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Delete Village Confirmation Dialog */}
        {showDeleteConfirm && villageToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Village</CardTitle>
                <CardDescription>
                  Are you sure you want to delete this village? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium">{villageToDelete.villageName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {villageToDelete.district}, {villageToDelete.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Admin: {villageToDelete.adminName}
                  </p>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h5 className="font-medium text-destructive">Warning</h5>
                      <p className="text-sm text-destructive/80">
                        This will permanently delete the village and all associated admin accounts. 
                        Applications from this village will be preserved but orphaned.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setVillageToDelete(null);
                    }}
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmDeleteVillage}
                    disabled={isDeleting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isDeleting ? "Deleting..." : "Delete Village"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
export default SuperAdminDashboard;
