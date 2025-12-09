import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal = ({ isOpen, onClose }: ChangePinModalProps) => {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showPins, setShowPins] = useState({
    current: false,
    new: false,
    confirm: false
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setShowPins({ current: false, new: false, confirm: false });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate PINs
    if (!/^\d{4}$/.test(currentPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'Current PIN must be exactly 4 digits.',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'New PIN must be exactly 4 digits.',
        variant: 'destructive',
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: 'PIN Mismatch',
        description: 'New PIN and confirmation PIN do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (currentPin === newPin) {
      toast({
        title: 'Same PIN',
        description: 'New PIN must be different from current PIN.',
        variant: 'destructive',
      });
      return;
    }

    setIsChanging(true);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/change-sub-village-admin-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPin, newPin })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'PIN Changed',
          description: 'Your PIN has been changed successfully.',
        });
        handleClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to change PIN.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change PIN. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChanging(false);
    }
  };

  const handlePinInput = (value: string, setter: (val: string) => void) => {
    // Only allow digits and max 4 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setter(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Change PIN</CardTitle>
              <CardDescription>Update your 4-digit approval PIN</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPin">Current PIN</Label>
              <div className="relative">
                <Input
                  id="currentPin"
                  type={showPins.current ? 'text' : 'password'}
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => handlePinInput(e.target.value, setCurrentPin)}
                  placeholder="Enter current 4-digit PIN"
                  className="text-center text-xl tracking-widest pr-10"
                  maxLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPins({ ...showPins, current: !showPins.current })}
                >
                  {showPins.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPin">New PIN</Label>
              <div className="relative">
                <Input
                  id="newPin"
                  type={showPins.new ? 'text' : 'password'}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                  placeholder="Enter new 4-digit PIN"
                  className="text-center text-xl tracking-widest pr-10"
                  maxLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPins({ ...showPins, new: !showPins.new })}
                >
                  {showPins.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPin">Confirm New PIN</Label>
              <div className="relative">
                <Input
                  id="confirmPin"
                  type={showPins.confirm ? 'text' : 'password'}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                  placeholder="Confirm new 4-digit PIN"
                  className="text-center text-xl tracking-widest pr-10"
                  maxLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPins({ ...showPins, confirm: !showPins.confirm })}
                >
                  {showPins.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your PIN is used to approve or reject certificate applications. 
                Keep it secure and do not share it with anyone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isChanging}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isChanging || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
              >
                {isChanging ? 'Changing...' : 'Change PIN'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
