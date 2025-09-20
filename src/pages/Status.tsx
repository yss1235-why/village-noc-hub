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
  if (!applicationNumber.trim()) {
    alert('Please enter an application number');
    return;
  }

  setIsLoading(true);
  setSearchResult(null);
  
  try {
    console.log('Searching for application:', applicationNumber);
    
    const response = await fetch(`/.netlify/functions/applications?applicationNumber=${encodeURIComponent(applicationNumber.trim())}`);
    const result = await response.json();
    
    console.log('API Response:', result);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      if (result.application) {
        if (!result.application.id) {
          console.error('Application found but missing ID:', result.application);
          alert('Application found but has data issues. Please contact support.');
          return;
        }
        
        setSearchResult({
          applicationId: result.application.id,
          applicationNumber: result.application.application_number,
          name: result.application.applicant_name,
          fatherName: result.application.father_name,
          certificateType: "NOC",
          status: result.application.status,
          submittedDate: result.application.created_at,
          approvedDate: result.application.approved_at,
          approvedBy: result.application.approved_by ? "Village Admin" : null,
          villageName: result.application.village_name,
          rejectionReason: result.application.admin_notes
        });
        
        console.log('Search successful, applicationId:', result.application.id);
      } else {
        console.log('No application found for number:', applicationNumber);
        alert(`No application found with number: ${applicationNumber}`);
      }
    } else {
      console.error('API Error:', result);
      alert(`Search failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Search error:', error);
    alert('Network error. Please check your connection and try again.');
  } finally {
    setIsLoading(false);
  }
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
const handleDownload = async () => {
  if (!searchResult) {
    alert('No application selected. Please search for an application first.');
    return;
  }
  
  if (!searchResult.applicationId) {
    console.error('Missing applicationId in searchResult:', searchResult);
    alert('Application ID not found. Please search again and contact support if the issue persists.');
    return;
  }
  
 if (searchResult.status !== 'approved') {
  alert('Certificate download not available: Your application must be approved first. Current status: ' + searchResult.status);
  return;
}
  try {
    console.log('Downloading certificate for application:', searchResult.applicationId);
    
    const response = await fetch('/.netlify/functions/generate-certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId: searchResult.applicationId
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${searchResult.applicationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Certificate downloaded successfully');
    } else {
      const errorText = await response.text();
      console.error('Certificate generation failed:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        alert(`Failed to generate certificate: ${errorJson.error || 'Unknown error'}`);
      } catch {
        alert(`Failed to generate certificate. Server responded with: ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    alert(`Failed to download certificate: ${error.message}`);
  }
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
              <CardDescription>Try submitting an application first, then use the application number to check status:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-muted rounded text-center">
                  <p>Submit a NOC application first to get an application number</p>
                  <p className="text-xs text-muted-foreground">Application numbers are generated automatically when you submit</p>
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

                {searchResult.status === "rejected" && searchResult.rejectionReason && (
                  <div className="pt-4 border-t">
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                          <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Application Rejected</h4>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                            <strong>Reason:</strong> {searchResult.rejectionReason}
                          </p>
                          <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-md">
                            <p className="text-xs text-red-700 dark:text-red-300">
                              <strong>What to do next:</strong> Please address the issues mentioned above and submit a new application with the corrected documents/information.
                            </p>
                          </div>
                        </div>
                      </div>
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
