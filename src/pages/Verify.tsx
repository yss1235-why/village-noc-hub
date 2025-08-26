import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Shield, Calendar, MapPin, User, IndianRupee } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Certificate {
  applicationNumber: string;
  applicantName: string;
  title: string;
  relation: string;
  tribe: string;
  religion: string;
  annualIncome: string;
  villageName: string;
  district: string;
  state: string;
  adminName: string;
  approvedDate: string;
  issueDate: string;
}

const Verify = () => {
  const { applicationNumber } = useParams<{ applicationNumber: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (applicationNumber) {
      verifyApplication();
    }
  }, [applicationNumber]);

  const verifyApplication = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/.netlify/functions/verify-certificate?applicationNumber=${applicationNumber}`);
      const result = await response.json();

      if (response.ok) {
        setIsValid(result.valid);
        if (result.valid && result.certificate) {
          setCertificate(result.certificate);
        } else {
          setError(result.message || 'Certificate not found or invalid');
        }
      } else {
        setIsValid(false);
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setIsValid(false);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(amount));
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
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-bold">Certificate Verification</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Application Number Display */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Verifying Application</h2>
                <code className="bg-muted px-3 py-1 rounded text-lg font-mono">
                  {applicationNumber}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Verifying certificate...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {!isLoading && (isValid === false || error) && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-destructive mb-2">Invalid Certificate</h3>
                  <p className="text-muted-foreground mb-4">
                    {error || 'This certificate could not be verified in our records.'}
                  </p>
                  <Alert className="border-amber-200 bg-amber-50 max-w-md mx-auto">
                    <AlertDescription className="text-amber-800">
                      This may indicate a fraudulent document or the certificate may not have been issued by our system.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid Certificate Display */}
          {!isLoading && isValid && certificate && (
            <div className="space-y-6">
              {/* Verification Status */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center py-4">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700 mb-2">✅ Certificate Verified</h3>
                    <p className="text-green-600">
                      This is a genuine NOC certificate issued by {certificate.villageName} Village Authority.
                    </p>
                    <Badge variant="default" className="mt-3 bg-green-600">
                      AUTHENTIC DOCUMENT
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Certificate Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Certificate Details
                  </CardTitle>
                  <CardDescription>
                    Official information from {certificate.villageName} Village Authority
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Personal Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-primary">Personal Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-muted-foreground">Full Name</span>
                          <p className="font-medium">{certificate.title} {certificate.applicantName}</p>
                        </div>
                        {certificate.relation && (
                          <div>
                            <span className="text-sm text-muted-foreground">Relation</span>
                            <p className="font-medium">{certificate.relation}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-muted-foreground">Tribe</span>
                          <p className="font-medium">{certificate.tribe}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Religion</span>
                          <p className="font-medium">{certificate.religion}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-primary">Administrative Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-muted-foreground">Annual Income</span>
                          <p className="font-medium flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {formatCurrency(certificate.annualIncome)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Issued By</span>
                          <p className="font-medium">{certificate.adminName}</p>
                          <p className="text-sm text-muted-foreground">Headman/Chairman</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div>
                    <h4 className="font-semibold mb-3 text-primary flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location Details
                    </h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="font-medium">{certificate.villageName} Village</p>
                      <p className="text-sm text-muted-foreground">
                        {certificate.district} District, {certificate.state}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <h4 className="font-semibold mb-3 text-primary flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Important Dates
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-3 rounded">
                        <span className="text-sm text-muted-foreground">Application Date</span>
                        <p className="font-medium">{formatDate(certificate.issueDate)}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded">
                        <span className="text-sm text-muted-foreground">Approval Date</span>
                        <p className="font-medium">{formatDate(certificate.approvedDate)}</p>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Verification Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Verification Notice:</strong> This certificate has been verified against our secure database. 
                  The information displayed above matches our official records. This verification was performed on {new Date().toLocaleDateString('en-IN')}.
                </AlertDescription>
              </Alert>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Verify;
