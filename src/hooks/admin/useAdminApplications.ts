import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Application {
  id: string;
  application_number: string;
  applicant_name: string;
  father_name: string;
  mother_name?: string;
  husband_name?: string;
  guardian_name?: string;
  child_name?: string;
  ward_name?: string;
  relation?: string;
  title?: string;
  house_number?: string;
  address?: string;
  tribe_name?: string;
  religion?: string;
  annual_income?: string;
  annual_income_words?: string;
  purpose_of_noc?: string;
  phone?: string;
  email?: string;
  village_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  approved_at?: string;
  aadhaar_document?: string;
  passport_photo?: string;
}

interface UseAdminApplicationsProps {
  villageId: string | undefined;
}

interface UseAdminApplicationsReturn {
  applications: Application[];
  isLoadingApplications: boolean;
  pendingApplications: Application[];
  approvedApplications: Application[];
  rejectedApplications: Application[];
  selectedApplication: Application | null;
  isLoadingApplicationDetails: boolean;
  isProcessingAction: boolean;
  rejectionRemark: string;
  setRejectionRemark: (remark: string) => void;
  setSelectedApplication: (app: Application | null) => void;
  loadApplications: () => Promise<void>;
  handleApproveApplication: () => Promise<boolean>;
  handleRejectApplication: () => Promise<boolean>;
  handleReviewApplication: (applicationId: string) => Promise<void>;
  getStatusBadgeVariant: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export const useAdminApplications = ({ villageId }: UseAdminApplicationsProps): UseAdminApplicationsReturn => {
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isLoadingApplicationDetails, setIsLoadingApplicationDetails] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rejectionRemark, setRejectionRemark] = useState('');

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const loadApplications = useCallback(async () => {
    if (!villageId) return;
    
    setIsLoadingApplications(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-village-applications?villageId=${villageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (response.ok && result.applications) {
        setApplications(result.applications);
      } else {
        console.error('Failed to load applications:', result.error);
        toast({
          title: 'Error',
          description: 'Failed to load applications.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingApplications(false);
    }
  }, [villageId, toast]);

  const handleReviewApplication = useCallback(async (applicationId: string) => {
    setIsLoadingApplicationDetails(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-application-details?applicationId=${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setSelectedApplication(result.application);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load application details.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load application details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingApplicationDetails(false);
    }
  }, [toast]);

  const handleApproveApplication = useCallback(async (): Promise<boolean> => {
    if (!selectedApplication) return false;
    
    setIsProcessingAction(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/update-application-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          status: 'approved',
          adminNotes: null
        })
      });

      const result = await response.json();

      if (response.ok) {
        setApplications(apps => 
          apps.map(app => 
            app.id === selectedApplication.id 
              ? { ...app, status: 'approved' as const, approved_at: new Date().toISOString() }
              : app
          )
        );
        toast({
          title: 'Application Approved',
          description: `Application ${selectedApplication.application_number} has been approved.`,
        });
        setSelectedApplication(null);
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve application.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve application. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  }, [selectedApplication, toast]);

  const handleRejectApplication = useCallback(async (): Promise<boolean> => {
    if (!selectedApplication || !rejectionRemark.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsProcessingAction(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/update-application-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          status: 'rejected',
          adminNotes: rejectionRemark
        })
      });

      const result = await response.json();

      if (response.ok) {
        setApplications(apps => 
          apps.map(app => 
            app.id === selectedApplication.id 
              ? { ...app, status: 'rejected' as const, admin_notes: rejectionRemark }
              : app
          )
        );
        toast({
          title: 'Application Rejected',
          description: `Application ${selectedApplication.application_number} has been rejected.`,
          variant: 'destructive',
        });
        setSelectedApplication(null);
        setRejectionRemark('');
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject application.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject application. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  }, [selectedApplication, rejectionRemark, toast]);

  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'approved':
        return 'success' as const;
      case 'pending':
        return 'secondary' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  }, []);

  return {
    applications,
    isLoadingApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    selectedApplication,
    isLoadingApplicationDetails,
    isProcessingAction,
    rejectionRemark,
    setRejectionRemark,
    setSelectedApplication,
    loadApplications,
    handleApproveApplication,
    handleRejectApplication,
    handleReviewApplication,
    getStatusBadgeVariant,
  };
};
