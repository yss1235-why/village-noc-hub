import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const VillageRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    villageName: "",
    district: "",
    state: "",
    pinCode: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    letterheadFile: null as File | null,
    signatureFile: null as File | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Registration Submitted",
      description: "Your village registration request has been submitted for approval.",
    });
    
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
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
              <Building className="h-6 w-6" />
              <h1 className="text-xl font-bold">Village Registration</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Register Your Village</CardTitle>
              <CardDescription>
                Register your village to provide NOC services to residents. Your request will be reviewed by the super admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Village Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Village Information</h3>
                  
                  <div>
                    <Label htmlFor="villageName">Village Name *</Label>
                    <Input
                      id="villageName"
                      value={formData.villageName}
                      onChange={(e) => setFormData({...formData, villageName: e.target.value})}
                      placeholder="Enter village name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="district">District *</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => setFormData({...formData, district: e.target.value})}
                        placeholder="Enter district"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        placeholder="Enter state"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pinCode">PIN Code *</Label>
                    <Input
                      id="pinCode"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({...formData, pinCode: e.target.value})}
                      placeholder="Enter PIN code"
                      required
                    />
                  </div>
                </div>

                {/* Admin Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Admin Information</h3>
                  
                  <div>
                    <Label htmlFor="adminName">Admin Full Name *</Label>
                    <Input
                      id="adminName"
                      value={formData.adminName}
                      onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                      placeholder="Enter admin full name"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Create password"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        placeholder="Confirm password"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Document Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Required Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="letterhead">Village Letterhead *</Label>
                      <Input
                        id="letterhead"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormData({...formData, letterheadFile: e.target.files?.[0] || null})}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Upload official letterhead (PDF, JPG, PNG)</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="signature">Official Signature *</Label>
                      <Input
                        id="signature"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormData({...formData, signatureFile: e.target.files?.[0] || null})}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Upload official signature (PDF, JPG, PNG)</p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Registration Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VillageRegistration;
