import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Custom hooks
import { useAdminApplications, useAdminDocuments, useAdminProfile } from '@/hooks/admin';

// Components
import {
  AdminHeader,
  AdminStatsCards,
  ApplicationsTable,
  ApplicationReviewModal,
  ProfileManagerModal,
  ChangePasswordModal,
  ChangePinModal,
  SubAdminManagerModal,
  VillageInfoModal,
  DocumentManagerModal,
  CertificateTemplateModal,
} from '@/components/admin';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();

  // Point balance state
  const [adminPointBalance, setAdminPointBalance] = useState(0);
  const [isLoadingPointBalance, setIsLoadingPointBalance] = useState(false);

 // Modal visibility state
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showSubAdminManager, setShowSubAdminManager] = useState(false);
  const [showVillageInfo, setShowVillageInfo] = useState(false);
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Initialize custom hooks
  const applications = useAdminApplications({ villageId: user?.villageId });
  const documents = useAdminDocuments({ villageId: user?.villageId });
  const profile = useAdminProfile({ villageId: user?.villageId });

  // Load admin point balance
  const loadAdminPointBalance = async () => {
    if (!user?.id) return;
    
    setIsLoadingPointBalance(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-admin-point-balance?adminId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok) {
        setAdminPointBalance(result.pointBalance || 0);
      }
    } catch (error) {
      console.error('Error loading point balance:', error);
    } finally {
      setIsLoadingPointBalance(false);
    }
  };

  // Authentication check and initial data load
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'village_admin') {
      navigate('/admin');
    } else {
      applications.loadApplications();
      profile.loadProfileInfo();
      documents.loadDocuments();
      loadAdminPointBalance();
    }
  }, [isAuthenticated, user, navigate]);

  // Logout handler
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      navigate('/');
    }
  };

  // Settings menu handlers
  const handleShowProfile = () => {
    setShowProfileManager(true);
    profile.loadProfileInfo();
  };

  const handleShowVillageInfo = () => {
    setShowVillageInfo(true);
    profile.loadVillageInfo();
  };

  const handleShowDocuments = () => {
    setShowDocumentManager(true);
    documents.loadDocuments();
  };

 const handleShowTemplate = () => {
    setShowTemplateManager(true);
    documents.loadDocuments();
  };

  const handleShowChangePin = () => {
    setShowChangePin(true);
  };

  const handleShowSubAdminManager = () => {
    setShowSubAdminManager(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <AdminHeader
        villageName={user?.villageName || 'Village'}
        isPrimary={user?.isPrimary}
        onShowProfile={handleShowProfile}
        onShowVillageInfo={handleShowVillageInfo}
        onShowDocuments={handleShowDocuments}
        onShowTemplate={handleShowTemplate}
        onShowChangePin={handleShowChangePin}
        onShowSubAdminManager={handleShowSubAdminManager}
        onLogout={handleLogout}
      />
      <main className="container mx-auto px-4 py-8">
        <AdminStatsCards
          pointBalance={adminPointBalance}
          isLoadingPointBalance={isLoadingPointBalance}
          totalApplications={applications.applications.length}
          pendingCount={applications.pendingApplications.length}
          approvedCount={applications.approvedApplications.length}
          rejectedCount={applications.rejectedApplications.length}
        />

        <ApplicationsTable
          isLoading={applications.isLoadingApplications}
          pendingApplications={applications.pendingApplications}
          approvedApplications={applications.approvedApplications}
          rejectedApplications={applications.rejectedApplications}
          isLoadingDetails={applications.isLoadingApplicationDetails}
          onReview={applications.handleReviewApplication}
          getStatusBadgeVariant={applications.getStatusBadgeVariant}
        />

        <ApplicationReviewModal
          application={applications.selectedApplication}
          onClose={() => applications.setSelectedApplication(null)}
          rejectionRemark={applications.rejectionRemark}
          setRejectionRemark={applications.setRejectionRemark}
          isProcessing={applications.isProcessingAction}
          onApprove={applications.handleApproveApplication}
          onReject={applications.handleRejectApplication}
        />

        <ProfileManagerModal
          isOpen={showProfileManager}
          onClose={() => setShowProfileManager(false)}
          profileForm={profile.profileForm}
          setProfileForm={profile.setProfileForm}
          isUpdating={profile.isUpdatingProfile}
          onSubmit={profile.handleUpdateProfile}
          onResetPasswordFields={profile.resetProfilePasswordFields}
        />

        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          passwordForm={profile.passwordForm}
          setPasswordForm={profile.setPasswordForm}
          isChanging={profile.isChangingPassword}
          onSubmit={profile.handleChangePassword}
          onReset={profile.resetPasswordForm}
        />
        <ChangePinModal
          isOpen={showChangePin}
          onClose={() => setShowChangePin(false)}
        />

        <SubAdminManagerModal
          isOpen={showSubAdminManager}
          onClose={() => setShowSubAdminManager(false)}
          villageId={user?.villageId || ''}
        />

        <VillageInfoModal
          isOpen={showVillageInfo}
          onClose={() => setShowVillageInfo(false)}
          villageForm={profile.villageForm}
          setVillageForm={profile.setVillageForm}
          isLoading={profile.isLoadingVillageInfo}
          isUpdating={profile.isUpdatingVillage}
          onSubmit={profile.handleUpdateVillage}
        />

        <DocumentManagerModal
          isOpen={showDocumentManager}
          onClose={() => setShowDocumentManager(false)}
          documents={documents.documents}
          documentFiles={documents.documentFiles}
          setDocumentFiles={documents.setDocumentFiles}
          isLoading={documents.isLoadingDocuments}
          isUploading={documents.isUploadingDocument}
          onUploadDocument={documents.handleUploadDocument}
          onUploadCroppedDocument={documents.handleUploadCroppedDocument}
        />

        <CertificateTemplateModal
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          template={documents.certificateTemplate}
          setTemplate={documents.setCertificateTemplate}
          isUpdating={documents.isUpdatingTemplate}
          onUpdate={documents.handleUpdateTemplate}
          onReset={() => documents.setCertificateTemplate(documents.getDefaultTemplate())}
          getDefaultTemplate={documents.getDefaultTemplate}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
