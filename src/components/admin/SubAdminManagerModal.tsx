import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  X, 
  Shield, 
  AlertTriangle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubAdmin {
  id: string;
  full_name: string;
  phone_number: string;
  designation: string;
  designation_id: number;
  is_primary: boolean;
  is_active: boolean;
  is_locked: boolean;
  pin_reset_required: boolean;
  created_at: string;
}

interface Designation {
  id: number;
  name: string;
  display_order: number;
}

interface SubAdminManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  villageId: string;
}

export const SubAdminManagerModal = ({ isOpen, onClose, villageId }: SubAdminManagerModalProps) => {
  const { toast } = useToast();
  
  // List state
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    designationId: '',
    pin: '',
    confirmPin: ''
  });
  const [showPin, setShowPin] = useState(false);
  
  // Image states
  const [images, setImages] = useState({
    aadhaarFront: '',
    aadhaarBack: '',
    passportPhoto: '',
    signature: '',
    seal: ''
  });
  
  // File input refs
  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);
  const sealRef = useRef<HTMLInputElement>(null);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load sub-admins on mount
  useEffect(() => {
    if (isOpen && villageId) {
      loadSubAdmins();
    }
  }, [isOpen, villageId]);

  const loadSubAdmins = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `/.netlify/functions/get-sub-village-admins?villageId=${villageId}&includeDocuments=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSubAdmins(result.subVillageAdmins || []);
        setDesignations(result.designations || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load sub-admins',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sub-admins',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: keyof typeof images) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Image must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => ({
          ...prev,
          [imageType]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      designationId: '',
      pin: '',
      confirmPin: ''
    });
    setImages({
      aadhaarFront: '',
      aadhaarBack: '',
      passportPhoto: '',
      signature: '',
      seal: ''
    });
    setShowPin(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (formData.fullName.trim().length < 3) {
      toast({ title: 'Error', description: 'Full name must be at least 3 characters', variant: 'destructive' });
      return;
    }
    
    if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      toast({ title: 'Error', description: 'Phone number must be 10 digits', variant: 'destructive' });
      return;
    }
    
    if (!/^\d{4}$/.test(formData.pin)) {
      toast({ title: 'Error', description: 'PIN must be exactly 4 digits', variant: 'destructive' });
      return;
    }
    
    if (formData.pin !== formData.confirmPin) {
      toast({ title: 'Error', description: 'PINs do not match', variant: 'destructive' });
      return;
    }
    
    if (!formData.designationId) {
      toast({ title: 'Error', description: 'Please select a designation', variant: 'destructive' });
      return;
    }
    
    if (!images.aadhaarFront || !images.aadhaarBack || !images.passportPhoto || !images.signature || !images.seal) {
      toast({ title: 'Error', description: 'All document images are required', variant: 'destructive' });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/manage-sub-village-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: 'Success',
          description: 'Sub-admin created successfully'
        });
        resetForm();
        setShowCreateForm(false);
        loadSubAdmins();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create sub-admin',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create sub-admin',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `/.netlify/functions/manage-sub-village-admins?subVillageAdminId=${adminId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: 'Success',
          description: 'Sub-admin removed successfully'
        });
        setDeleteConfirm(null);
        loadSubAdmins();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove sub-admin',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove sub-admin',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setShowCreateForm(false);
    setDeleteConfirm(null);
    onClose();
  };

  if (!isOpen) return null;

  const ImageUploadBox = ({ 
    label, 
    imageKey, 
    inputRef 
  }: { 
    label: string; 
    imageKey: keyof typeof images; 
    inputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageUpload(e, imageKey)}
      />
      {images[imageKey] ? (
        <div className="relative">
          <img 
            src={images[imageKey]} 
            alt={label} 
            className="w-full h-20 object-cover rounded border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={() => setImages(prev => ({ ...prev, [imageKey]: '' }))}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-20"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Manage Sub-Village Admins</CardTitle>
                <CardDescription>Add or remove sub-admins who can approve certificates</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Sub-Admins List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Current Sub-Admins</h3>
              {!showCreateForm && (
                <Button size="sm" onClick={() => setShowCreateForm(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No sub-admins found. Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subAdmins.map((admin) => (
                  <div 
                    key={admin.id} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.full_name}</span>
                          {admin.is_primary && (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          )}
                          {admin.is_locked && (
                            <Badge variant="destructive" className="text-xs">Locked</Badge>
                          )}
                          {admin.pin_reset_required && (
                            <Badge variant="outline" className="text-xs">PIN Reset Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {admin.designation} • {admin.phone_number}
                        </p>
                      </div>
                    </div>
                    
                    {!admin.is_primary && (
                      <div>
                        {deleteConfirm === admin.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-destructive">Confirm?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(admin.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirm(null)}
                              disabled={isDeleting}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Sub-Admin Form */}
          {showCreateForm && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Add New Sub-Admin</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { resetForm(); setShowCreateForm(false); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit phone number"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="designation">Designation *</Label>
                    <Select
                      value={formData.designationId}
                      onValueChange={(value) => setFormData({ ...formData, designationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {designations.map((d) => (
                          <SelectItem key={d.id} value={d.id.toString()}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="pin">4-Digit PIN *</Label>
                    <div className="relative">
                      <Input
                        id="pin"
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="Enter 4-digit PIN"
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPin(!showPin)}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPin">Confirm PIN *</Label>
                    <Input
                      id="confirmPin"
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      value={formData.confirmPin}
                      onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="Confirm 4-digit PIN"
                      required
                    />
                  </div>
                </div>
                
                {/* Document Uploads */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Required Documents *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <ImageUploadBox label="Aadhaar Front" imageKey="aadhaarFront" inputRef={aadhaarFrontRef} />
                    <ImageUploadBox label="Aadhaar Back" imageKey="aadhaarBack" inputRef={aadhaarBackRef} />
                    <ImageUploadBox label="Passport Photo" imageKey="passportPhoto" inputRef={passportRef} />
                    <ImageUploadBox label="Signature" imageKey="signature" inputRef={signatureRef} />
                    <ImageUploadBox label="Official Seal" imageKey="seal" inputRef={sealRef} />
                  </div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    The sub-admin will use their PIN to approve or reject certificate applications. 
                    Make sure to securely share the PIN with them.
                  </p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { resetForm(); setShowCreateForm(false); }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Create Sub-Admin
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
