import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VillageForm } from '@/hooks/admin/useAdminProfile';

interface VillageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  villageForm: VillageForm;
  setVillageForm: React.Dispatch<React.SetStateAction<VillageForm>>;
  isLoading: boolean;
  isUpdating: boolean;
  onSubmit: (e: React.FormEvent) => Promise<boolean>;
}

export const VillageInfoModal = ({
  isOpen,
  onClose,
  villageForm,
  setVillageForm,
  isLoading,
  isUpdating,
  onSubmit,
}: VillageInfoModalProps) => {
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    const success = await onSubmit(e);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Village Information</CardTitle>
          <CardDescription>View and update your village details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading village information...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="villageName">Village Name *</Label>
                  <Input
                    id="villageName"
                    value={villageForm.villageName}
                    onChange={(e) => setVillageForm({ ...villageForm, villageName: e.target.value })}
                    placeholder="Enter village name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    value={villageForm.district}
                    onChange={(e) => setVillageForm({ ...villageForm, district: e.target.value })}
                    placeholder="Enter district"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={villageForm.state}
                    onChange={(e) => setVillageForm({ ...villageForm, state: e.target.value })}
                    placeholder="Enter state"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pinCode">PIN Code *</Label>
                  <Input
                    id="pinCode"
                    value={villageForm.pinCode}
                    onChange={(e) => setVillageForm({ ...villageForm, pinCode: e.target.value })}
                    placeholder="Enter PIN code"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="postOffice">Post Office</Label>
                  <Input
                    id="postOffice"
                    value={villageForm.postOffice}
                    onChange={(e) => setVillageForm({ ...villageForm, postOffice: e.target.value })}
                    placeholder="Enter post office"
                  />
                </div>

                <div>
                  <Label htmlFor="policeStation">Police Station</Label>
                  <Input
                    id="policeStation"
                    value={villageForm.policeStation}
                    onChange={(e) => setVillageForm({ ...villageForm, policeStation: e.target.value })}
                    placeholder="Enter police station"
                  />
                </div>

                <div>
                  <Label htmlFor="subDivision">Sub Division</Label>
                  <Input
                    id="subDivision"
                    value={villageForm.subDivision}
                    onChange={(e) => setVillageForm({ ...villageForm, subDivision: e.target.value })}
                    placeholder="Enter sub division"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Admin Information (Read Only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input
                      id="adminName"
                      value={villageForm.adminName}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      value={villageForm.adminEmail}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Updating...' : 'Update Information'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
