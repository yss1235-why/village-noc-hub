import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Documents {
  letterhead: string | null;
  signature: string | null;
  seal: string | null;
  roundSeal: string | null;
}

export interface DocumentFiles {
  letterhead: File | null;
  signature: File | null;
  seal: File | null;
  roundSeal: File | null;
}

interface UseAdminDocumentsProps {
  villageId: string | undefined;
}

interface UseAdminDocumentsReturn {
  documents: Documents;
  documentFiles: DocumentFiles;
  setDocumentFiles: React.Dispatch<React.SetStateAction<DocumentFiles>>;
  certificateTemplate: string;
  setCertificateTemplate: (template: string) => void;
  isLoadingDocuments: boolean;
  isUploadingDocument: boolean;
  isUpdatingTemplate: boolean;
  loadDocuments: () => Promise<void>;
  handleUploadDocument: (file: File, documentType: keyof Documents) => Promise<void>;
  handleUploadCroppedDocument: (croppedData: string, documentType: keyof Documents) => Promise<void>;
  handleUpdateTemplate: () => Promise<boolean>;
  getDefaultTemplate: () => string;
}

const DEFAULT_TEMPLATE = `This is to certify that {{TITLE}} {{APPLICANT_NAME}} {{RELATION}} {{FATHER_NAME}} is a permanent resident of Village {{VILLAGE_NAME}}, Post Office {{POST_OFFICE}}, Police Station {{POLICE_STATION}}, Sub Division {{SUB_DIVISION}}, District {{DISTRICT}}, {{STATE}} - {{PIN_CODE}}.

He/She belongs to {{TRIBE_NAME}} Tribe and follows {{RELIGION}} religion.

He/She is a citizen of the {{VILLAGE_NAME}} Village by Birth. As per the family data collected by the Village his/her annual income is {{ANNUAL_INCOME_NUMBER}} in word {{ANNUAL_INCOME_WORDS}} only.

To the best of my knowledge and belief, He/She does not have any negative remarks in the Village record.

He/She is not related to me.

This NOC is issued for the purpose of {{PURPOSE_OF_NOC}}.`;

export const useAdminDocuments = ({ villageId }: UseAdminDocumentsProps): UseAdminDocumentsReturn => {
  const { toast } = useToast();

  const [documents, setDocuments] = useState<Documents>({
    letterhead: null,
    signature: null,
    seal: null,
    roundSeal: null
  });

  const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({
    letterhead: null,
    signature: null,
    seal: null,
    roundSeal: null
  });

  const [certificateTemplate, setCertificateTemplate] = useState('');
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const getDefaultTemplate = useCallback(() => DEFAULT_TEMPLATE, []);

  const loadDocuments = useCallback(async () => {
    if (!villageId) return;

    setIsLoadingDocuments(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-village-documents?villageId=${villageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (response.ok && result.documents) {
        setDocuments({
          letterhead: result.documents.letterhead?.data || null,
          signature: result.documents.signature?.data || null,
          seal: result.documents.seal?.data || null,
          roundSeal: result.documents.roundSeal?.data || null
        });
        setCertificateTemplate(result.documents.certificateTemplate || DEFAULT_TEMPLATE);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load documents.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [villageId, toast]);

  const handleUploadDocument = useCallback(async (file: File, documentType: keyof Documents) => {
    if (!villageId) return;

    setIsUploadingDocument(true);
    try {
      const reader = new FileReader();
      
      const uploadPromise = new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            const token = localStorage.getItem('auth-token');
            
            const response = await fetch('/.netlify/functions/upload-village-document', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                villageId,
                documentType,
                documentData: base64Data,
                fileName: file.name
              })
            });

            const result = await response.json();

            if (response.ok) {
              setDocuments(prev => ({
                ...prev,
                [documentType]: base64Data
              }));
              toast({
                title: 'Document Uploaded',
                description: `${documentType} has been uploaded successfully.`,
              });
              resolve();
            } else {
              toast({
                title: 'Upload Failed',
                description: result.error || 'Failed to upload document.',
                variant: 'destructive',
              });
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (error) {
            toast({
              title: 'Upload Failed',
              description: 'Failed to upload document. Please try again.',
              variant: 'destructive',
            });
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
      });
      
      reader.readAsDataURL(file);
      await uploadPromise;
      
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }, [villageId, toast]);

  const handleUploadCroppedDocument = useCallback(async (croppedData: string, documentType: keyof Documents) => {
    if (!villageId) return;

    setIsUploadingDocument(true);
    try {
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('/.netlify/functions/upload-village-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          villageId,
          documentType,
          documentData: croppedData,
          fileName: `${documentType}.png`
        })
      });

      const result = await response.json();

      if (response.ok) {
        setDocuments(prev => ({
          ...prev,
          [documentType]: croppedData
        }));
        toast({
          title: 'Document Uploaded',
          description: `${documentType} has been uploaded successfully.`,
        });
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Failed to upload document.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }, [villageId, toast]);

  const handleUpdateTemplate = useCallback(async (): Promise<boolean> => {
    if (!certificateTemplate || certificateTemplate.trim() === '') {
      toast({
        title: 'Error',
        description: 'Certificate template cannot be empty. Please enter a valid template.',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdatingTemplate(true);
    
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/update-certificate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          villageId,
          template: certificateTemplate
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Template Updated',
          description: 'Certificate template has been updated successfully.',
        });
        return true;
      } else {
        toast({
          title: 'Update Failed',
          description: result.error || 'Failed to update template.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update template. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdatingTemplate(false);
    }
  }, [villageId, certificateTemplate, toast]);

  return {
    documents,
    documentFiles,
    setDocumentFiles,
    certificateTemplate,
    setCertificateTemplate,
    isLoadingDocuments,
    isUploadingDocument,
    isUpdatingTemplate,
    loadDocuments,
    handleUploadDocument,
    handleUploadCroppedDocument,
    handleUpdateTemplate,
    getDefaultTemplate,
  };
};
