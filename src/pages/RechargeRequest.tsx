import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Gift, 
  MessageSquare, 
  Phone, 
  Mail, 
  Copy, 
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';

interface ContactInfo {
  admin_whatsapp: { value: string; displayName: string };
  admin_phone: { value: string; displayName: string };
  admin_email: { value: string; displayName: string };
  recharge_instructions: { value: string; displayName: string };
}

const RechargeRequest: React.FC = () => {
  const [selectedAmount, setSelectedAmount] = useState<500 | 1000 | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadContactInfo();
  }, []);

  const loadContactInfo = async () => {
    try {
      const response = await fetch('/.netlify/functions/admin-contact-settings');
      if (response.ok) {
        const result = await response.json();
        setContactInfo(result.contactInfo);
      }
    } catch (error) {
      console.error('Failed to load contact info:', error);
      toast({
        title: "Error",
        description: "Failed to load contact information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateWhatsAppMessage = (amount: 500 | 1000) => {
    const message = `Hello, I want to recharge ${amount} points for my account:
    
Username: ${user?.username}
Email: ${user?.email}
Full Name: ${user?.full_name || 'Not provided'}
Amount: ${amount} points

Please let me know the payment method and confirm when ready to process.

Thank you!`;
    
    return encodeURIComponent(message);
  };

  const openWhatsApp = (amount: 500 | 1000) => {
    if (!contactInfo?.admin_whatsapp?.value) {
      toast({
        title: "Error",
        description: "WhatsApp contact not available",
        variant: "destructive"
      });
      return;
    }

    const message = generateWhatsAppMessage(amount);
    const whatsappNumber = contactInfo.admin_whatsapp.value.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Gift className="h-8 w-8" />
              Recharge Points
            </CardTitle>
            <CardDescription>
              Contact our admin to recharge your account with points for NOC applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4">
                <Badge variant="outline" className="text-sm">
                  Current Balance: {user?.pointBalance?.toLocaleString() || 0} points
                </Badge>
                <Badge variant="outline" className="text-sm">
                  Application Cost: 15 points each
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Recharge Amount</CardTitle>
            <CardDescription>
              Choose the amount of points you want to recharge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedAmount === 500 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAmount(500)}
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold">500 Points</h3>
                  <p className="text-muted-foreground">33 NOC Applications</p>
                  <div className="mt-2">
                    <Badge variant="secondary">Popular Choice</Badge>
                  </div>
                </div>
              </div>

              <div 
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedAmount === 1000 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAmount(1000)}
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold">1000 Points</h3>
                  <p className="text-muted-foreground">66 NOC Applications</p>
                  <div className="mt-2">
                    <Badge variant="secondary">Best Value</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Methods */}
        {selectedAmount && (
          <Card>
            <CardHeader>
              <CardTitle>Contact Admin for Payment</CardTitle>
              <CardDescription>
                Choose your preferred method to contact the admin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* WhatsApp */}
              {contactInfo?.admin_whatsapp && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">WhatsApp (Recommended)</p>
                      <p className="text-sm text-muted-foreground">
                        {contactInfo.admin_whatsapp.value}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => openWhatsApp(selectedAmount)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              )}

              {/* Phone */}
              {contactInfo?.admin_phone && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Phone Call</p>
                      <p className="text-sm text-muted-foreground">
                        {contactInfo.admin_phone.value}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(contactInfo.admin_phone.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(`tel:${contactInfo.admin_phone.value}`)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Email */}
              {contactInfo?.admin_email && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {contactInfo.admin_email.value}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(contactInfo.admin_email.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(`mailto:${contactInfo.admin_email.value}?subject=Point Recharge Request - ${selectedAmount} Points&body=Hello, I want to recharge ${selectedAmount} points for my account (${user?.username}).`)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Recharge Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contactInfo?.recharge_instructions && (
                <p className="text-muted-foreground">
                  {contactInfo.recharge_instructions.value}
                </p>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Important Notes</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Maximum 1000 points can be recharged per day</li>
                      <li>• Points are added to your account after payment confirmation</li>
                      <li>• Keep your payment receipt for reference</li>
                      <li>• Contact admin if points are not credited within 24 hours</li>
                      <li>• Each NOC application costs 15 points</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default RechargeRequest;
