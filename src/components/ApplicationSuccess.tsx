import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, FileText, Search, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApplicationSuccessProps {
  applicationNumber: string;
  onApplyNew: () => void;
  onCheckStatus: (applicationNumber: string) => void;
  onBackToHome: () => void;
}

const ApplicationSuccess: React.FC<ApplicationSuccessProps> = ({ 
  applicationNumber, 
  onApplyNew, 
  onCheckStatus, 
  onBackToHome 
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Automatically copy to clipboard when component loads
  useEffect(() => {
    if (applicationNumber) {
      copyToClipboard(applicationNumber);
    }
  }, [applicationNumber]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const handleApplyNew = () => {
    if (onApplyNew) onApplyNew();
  };

  const handleCheckStatus = () => {
    if (onCheckStatus) onCheckStatus(applicationNumber);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-green-600 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-green-700/20"
              onClick={onBackToHome}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              <h1 className="text-xl font-bold">Application Submitted</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Card */}
          <Card className="mb-6 border-green-200 bg-green-50/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Application Submitted Successfully!
              </CardTitle>
              <CardDescription className="text-green-700">
                Your NOC application has been received and is being processed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Application Number Section */}
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">Your Application Number:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(applicationNumber)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-gray-50 p-3 rounded border-2 border-dashed border-gray-300">
                  <span className="font-mono text-xl font-bold text-blue-600">
                    {applicationNumber}
                  </span>
                </div>
                {copySuccess && (
                  <Alert className="mt-2 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Application number copied to clipboard!
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  ✅ This number has been automatically copied to your clipboard for your convenience.
                </p>
              </div>

              {/* Important Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  What's Next?
                </h3>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-start">
                    <span className="font-bold mr-2 text-blue-600">1.</span>
                    <span><strong>Save your application number</strong> - You'll need it to check status and collect your certificate.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2 text-blue-600">2.</span>
                    <span><strong>Processing time</strong> - Your application will be processed within 7-10 working days.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2 text-blue-600">3.</span>
                    <span><strong>Status updates</strong> - Check your application status regularly using the number above.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2 text-blue-600">4.</span>
                    <span><strong>Email notifications</strong> - You'll receive email updates at the address you provided.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2 text-blue-600">5.</span>
                    <span><strong>Certificate collection</strong> - Once approved, you can download your NOC certificate directly from the status page.</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Button 
                  onClick={handleCheckStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Check Application Status
                </Button>
                <Button 
                  onClick={handleApplyNew}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Apply for New NOC
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How to Check Status Guide */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Search className="h-5 w-5 mr-2 text-blue-600" />
                How to Check Your Application Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">•</span>
                  <span>Visit the <strong>"Check Application Status"</strong> page from the main menu</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">•</span>
                  <span>Enter your application number: <code className="bg-gray-200 px-2 py-1 rounded font-mono">{applicationNumber}</code></span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">•</span>
                  <span>Click "Search Application" to view current status</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">•</span>
                  <span>If approved, you can download your NOC certificate as a PDF</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold mr-2 text-blue-600">•</span>
                  <span>Keep checking regularly for status updates</span>
                </div>
              </div>
              
              <Alert className="mt-4 border-amber-200 bg-amber-50">
                <Download className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Important:</strong> Save a screenshot of this page or write down your application number. 
                  You cannot retrieve it later without this information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ApplicationSuccess;
