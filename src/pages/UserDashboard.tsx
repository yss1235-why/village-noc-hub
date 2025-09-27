import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, FileText, Search, Download, Plus, Clock, CheckCircle, XCircle, User, AlertCircle, History, Filter, Calendar, TrendingUp, TrendingDown, Gift, CreditCard } from "lucide-react";
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
 

// Point transactions state
const [pointTransactions, setPointTransactions] = useState([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
const [transactionFilters, setTransactionFilters] = useState({
  type: 'all',
  startDate: '',
  endDate: ''
});

 

  // Redirect if not authenticated and auto-load data
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    
    // Auto-load data when authenticated
loadUserApplications();
loadPointTransactions();
   
  }, [isAuthenticated, user, navigate]);
  
const loadUserApplications = async () => {
    if (!user?.id) return;
    
    setIsLoadingUserApplications(true);
    try {
     const token = localStorage.getItem('auth-token');
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

const loadPointTransactions = async () => {
  if (!user?.id) return;
  
  setIsLoadingTransactions(true);
  try {
    const token = localStorage.getItem('auth-token');
    const params = new URLSearchParams();
    
   if (transactionFilters.type && transactionFilters.type !== 'all') params.append('type', transactionFilters.type);
    if (transactionFilters.startDate) params.append('startDate', transactionFilters.startDate);
    if (transactionFilters.endDate) params.append('endDate', transactionFilters.endDate);
    
    const response = await fetch(`/.netlify/functions/get-point-transactions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    if (response.ok) {
      setPointTransactions(result.transactions || []);
    } else {
      console.error('Failed to load transactions:', result.error);
      toast({
        title: "Error",
        description: "Failed to load point transactions.",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error('Failed to load transactions:', error);
    toast({
      title: "Error",
      description: "Failed to connect to server.",
      variant: "destructive",
    });
  } finally {
    setIsLoadingTransactions(false);
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
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
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
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
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
  const exportTransactions = (format = 'csv') => {
  if (pointTransactions.length === 0) {
    toast({
      title: "No Data",
      description: "No transactions available to export.",
      variant: "destructive",
    });
    return;
  }

  const headers = ['Date', 'Type', 'Amount', 'Previous Balance', 'New Balance', 'Reason', 'Application Number'];
  const data = pointTransactions.map(transaction => [
    new Date(transaction.created_at).toLocaleString(),
    transaction.type,
    transaction.amount,
    transaction.previous_balance,
    transaction.new_balance,
    transaction.reason,
    transaction.application_number || 'N/A'
  ]);

  if (format === 'csv') {
    const csvContent = [headers, ...data]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `point-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  toast({
    title: "Export Complete",
    description: `Transactions exported successfully as ${format.toUpperCase()}.`,
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
        {/* Low Balance Warning */}
        {(user?.pointBalance || 0) < 30 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-800">Low Point Balance</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    You have {user?.pointBalance || 0} points remaining. Consider redeeming a voucher to add more points for future applications.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 border-amber-600 text-amber-700 hover:bg-amber-100"
                    onClick={() => navigate('/user/vouchers')}
                  >
                    <Gift className="h-3 w-3 mr-1" />
                    Redeem Voucher
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Button 
            onClick={() => navigate('/apply')}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Apply for New NOC Certificate
          </Button>
          <Button 
            onClick={() => navigate('/user/vouchers')}
            size="lg"
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Gift className="h-5 w-5 mr-2" />
            Redeem Vouchers
          </Button>
        </div>

       {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-50" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Point Balance</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700">
                {(user?.pointBalance || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Available for NOC applications
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">
                  {Math.floor((user?.pointBalance || 0) / 15)} applications possible
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">15 points each</span>
              </div>
              {(user?.pointBalance || 0) < 30 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 w-full text-xs"
                  onClick={() => navigate('/user/vouchers')}
                >
                  <Gift className="h-3 w-3 mr-1" />
                  Redeem Voucher
                </Button>
              )}
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
           <Tabs defaultValue="applications" className="w-full">
             <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="applications">My Applications</TabsTrigger>
                <TabsTrigger value="search">Search Applications</TabsTrigger>
                <TabsTrigger value="transactions">Point History</TabsTrigger>
                <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
              </TabsList>
              {/* My Applications Tab */}
            <TabsContent value="applications" className="space-y-4">
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

<TabsContent value="transactions">
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Point Transaction History
          </CardTitle>
          <CardDescription>
            View your complete point transaction history with filters and export options
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTransactions('csv')}
            disabled={pointTransactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <Label htmlFor="transactionType">Transaction Type</Label>
          <Select 
            value={transactionFilters.type} 
            onValueChange={(value) => setTransactionFilters(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
           <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ADD">Credits</SelectItem>
              <SelectItem value="DEDUCT">Debits</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            type="date"
            value={transactionFilters.startDate}
            onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            type="date"
            value={transactionFilters.endDate}
            onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
        
        <div className="flex items-end gap-2">
          <Button onClick={loadPointTransactions} disabled={isLoadingTransactions}>
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
          <Button 
            variant="outline" 
           onClick={() => {
              setTransactionFilters({ type: 'all', startDate: '', endDate: '' });
              loadPointTransactions();
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Transaction Table */}
      {isLoadingTransactions ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : pointTransactions.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pointTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(transaction.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === 'ADD' ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <Badge className="bg-green-100 text-green-800">Credit</Badge>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <Badge className="bg-red-100 text-red-800">Debit</Badge>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`font-semibold ${transaction.type === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'ADD' ? '+' : ''}{transaction.amount}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.new_balance}
                  </TableCell>
                  <TableCell>{transaction.reason}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.application_number || 'System'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
          <p className="text-muted-foreground">
            No point transactions match your current filters.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

              {/* Search Applications Tab */}
          <TabsContent value="search" className="space-y-4">
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

              {/* Vouchers Tab */}
              <TabsContent value="vouchers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Voucher Redemption</h3>
                    <p className="text-sm text-muted-foreground">
                      Redeem voucher codes to add points to your account
                    </p>
                  </div>
                  <Button onClick={() => navigate('/user/vouchers')}>
                    <Gift className="h-4 w-4 mr-2" />
                    Go to Voucher Page
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Current Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-700">
                        {(user?.pointBalance || 0).toLocaleString()} points
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Available for NOC applications
                      </p>
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span>Applications possible:</span>
                            <span className="font-semibold">{Math.floor((user?.pointBalance || 0) / 15)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Cost per application:</span>
                            <span>15 points</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-green-600" />
                        Redeem Voucher
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="quick-voucher">Voucher Code</Label>
                          <Input
                            id="quick-voucher"
                            placeholder="Enter voucher code..."
                            className="font-mono"
                          />
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => navigate('/user/vouchers')}
                        >
                          Go to Redemption Page
                        </Button>
                      </div>
                      
                      <div className="mt-4 text-xs text-muted-foreground space-y-1">
                        <p>• Vouchers are assigned to your account</p>
                        <p>• Minimum value: 500 points (₹500)</p>
                        <p>• Vouchers expire after 30 days</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-blue-800">About Vouchers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-blue-700 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Vouchers are issued by system administrators to add points to your account</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Each voucher has a minimum value of 500 points (₹500)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Vouchers are assigned specifically to your account and expire after 30 days</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <p>Use points to submit NOC applications (15 points per application)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;
