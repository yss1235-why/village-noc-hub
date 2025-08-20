import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Download, Calendar, User, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Status = () => {
  const [applicationNumber, setApplicationNumber] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockApplications: Record<string, any> = {
    "ZSV20122024": {
      applicationNumber: "ZSV20122024",
      name: "John Doe",
      fatherName: "Robert Doe",
      certificateType: "Birth",
      status: "approved",
      submittedDate: "2024-12-15",
      approvedDate: "2024-12-18",
      approvedBy: "Ningthar Kashak"
    },
    "ZSV19122024": {
      applicationNumber: "ZSV19122024",
      name: "Jane Smith",
      fatherName: "Michael Smith",
      certificateType: "Resident",
      status: "pending",
      submittedDate: "2024-12-19",
      approvedDate: null,
      approvedBy: null
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const result = mockApplications[applicationNumber];
      setSearchResult(result || null);
      setIsLoading(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleDownload = () => {
    // In real implementation, this would download the actual certificate
    const link = document.createElement('a');
    link.href = '#'; // Would be actual certificate URL
    link.download = `certificate-${searchResult.applicationNumber}.pdf`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              <h1 className="text-xl font-bold">Check Application Status</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Search Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Track Your Application</CardTitle>
              <CardDescription>
                Enter your application number to check the status and download your certificate if approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="applicationNumber">Application Number</Label>
                  <Input
                    id="applicationNumber"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value)}
                    placeholder="Enter your application number (e.g., ZSV20122024)"
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={!applicationNumber || isLoading}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? "Searching..." : "Search Application"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo Applications */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Demo Application Numbers</CardTitle>
              <CardDescription>Try these sample application numbers to see different statuses:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <code>ZSV20122024</code>
                  <Badge className="bg-success text-success-foreground">Approved</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <code>ZSV19122024</code>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResult === null && applicationNumber && !isLoading && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
                  <p>No application found with number: <code>{applicationNumber}</code></p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please check your application number and try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {searchResult && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Application Details</CardTitle>
                    <CardDescription>Application #{searchResult.applicationNumber}</CardDescription>
                  </div>
                  {getStatusBadge(searchResult.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Applicant Name</p>
                        <p className="font-medium">{searchResult.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Certificate Type</p>
                        <p className="font-medium">{searchResult.certificateType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted Date</p>
                        <p className="font-medium">{new Date(searchResult.submittedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {searchResult.approvedDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Approved Date</p>
                          <p className="font-medium">{new Date(searchResult.approvedDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {searchResult.status === "approved" && (
                  <div className="pt-4 border-t">
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Approved by: {searchResult.approvedBy}
                    </p>
                  </div>
                )}

                {searchResult.status === "pending" && (
                  <div className="pt-4 border-t">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">
                        <strong>Status:</strong> Your application is being reviewed by the village headman. 
                        You will be notified once it's approved.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Status;