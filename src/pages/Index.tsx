import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Search, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="text-center">
           <h1 className="text-3xl font-bold mb-2">Multi-Village NOC System</h1>
          <p className="text-primary-foreground/90">No Objection Certificate Management</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Building2 className="mx-auto h-16 w-16 text-primary mb-4" />
           <h2 className="text-2xl font-bold mb-4">Multi-Village NOC Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Apply for No Objection Certificates (NOC) from registered villages online. 
              Track your application status and download approved certificates.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Apply for Certificate */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <FileText className="mx-auto h-12 w-12 text-primary mb-4" />
               <CardTitle>Apply for NOC</CardTitle>
                  <CardDescription>
                    Submit a new application for No Objection Certificate
                  </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/apply">
                  <Button className="w-full" size="lg">
                    Apply Now
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Check Status */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <Search className="mx-auto h-12 w-12 text-accent mb-4" />
                <CardTitle>Check Status</CardTitle>
                <CardDescription>
                  Track your application status and download certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/status">
                  <Button variant="secondary" className="w-full" size="lg">
                    Check Status
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Headman Login */}
            <Card className="border-2 hover:border-destructive/50 transition-colors">
              <CardHeader className="text-center">
                <Shield className="mx-auto h-12 w-12 text-destructive mb-4" />
                <CardTitle>Official Access</CardTitle>
                <CardDescription>
                  Headman/Chairman login for application management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/admin">
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" size="lg">
                    Admin Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Information Section */}
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Certificate Information</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">Village Details:</h4>
                <ul className="space-y-1">
                  <li>• Village: Zingsui Sambu</li>
                  <li>• Post Office: Ukhrul</li>
                  <li>• Police Station: Shangshak</li>
                  <li>• Sub-division: Sahamphung</li>
                  <li>• District: Kamjong, Manipur - 795145</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Available Services:</h4>
                  <ul className="space-y-1">
                    <li>• No Objection Certificate (NOC)</li>
                    <li>• Multi-village support</li>
                    <li>• Digital document verification</li>
                    <li>• PDF certificate download</li>
                  </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-6 mt-12">
  <div className="container mx-auto px-4">
    <div className="flex flex-col md:flex-row justify-between items-center">
      <p className="text-sm">Developed and designed by Innovative Archive</p>
      <Link to="/village/register">
        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 mt-2 md:mt-0">
          Register Your Village
        </Button>
      </Link>
    </div>
  </div>
</footer>
    </div>
  );
};

export default Index;
