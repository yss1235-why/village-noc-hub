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
           <h1 className="text-3xl font-bold mb-2">Iram</h1>
          <p className="text-primary-foreground/90"> Online No Objection Certificate</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Building2 className="mx-auto h-16 w-16 text-primary mb-4" />
           <h2 className="text-2xl font-bold mb-4">Online NOC Services</h2>
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

{/* Advertisements Section - For Future Use */}
          <div className="bg-card rounded-lg p-6 shadow-sm border-2 border-dashed border-muted">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Advertisement Space</h3>
              <p className="text-sm text-muted-foreground">
                This section is reserved for future advertisements and promotional content.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
     <footer className="bg-primary text-primary-foreground py-6 mt-12">
  <div className="container mx-auto px-4">
    <div className="flex flex-col space-y-4">
      
      {/* Main Footer Content */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">Developed and designed by Innovative Archive</p>
          <p className="text-xs text-primary-foreground/70 mt-1">
            Secure Digital NOC Certificate Platform
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link to="/village/register">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              Register Your Village
            </Button>
          </Link>
          <Link to="/super-admin" className="text-xs text-primary-foreground/70 hover:text-primary-foreground/90 underline">
            System Admin
          </Link>
        </div>
      </div>

      {/* Legal Links Section */}
      <div className="border-t border-primary-foreground/20 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          {/* Legal Links */}
          <div className="flex flex-wrap gap-4 text-xs">
            <Link 
              to="/terms" 
              className="text-primary-foreground/80 hover:text-primary-foreground underline transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link 
              to="/terms#data-protection" 
              className="text-primary-foreground/80 hover:text-primary-foreground underline transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms#certificate-verification" 
              className="text-primary-foreground/80 hover:text-primary-foreground underline transition-colors"
            >
              Certificate Verification
            </Link>
            <button 
              onClick={() => window.open('/terms', '_blank')}
              className="text-primary-foreground/80 hover:text-primary-foreground underline transition-colors"
            >
              Legal Notice
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} Online NOC Platform. All rights reserved.
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-primary-foreground/20 pt-3">
        <p className="text-xs text-primary-foreground/60 text-center">
          This platform facilitates digital NOC certificate issuance by authorized village authorities. 
          Certificate authenticity can be verified through QR codes and verification URLs.
        </p>
      </div>

    </div>
  </div>
</footer>
    </div>
  );
};

export default Index;
