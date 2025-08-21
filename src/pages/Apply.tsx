import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
const [searchValue, setSearchValue] = useState("");
const [isVillagesLoading, setIsVillagesLoading] = useState(true);
]);

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
  
  // Validate required files
  if (!formData.aadhaarFile || !formData.passportFile) {
    toast({
      title: "Missing Documents",
      description: "Please upload both Aadhaar and Passport documents.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    // Generate application number based on selected village
    const now = new Date();
    const selectedVillage = villages.find(v => v.id === formData.villageId);
    const villageCode = selectedVillage ? selectedVillage.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase() : 'NOC';
    const appNo = `${villageCode}${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear()}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Submit to database
    const response = await fetch('/.netlify/functions/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationNumber: appNo,
        applicantName: formData.name,
        fatherName: formData.fatherName,
        address: formData.address,
        villageId: formData.villageId,
        purposeOfNOC: formData.purposeOfNOC,
        phone: formData.phone,
        email: formData.email
      })
    });

    const result = await response.json();

    if (response.ok) {
      toast({
        title: "NOC Application Submitted Successfully!",
        description: `Your application number is: ${appNo}. Please save this number to check your status.`,
      });
      
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
    } else {
      throw new Error(result.error || 'Submission failed');
    }
  } catch (error) {
    console.error('Submission error:', error);
    toast({
      title: "Submission Failed",
      description: "Please try again later.",
      variant: "destructive",
    });
  }
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
    <Button type="submit" className="flex-1" disabled={!formData.villageId || isVillagesLoading}>
      {isVillagesLoading ? "Loading..." : "Submit NOC Application"}
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
