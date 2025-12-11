import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Building2, X } from 'lucide-react';
import LetterheadCropInterface from '@/components/LetterheadCropInterface';
import SealCropInterface from '@/components/SealCropInterface';
import type { Documents, DocumentFiles } from '@/hooks/admin/useAdminDocuments';

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Documents;
  documentFiles: DocumentFiles;
  setDocumentFiles: React.Dispatch<React.SetStateAction<DocumentFiles>>;
  isLoading: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  onUploadDocument: (file: File, type: keyof Documents) => Promise<void>;
  onUploadCroppedDocument: (croppedData: string, type: keyof Documents) => Promise<void>;
  onDeleteDocument: (type: keyof Documents) => Promise<void>;
}
export const DocumentManagerModal = ({
  isOpen,
  onClose,
  documents,
  documentFiles,
  setDocumentFiles,
  isLoading,
  isUploading,
  isDeleting,
  onUploadDocument,
  onUploadCroppedDocument,
  onDeleteDocument,
}: DocumentManagerModalProps) => {
  const [showLetterheadCrop, setShowLetterheadCrop] = useState(false);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);
  const [showSealCrop, setShowSealCrop] = useState(false);
  const [sealFile, setSealFile] = useState<File | null>(null);

  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const roundSealInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLetterheadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLetterheadFile(file);
      setShowLetterheadCrop(true);
    }
  };

  const handleSealSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSealFile(file);
      setShowSealCrop(true);
    }
  };

  const handleLetterheadCropComplete = async (croppedData: string) => {
    setShowLetterheadCrop(false);
    setLetterheadFile(null);
    await onUploadCroppedDocument(croppedData, 'letterhead');
  };

  const handleSealCropComplete = async (croppedData: string) => {
    setShowSealCrop(false);
    setSealFile(null);
    await onUploadCroppedDocument(croppedData, 'seal');
  };

  const handleClose = () => {
    onClose();
    setDocumentFiles({
      letterhead: null,
      signature: null,
      seal: null,
      roundSeal: null
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Document Manager</CardTitle>
            <CardDescription>Upload and manage your village documents, seals, and signatures.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading documents...</div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Letterhead</Label>
                      <input
                        ref={letterheadInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLetterheadSelect}
                        className="hidden"
                      />
                      {documents.letterhead ? (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => letterheadInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Replace Letterhead'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => letterheadInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Letterhead'}
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Current Letterhead</Label>
                      <div className="border rounded-lg p-4 min-h-[100px] flex items-center justify-center bg-muted/10 relative">
                        {documents.letterhead ? (
                          <>
                            <img
                              src={documents.letterhead}
                              alt="Letterhead"
                              className="max-w-full max-h-[100px] object-contain"
                            />
                            <button
                              onClick={() => onDeleteDocument('letterhead')}
                              disabled={isDeleting}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-50"
                              title="Delete letterhead"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No letterhead uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Signature</Label>
                      <input
                        ref={signatureInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadDocument(file, 'signature');
                        }}
                        className="hidden"
                      />
                      {documents.signature ? (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => signatureInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Replace Signature'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => signatureInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Signature'}
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Current Signature</Label>
                      <div className="border rounded-lg p-4 min-h-[100px] flex items-center justify-center bg-muted/10 relative">
                        {documents.signature ? (
                          <>
                            <img
                              src={documents.signature}
                              alt="Signature"
                              className="max-w-full max-h-[100px] object-contain"
                            />
                            <button
                              onClick={() => onDeleteDocument('signature')}
                              disabled={isDeleting}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-50"
                              title="Delete signature"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No signature uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Official Seal (Long)</Label>
                      <input
                        ref={sealInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSealSelect}
                        className="hidden"
                      />
                      {documents.seal ? (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => sealInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Replace Seal'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => sealInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Seal'}
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Current Seal</Label>
                      <div className="border rounded-lg p-4 min-h-[100px] flex items-center justify-center bg-muted/10 relative">
                        {documents.seal ? (
                          <>
                            <img
                              src={documents.seal}
                              alt="Official Seal"
                              className="max-w-full max-h-[100px] object-contain"
                            />
                            <button
                              onClick={() => onDeleteDocument('seal')}
                              disabled={isDeleting}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-50"
                              title="Delete seal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No seal uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Round Seal</Label>
                      <input
                        ref={roundSealInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadDocument(file, 'roundSeal');
                        }}
                        className="hidden"
                      />
                      {documents.roundSeal ? (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => roundSealInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Replace Round Seal'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => roundSealInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Round Seal'}
                        </Button>
                      )}
                    </div>
                   <div>
                      <Label>Current Round Seal</Label>
                      <div className="border rounded-lg p-4 min-h-[150px] flex items-center justify-center bg-muted/10 relative">
                        {documents.roundSeal ? (
                          <>
                            <img
                              src={documents.roundSeal}
                              alt="Round Official Seal"
                              className="max-w-full max-h-[150px] object-contain"
                            />
                            <button
                              onClick={() => onDeleteDocument('roundSeal')}
                              disabled={isDeleting}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-50"
                              title="Delete round seal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No round seal uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showLetterheadCrop && letterheadFile && (
        <LetterheadCropInterface
          imageFile={letterheadFile}
          onCropComplete={handleLetterheadCropComplete}
          onCancel={() => {
            setShowLetterheadCrop(false);
            setLetterheadFile(null);
          }}
        />
      )}

      {showSealCrop && sealFile && (
        <SealCropInterface
          imageFile={sealFile}
          onCropComplete={handleSealCropComplete}
          onCancel={() => {
            setShowSealCrop(false);
            setSealFile(null);
          }}
        />
      )}
    </>
  );
};
