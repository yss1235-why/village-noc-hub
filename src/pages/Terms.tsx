import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Terms = () => {
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
              <FileText className="h-6 w-6" />
              <h1 className="text-xl font-bold">Terms and Conditions</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Important Notice */}
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> By using this Online NOC Platform, you agree to comply with these terms and conditions. 
              Please read carefully before proceeding with any applications or services.
            </AlertDescription>
          </Alert>

          {/* Terms Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Terms and Conditions of Use
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-IN')}</p>
                <p><strong>Effective Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <div className="space-y-6">

                {/* Section 1 */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">1. ACCEPTANCE OF TERMS</h2>
                  <p className="text-muted-foreground mb-4">
                    By accessing, browsing, or using this Online NOC (No Objection Certificate) platform ("the Platform"), 
                    you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"). 
                    If you do not agree to these Terms, please discontinue use of the Platform immediately.
                  </p>
                </section>

                {/* Section 2 */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">2. PLATFORM DESCRIPTION</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">2.1 Service Overview</h3>
                  <p className="text-muted-foreground mb-3">This Platform provides digital services for:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Application Submission:</strong> Online submission of NOC applications to registered village authorities</li>
                    <li><strong>Document Management:</strong> Secure handling and storage of identity documents and certificates</li>
                    <li><strong>Certificate Issuance:</strong> Generation of official NOC certificates in PDF format</li>
                    <li><strong>Digital Verification:</strong> Online verification of issued certificates through unique verification URLs and QR codes</li>
                    <li><strong>Administrative Tools:</strong> Dashboard access for authorized village officials (Headmen/Chairmen)</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">2.2 Authorized Issuing Bodies</h3>
                  <p className="text-muted-foreground mb-4">NOC certificates are issued exclusively by:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Registered village authorities</li>
                    <li>Authorized Headmen/Chairmen of approved villages</li>
                    <li>Duly appointed village administrators with verified credentials</li>
                  </ul>
                </section>

                {/* Section 3 */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">3. USER CATEGORIES AND ELIGIBILITY</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">3.1 Applicants</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Must be at least 18 years of age or have legal guardian consent</li>
                    <li>Must provide accurate and truthful information</li>
                    <li>Must be a genuine resident or have legitimate connection to the village jurisdiction</li>
                    <li>Must possess valid government-issued identity documents</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">3.2 Village Administrators</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Must be officially appointed Headmen/Chairmen or authorized village officials</li>
                    <li>Must complete registration and verification process</li>
                    <li>Subject to approval by system administrators</li>
                    <li>Responsible for maintaining accuracy and legitimacy of issued certificates</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">3.3 Verification Users</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Any individual or organization seeking to verify certificate authenticity</li>
                    <li>No registration required for verification services</li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">4. APPLICATION PROCESS AND REQUIREMENTS</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">4.1 Required Information</h3>
                  <p className="text-muted-foreground mb-2">Applicants must provide:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Personal Details:</strong> Full name, title, relation details (father/mother/husband/guardian name)</li>
                    <li><strong>Address Information:</strong> Complete address including house number, village, post office, police station, sub-division, district, state, PIN code</li>
                    <li><strong>Identity Information:</strong> Tribe, religion, annual income details</li>
                    <li><strong>Supporting Documents:</strong> Valid Aadhaar card, passport-size photograph</li>
                    <li><strong>Purpose Declaration:</strong> Clear statement of NOC requirement purpose</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">4.2 Document Standards</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>File Formats:</strong> JPG, PNG, or PDF formats only</li>
                    <li><strong>File Size:</strong> Maximum 5MB per document</li>
                    <li><strong>Image Quality:</strong> Clear, legible scans or photographs</li>
                    <li><strong>Authenticity:</strong> All documents must be genuine and unaltered</li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">5. CERTIFICATE FEATURES AND VALIDITY</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">5.1 Digital Certificate Components</h3>
                  <p className="text-muted-foreground mb-2">Each issued NOC certificate includes:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Official Content:</strong> Formatted text with applicant details and official statement</li>
                    <li><strong>Security Features:</strong> Village letterhead, official signatures, and seals</li>
                    <li><strong>Verification Elements:</strong> Unique application number, QR code, and verification URL</li>
                    <li><strong>Timestamps:</strong> Issue date and approval information</li>
                    <li><strong>Authority Details:</strong> Issuing official name and designation</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">5.2 Certificate Verification</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Online Verification:</strong> Available 24/7 through verification URLs</li>
                    <li><strong>QR Code Access:</strong> Instant verification via QR code scanning</li>
                    <li><strong>Database Cross-Reference:</strong> Real-time validation against secure database records</li>
                    <li><strong>Fraud Detection:</strong> Automated identification of invalid or tampered certificates</li>
                  </ul>
                </section>

                {/* Section 6 - Data Protection */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">6. DATA PROTECTION AND PRIVACY</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">6.1 Information Collection</h3>
                  <p className="text-muted-foreground mb-2">We collect and process:</p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Personal identification information as provided in applications</li>
                    <li>Uploaded documents and photographs</li>
                    <li>Application processing data and status information</li>
                    <li>System access logs and usage analytics</li>
                    <li>Communication records between users and administrators</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">6.2 Data Security</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Encryption:</strong> All data transmissions use SSL/TLS encryption</li>
                    <li><strong>Access Control:</strong> Role-based access restrictions for sensitive information</li>
                    <li><strong>Audit Trails:</strong> Comprehensive logging of all system activities</li>
                    <li><strong>Regular Backups:</strong> Secure data backup and recovery procedures</li>
                  </ul>
                </section>

                {/* Section 7 - User Responsibilities */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">7. USER RESPONSIBILITIES</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">7.1 Applicant Responsibilities</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Provide accurate, complete, and truthful information</li>
                    <li>Upload genuine, unaltered documents</li>
                    <li>Maintain confidentiality of application numbers and certificates</li>
                    <li>Use certificates only for legitimate, lawful purposes</li>
                    <li>Promptly report any suspected misuse or security breaches</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">7.2 Administrator Responsibilities</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li>Verify applicant information thoroughly before approval</li>
                    <li>Maintain impartiality and fairness in application processing</li>
                    <li>Protect confidential applicant information</li>
                    <li>Use administrative access solely for official purposes</li>
                    <li>Ensure proper security of login credentials and digital assets</li>
                  </ul>
                </section>

                {/* Section 8 - Prohibited Uses */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">8. PROHIBITED USES AND CONDUCT</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">8.1 Strictly Prohibited Activities</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                    <li><strong>Fraudulent Applications:</strong> Submitting false information or forged documents</li>
                    <li><strong>Identity Impersonation:</strong> Applying on behalf of another person without authorization</li>
                    <li><strong>Certificate Tampering:</strong> Altering, modifying, or reproducing issued certificates</li>
                    <li><strong>System Manipulation:</strong> Attempting to hack, disrupt, or compromise Platform security</li>
                    <li><strong>Unauthorized Access:</strong> Accessing accounts, data, or functions without proper authorization</li>
                  </ul>
                </section>

                {/* Section 9 - Contact Information */}
                <section>
                  <h2 className="text-xl font-bold text-primary mb-3">9. CONTACT INFORMATION</h2>
                  <p className="text-muted-foreground mb-2">
                    For questions, concerns, or technical support regarding these Terms or Platform services:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p><strong>Platform Developer:</strong> Innovative Archive</p>
                    <p><strong>Technical Support:</strong> [Contact details to be provided]</p>
                    <p><strong>Administrative Inquiries:</strong> [Contact details to be provided]</p>
                  </div>
                </section>

                {/* Final Notice */}
                <div className="bg-primary/10 p-6 rounded-lg border-2 border-primary/20">
                  <p className="text-center font-semibold">
                    <strong>By using this Platform, you acknowledge that you have read, understood, and agree to comply with these Terms and Conditions. These Terms are legally binding and enforceable to the full extent permitted by law.</strong>
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Terms;
