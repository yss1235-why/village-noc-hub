import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface CertificateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: string;
  setTemplate: (template: string) => void;
  isUpdating: boolean;
  onUpdate: () => Promise<boolean>;
  onReset: () => void;
  getDefaultTemplate: () => string;
}

const PLACEHOLDERS = [
  '{{TITLE}}',
  '{{APPLICANT_NAME}}',
  '{{FATHER_NAME}}',
  '{{RELATION}}',
  '{{HOUSE_NUMBER}}',
  '{{ADDRESS}}',
  '{{VILLAGE_NAME}}',
  '{{POST_OFFICE}}',
  '{{POLICE_STATION}}',
  '{{SUB_DIVISION}}',
  '{{DISTRICT}}',
  '{{STATE}}',
  '{{PIN_CODE}}',
  '{{TRIBE_NAME}}',
  '{{RELIGION}}',
  '{{ANNUAL_INCOME_NUMBER}}',
  '{{ANNUAL_INCOME_WORDS}}',
  '{{PURPOSE_OF_NOC}}',
  '{{PHONE}}',
  '{{EMAIL}}',
  '{{ISSUE_DATE}}',
  '{{ADMIN_NAME}}',
  '{{APPLICATION_NUMBER}}',
];

export const CertificateTemplateModal = ({
  isOpen,
  onClose,
  template,
  setTemplate,
  isUpdating,
  onUpdate,
  onReset,
  getDefaultTemplate,
}: CertificateTemplateModalProps) => {
  if (!isOpen) return null;

  const handleUpdate = async () => {
    const success = await onUpdate();
    if (success) {
      // Optionally close or show success state
    }
  };

  const handleReset = () => {
    setTemplate(getDefaultTemplate());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Certificate Template Manager</CardTitle>
          <CardDescription>
            Customize your NOC certificate template. Use placeholders that will be replaced with actual values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="certificateTemplate">NOC Certificate Template</Label>
              <textarea
                id="certificateTemplate"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm resize-vertical"
                placeholder="Enter your certificate template here..."
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Template'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
              >
                Reset to Default
              </Button>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h5 className="font-medium mb-3">Available Placeholders:</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
                {PLACEHOLDERS.map((placeholder) => (
                  <span key={placeholder} className="bg-white p-1 rounded">
                    {placeholder}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
