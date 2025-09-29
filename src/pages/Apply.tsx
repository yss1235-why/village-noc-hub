import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, FileText, Upload, X, AlertTriangle, ChevronsUpDown, Check,Plus, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ApplicationSuccess from "@/components/ApplicationSuccess";
import { useNavigate } from "react-router-dom";


const Apply = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
 const { isAuthenticated, user, isLoading, refreshUser, logout } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedAppNumber, setSubmittedAppNumber] = useState('');

  // Function to convert numbers to words
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Lakh", "Crore"];

    const convertGroup = (n: number): string => {
      let result = "";
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + " ";
        return result.trim();
      }
      if (n > 0) {
        result += ones[n] + " ";
      }
      return result.trim();
    };

    let result = "";
    let groupIndex = 0;
    
    while (num > 0) {
      let group = 0;
      if (groupIndex === 0) group = num % 1000;
      else if (groupIndex === 1) group = num % 100;
      else group = num % 100;
      
      if (group !== 0) {
        const groupWords = convertGroup(group);
        result = groupWords + (thousands[groupIndex] ? " " + thousands[groupIndex] : "") + " " + result;
      }
      
      if (groupIndex === 0) num = Math.floor(num / 1000);
      else num = Math.floor(num / 100);
      groupIndex++;
    }
    
    return result.trim();
  };

  // Handle income change and auto-fill words
  const handleIncomeChange = (value: string) => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    const words = isNaN(numericValue) ? "" : numberToWords(numericValue);
    
    setFormData({
      ...formData,
      annualIncome: value,
      annualIncomeWords: words
    });
  };
const [formData, setFormData] = useState({
    salutation: "",
    name: "",
    relation: "",
    fatherName: "",
    husbandName: "",
    motherName: "",
    guardianName: "",
    childName: "",
    wardName: "",
    address: "",
    houseNumber: "",
    villageId: "",
    tribe: "",
    religion: "",
    annualIncome: "",
    annualIncomeWords: "",
    purposeOfNOC: "",
    aadhaarFile: null,
    passportFile: null,
    phone: "",
    email: "",
    termsAccepted: false,
    privacyAccepted: false,
    declarationAccepted: false
  });

const [villages, setVillages] = useState<any[]>([]);
const [searchValue, setSearchValue] = useState("");
const [isVillagesLoading, setIsVillagesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
// Validation function
const validateForm = () => {
  if (!formData.aadhaarFile || !formData.passportFile) {
    toast({
      title: "Documents Required",
      description: "Please upload both Aadhaar card and passport photo.",
      variant: "destructive",
    });
    return false;
  }
  
  if (!formData.termsAccepted) {
    toast({
      title: "Terms and Conditions Required",
      description: "Please accept the Terms and Conditions to proceed.",
      variant: "destructive",
    });
    return false;
  }

  if (!formData.privacyAccepted) {
    toast({
      title: "Privacy Policy Required", 
      description: "Please accept the Privacy Policy to proceed.",
      variant: "destructive",
    });
    return false;
  }

  // Validate relation-specific required fields
  if ((formData.relation === 'Son' || formData.relation === 'Daughter') && !formData.fatherName) {
    toast({
      title: "Father's Name Required",
      description: "Please enter father's name for Son/Daughter relation.",
      variant: "destructive",
    });
    return false;
  }

  if (formData.relation === 'Wife' && !formData.husbandName) {
    toast({
      title: "Husband's Name Required",
      description: "Please enter husband's name for Wife relation.",
      variant: "destructive",
    });
    return false;
  }

  if (formData.relation === 'Husband' && !formData.motherName) {
    toast({
      title: "Mother's Name Required",
      description: "Please enter mother's name for Husband relation.",
      variant: "destructive",
    });
    return false;
  }

  if (formData.relation === 'Father' && !formData.childName) {
    toast({
      title: "Child's Name Required",
      description: "Please enter child's name for Father relation.",
      variant: "destructive",
    });
    return false;
  }
  if (formData.relation === 'Mother' && !formData.childName) {
    toast({
      title: "Child's Name Required",
      description: "Please enter child's name for Mother relation.",
      variant: "destructive",
    });
    return false;
  }

  if (formData.relation === 'Guardian' && !formData.wardName) {
    toast({
      title: "Ward's Name Required",
      description: "Please enter ward's name for Guardian relation.",
      variant: "destructive",
    });
    return false;
  }

  if ((formData.relation === 'Ward' || formData.relation === 'Dependent') && !formData.guardianName) {
    toast({
      title: "Guardian's Name Required",
      description: "Please enter guardian's name for Ward/Dependent relation.",
      variant: "destructive",
    });
    return false;
  }

 return true;
};

// Convert file to base64
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};
useEffect(() => {
  // Load villages from database
  const loadVillages = async () => {
    setIsVillagesLoading(true);
    try {
      const response = await fetch('/.netlify/functions/villages');
      const result = await response.json();
      if (response.ok && result.villages) {
        setVillages(result.villages);
      } else {
        console.error('Failed to load villages:', result.error);
      }
    } catch (error) {
      console.error('Failed to load villages:', error);
    } finally {
      setIsVillagesLoading(false);
    }
  };
  
  loadVillages();
}, []);


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!user) {
    toast({
      title: "Authentication Required",
      description: "Please log in to submit an application.",
      variant: "destructive",
    });
    return;
  }

  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);
  
  try {
    const token = localStorage.getItem('auth-token');
    
   const payload = {
  title: formData.salutation,
  applicantName: formData.name,
  relation: formData.relation,
  fatherName: formData.fatherName,
  husbandName: formData.husbandName,
  motherName: formData.motherName,
  guardianName: formData.guardianName,
  childName: formData.childName,
  wardName: formData.wardName,
  address: formData.address,
  houseNumber: formData.houseNumber,
  villageId: formData.villageId,
  tribeName: formData.tribe,
  religion: formData.religion,
  annualIncome: formData.annualIncome,
  annualIncomeWords: formData.annualIncomeWords,
  purposeOfNOC: formData.purposeOfNOC,
  phone: formData.phone,
  email: formData.email,
  aadhaarDocument: formData.aadhaarFile ? await convertToBase64(formData.aadhaarFile) : null,
  passportPhoto: formData.passportFile ? await convertToBase64(formData.passportFile) : null
};
    const response = await fetch('/.netlify/functions/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      toast({
        title: "Application Submitted Successfully!",
        description: `Your application number is: ${result.applicationNumber}`,
      });
      
     setFormData({
  salutation: '',
  name: '',
  relation: '',
  fatherName: '',
  husbandName: '',
  motherName: '',
  guardianName: '',
  childName: '',
  wardName: '',
  address: '',
  houseNumber: '',
  villageId: '',
  tribe: '',
  religion: '',
  annualIncome: '',
  annualIncomeWords: '',
  purposeOfNOC: '',
  phone: '',
  email: '',
  aadhaarFile: null,
  passportFile: null,
  termsAccepted: false,
  privacyAccepted: false,
  declarationAccepted: false
});
      
      // Redirect to dashboard after successful submission
     setTimeout(() => {
          navigate('/userDashboard');
        }, 3000);
      
    } else {
      // ERROR OCCURRED - Check if application was actually submitted
      await checkApplicationStatus(result.error || 'Submission failed');
    }

  } catch (error) {
    console.error('Submission error:', error);
    // NETWORK ERROR - Check if application was actually submitted
    await checkApplicationStatus('Network error occurred');
  } finally {
    setIsSubmitting(false);
  }
};

// NEW FUNCTION: Check if application was submitted despite error
const checkApplicationStatus = async (originalError: string) => {
  try {
    const token = localStorage.getItem('auth-token');
    
    // Check user's recent applications and point balance
    const statusResponse = await fetch('/.netlify/functions/check-submission-status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      // Check if a recent application exists (within last 5 minutes)
      const recentApplication = statusData.recentApplications?.find((app: any) => {
        const appTime = new Date(app.created_at).getTime();
        const now = new Date().getTime();
        return (now - appTime) < 5 * 60 * 1000; // 5 minutes
      });
      
      if (recentApplication) {
        // Application was actually submitted successfully!
        toast({
          title: "Application Submitted Successfully!",
          description: `Your application number is: ${recentApplication.application_number}. Despite the error message, your application was processed.`,
        });
        
        // Clear form and redirect
       setFormData({
  salutation: '',
  name: '',
  relation: '',
  fatherName: '',
  husbandName: '',
  motherName: '',
  guardianName: '',
  childName: '',
  wardName: '',
  address: '',
  houseNumber: '',
  villageId: '',
  tribe: '',
  religion: '',
  annualIncome: '',
  annualIncomeWords: '',
  purposeOfNOC: '',
  phone: '',
  email: '',
  aadhaarFile: null,
  passportFile: null,
  termsAccepted: false,
  privacyAccepted: false,
  declarationAccepted: false
});
        
        setTimeout(() => {
         navigate('/userDashboard');
        }, 3000);
        
      } else {
        // Check if points were deducted without application submission
        if (statusData.pointsDeductedWithoutApp) {
          toast({
            title: "Processing Refund",
            description: "Points were deducted but application failed. Refunding 15 points...",
          });
          
          // Trigger refund
          await fetch('/.netlify/functions/refund-failed-application', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          toast({
            title: "Refund Completed",
            description: "15 points have been refunded to your account.",
          });
        }
        
        // Show original error
        toast({
          title: "Submission Failed",
          description: originalError,
          variant: "destructive",
        });
      }
    } else {
      // Fallback to original error
      toast({
        title: "Submission Failed",
        description: originalError,
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    // Fallback to original error
    toast({
      title: "Submission Failed",
      description: originalError,
      variant: "destructive",
    });
  }
};

// Add these handler functions
const handleApplyNew = () => {
  setShowSuccess(false);
  setSubmittedAppNumber('');
};

const handleCheckStatus = (applicationNumber: string) => {
  navigate(`/status?number=${applicationNumber}`);
};

const handleBackToHome = () => {
  navigate('/');
};

const handleLogout = async () => {
  const result = await logout();
  if (result.success) {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  }
};

// Show loading while checking authentication
if (isLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-4 pt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p>Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Show login required message if not authenticated
if (!isAuthenticated) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Login Required</CardTitle>
          <CardDescription>
            You must be logged in to submit NOC applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Please log in to your account or register if you don't have one.
          </p>
          <div className="space-y-2">
            <Link to="/login" className="w-full">
              <Button className="w-full">Login to Continue</Button>
            </Link>
            <Link to="/register" className="w-full">
              <Button variant="outline" className="w-full">Create New Account</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Show pending approval message if user not approved
if (user && !user.isApproved) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-yellow-600">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting for admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Please wait for the super admin to approve your registration before you can submit applications.
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Show insufficient points message
if (user && user.pointBalance < 15) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Insufficient Points</CardTitle>
          <CardDescription>
            You need 15 points to submit an NOC application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Current Balance: {user.pointBalance} points</p>
            <p className="text-sm text-gray-600 mt-2">Required: 15 points</p>
          </div>
          <p className="text-center text-gray-600">
            Please contact the super admin to add points to your account.
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={refreshUser}>
              Refresh Balance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Show success page if application was submitted
if (showSuccess) {
  return (
    <ApplicationSuccess 
      applicationNumber={submittedAppNumber}
      onApplyNew={handleApplyNew}
      onCheckStatus={handleCheckStatus}
      onBackToHome={handleBackToHome}
    />
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
     <header className="bg-primary text-primary-foreground py-4 shadow-lg">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
       <Link to="/userDashboard">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
            <User className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-xl font-bold">NOC Application</h1>
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{user.fullName || user.username}</p>
            <p className="text-xs text-primary-foreground/70">{user.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={async () => {
              const result = await logout();
              if (result.success) {
                toast({
                  title: "Logged Out",
                  description: "You have been successfully logged out.",
                });
                navigate("/");
              }
            }}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
    </div>
  </div>
</header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
             <CardTitle>Apply for No Objection Certificate (NOC)</CardTitle>
            <CardDescription>
              Fill in the details below to apply for your NOC. Upload required documents for verification. All fields marked with * are required.
            </CardDescription>
            
            {/* Point Balance Display */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm text-blue-600 font-medium">Your Balance</p>
                  <p className="text-2xl font-bold text-blue-800">{user?.pointBalance || 0} points</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600">Application Cost</p>
                  <p className="text-lg font-semibold text-red-600">15 points</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600">After Submission</p>
                  <p className="text-lg font-semibold text-gray-800">{(user?.pointBalance || 0) - 15} points</p>
                </div>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
  {/* Village Selection */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Village Selection</h3>
    
   <div>
  <Label htmlFor="villageId">Select Village *</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={false}
        className="w-full justify-between"
        disabled={isVillagesLoading}
      >
        {formData.villageId
          ? villages.find((village) => village.id === formData.villageId)
              ? `${villages.find((village) => village.id === formData.villageId)?.name}, ${villages.find((village) => village.id === formData.villageId)?.district}, ${villages.find((village) => village.id === formData.villageId)?.state}`
              : "Select village..."
          : isVillagesLoading 
            ? "Loading villages..."
            : "Select village..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-full p-0">
      <Command>
        <CommandInput 
          placeholder="Search villages..." 
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandEmpty>
          {isVillagesLoading ? "Loading villages..." : "No village found."}
        </CommandEmpty>
        <CommandGroup>
          <CommandList>
            {villages
              .filter((village) =>
                village.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                village.district.toLowerCase().includes(searchValue.toLowerCase()) ||
                village.state.toLowerCase().includes(searchValue.toLowerCase())
              )
              .map((village) => (
                <CommandItem
                  key={village.id}
                  value={village.id}
                  onSelect={() => {
                    setFormData({...formData, villageId: village.id});
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      formData.villageId === village.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {village.name}, {village.district}, {village.state}
                </CommandItem>
              ))}
          </CommandList>
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
  {villages.length === 0 && !isVillagesLoading && (
    <p className="text-xs text-muted-foreground mt-1">
      No approved villages available. Please contact administrator.
    </p>
  )}
</div>
  </div>

  {/* Personal Information */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Personal Information</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="salutation">Title *</Label>
        <Select value={formData.salutation} onValueChange={(value) => setFormData({...formData, salutation: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Mr">Mr</SelectItem>
            <SelectItem value="Mrs">Mrs</SelectItem>
            <SelectItem value="Miss">Miss</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Enter your full name"
          required
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="relation">Relation *</Label>
        <Select value={formData.relation} onValueChange={(value) => setFormData({...formData, relation: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
         <SelectContent>
              <SelectItem value="Son">Son</SelectItem>
              <SelectItem value="Daughter">Daughter</SelectItem>
              <SelectItem value="Father">Father of</SelectItem>
              <SelectItem value="Mother">Mother of</SelectItem>
              <SelectItem value="Guardian">Guardian of</SelectItem>
              <SelectItem value="Wife">Wife</SelectItem>
              <SelectItem value="Husband">Husband</SelectItem>
              <SelectItem value="Ward">Ward</SelectItem>
              <SelectItem value="Dependent">Dependent</SelectItem>
            </SelectContent>
        </Select>
      </div>
      
     <div className="md:col-span-2">
  {(formData.relation === 'Son' || formData.relation === 'Daughter') && (
    <>
      <Label htmlFor="fatherName">Father's/Mother's Name *</Label>
      <Input
        id="fatherName"
        value={formData.fatherName}
        onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
        placeholder="Enter father's or mother's name"
        required
      />
    </>
  )}
  
  {formData.relation === 'Wife' && (
    <>
      <Label htmlFor="husbandName">Husband's Name *</Label>
      <Input
        id="husbandName"
        value={formData.husbandName}
        onChange={(e) => setFormData({...formData, husbandName: e.target.value})}
        placeholder="Enter husband's name"
        required
      />
    </>
  )}
  
  {formData.relation === 'Husband' && (
    <>
      <Label htmlFor="motherName">Mother's Name *</Label>
      <Input
        id="motherName"
        value={formData.motherName}
        onChange={(e) => setFormData({...formData, motherName: e.target.value})}
        placeholder="Enter mother's name"
        required
      />
    </>
  )}
  
  {formData.relation === 'Father' && (
  <>
    <Label htmlFor="childName">Child's Name *</Label>
    <Input
      id="childName"
      value={formData.childName}
      onChange={(e) => setFormData({...formData, childName: e.target.value})}
      placeholder="Enter child's name"
      required
    />
  </>
)}

{formData.relation === 'Guardian' && (
  <>
    <Label htmlFor="wardName">Ward's Name *</Label>
    <Input
      id="wardName"
      value={formData.wardName}
      onChange={(e) => setFormData({...formData, wardName: e.target.value})}
      placeholder="Enter ward's name"
      required
    />
  </>
)}
       {formData.relation === 'Mother' && (
  <>
    <Label htmlFor="childName">Child's Name *</Label>
    <Input
      id="childName"
      value={formData.childName}
      onChange={(e) => setFormData({...formData, childName: e.target.value})}
      placeholder="Enter child's name"
      required
    />
  </>
)}
</div>
    </div>

    <div>
      <Label htmlFor="address">Complete Address *</Label>
      <Input
        id="address"
        value={formData.address}
        onChange={(e) => setFormData({...formData, address: e.target.value})}
        placeholder="Enter your complete address"
        required
      />
    </div>

    <div>
      <Label htmlFor="houseNumber">House Number</Label>
      <Input
        id="houseNumber"
        value={formData.houseNumber}
        onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
        placeholder="Enter house number (optional)"
      />
    </div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="tribe">Tribe *</Label>
        <Input
          id="tribe"
          value={formData.tribe}
          onChange={(e) => setFormData({...formData, tribe: e.target.value})}
          placeholder="Enter your tribe"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="religion">Religion *</Label>
        <Select value={formData.religion} onValueChange={(value) => setFormData({...formData, religion: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select religion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Hindu">Hindu</SelectItem>
            <SelectItem value="Muslim">Muslim</SelectItem>
            <SelectItem value="Christian">Christian</SelectItem>
            <SelectItem value="Sikh">Sikh</SelectItem>
            <SelectItem value="Buddhist">Buddhist</SelectItem>
            <SelectItem value="Jain">Jain</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          placeholder="Enter phone number"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="Enter email address"
        />
      </div>
    </div>
    

   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="annualIncome">Annual Income (₹) *</Label>
        <Input
          id="annualIncome"
          value={formData.annualIncome}
          onChange={(e) => handleIncomeChange(e.target.value)}
          placeholder="Enter annual income"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="annualIncomeWords">Annual Income in Words</Label>
        <Input
          id="annualIncomeWords"
          value={formData.annualIncomeWords}
          readOnly
          placeholder="Auto-filled"
          className="bg-muted"
        />
      </div>
    </div>

    <div>
      <Label htmlFor="purposeOfNOC">Purpose of NOC *</Label>
      <Input
        id="purposeOfNOC"
        value={formData.purposeOfNOC}
        onChange={(e) => setFormData({...formData, purposeOfNOC: e.target.value})}
        placeholder="Specify the purpose for which NOC is required"
        required
      />
    </div>
  </div>

  {/* Document Upload */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Required Documents</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="aadhaar">Aadhaar Card *</Label>
        <Input
          id="aadhaar"
          type="file"
         accept=".jpg,.jpeg,.png"
          onChange={(e) => setFormData({...formData, aadhaarFile: e.target.files?.[0] || null})}
          required
        />
       <p className="text-xs text-muted-foreground mt-1">Upload JPG or PNG only (max 5MB) - PDF not supported</p>
      </div>
      
      <div>
        <Label htmlFor="passport">Passport *</Label>
        <Input
          id="passport"
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => setFormData({...formData, passportFile: e.target.files?.[0] || null})}
          required
        />
       <p className="text-xs text-muted-foreground mt-1">Upload JPG or PNG only (max 5MB) - PDF not supported</p>
      </div>
    </div>
  </div>

{/* Terms and Conditions Acceptance */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h3 className="text-lg font-semibold">Legal Agreements</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="terms"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, termsAccepted: checked === true }))
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">
                        I have read and agree to the{' '}
                        <Link 
                          to="/terms" 
                          target="_blank" 
                          className="text-primary hover:underline font-medium"
                        >
                          Terms and Conditions
                        </Link>
                        {' '}of using this Online NOC Platform. I understand that providing false information 
                        or fraudulent documents is prohibited and may result in legal consequences. *
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="privacy"
                        checked={formData.privacyAccepted}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, privacyAccepted: checked === true }))
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="privacy" className="text-sm leading-relaxed">
                        I consent to the collection, processing, and storage of my personal information 
                        as described in the Terms and Conditions. I understand that my data will be used 
                        for NOC application processing and certificate verification purposes. *
                      </Label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="declaration"
                        checked={formData.declarationAccepted || false}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, declarationAccepted: checked === true }))
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="declaration" className="text-sm leading-relaxed">
                        I declare that all the information provided in this application is true and correct 
                        to the best of my knowledge. I understand that any false information may lead to 
                        rejection of my application or cancellation of issued certificates.
                      </Label>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Important:</strong> By submitting this application, you agree to all terms and conditions. 
                      Applications with false information will be rejected and may be reported to relevant authorities.
                    </AlertDescription>
                  </Alert>
                </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit NOC Application"}
              </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Apply;
