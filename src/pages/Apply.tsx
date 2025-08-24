import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, FileText, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Apply = () => {
  const { toast } = useToast();

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
  address: "",
  houseNumber: "",
  villageId: "",
  tribe: "",
  religion: "",
  annualIncome: "",
  annualIncomeWords: "",
  purposeOfNOC: "",
  aadhaarFile: null as File | null,
  passportFile: null as File | null,
  phone: "",
  email: ""
});

const [villages, setVillages] = useState<any[]>([]);
const [searchValue, setSearchValue] = useState("");
const [isVillagesLoading, setIsVillagesLoading] = useState(true);

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
        title: formData.salutation,
        applicantName: formData.name,
        relation: formData.relation,
        fatherName: formData.fatherName,
        address: formData.address,
        houseNumber: formData.houseNumber,
        villageId: formData.villageId,
        tribeName: formData.tribe,
        religion: formData.religion,
        annualIncome: formData.annualIncome,
        annualIncomeWords: formData.annualIncomeWords,
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
