import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Application } from '@/hooks/admin/useAdminApplications';

interface ViewDocumentModal {
  isOpen: boolean;
  document: string | null;
  title: string;
}

interface ApplicationReviewModalProps {
  application: Application | null;
  onClose: () => void;
  rejectionRemark: string;
  setRejectionRemark: (remark: string) => void;
  isProcessing: boolean;
  onApprove: () => Promise<boolean>;
  onReject: () => Promise<boolean>;
}

export const ApplicationReviewModal = ({
  application,
  onClose,
  rejectionRemark,
  setRejectionRemark,
  isProcessing,
  onApprove,
  onReject,
}: ApplicationReviewModalProps) => {
  const [viewDocumentModal, setViewDocumentModal] = useState<ViewDocumentModal>({
    isOpen: false,
    document: null,
    title: ''
  });

  if (!application) return null;

  const handleApprove = async () => {
    const success = await onApprove();
    if (success) {
      onClose();
    }
  };

  const handleReject = async () => {
    const success = await onReject();
    if (success) {
      onClose();
    }
  };

  const openDocument = (document: string | undefined, title: string) => {
    if (document) {
      setViewDocumentModal({ isOpen: true, document, title });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Review Application - {application.application_number}</CardTitle>
            <CardDescription>
              Review the application details and uploaded documents before making a decision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Personal Information</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Title:</span>
                      <p className="font-medium">{application.title || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Full Name:</span>
                      <p className="font-medium">{application.applicant_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Father's Name:</span>
                      <p className="font-medium">{application.father_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Relation:</span>
                      <p className="font-medium">{application.relation || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">House Number:</span>
                      <p className="font-medium">{application.house_number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{application.address || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">Additional Details</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tribe:</span>
                      <p className="font-medium">{application.tribe_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Religion:</span>
                      <p className="font-medium">{application.religion || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Annual Income:</span>
                      <p className="font-medium">{application.annual_income || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Purpose:</span>
                      <p className="font-medium">{application.purpose_of_noc || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{application.phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{application.email || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">Uploaded Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {application.aadhaar_front && (
                    <div 
                      className="border rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDocument(application.aadhaar_front, 'Aadhaar Front')}
                    >
                      <p className="text-sm font-medium mb-2">Aadhaar Front</p>
                      <img 
                        src={application.aadhaar_front} 
                        alt="Aadhaar Front" 
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  )}
                  {application.aadhaar_back && (
                    <div 
                      className="border rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDocument(application.aadhaar_back, 'Aadhaar Back')}
                    >
                      <p className="text-sm font-medium mb-2">Aadhaar Back</p>
                      <img 
                        src={application.aadhaar_back} 
                        alt="Aadhaar Back" 
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  )}
                  {application.passport_photo && (
                    <div 
                      className="border rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDocument(application.passport_photo, 'Passport Photo')}
                    >
                      <p className="text-sm font-medium mb-2">Passport Photo</p>
                      <img 
                        src={application.passport_photo} 
                        alt="Passport Photo" 
                        className="w-full h-24 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionRemark">Rejection Remark (Required for rejection)</Label>
                <Input
                  id="rejectionRemark"
                  value={rejectionRemark}
                  onChange={(e) => setRejectionRemark(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {isProcessing ? 'Processing...' : 'Reject Application'}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {isProcessing ? 'Processing...' : 'Approve Application'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewDocumentModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{viewDocumentModal.title}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewDocumentModal({ isOpen: false, document: null, title: '' })}
              >
                ✕ Close
              </Button>
            </div>
            <div className="flex justify-center">
              {viewDocumentModal.document?.includes('data:application/pdf') ? (
                <div className="text-center">
                  <p className="mb-4">PDF Document - Click download to view</p>
                  <Button
                    onClick={() => window.open(viewDocumentModal.document!, '_blank')}
                    className="mb-4"
                  >
                    📄 Download PDF
                  </Button>
                </div>
              ) : (
                <img
                  src={viewDocumentModal.document!}
                  alt={viewDocumentModal.title}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
