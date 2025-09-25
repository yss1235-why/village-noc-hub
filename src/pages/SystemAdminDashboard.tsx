import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, CheckCircle, XCircle, Clock, Shield, Building, Users, Settings, Eye, AlertCircle, BarChart, MessageCircle, FileText, Search, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SystemAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Authentication state
  const [authToken, setAuthToken] = useState(() => {
    return sessionStorage.getItem('auth-token');
  });
  
  const [adminInfo, setAdminInfo] = useState(() => {
    const stored = sessionStorage.getItem('userInfo');
    return stored ? JSON.parse(stored) : null;
  });

  // Core data state
  const [villages, setVillages] = useState([]);
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Points management state
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsForm, setPointsForm] = useState({
    userId: '',
    action: 'add',
    amount: '',
    reason: ''
  });

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

  // Redirect if not authenticated as admin
  useEffect(() => {
    if (!adminInfo || !authToken || adminInfo.role !== 'admin') {
      navigate('/system-admin');
    } else {
      initializeDashboard();
    }
  }, [adminInfo, authToken, navigate]);

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
      const response = await fetch('/.netlify/functions/get-system-admin-villages', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
      const response = await fetch('/.netlify/functions/get-system-admin-applications', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
      const response = await fetch('/.netlify/functions/get-system-admin-users', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
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

  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch('/.netlify/functions/approve-user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action: 'approve' })
      });

      const result = await response.json();
      if (response.ok) {
        setUsers(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, is_approved: true, status: 'approved' }
              : user
          )
        );
        toast({
          title: "User Approved",
          description: "User has been approved successfully.",
        });
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
    }
  };

  const handleManagePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pointsForm.userId || !pointsForm.amount || !pointsForm.reason) {
      toast({
        title: "Error", 
        description: "All fields are required for points management.",
        variant: "destructive",
      });
      return;
    }

    try {
      const endpoint = pointsForm.action === 'add' ? 'add-points' : 'deduct-points';
      const response = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: pointsForm.userId,
          amount: parseInt(pointsForm.amount),
          reason: pointsForm.reason,
          adminId: adminInfo.userId
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Points Updated",
          description: `${pointsForm.amount} points ${pointsForm.action}ed successfully.`,
        });
        setShowPointsModal(false);
        setPointsForm({ userId: '', action: 'add', amount: '', reason: '' });
        loadUsers();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update points.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update points. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('auth-token');
    sessionStorage.removeItem('userInfo');
    
    try {
      await fetch('/.netlify/functions/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (error) {
      console.log('Logout endpoint call failed:', error);
    }
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
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
                <p className="text-sm font-medium">{adminInfo?.name || 'System Admin'}</p>
                <p className="text-xs text-purple-200">{adminInfo?.email}</p>
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
            onClick={() => setShowPointsModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <BarChart className="h-4 w-4 mr-2" />
            Manage Points
          </Button>
          <Button 
            onClick={() => setShowMessageModal(true)}
            variant="outline"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Managed Villages</CardTitle>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">
                  Users ({users.length})
                </TabsTrigger>
                <TabsTrigger value="applications">
                  Applications ({applications.length})
                </TabsTrigger>
                <TabsTrigger value="villages">
                  Villages ({villages.length})
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
                                  onClick={() => handleApproveUser(user.id)}
                                  className="bg-success text-success-foreground hover:bg-success/90"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setPointsForm(prev => ({ ...prev, userId: user.id }));
                                  setShowPointsModal(true);
                                }}
                              >
                                <BarChart className="h-4 w-4" />
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
            </Tabs>
          </CardContent>
        </Card>

        {/* Points Management Modal */}
        {showPointsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Manage User Points</CardTitle>
                <CardDescription>Add or deduct points from user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManagePoints} className="space-y-4">
                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={pointsForm.userId}
                      onChange={(e) => setPointsForm({...pointsForm, userId: e.target.value})}
                      placeholder="Enter user ID"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="action">Action</Label>
                    <Select value={pointsForm.action} onValueChange={(value) => setPointsForm({...pointsForm, action: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Points</SelectItem>
                        <SelectItem value="deduct">Deduct Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={pointsForm.amount}
                      onChange={(e) => setPointsForm({...pointsForm, amount: e.target.value})}
                      placeholder="Enter points amount"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      value={pointsForm.reason}
                      onChange={(e) => setPointsForm({...pointsForm, reason: e.target.value})}
                      placeholder="Enter reason for points change"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPointsModal(false);
                        setPointsForm({ userId: '', action: 'add', amount: '', reason: '' });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {pointsForm.action === 'add' ? 'Add Points' : 'Deduct Points'}
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

export default SystemAdminDashboard;
