import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, CheckCircle, XCircle, Clock, Crown, Building, Users, Settings, Eye, EyeOff, Trash2, AlertCircle } from "lucide-react";
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

  const [villageRequests, setVillageRequests] = useState([]);
  const [isLoadingVillages, setIsLoadingVillages] = useState(true);

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
      setIsDeleting(false);
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

  useEffect(() => {
    loadVillages();
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Villages</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{villageRequests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingVillages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Villages</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedVillages.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Village Management */}
        <Card>
          <CardHeader>
            <CardTitle>Village Management</CardTitle>
            <CardDescription>Approve or reject village admin registrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                  Pending Approval ({pendingVillages.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved Villages ({approvedVillages.length})
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
                        <TableCell>{new Date(village.requestDate).toLocaleDateString()}</TableCell>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteVillage(village)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
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
