import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Upload, 
  Check, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  Lock, 
  FileText, 
  Stamp, 
  Camera,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Designation {
  id: number;
  name: string;
  display_order: number;
}

interface VillageInfo {
  id: string;
  name: string;
  admin_name: string;
  admin_email: string;
}

const AdminSetup = () => {
  const [searchParams] = useSearchParams();
  const villageId = searchParams.get('villageId');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data states
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [villageInfo, setVillageInfo] = useState<VillageInfo | null>(null);
  const [requiresSetup, setRequiresSetup] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    designationId: "",
    phoneNumber: "",
    pin: "",
    confirmPin: ""
  });

  // Image states
  const [images, setImages] = useState({
    aadhaarFront: null as string | null,
    aadhaarBack: null as string | null,
    passportPhoto: null as string | null,
    signature: null as string | null,
    seal: null as string | null
  });

  // Image preview states
  const [imagePreviews, setImagePreviews] = useState({
    aadhaarFront: null as string | null,
    aadhaarBack: null as string | null,
    passportPhoto: null as string | null,
    signature: null as string | null,
    seal: null as string | null
  });

  // PIN visibility
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // File input refs
  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const passportPhotoRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);
  const sealRef = useRef<HTMLInputElement>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    if (!villageId) {
      toast({
        title: "Error",
        description: "Village ID is required. Please login again.",
        variant: "destructive",
      });
      navigate('/admin');
      return;
    }

    loadSetupData();
  }, [villageId]);

  const loadSetupData = async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('temp-auth-token');
      if (!token) {
        toast({
          title: "Session Expired",
          description: "Please login again to continue setup.",
          variant: "destructive",
        });
        navigate('/admin');
        return;
      }

      const response = await fetch(`/.netlify/functions/setup-primary-village-admin?villageId=${villageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (!data.requiresSetup) {
          toast({
            title: "Setup Already Complete",
            description: "Please login with your PIN.",
          });
          navigate('/admin');
          return;
        }

        setDesignations(data.designations || []);
        setVillageInfo(data.village || null);
        setRequiresSetup(data.requiresSetup);

        // Pre-fill name if available from village registration
        if (data.village?.admin_name) {
          setFormData(prev => ({ ...prev, fullName: data.village.admin_name }));
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load setup data.",
          variant: "destructive",
        });
        navigate('/admin');
      }
    } catch (error) {
      console.error('Load setup data error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: keyof typeof images
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImages(prev => ({ ...prev, [imageType]: base64 }));
      setImagePreviews(prev => ({ ...prev, [imageType]: base64 }));
      // Clear error for this field
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[imageType];
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters";
    }

    // Validate designation
    if (!formData.designationId) {
      newErrors.designationId = "Please select a designation";
    }

    // Validate phone number
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (phoneDigits.length !== 10) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    // Validate PIN
    if (!formData.pin) {
      newErrors.pin = "PIN is required";
    } else if (!/^\d{4}$/.test(formData.pin)) {
      newErrors.pin = "PIN must be exactly 4 digits";
    }

    // Validate confirm PIN
    if (!formData.confirmPin) {
      newErrors.confirmPin = "Please confirm your PIN";
    } else if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = "PINs do not match";
    }

    // Validate images
    if (!images.aadhaarFront) {
      newErrors.aadhaarFront = "Aadhaar front image is required";
    }
    if (!images.aadhaarBack) {
      newErrors.aadhaarBack = "Aadhaar back image is required";
    }
    if (!images.passportPhoto) {
      newErrors.passportPhoto = "Passport photo is required";
    }
    if (!images.signature) {
      newErrors.signature = "Signature image is required";
    }
    if (!images.seal) {
      newErrors.seal = "Official seal image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('temp-auth-token');
      if (!token) {
        toast({
          title: "Session Expired",
          description: "Please login again to continue setup.",
          variant: "destructive",
        });
        navigate('/admin');
        return;
      }

      const response = await fetch('/.netlify/functions/setup-primary-village-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          designationId: parseInt(formData.designationId),
          phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
          pin: formData.pin,
          aadhaarFrontImage: images.aadhaarFront,
          aadhaarBackImage: images.aadhaarBack,
          passportPhoto: images.passportPhoto,
          signatureImage: images.signature,
          sealImage: images.seal
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Setup Complete",
          description: "Your profile has been set up successfully. Please login with your PIN.",
        });

        // Clear temporary storage
        localStorage.removeItem('temp-auth-token');
        localStorage.removeItem('temp-village-id');
        localStorage.removeItem('temp-village-name');

        // Redirect to login
        navigate('/admin');
      } else {
        toast({
          title: "Setup Failed",
          description: data.error || "Failed to complete setup. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Setup submission error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ImageUploadBox = ({
    label,
    imageType,
    inputRef,
    icon: Icon,
    description
  }: {
    label: string;
    imageType: keyof typeof images;
    inputRef: React.RefObject<HTMLInputElement>;
    icon: React.ElementType;
    description: string;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label} <span className="text-destructive">*</span>
      </Label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors
          ${imagePreviews[imageType] ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${errors[imageType] ? 'border-destructive' : ''}
        `}
      >
        {imagePreviews[imageType] ? (
          <div className="relative">
            <img
              src={imagePreviews[imageType]!}
              alt={label}
              className="max-h-32 mx-auto rounded object-contain"
            />
            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageUpload(e, imageType)}
      />
      {errors[imageType] && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errors[imageType]}
        </p>
      )}
    </div>
  );

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading setup data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <User className="h-6 w-6" />
              <h1 className="text-xl font-bold">Primary Admin Setup</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Village Info Banner */}
          {villageInfo && (
            <Card className="mb-6 bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{villageInfo.name}</h2>
                    <p className="text-sm text-muted-foreground">Village ID: {villageInfo.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{villageInfo.admin_name}</p>
                    <p className="text-xs text-muted-foreground">{villageInfo.admin_email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile Setup</CardTitle>
              <CardDescription>
                As the primary village admin, you need to complete your profile setup before you can start managing applications.
                All fields marked with <span className="text-destructive">*</span> are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, fullName: e.target.value }));
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.fullName;
                            return newErrors;
                          });
                        }}
                        placeholder="Enter your full name"
                        className={errors.fullName ? 'border-destructive' : ''}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designation" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Designation <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.designationId}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, designationId: value }));
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.designationId;
                            return newErrors;
                          });
                        }}
                      >
                        <SelectTrigger className={errors.designationId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select your designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {designations.map((designation) => (
                            <SelectItem key={designation.id} value={designation.id.toString()}>
                              {designation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.designationId && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.designationId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData(prev => ({ ...prev, phoneNumber: value }));
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.phoneNumber;
                            return newErrors;
                          });
                        }}
                        placeholder="Enter 10-digit phone number"
                        className={errors.phoneNumber ? 'border-destructive' : ''}
                      />
                      {errors.phoneNumber && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PIN Setup Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Approval PIN Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    This 4-digit PIN will be required every time you approve or reject an application.
                    Keep it secure and do not share it with anyone.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pin" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        4-Digit PIN <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="pin"
                          type={showPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={4}
                          value={formData.pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setFormData(prev => ({ ...prev, pin: value }));
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.pin;
                              return newErrors;
                            });
                          }}
                          placeholder="Enter 4-digit PIN"
                          className={`text-center text-xl tracking-widest ${errors.pin ? 'border-destructive' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPin(!showPin)}
                        >
                          {showPin ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.pin && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.pin}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPin" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Confirm PIN <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPin"
                          type={showConfirmPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={4}
                          value={formData.confirmPin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setFormData(prev => ({ ...prev, confirmPin: value }));
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.confirmPin;
                              return newErrors;
                            });
                          }}
                          placeholder="Confirm 4-digit PIN"
                          className={`text-center text-xl tracking-widest ${errors.confirmPin ? 'border-destructive' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                        >
                          {showConfirmPin ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.confirmPin && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.confirmPin}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Identity Documents Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Identity Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload clear images of your Aadhaar card (both sides) for verification purposes.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadBox
                      label="Aadhaar Front"
                      imageType="aadhaarFront"
                      inputRef={aadhaarFrontRef}
                      icon={FileText}
                      description="Upload front side of Aadhaar"
                    />

                    <ImageUploadBox
                      label="Aadhaar Back"
                      imageType="aadhaarBack"
                      inputRef={aadhaarBackRef}
                      icon={FileText}
                      description="Upload back side of Aadhaar"
                    />
                  </div>
                </div>

                {/* Official Documents Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Official Documents</h3>
                  <p className="text-sm text-muted-foreground">
                    These documents will be used on approved NOC certificates. Please upload clear, high-quality images.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ImageUploadBox
                      label="Passport Photo"
                      imageType="passportPhoto"
                      inputRef={passportPhotoRef}
                      icon={Camera}
                      description="Recent passport size photo"
                    />

                    <ImageUploadBox
                      label="Signature"
                      imageType="signature"
                      inputRef={signatureRef}
                      icon={FileText}
                      description="Your official signature"
                    />

                    <ImageUploadBox
                      label="Official Seal"
                      imageType="seal"
                      inputRef={sealRef}
                      icon={Stamp}
                      description="Your official seal/stamp"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-amber-800 mb-2">Important Notes:</h4>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Signature and seal images will appear on all NOC certificates you approve</li>
                      <li>• Use PNG format with transparent background for best results</li>
                      <li>• Maximum file size: 5MB per image</li>
                      <li>• Ensure images are clear and properly oriented</li>
                    </ul>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      localStorage.removeItem('temp-auth-token');
                      localStorage.removeItem('temp-village-id');
                      localStorage.removeItem('temp-village-name');
                      navigate('/admin');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Complete Setup
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminSetup;
