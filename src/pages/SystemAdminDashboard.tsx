import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import SimplePointManagement from '@/components/admin/SimplePointManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, CheckCircle, XCircle, Clock, Shield, Building, Users, Settings, Eye, AlertCircle, BarChart, MessageCircle, FileText, Search, UserCheck, Download, Gift, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

const SystemAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();

  // Core data state
  const [villages, setVillages] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);


  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({
    targetType: 'village',
    targetId: '',
    title: '',
    content: '',
    priority: 'normal'
  });
// User filter state
  const [userFilter, setUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

 // User review modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [isProcessingUserAction, setIsProcessingUserAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // User action states
  const [showDisableConfirm, setShowDisableConfirm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [disableReason, setDisableReason] = useState('');
  
  // Document view modal state
  const [viewDocumentModal, setViewDocumentModal] = useState({
    isOpen: false,
    document: null,
    title: ""
  });
 // Redirect if not authenticated as admin
 useEffect(() => {
  // Wait for authentication to finish loading before checking
  if (isLoading) return;
  
  // Now safely check authentication
  if (!isAuthenticated || !user || (user.role !== 'system_admin' && user.role !== 'super_admin')) {
    navigate('/system-admin');
  } else {
    initializeDashboard();
  }
}, [isAuthenticated, user, navigate, isLoading]); // Add isLoading to dependencies

const initializeDashboard = async () => {
    setIsLoadingData(true);
    await Promise.all([
      loadVillages(),
      loadApplications(),
      loadUsers()
    ]);
    setIsLoadingData(false);
  };
 
 const loadVillages = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/get-system-admin-villages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setVillages(result.villages || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load villages",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to load villages",
        variant: "destructive",
      });
    }
  };

 const loadApplications = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/get-system-admin-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setApplications(result.applications || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load applications", 
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    }
  };

 const loadUsers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/get-system-admin-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setUsers(result.users || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load users",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const handleReviewUser = async (userId: string) => {
    setIsLoadingUserDetails(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-user-details?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setSelectedUser(result.user);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load user details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUserDetails(false);
    }
  };

  const handleApproveFromModal = async () => {
    if (!selectedUser) return;
    
    setIsProcessingUserAction(true);
    try {
     const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/approve-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUser.id, action: 'approve' })
      });

      const result = await response.json();
      if (response.ok) {
        setUsers(prev => 
          prev.map(user => 
            user.id === selectedUser.id 
              ? { ...user, is_approved: true, status: 'approved' }
              : user
          )
        );
        toast({
          title: "User Approved",
          description: `User ${selectedUser.username} has been approved successfully.`,
        });
        setSelectedUser(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingUserAction(false);
    }
  };

 const handleDisableUser = async (userId, reason) => {
    try {
     const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/disable-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, reason })
      });

      const result = await response.json();
      if (response.ok) {
        setUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_active: false, status: 'disabled' }
              : user
          )
        );
        toast({
          title: "User Disabled",
          description: "User has been successfully disabled.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to disable user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDisableConfirm(null);
      setDisableReason('');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
     const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/delete-user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      const result = await response.json();
      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast({
          title: "User Deleted",
          description: "User has been permanently removed from the system.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(null);
    }
  };
  const handleRejectFromModal = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessingUserAction(true);
    try {
     const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/approve-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          action: 'reject',
          reason: rejectionReason 
        })
      });

      const result = await response.json();
      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
        toast({
          title: "User Rejected",
          description: `User ${selectedUser.username} has been rejected and removed.`,
          variant: "destructive",
        });
        setSelectedUser(null);
        setRejectionReason("");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingUserAction(false);
    }
  };
  

 const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
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

  const filteredUsers = users.filter(user => {
    const matchesFilter = userFilter === 'all' || user.status === userFilter || user.role === userFilter;
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingApplications = applications.filter(app => app.status === "pending");
  const approvedApplications = applications.filter(app => app.status === "approved");
  const rejectedApplications = applications.filter(app => app.status === "rejected");
  const pendingUsers = users.filter(user => !user.is_approved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">System Administrator</h1>
                <p className="text-sm text-purple-100">
                  Cross-Village NOC Management System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.fullName || user?.username || 'System Admin'}</p>
                <p className="text-xs text-purple-200">{user?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
   {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
         <Button 
            onClick={() => setShowMessageModal(true)}
            variant="outline"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>

       {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Villages</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{villages.length}</div>
              <p className="text-xs text-muted-foreground">
                Active village administrations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingApplications.length} pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingUsers.length} awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {applications.length > 0 ? Math.round((approvedApplications.length / applications.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                system efficiency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Management Interface */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Administration</CardTitle>
                <CardDescription>Manage users, villages, and applications across the regional system.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
             <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users">
                  Users ({users.length})
                </TabsTrigger>
                <TabsTrigger value="applications">
                  Applications ({applications.length})
                </TabsTrigger>
                <TabsTrigger value="villages">
                  Villages ({villages.length})
                </TabsTrigger>
                <TabsTrigger value="points">
                  Point Management
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">User Management</h3>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="village_admin">Village Admins</SelectItem>
                        <SelectItem value="user">Regular Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Village</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Joined {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.village_name || '-'}</TableCell>
                          <TableCell>
                            {user.is_approved ? (
                              <Badge className="bg-success text-success-foreground">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.point_balance || 0}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                             {!user.is_approved && (
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewUser(user.id)}
                                  disabled={isLoadingUserDetails}
                                  className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {isLoadingUserDetails ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Review
                                    </>
                                  )}
                                </Button>
                              )}
                              
                               
                              {user.is_approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowDisableConfirm(user)}
                                  className="text-orange-600 hover:text-orange-700"
                                  title="Disable User"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(user)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete User"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found matching your criteria</p>
                  </div>
                )}
              </TabsContent>

              {/* Applications Tab - Similar structure to users but for applications */}
              <TabsContent value="applications" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Application Oversight</h3>
                  <Badge variant="outline">
                    {pendingApplications.length} Pending Review
                  </Badge>
                </div>

                {applications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Village</TableHead>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
                          <TableCell>{app.village_name}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.applicant_name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No applications found</p>
                  </div>
                )}
              </TabsContent>

              {/* Villages Tab */}
              <TabsContent value="villages" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Village Administration</h3>
                  <Badge variant="outline">
                    {villages.length} Active Villages
                  </Badge>
                </div>

                {villages.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village Name</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {villages.map((village) => (
                        <TableRow key={village.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{village.name}</p>
                              <p className="text-sm text-muted-foreground">{village.state}</p>
                            </div>
                          </TableCell>
                          <TableCell>{village.district}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{village.admin_name}</p>
                              <p className="text-sm text-muted-foreground">{village.admin_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{village.application_count || 0}</TableCell>
                          <TableCell>{village.user_count || 0}</TableCell>
                          <TableCell>
                            <Badge className="bg-success text-success-foreground">Active</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No villages found</p>
                  </div>
                )}
             </TabsContent>
                {/* Point Management Tab */}
              <TabsContent value="points" className="space-y-4">
                <SimplePointManagement />
              </TabsContent>   
            </Tabs>
          </CardContent>
        </Card>

      
      {/* User Review Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Review User Registration - {selectedUser.username}
                </CardTitle>
                <CardDescription>
                  Review user information and uploaded documents before approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Full Name</Label>
                      <p className="text-sm">{selectedUser.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Username</Label>
                      <p className="text-sm">{selectedUser.username}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Email</Label>
                      <p className="text-sm">{selectedUser.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Phone</Label>
                      <p className="text-sm">{selectedUser.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Aadhaar Number</Label>
                      <p className="text-sm">{selectedUser.aadhaar_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">ID Code</Label>
                      <p className="text-sm">{selectedUser.id_code}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold">Address</Label>
                      <p className="text-sm">{selectedUser.address}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold">Center/Shop Name</Label>
                      <p className="text-sm">{selectedUser.center_shop_name}</p>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Uploaded Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded p-3">
                        <Label className="text-sm font-semibold">Aadhaar Document</Label>
                        {selectedUser.aadhaar_document ? (
                          <div className="mt-2">
                            <img 
                              src={selectedUser.aadhaar_document} 
                              alt="Aadhaar Document" 
                              className="max-w-full h-40 object-contain border rounded"
                            />
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-2"
                              onClick={() => setViewDocumentModal({
                                isOpen: true,
                                document: selectedUser.aadhaar_document,
                                title: "Aadhaar Document"
                              })}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              View Full Size
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No Aadhaar document uploaded</p>
                        )}
                      </div>
                      
                      <div className="border rounded p-3">
                        <Label className="text-sm font-semibold">Passport Photo</Label>
                        {selectedUser.passport_photo ? (
                          <div className="mt-2">
                            <img 
                              src={selectedUser.passport_photo} 
                              alt="Passport Photo" 
                              className="max-w-full h-40 object-contain border rounded"
                            />
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-2"
                              onClick={() => setViewDocumentModal({
                                isOpen: true,
                                document: selectedUser.passport_photo,
                                title: "Passport Photo"
                              })}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              View Full Size
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">No passport photo uploaded</p>
                        )}
                      </div>

                      {selectedUser.police_verification && (
                        <div className="border rounded p-3 md:col-span-2">
                          <Label className="text-sm font-semibold">Police Verification Document</Label>
                          <div className="mt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setViewDocumentModal({
                                isOpen: true,
                                document: selectedUser.police_verification,
                                title: "Police Verification Document"
                              })}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              View Document
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                    <Label htmlFor="rejection-reason" className="text-sm font-semibold">
                      Rejection Reason (Required if rejecting)
                    </Label>
                    <textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection (e.g., Documents not clear, Information incomplete, etc.)"
                      className="w-full mt-2 p-3 border rounded-md h-24 resize-none"
                    />
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground">Common reasons:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          "Documents not clear/readable",
                          "Information incomplete", 
                          "Invalid documents",
                          "Suspicious registration"
                        ].map((reason) => (
                          <Button
                            key={reason}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => setRejectionReason(reason)}
                          >
                            {reason}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(null);
                        setRejectionReason("");
                      }}
                      disabled={isProcessingUserAction}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRejectFromModal}
                      disabled={isProcessingUserAction || !rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {isProcessingUserAction ? "Processing..." : "Reject User"}
                    </Button>
                    <Button
                      onClick={handleApproveFromModal}
                      disabled={isProcessingUserAction}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {isProcessingUserAction ? "Processing..." : "Approve User"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {viewDocumentModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{viewDocumentModal.title}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDocumentModal({isOpen: false, document: null, title: ""})}
              >
                ✕ Close
              </Button>
            </div>
            <div className="flex justify-center">
              {viewDocumentModal.document?.includes('data:application/pdf') ? (
                <div className="text-center">
                  <p className="mb-4">PDF Document - Click download to view</p>
                  <Button
                    onClick={() => window.open(viewDocumentModal.document, '_blank')}
                    className="mb-4"
                  >
                    📄 Download PDF
                  </Button>
                </div>
              ) : (
                <img
                  src={viewDocumentModal.document}
                  alt={viewDocumentModal.title}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    {/* Disable User Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Disable User Account</CardTitle>
              <CardDescription>
                This will prevent {showDisableConfirm.name} from accessing the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="disable-reason">Reason for disabling (required)</Label>
                  <textarea
                    id="disable-reason"
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    placeholder="Enter reason for disabling this user account"
                    className="w-full mt-2 p-3 border rounded-md h-24 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisableConfirm(null);
                      setDisableReason('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDisableUser(showDisableConfirm.id, disableReason)}
                    disabled={!disableReason.trim()}
                    className="flex-1"
                  >
                    Disable User
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete User Account</CardTitle>
              <CardDescription>
                This action cannot be undone. All data associated with {showDeleteConfirm.name} will be permanently removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete the user account and all associated data including applications, point history, and audit trails.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteUser(showDeleteConfirm.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Delete Permanently
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </main>
    </div>
  );
};

export default SystemAdminDashboard;

