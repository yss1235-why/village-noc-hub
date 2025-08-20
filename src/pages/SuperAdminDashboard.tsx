import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, XCircle, Clock, Crown, Building, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [villageRequests, setVillageRequests] = useState([
    {
      id: "1",
      villageName: "Zingsui Sambu Village",
      district: "Kamjong",
      state: "Manipur",
      adminName: "John Doe",
      email: "john@village1.com",
      status: "pending",
      requestDate: "2024-12-20"
    },
    {
      id: "2",
      villageName: "Sample Village 2",
      district: "Ukhrul", 
      state: "Manipur",
      adminName: "Jane Smith",
      email: "jane@village2.com",
      status: "approved",
      requestDate: "2024-12-18"
    }
  ]);

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "Super admin logged out successfully.",
    });
    navigate("/");
  };

  const handleApproveVillage = (villageId: string) => {
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
  };

  const handleRejectVillage = (villageId: string) => {
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
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Village Details</TableHead>
                      <TableHead>Admin Details</TableHead>
                      <TableHead>Status</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
