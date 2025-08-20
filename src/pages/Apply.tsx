import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    houseNo: "",
    tribe: "Tangkhul",
    religion: "Christian",
    certificateType: "Birth",
    annualIncome: "100000",
    annualIncomeWords: "One Lakh",
    includeSignature: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate application number
    const now = new Date();
    const appNo = `ZSV${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
    
    toast({
      title: "Application Submitted Successfully!",
      description: `Your application number is: ${appNo}. Please save this number to check your status.`,
    });
    
    console.log("Application submitted:", { ...formData, applicationNumber: appNo });
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
              <h1 className="text-xl font-bold">Certificate Application</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Village Certificate</CardTitle>
              <CardDescription>
                Fill in the details below to apply for your village certificate. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                          <SelectItem value="F/o">F/o (Father of)</SelectItem>
                          <SelectItem value="M/o">M/o (Mother of)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="fatherName">Father's/Mother's/Spouse's Name *</Label>
                      <Input
                        id="fatherName"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                        placeholder="Enter name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="houseNo">House Number</Label>
                      <Input
                        id="houseNo"
                        value={formData.houseNo}
                        onChange={(e) => setFormData({...formData, houseNo: e.target.value})}
                        placeholder="Enter house number"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="certificateType">Certificate Type *</Label>
                      <Select value={formData.certificateType} onValueChange={(value) => setFormData({...formData, certificateType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Birth">Birth Certificate</SelectItem>
                          <SelectItem value="Resident">Residence Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tribe">Tribe *</Label>
                      <Input
                        id="tribe"
                        value={formData.tribe}
                        onChange={(e) => setFormData({...formData, tribe: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="religion">Religion *</Label>
                      <Input
                        id="religion"
                        value={formData.religion}
                        onChange={(e) => setFormData({...formData, religion: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="annualIncome">Annual Income (₹) *</Label>
                      <Input
                        id="annualIncome"
                        type="number"
                        value={formData.annualIncome}
                        onChange={(e) => handleIncomeChange(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="annualIncomeWords">Annual Income (in words)</Label>
                      <Input
                        id="annualIncomeWords"
                        value={formData.annualIncomeWords}
                        onChange={(e) => setFormData({...formData, annualIncomeWords: e.target.value})}
                        placeholder="In words"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSignature"
                      checked={formData.includeSignature}
                      onCheckedChange={(checked) => setFormData({...formData, includeSignature: checked as boolean})}
                    />
                    <Label htmlFor="includeSignature">Include digital signature on certificate</Label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Application
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    Preview Form
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