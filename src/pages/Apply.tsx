import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Apply = () => {
  const { toast } = useToast();
const [formData, setFormData] = useState({
  salutation: "",
  name: "",
  relation: "",
  fatherName: "",
  address: "",
  villageId: "",
  purposeOfNOC: "",
  aadhaarFile: null as File | null,
  passportFile: null as File | null,
  phone: "",
  email: ""
});

const [villages, setVillages] = useState([
  { id: "1", name: "Zingsui Sambu Village", district: "Kamjong", state: "Manipur" },
  { id: "2", name: "Sample Village 2", district: "Ukhrul", state: "Manipur" },
]);

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate required files
  if (!formData.aadhaarFile || !formData.passportFile) {
    toast({
      title: "Missing Documents",
      description: "Please upload both Aadhaar and Passport documents.",
      variant: "destructive",
    });
    return;
  }
  
  // Generate application number based on selected village
  const now = new Date();
  const selectedVillage = villages.find(v => v.id === formData.villageId);
  const villageCode = selectedVillage ? selectedVillage.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase() : 'NOC';
  const appNo = `${villageCode}${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  
  toast({
    title: "NOC Application Submitted Successfully!",
    description: `Your application number is: ${appNo}. Please save this number to check your status.`,
  });
  
  console.log("NOC Application submitted:", { ...formData, applicationNumber: appNo });
  
  // Reset form after successful submission
  setFormData({
    salutation: "",
    name: "",
    relation: "",
    fatherName: "",
    address: "",
    villageId: "",
    purposeOfNOC: "",
    aadhaarFile: null,
    passportFile: null,
    phone: "",
    email: ""
  });
};

  const numberToWords = (num: number) => {
    // Simplified number to words conversion
    if (num === 100000) return "One Lakh";
    if (num === 200000) return "Two Lakh";
    if (num === 300000) return "Three Lakh";
    if (num === 500000) return "Five Lakh";
    return num.toString();
  };

  const handleIncomeChange = (value: string) => {
    const numValue = parseInt(value);
    setFormData({
      ...formData,
      annualIncome: value,
      annualIncomeWords: numberToWords(numValue)
    });
  };

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
              <h1 className="text-xl font-bold">NOC Application</h1>
            </div>
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
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
  {/* Village Selection */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Village Selection</h3>
    
    <div>
      <Label htmlFor="villageId">Select Village *</Label>
      <Select value={formData.villageId} onValueChange={(value) => setFormData({...formData, villageId: value})}>
        <SelectTrigger>
          <SelectValue placeholder="Choose your village" />
        </SelectTrigger>
        <SelectContent>
          {villages.map((village) => (
            <SelectItem key={village.id} value={village.id}>
              {village.name}, {village.district}, {village.state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
            <SelectItem value="S/o">S/o (Son of)</SelectItem>
            <SelectItem value="D/o">D/o (Daughter of)</SelectItem>
            <SelectItem value="W/o">W/o (Wife of)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="fatherName">Father's/Husband's Name *</Label>
        <Input
          id="fatherName"
          value={formData.fatherName}
          onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
          placeholder="Enter name"
          required
        />
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
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFormData({...formData, aadhaarFile: e.target.files?.[0] || null})}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Upload PDF, JPG, or PNG (max 5MB)</p>
      </div>
      
      <div>
        <Label htmlFor="passport">Passport *</Label>
        <Input
          id="passport"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFormData({...formData, passportFile: e.target.files?.[0] || null})}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Upload PDF, JPG, or PNG (max 5MB)</p>
      </div>
    </div>
  </div>

  {/* Submit Button */}
  <div className="flex gap-4">
    <Button type="submit" className="flex-1" disabled={!formData.villageId}>
      Submit NOC Application
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

export default Apply;
