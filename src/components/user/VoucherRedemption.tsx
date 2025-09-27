import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, CreditCard, History, CheckCircle, AlertTriangle, User } from 'lucide-react';

interface RedemptionResult {
  pointsAdded: number;
  previousBalance: number;
  newBalance: number;
  voucherCode: string;
}

const VoucherRedemption: React.FC = () => {
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [recentRedemption, setRecentRedemption] = useState<RedemptionResult | null>(null);
  
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Verify user has permission to redeem vouchers
  const hasRedemptionPermission = user?.role === 'user' || user?.role === 'applicant';

  const redeemVoucher = async () => {
    if (!voucherCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a voucher code.",
        variant: "destructive"
      });
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await fetch('/.netlify/functions/redeem-voucher', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voucherCode: voucherCode.trim().toUpperCase()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setRecentRedemption(result.transaction);
        setVoucherCode('');
        
        toast({
          title: "Voucher Redeemed Successfully!",
          description: `${result.transaction.pointsAdded} points have been added to your account.`,
        });

        // Refresh user data to update point balance
        await refreshUser();
      } else {
        toast({
          title: "Redemption Failed",
          description: result.error || "Failed to redeem voucher. Please check the code and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process voucher redemption. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleVoucherCodeChange = (value: string) => {
    // Format voucher code as user types (uppercase, remove spaces)
    const formatted = value.replace(/\s/g, '').toUpperCase();
    setVoucherCode(formatted);
  };

  // Access control check
  if (!hasRedemptionPermission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only users and applicants can redeem vouchers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Role Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              <strong>Account Type:</strong> {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} | 
              <strong> Voucher Redemption:</strong> Authorized
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current Balance Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Point Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {user?.pointBalance?.toLocaleString() || 0} points
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Available for NOC applications and services
          </p>
        </CardContent>
      </Card>

      {/* Voucher Redemption Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Redeem Voucher
          </CardTitle>
          <CardDescription>
            Enter your voucher code to add points to your account. Vouchers are assigned to your account specifically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="voucher-code">Voucher Code</Label>
            <div className="flex gap-2">
              <Input
                id="voucher-code"
                placeholder="Enter voucher code (e.g., VCH12345678...)"
                value={voucherCode}
                onChange={(e) => handleVoucherCodeChange(e.target.value)}
                className="font-mono"
                maxLength={32}
                disabled={isRedeeming}
              />
              <Button
                onClick={redeemVoucher}
                disabled={!voucherCode.trim() || isRedeeming}
                className="whitespace-nowrap"
              >
                {isRedeeming ? 'Redeeming...' : 'Redeem'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Voucher codes are case-insensitive and typically start with "VCH"
            </p>
          </div>

          {/* Recent Redemption Success */}
          {recentRedemption && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800">Voucher Successfully Redeemed!</h4>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>Voucher Code: <span className="font-mono">{recentRedemption.voucherCode}</span></p>
                <p>Points Added: <span className="font-semibold">{recentRedemption.pointsAdded.toLocaleString()}</span></p>
                <p>Previous Balance: {recentRedemption.previousBalance.toLocaleString()} points</p>
                <p>New Balance: <span className="font-semibold">{recentRedemption.newBalance.toLocaleString()} points</span></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemption Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            How to Use Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <p>Obtain a voucher code from authorized System Administrators or Super Administrators</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <p>Ensure the voucher is assigned to your account (vouchers are user-specific)</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <p>Enter the complete voucher code in the redemption field above</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <p>Click "Redeem" to add the voucher's point value to your account</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">5</Badge>
              <p>Use your points to submit NOC applications (15 points per application)</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-1">Important Security Notes:</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Vouchers are assigned to specific accounts and cannot be transferred</li>
              <li>• Vouchers have expiration dates (typically 30 days) and must be redeemed before expiry</li>
              <li>• Minimum voucher value is 500 points (₹500)</li>
              <li>• Each voucher can only be redeemed once</li>
              <li>• Only {user?.role}s can redeem vouchers</li>
              <li>• All redemption activities are logged for security purposes</li>
              <li>• Contact support if you encounter issues with valid vouchers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoucherRedemption;
