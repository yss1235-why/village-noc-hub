import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, XCircle, Clock, Eye, FileText, Users, AlertCircle, Settings, EyeOff, ChevronDown, Key, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AdminDashboard = () => {
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

  // Village info state
  const [showVillageInfo, setShowVillageInfo] = useState(false);
  const [villageForm, setVillageForm] = useState({
    villageName: "",
    district: "",
    state: "",
    pinCode: "",
    adminName: "",
    adminEmail: ""
  });
  const [isUpdatingVillage, setIsUpdatingVillage] = useState(false);
 const [isLoadingVillageInfo, setIsLoadingVillageInfo] = useState(false);

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
      const response = await fetch('/.netlify/functions/change-village-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          villageId: 'zingsui-village-1' // In real app, get this from user session
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

  const loadVillageInfo = async () => {
    setIsLoadingVillageInfo(true);
    try {
      const response = await fetch('/.netlify/functions/update-village-info?villageId=zingsui-village-1');
      const result = await response.json();
      
      if (response.ok && result.village) {
        setVillageForm({
          villageName: result.village.name,
          district: result.village.district,
          state: result.village.state,
          pinCode: result.village.pin_code,
          adminName: result.village.admin_name,
          adminEmail: result.village.admin_email
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load village information.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVillageInfo(false);
    }
  };

  const handleUpdateVillageInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingVillage(true);

    try {
      const response = await fetch('/.netlify/functions/update-village-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: 'zingsui-village-1', // In real app, get this from user session
          villageName: villageForm.villageName,
          district: villageForm.district,
          state: villageForm.state,
          pinCode: villageForm.pinCode,
          adminName: villageForm.adminName,
          adminEmail: villageForm.adminEmail
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Village Information Updated",
          description: "Your village information has been updated successfully.",
        });
        setShowVillageInfo(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update village information.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update village information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingVillage(false);
    }
  };

  const handleShowVillageInfo = () => {
    setShowVillageInfo(true);
    loadVillageInfo();
  };
  // Mock data for applications
  const [applications, setApplications] = useState([
    {
      id: "ZSV20122024",
      name: "John Doe",
      fatherName: "Robert Doe",
      certificateType: "Birth",
      status: "approved",
      submittedDate: "2024-12-15",
      approvedDate: "2024-12-18",
    },
    {
      id: "ZSV19122024",
      name: "Jane Smith",
      fatherName: "Michael Smith",
      certificateType: "Resident",
      status: "pending",
      submittedDate: "2024-12-19",
      approvedDate: null,
    },
    {
      id: "ZSV18122024",
      name: "Alice Johnson",
      fatherName: "David Johnson",
      certificateType: "Birth",
      status: "pending",
      submittedDate: "2024-12-18",
      approvedDate: null,
    },
    {
      id: "ZSV17122024",
      name: "Bob Wilson",
      fatherName: "Tom Wilson",
      certificateType: "Resident",
      status: "rejected",
      submittedDate: "2024-12-17",
      approvedDate: null,
    },
  ]);

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleApprove = (applicationId: string) => {
    setApplications(apps => 
      apps.map(app => 
        app.id === applicationId 
          ? { ...app, status: "approved", approvedDate: new Date().toISOString().split('T')[0] }
          : app
      )
    );
    toast({
      title: "Application Approved",
      description: `Application ${applicationId} has been approved.`,
    });
  };

  const handleReject = (applicationId: string) => {
    setApplications(apps => 
      apps.map(app => 
        app.id === applicationId 
          ? { ...app, status: "rejected" }
          : app
      )
    );
    toast({
      title: "Application Rejected",
      description: `Application ${applicationId} has been rejected.`,
      variant: "destructive",
    });
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

  const pendingApplications = applications.filter(app => app.status === "pending");
  const approvedApplications = applications.filter(app => app.status === "approved");
  const rejectedApplications = applications.filter(app => app.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-primary-foreground/80">Zingsui Sambu Village - Certificate Management</p>
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
                  <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShowVillageInfo}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Village Information
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{rejectedApplications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Application Management</CardTitle>
            <CardDescription>Review and manage certificate applications from villagers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                  Pending ({pendingApplications.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedApplications.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedApplications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.fatherName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{app.certificateType}</TableCell>
                          <TableCell>{new Date(app.submittedDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(app.id)}
                                className="bg-success text-success-foreground hover:bg-success/90"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(app.id)}
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
                    <p>No pending applications</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                {approvedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Approved Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.fatherName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{app.certificateType}</TableCell>
                          <TableCell>{app.approvedDate ? new Date(app.approvedDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No approved applications</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4">
                {rejectedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.id}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.fatherName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{app.certificateType}</TableCell>
                          <TableCell>{new Date(app.submittedDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rejected applications</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
       </Card>

        {/* Village Information Dialog */}
        {showVillageInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Village Information</CardTitle>
                <CardDescription>Update your village details</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVillageInfo ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading village information...</div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateVillageInfo} className="space-y-4">
                    <div>
                      <Label htmlFor="villageName">Village Name *</Label>
                      <Input
                        id="villageName"
                        value={villageForm.villageName}
                        onChange={(e) => setVillageForm({...villageForm, villageName: e.target.value})}
                        placeholder="Enter village name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="district">District *</Label>
                        <Input
                          id="district"
                          value={villageForm.district}
                          onChange={(e) => setVillageForm({...villageForm, district: e.target.value})}
                          placeholder="Enter district"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={villageForm.state}
                          onChange={(e) => setVillageForm({...villageForm, state: e.target.value})}
                          placeholder="Enter state"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pinCode">PIN Code *</Label>
                      <Input
                        id="pinCode"
                        value={villageForm.pinCode}
                        onChange={(e) => setVillageForm({...villageForm, pinCode: e.target.value})}
                        placeholder="Enter PIN code"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="adminName">Admin Name *</Label>
                      <Input
                        id="adminName"
                        value={villageForm.adminName}
                        onChange={(e) => setVillageForm({...villageForm, adminName: e.target.value})}
                        placeholder="Enter admin name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="adminEmail">Admin Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={villageForm.adminEmail}
                        onChange={(e) => setVillageForm({...villageForm, adminEmail: e.target.value})}
                        placeholder="Enter admin email"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowVillageInfo(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isUpdatingVillage}
                        className="flex-1"
                      >
                        {isUpdatingVillage ? "Updating..." : "Update Information"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Change Password Dialog */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
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
      </main>
    </div>
  );
};

export default AdminDashboard;
