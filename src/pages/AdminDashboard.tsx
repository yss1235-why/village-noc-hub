import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, XCircle, Clock, Eye, FileText, Users, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
      </main>
    </div>
  );
};

export default AdminDashboard;