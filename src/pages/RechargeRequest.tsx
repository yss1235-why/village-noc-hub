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

interface AdminContact {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  role: string;
}
const RechargeRequest: React.FC = () => {
 const [selectedAmount, setSelectedAmount] = useState<500 | 1000 | null>(null);
const [availableAdmins, setAvailableAdmins] = useState<AdminContact[]>([]);
const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
  loadAvailableAdmins();
}, []);
  const loadAvailableAdmins = async () => {
  try {
   const response = await fetch('/.netlify/functions/admin-contact-settings?getAllAdmins=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      const admins = result.admins?.filter(admin => 
        admin.is_active && 
        admin.is_approved && 
        (admin.role === 'system_admin' || admin.role === 'super_admin')
      ).map(admin => ({
        id: admin.id,
        name: admin.name || admin.email,
        phone: admin.phone || admin.email,
        whatsapp: admin.phone || admin.email,
        role: admin.role
      })) || [];
      
      setAvailableAdmins(admins);
    }
  } catch (error) {
    console.error('Failed to load admins:', error);
    toast({
      title: "Error",
      description: "Failed to load admin contacts",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

 const generateWhatsAppMessage = (amount: 500 | 1000, adminName: string) => {
  const message = `Hello ${adminName}, I want to recharge ${amount} points for my account:

Username: ${user?.username}
Email: ${user?.email}
Full Name: ${user?.username}
Amount: ${amount} points

Please let me know the payment method and confirm when ready to process.

Thank you!`;
  
  return encodeURIComponent(message);
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

       {/* Admin Selection */}
{selectedAmount && availableAdmins.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Choose Admin to Contact</CardTitle>
      <CardDescription>
        Select any admin to process your {selectedAmount} points recharge request
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableAdmins.map((admin) => (
          <div key={admin.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{admin.name}</h3>
                <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'System Admin'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{admin.phone}</span>
              </div>
              
              <Button 
                onClick={() => {
                  const whatsappNumber = admin.whatsapp?.replace(/[^0-9]/g, '');
                  if (whatsappNumber) {
                    const message = generateWhatsAppMessage(selectedAmount, admin.name);
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
                    window.open(whatsappUrl, '_blank');
                  } else {
                    toast({
                      title: "Error",
                      description: "WhatsApp contact not available for this admin",
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={!admin.whatsapp}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact via WhatsApp
              </Button>
            </div>
          </div>
        ))}
      </div>
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
