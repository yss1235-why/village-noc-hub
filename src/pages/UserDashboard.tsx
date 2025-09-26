import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, FileText, Search, Download, Plus, Clock, CheckCircle, XCircle, User, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  // User applications state
  const [userApplications, setUserApplications] = useState([]);
  const [isLoadingUserApplications, setIsLoadingUserApplications] = useState(true);

  // Application search state
  const [searchApplicationNumber, setSearchApplicationNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // User point balance
  const [userPointBalance, setUserPointBalance] = useState(0);
  const [isLoadingPointBalance, setIsLoadingPointBalance] = useState(false);

  // Redirect if not authenticated and auto-load data
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    
    // Auto-load data when authenticated
    loadUserApplications();
    loadUserPointBalance();
  }, [isAuthenticated, user, navigate]);
  
 const loadUserApplications = async () => {
    if (!user?.id) return;
    
    setIsLoadingUserApplications(true);
    try {
     const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-user-applications?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setUserApplications(result.applications || []);
      } else {
        console.error('Failed to load applications:', result.error);
        toast({
          title: "Error",
          description: "Failed to load your applications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUserApplications(false);
    }
  };

 const loadUserPointBalance = async () => {
    if (!user?.id) return;
    
    setIsLoadingPointBalance(true);
    try {
     const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-user-point-balance?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setUserPointBalance(result.pointBalance || 0);
      } else {
        console.error('Failed to load point balance:', result.error);
      }
    } catch (error) {
      console.error('Error loading point balance:', error);
    } finally {
      setIsLoadingPointBalance(false);
    }
  };

  const handleSearchApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchApplicationNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an application number.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const response = await fetch(`/.netlify/functions/search-application?applicationNumber=${searchApplicationNumber.trim()}`, {
       headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && result.application) {
        setSearchResult(result.application);
      } else {
        toast({
          title: "Application Not Found",
          description: "No application found with this number.",
          variant: "destructive",
        });
        setSearchResult(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for application.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadCertificate = async (applicationId: string, applicationNumber: string) => {
    try {
      const response = await fetch(`/.netlify/functions/download-certificate?applicationId=${applicationId}`, {
       headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NOC_Certificate_${applicationNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `Certificate for ${applicationNumber} is downloading.`,
        });
      } else {
        const result = await response.json();
        toast({
          title: "Download Failed",
          description: result.error || "Failed to download certificate.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
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

  const pendingApplications = userApplications.filter(app => app.status === "pending");
  const approvedApplications = userApplications.filter(app => app.status === "approved");
  const rejectedApplications = userApplications.filter(app => app.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">User Dashboard</h1>
             <p className="text-sm text-primary-foreground/80">
                Welcome, {user?.fullName || user?.username || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                <p className="text-xs text-primary-foreground/70">{user?.email}</p>
              </div>
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
        {/* Quick Action */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/apply')}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Apply for New NOC Certificate
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Point Balance</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingPointBalance ? "..." : userPointBalance}
              </div>
              <p className="text-xs text-muted-foreground">
                Available points for applications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userApplications.length}</div>
              <p className="text-xs text-muted-foreground">
                Applications submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
              <p className="text-xs text-muted-foreground">
                Under review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedApplications.length}</div>
              <p className="text-xs text-muted-foreground">
                Ready for download
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Application Management</CardTitle>
            <CardDescription>Manage your applications and search for certificates by application number.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="my-applications" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-applications">
                  My Applications ({userApplications.length})
                </TabsTrigger>
                <TabsTrigger value="search-applications">
                  Search Applications
                </TabsTrigger>
              </TabsList>

              {/* My Applications Tab */}
              <TabsContent value="my-applications" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Your Applications</h3>
                  <Button 
                    onClick={() => navigate('/apply')}
                    className="bg-primary text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Application
                  </Button>
                </div>

                {isLoadingUserApplications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading your applications...</div>
                  </div>
                ) : userApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Applicant Name</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.applicant_name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {app.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadCertificate(app.id, app.application_number)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No applications submitted yet</p>
                    <Button 
                      onClick={() => navigate('/apply')}
                      className="bg-primary text-primary-foreground"
                    >
                      Submit Your First Application
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Search Applications Tab */}
              <TabsContent value="search-applications" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-4">Search Application by Number</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter any application number to search and download the certificate if available.
                  </p>
                  
                  <form onSubmit={handleSearchApplication} className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="searchAppNumber">Application Number</Label>
                        <Input
                          id="searchAppNumber"
                          value={searchApplicationNumber}
                          onChange={(e) => setSearchApplicationNumber(e.target.value)}
                          placeholder="Enter application number (e.g., NOC-2024-001234)"
                          className="font-mono"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="submit" 
                          disabled={isSearching}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSearching ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Searching...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Search
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Search Results */}
                  {searchResult && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-base">Search Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-semibold">Application Number</Label>
                            <p className="text-sm font-mono">{searchResult.application_number}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Applicant Name</Label>
                            <p className="text-sm">{searchResult.applicant_name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Village</Label>
                            <p className="text-sm">{searchResult.village_name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Status</Label>
                            <div className="mt-1">{getStatusBadge(searchResult.status)}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {searchResult.status === 'approved' ? (
                            <Button
                              onClick={() => handleDownloadCertificate(searchResult.id, searchResult.application_number)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download Certificate
                            </Button>
                          ) : (
                            <div className="flex items-center text-muted-foreground">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Certificate not yet available
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;
