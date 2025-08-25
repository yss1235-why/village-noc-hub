import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LetterheadCropInterface from '@/components/LetterheadCropInterface';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, XCircle, Clock, Eye, FileText, Users, AlertCircle, Settings, EyeOff, ChevronDown, Key, Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get logged-in village info
  const [villageInfo, setVillageInfo] = useState(() => {
    const stored = localStorage.getItem('villageAdmin');
    return stored ? JSON.parse(stored) : null;
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!villageInfo) {
      navigate('/admin');
    } else {
      loadApplications();
      loadProfileInfo();
    }
  }, [villageInfo, navigate]);

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

// Village info state
  const [showVillageInfo, setShowVillageInfo] = useState(false);
 const [villageForm, setVillageForm] = useState({
    villageName: "",
    district: "",
    state: "",
    pinCode: "",
    postOffice: "",
    policeStation: "",
    subDivision: "",
    adminName: "",
    adminEmail: ""
  });
  const [isUpdatingVillage, setIsUpdatingVillage] = useState(false);
  const [isLoadingVillageInfo, setIsLoadingVillageInfo] = useState(false);

  // Document management state
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [documents, setDocuments] = useState({
    letterhead: null,
    signature: null,
    seal: null,
    roundSeal: null
  });
  const [documentFiles, setDocumentFiles] = useState({
    letterhead: null as File | null,
    signature: null as File | null,
    seal: null as File | null,
    roundSeal: null as File | null
  });
  const [showLetterheadCrop, setShowLetterheadCrop] = useState(false);
  const [letterheadFile, setLetterheadFile] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Certificate template state
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [certificateTemplate, setCertificateTemplate] = useState("");
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  // Profile management state
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [profileForm, setProfileForm] = useState({
    adminName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showProfilePasswords, setShowProfilePasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/.netlify/functions/change-village-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          villageId: villageInfo?.villageId
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
        setShowChangePassword(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const loadVillageInfo = async () => {
    setIsLoadingVillageInfo(true);
    try {
     const response = await fetch(`/.netlify/functions/update-village-info?villageId=${villageInfo?.villageId}`);
      const result = await response.json();
      
      if (response.ok && result.village) {
       setVillageForm({
          villageName: result.village.name,
          district: result.village.district,
          state: result.village.state,
          pinCode: result.village.pin_code,
          postOffice: result.village.post_office || '',
          policeStation: result.village.police_station || '',
          subDivision: result.village.sub_division || '',
          adminName: result.village.admin_name,
          adminEmail: result.village.admin_email
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load village information.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVillageInfo(false);
    }
  };

  const handleUpdateVillageInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingVillage(true);

    try {
      const response = await fetch('/.netlify/functions/update-village-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: villageInfo?.villageId,
          villageName: villageForm.villageName,
          district: villageForm.district,
          state: villageForm.state,
          pinCode: villageForm.pinCode,
          postOffice: villageForm.postOffice || '',
          policeStation: villageForm.policeStation || '',
          subDivision: villageForm.subDivision || '',
          adminName: villageForm.adminName,
          adminEmail: villageForm.adminEmail
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Village Information Updated",
          description: "Your village information has been updated successfully.",
        });
        setShowVillageInfo(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update village information.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update village information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingVillage(false);
    }
  };

      

 const handleShowVillageInfo = () => {
    setShowVillageInfo(true);
    loadVillageInfo();
  };

  const getDefaultTemplate = () => {
   return `This is to certify that {{TITLE}} {{APPLICANT_NAME}} {{RELATION}} {{FATHER_NAME}} is an inhabitant of House no.
{{HOUSE_NUMBER}},
{{VILLAGE_NAME}} Village, Under
Post Office {{POST_OFFICE}}, Police Station {{POLICE_STATION}}
Sub-division {{SUB_DIVISION}},
{{DISTRICT}} Dist
{{STATE}} - {{PIN_CODE}}.
He/She belongs to {{TRIBE_NAME}} Tribe,
{{RELIGION}} Religion by faith.
He/She is a citizen of the {{VILLAGE_NAME}} Village by Birth.
As per the family data collected by the Village his/her annual income is
{{ANNUAL_INCOME_NUMBER}} in word {{ANNUAL_INCOME_WORDS}} only.
To the best of my knowledge and belief, He/She does not have any negative remarks in the Village record.
He/She is not related to me.

Date: {{ISSUE_DATE}}
Place: {{VILLAGE_NAME}}

{{ADMIN_NAME}}
Headman/Chairman
{{VILLAGE_NAME}}`;
  };

const loadDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/.netlify/functions/get-village-documents?villageId=${villageInfo?.villageId}`);
      const result = await response.json();
      
      if (response.ok) {
        setDocuments({
          letterhead: result.documents?.letterhead?.data || null,
          signature: result.documents?.signature?.data || null,
          seal: result.documents?.seal?.data || null,
          roundSeal: result.documents?.roundSeal?.data || null
        });
        setCertificateTemplate(result.documents?.certificateTemplate || getDefaultTemplate());
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const validatePNGFile = (file: File): boolean => {
    if (file.type !== 'image/png') {
      toast({
        title: "Invalid File Format",
        description: "Only PNG files with transparent background are accepted.",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleDocumentFileChange = (documentType: string, file: File | null) => {
    if (file && !validatePNGFile(file)) {
      return;
    }
    
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const handleDocumentUpload = async (documentType: string) => {
    const file = documentFiles[documentType];
    if (!file) return;

    setIsUploadingDocument(true);
    
    try {
      // Convert file to base64 for simple storage
      const reader = new FileReader();
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64String = reader.result as string;
            
            const response = await fetch(`/.netlify/functions/upload-village-document?villageId=${villageInfo?.villageId}&documentType=${documentType}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-village-id': villageInfo?.villageId || '',
                'x-document-type': documentType,
              },
              body: JSON.stringify({
                document: base64String,
                documentType,
                villageId: villageInfo?.villageId
              })
            });

            const result = await response.json();

            if (response.ok) {
              toast({
                title: "Document Uploaded",
                description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} has been uploaded successfully.`,
              });
              
              loadDocuments();
              setDocumentFiles(prev => ({
                ...prev,
                [documentType]: null
              }));
              resolve();
            } else {
              toast({
                title: "Upload Failed",
                description: result.error || "Failed to upload document.",
                variant: "destructive",
              });
              reject(new Error(result.error || "Upload failed"));
            }
          } catch (error) {
            toast({
              title: "Upload Failed",
              description: "Failed to upload document. Please try again.",
              variant: "destructive",
            });
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
      });
      
      reader.readAsDataURL(file);
      await uploadPromise;
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };
const handleUpdateTemplate = async () => {
  if (!certificateTemplate || certificateTemplate.trim() === '') {
    toast({
      title: "Error",
      description: "Certificate template cannot be empty. Please enter a valid template.",
      variant: "destructive",
    });
    return;
  }

  setIsUpdatingTemplate(true);
  
  try {
    const response = await fetch('/.netlify/functions/update-certificate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: villageInfo?.villageId,
          template: certificateTemplate
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Template Updated",
          description: "Certificate template has been updated successfully.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update template.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const loadProfileInfo = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-admin-profile?villageId=${villageInfo?.villageId}`);
      const result = await response.json();
      
      if (response.ok && result.profile) {
        setProfileForm(prev => ({
          ...prev,
          adminName: result.profile.adminName,
          email: result.profile.email,
          phone: result.profile.phone || ""
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile information.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (profileForm.newPassword && profileForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const response = await fetch('/.netlify/functions/update-admin-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          villageId: villageInfo?.villageId,
          adminName: profileForm.adminName,
          email: profileForm.email,
          phone: profileForm.phone,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        
        // Update local storage if email changed
        if (villageInfo.email !== profileForm.email) {
          const updatedVillageInfo = { ...villageInfo, email: profileForm.email };
          localStorage.setItem('villageAdmin', JSON.stringify(updatedVillageInfo));
          setVillageInfo(updatedVillageInfo);
        }
        
        setShowProfileManager(false);
        setProfileForm(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
 const [applications, setApplications] = useState([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
 const handleLogout = () => {
    localStorage.removeItem('villageAdmin');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const loadApplications = async () => {
    if (!villageInfo?.villageId) return;
    
    setIsLoadingApplications(true);
    try {
      const response = await fetch(`/.netlify/functions/get-village-applications?villageId=${villageInfo.villageId}`);
      const result = await response.json();
      
      if (response.ok && result.applications) {
        setApplications(result.applications);
      } else {
        console.error('Failed to load applications:', result.error);
        toast({
          title: "Error",
          description: "Failed to load applications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    try {
      const response = await fetch('/.netlify/functions/update-application-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status: 'approved',
          approvedBy: villageInfo?.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setApplications(apps => 
          apps.map(app => 
            app.id === applicationId 
              ? { ...app, status: "approved", approvedDate: new Date().toISOString() }
              : app
          )
        );
        toast({
          title: "Application Approved",
          description: `Application ${applicationId} has been approved.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve application.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      const response = await fetch('/.netlify/functions/update-application-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status: 'rejected'
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state
        setApplications(apps => 
          apps.map(app => 
            app.id === applicationId 
              ? { ...app, status: "rejected" }
              : app
          )
        );
        toast({
          title: "Application Rejected",
          description: `Application ${applicationId} has been rejected.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject application.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject application. Please try again.",
        variant: "destructive",
      });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const pendingApplications = applications.filter(app => app.status === "pending");
  const approvedApplications = applications.filter(app => app.status === "approved");
  const rejectedApplications = applications.filter(app => app.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
           <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-primary-foreground/80">
                {villageInfo?.villageName || 'Village'} - Certificate Management
              </p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { setShowProfileManager(true); loadProfileInfo(); }}>
                    <Users className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShowVillageInfo}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Village Information
                  </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => { setShowDocumentManager(true); loadDocuments(); }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Documents & Seals
                  </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => { setShowTemplateManager(true); loadDocuments(); }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Certificate Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedApplications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{rejectedApplications.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Application Management</CardTitle>
            <CardDescription>Review and manage certificate applications from villagers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                  Pending ({pendingApplications.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedApplications.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedApplications.length})
                </TabsTrigger>
              </TabsList>

<TabsContent value="pending" className="space-y-4">
                {isLoadingApplications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading applications...</div>
                  </div>
                ) : pendingApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.applicant_name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>NOC</TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(app.id)}
                                className="bg-success text-success-foreground hover:bg-success/90"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(app.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending applications</p>
                 </div>
                )}
              </TabsContent>
             <TabsContent value="approved" className="space-y-4">
              {isLoadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading applications...</div>
                </div>
              ) : approvedApplications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Approved Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.applicant_name}</p>
                            <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>NOC</TableCell>
                        <TableCell>{app.approved_at ? new Date(app.approved_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No approved applications</p>
               </div>
                )}
              </TabsContent>

             <TabsContent value="rejected" className="space-y-4">
                {isLoadingApplications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading applications...</div>
                  </div>
                ) : rejectedApplications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectedApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.applicant_name}</p>
                              <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>NOC</TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                 <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rejected applications</p>
                 </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Village Information Dialog */}
        {showVillageInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Village Information</CardTitle>
                <CardDescription>Update your village details</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVillageInfo ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading village information...</div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateVillageInfo} className="space-y-4">
                    <div>
                      <Label htmlFor="villageName">Village Name *</Label>
                      <Input
                        id="villageName"
                        value={villageForm.villageName}
                        onChange={(e) => setVillageForm({...villageForm, villageName: e.target.value})}
                        placeholder="Enter village name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="district">District *</Label>
                        <Input
                          id="district"
                          value={villageForm.district}
                          onChange={(e) => setVillageForm({...villageForm, district: e.target.value})}
                          placeholder="Enter district"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={villageForm.state}
                          onChange={(e) => setVillageForm({...villageForm, state: e.target.value})}
                          placeholder="Enter state"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pinCode">PIN Code *</Label>
                      <Input
                        id="pinCode"
                        value={villageForm.pinCode}
                        onChange={(e) => setVillageForm({...villageForm, pinCode: e.target.value})}
                        placeholder="Enter PIN code"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postOffice">Post Office (PO) *</Label>
                        <Input
                          id="postOffice"
                          value={villageForm.postOffice}
                          onChange={(e) => setVillageForm({...villageForm, postOffice: e.target.value})}
                          placeholder="Enter post office"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="policeStation">Police Station (PS) *</Label>
                        <Input
                          id="policeStation"
                          value={villageForm.policeStation}
                          onChange={(e) => setVillageForm({...villageForm, policeStation: e.target.value})}
                          placeholder="Enter police station"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subDivision">Sub-district *</Label>
                      <Input
                        id="subDivision"
                        value={villageForm.subDivision}
                        onChange={(e) => setVillageForm({...villageForm, subDivision: e.target.value})}
                        placeholder="Enter sub-district"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminName">Admin Name *</Label>
                      <Input
                        id="adminName"
                        value={villageForm.adminName}
                        onChange={(e) => setVillageForm({...villageForm, adminName: e.target.value})}
                        placeholder="Enter admin name"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="adminEmail">Admin Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={villageForm.adminEmail}
                        onChange={(e) => setVillageForm({...villageForm, adminEmail: e.target.value})}
                        placeholder="Enter admin email"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowVillageInfo(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isUpdatingVillage}
                        className="flex-1"
                      >
                        {isUpdatingVillage ? "Updating..." : "Update Information"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

       {/* Profile Manager Dialog */}
        {showProfileManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Update your personal information and password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="adminName">Full Name *</Label>
                    <Input
                      id="adminName"
                      value={profileForm.adminName}
                      onChange={(e) => setProfileForm({...profileForm, adminName: e.target.value})}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Change Password (Optional)</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showProfilePasswords.current ? "text" : "password"}
                            value={profileForm.currentPassword}
                            onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowProfilePasswords({...showProfilePasswords, current: !showProfilePasswords.current})}
                          >
                            {showProfilePasswords.current ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showProfilePasswords.new ? "text" : "password"}
                            value={profileForm.newPassword}
                            onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowProfilePasswords({...showProfilePasswords, new: !showProfilePasswords.new})}
                          >
                            {showProfilePasswords.new ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showProfilePasswords.confirm ? "text" : "password"}
                            value={profileForm.confirmPassword}
                            onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                            placeholder="Confirm new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowProfilePasswords({...showProfilePasswords, confirm: !showProfilePasswords.confirm})}
                          >
                            {showProfilePasswords.confirm ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowProfileManager(false);
                        setProfileForm(prev => ({
                          ...prev,
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        }));
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isUpdatingProfile}
                      className="flex-1"
                    >
                      {isUpdatingProfile ? "Updating..." : "Update Profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Change Password Dialog */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        placeholder="Enter current password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword}
                      className="flex-1"
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
       )}

        {/* Document Management Dialog */}
        {showDocumentManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Documents & Seals Management</CardTitle>
                <CardDescription>
                  Upload and manage your village documents and seals. Only PNG files with transparent background are accepted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">Loading documents...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
{/* Letterhead Section */}
<div className="border rounded-lg p-4">
  <h4 className="font-medium mb-4 flex items-center gap-2">
    <FileText className="h-4 w-4" />
    Village Letterhead
  </h4>
  
  {!showLetterheadCrop ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="letterhead">Upload New Letterhead</Label>
        <Input
          id="letterhead"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLetterheadFile(file);
              setShowLetterheadCrop(true);
            }
          }}
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground mb-2">
          Will be cropped to 800x200 pixels at 300 DPI for optimal quality
        </p>
      </div>
      <div>
        <Label>Current Letterhead</Label>
        <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center bg-muted/10">
          {documents.letterhead ? (
            <img
              src={documents.letterhead}
              alt="Village Letterhead"
              className="max-w-full max-h-[150px] object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No letterhead uploaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <LetterheadCropInterface 
      imageFile={letterheadFile}
      onCropComplete={(croppedBlob) => {
        const croppedFile = new File([croppedBlob], letterheadFile.name, {
          type: 'image/png'
        });
        setDocumentFiles(prev => ({ ...prev, letterhead: croppedFile }));
        setShowLetterheadCrop(false);
        setLetterheadFile(null);
      }}
      onCancel={() => {
        setShowLetterheadCrop(false);
        setLetterheadFile(null);
      }}
    />
  )}
</div>

                    {/* Signature Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Official Signature
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="signature">Upload New Signature (PNG only)</Label>
                          <Input
                            id="signature"
                            type="file"
                            accept=".png"
                            onChange={(e) => handleDocumentFileChange('signature', e.target.files?.[0] || null)}
                            className="mb-2"
                          />
                          <p className="text-xs text-muted-foreground mb-2">
                            PNG format with transparent background, max 5MB
                          </p>
                          {documentFiles.signature && (
                            <Button
                              onClick={() => handleDocumentUpload('signature')}
                              disabled={isUploadingDocument}
                              size="sm"
                            >
                              {isUploadingDocument ? "Uploading..." : "Upload Signature"}
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Current Signature</Label>
                          <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center bg-muted/10">
                            {documents.signature ? (
                              <img
                                src={documents.signature}
                                alt="Official Signature"
                                className="max-w-full max-h-[150px] object-contain"
                              />
                            ) : (
                              <div className="text-center text-muted-foreground">
                                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No signature uploaded</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Official Seal Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Official Seal
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="seal">Upload New Seal (PNG only)</Label>
                          <Input
                            id="seal"
                            type="file"
                            accept=".png"
                            onChange={(e) => handleDocumentFileChange('seal', e.target.files?.[0] || null)}
                            className="mb-2"
                          />
                          <p className="text-xs text-muted-foreground mb-2">
                            PNG format with transparent background, max 5MB
                          </p>
                          {documentFiles.seal && (
                            <Button
                              onClick={() => handleDocumentUpload('seal')}
                              disabled={isUploadingDocument}
                              size="sm"
                            >
                              {isUploadingDocument ? "Uploading..." : "Upload Seal"}
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Current Seal</Label>
                          <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center bg-muted/10">
                            {documents.seal ? (
                              <img
                                src={documents.seal}
                                alt="Official Seal"
                                className="max-w-full max-h-[150px] object-contain"
                              />
                            ) : (
                              <div className="text-center text-muted-foreground">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No seal uploaded</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Round Seal Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Round Official Seal
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="roundSeal">Upload New Round Seal (PNG only)</Label>
                          <Input
                            id="roundSeal"
                            type="file"
                            accept=".png"
                            onChange={(e) => handleDocumentFileChange('roundSeal', e.target.files?.[0] || null)}
                            className="mb-2"
                          />
                          <p className="text-xs text-muted-foreground mb-2">
                            PNG format with transparent background, max 5MB
                          </p>
                          {documentFiles.roundSeal && (
                            <Button
                              onClick={() => handleDocumentUpload('roundSeal')}
                              disabled={isUploadingDocument}
                              size="sm"
                            >
                              {isUploadingDocument ? "Uploading..." : "Upload Round Seal"}
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Current Round Seal</Label>
                          <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center bg-muted/10">
                            {documents.roundSeal ? (
                              <img
                                src={documents.roundSeal}
                                alt="Round Official Seal"
                                className="max-w-full max-h-[150px] object-contain"
                              />
                            ) : (
                              <div className="text-center text-muted-foreground">
                                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No round seal uploaded</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDocumentManager(false);
                          setDocumentFiles({
                            letterhead: null,
                            signature: null,
                            seal: null,
                            roundSeal: null
                          });
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Certificate Template Manager Dialog */}
        {showTemplateManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Certificate Template Manager</CardTitle>
                <CardDescription>
                  Customize your NOC certificate template. Use placeholders that will be replaced with actual values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="certificateTemplate">NOC Certificate Template</Label>
                    <textarea
                      id="certificateTemplate"
                      value={certificateTemplate}
                      onChange={(e) => setCertificateTemplate(e.target.value)}
                      className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm resize-vertical"
                      placeholder="Enter your certificate template here..."
                      spellCheck={false}  // Add this line
                      autoComplete="off"  // Add this line
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateTemplate}
                      disabled={isUpdatingTemplate}
                    >
                      {isUpdatingTemplate ? "Updating..." : "Update Template"}
                    </Button>
                    <Button
                      onClick={() => setCertificateTemplate(getDefaultTemplate())}
                      variant="outline"
                    >
                      Reset to Default
                    </Button>
                  </div>

                  {/* Available Placeholders */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="font-medium mb-3">Available Placeholders:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
  <span className="bg-white p-1 rounded">{"{{TITLE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{APPLICANT_NAME}}"}</span>
  <span className="bg-white p-1 rounded">{"{{FATHER_NAME}}"}</span>
  <span className="bg-white p-1 rounded">{"{{RELATION}}"}</span>
  <span className="bg-white p-1 rounded">{"{{HOUSE_NUMBER}}"}</span>
  <span className="bg-white p-1 rounded">{"{{ADDRESS}}"}</span>
  <span className="bg-white p-1 rounded">{"{{VILLAGE_NAME}}"}</span>
  <span className="bg-white p-1 rounded">{"{{POST_OFFICE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{POLICE_STATION}}"}</span>
  <span className="bg-white p-1 rounded">{"{{SUB_DIVISION}}"}</span>
  <span className="bg-white p-1 rounded">{"{{DISTRICT}}"}</span>
  <span className="bg-white p-1 rounded">{"{{STATE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{PIN_CODE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{TRIBE_NAME}}"}</span>
  <span className="bg-white p-1 rounded">{"{{RELIGION}}"}</span>
  <span className="bg-white p-1 rounded">{"{{ANNUAL_INCOME_NUMBER}}"}</span>
  <span className="bg-white p-1 rounded">{"{{ANNUAL_INCOME_WORDS}}"}</span>
  <span className="bg-white p-1 rounded">{"{{PURPOSE_OF_NOC}}"}</span>
  <span className="bg-white p-1 rounded">{"{{PHONE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{EMAIL}}"}</span>
  <span className="bg-white p-1 rounded">{"{{ISSUE_DATE}}"}</span>
  <span className="bg-white p-1 rounded">{"{{ADMIN_NAME}}"}</span>
  <span className="bg-white p-1 rounded">{"{{APPLICATION_NUMBER}}"}</span>
</div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTemplateManager(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
