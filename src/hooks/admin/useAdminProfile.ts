import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ProfileForm {
  adminName: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VillageForm {
  villageName: string;
  district: string;
  state: string;
  pinCode: string;
  postOffice: string;
  policeStation: string;
  subDivision: string;
  adminName: string;
  adminEmail: string;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UseAdminProfileProps {
  villageId: string | undefined;
}

interface UseAdminProfileReturn {
  profileForm: ProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  villageForm: VillageForm;
  setVillageForm: React.Dispatch<React.SetStateAction<VillageForm>>;
  passwordForm: PasswordForm;
  setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
  isUpdatingProfile: boolean;
  isUpdatingVillage: boolean;
  isChangingPassword: boolean;
  isLoadingVillageInfo: boolean;
  loadProfileInfo: () => Promise<void>;
  loadVillageInfo: () => Promise<void>;
  handleUpdateProfile: (e: React.FormEvent) => Promise<boolean>;
  handleUpdateVillage: (e: React.FormEvent) => Promise<boolean>;
  handleChangePassword: (e: React.FormEvent) => Promise<boolean>;
  resetProfilePasswordFields: () => void;
  resetPasswordForm: () => void;
}

export const useAdminProfile = ({ villageId }: UseAdminProfileProps): UseAdminProfileReturn => {
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    adminName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [villageForm, setVillageForm] = useState<VillageForm>({
    villageName: '',
    district: '',
    state: '',
    pinCode: '',
    postOffice: '',
    policeStation: '',
    subDivision: '',
    adminName: '',
    adminEmail: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingVillage, setIsUpdatingVillage] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoadingVillageInfo, setIsLoadingVillageInfo] = useState(false);

  const loadProfileInfo = useCallback(async () => {
    if (!villageId) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-admin-profile?villageId=${villageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (response.ok && result.profile) {
        setProfileForm(prev => ({
          ...prev,
          adminName: result.profile.adminName || '',
          email: result.profile.email || '',
          phone: result.profile.phone || ''
        }));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile information.',
        variant: 'destructive',
      });
    }
  }, [villageId, toast]);

  const loadVillageInfo = useCallback(async () => {
    if (!villageId) return;

    setIsLoadingVillageInfo(true);
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/.netlify/functions/get-village-info?villageId=${villageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (response.ok && result.village) {
        setVillageForm({
          villageName: result.village.name || '',
          district: result.village.district || '',
          state: result.village.state || '',
          pinCode: result.village.pin_code || '',
          postOffice: result.village.post_office || '',
          policeStation: result.village.police_station || '',
          subDivision: result.village.sub_division || '',
          adminName: result.village.admin_name || '',
          adminEmail: result.village.admin_email || ''
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load village information.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVillageInfo(false);
    }
  }, [villageId, toast]);

  const handleUpdateProfile = useCallback(async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return false;
    }

    if (profileForm.newPassword && profileForm.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return false;
    }

    setIsUpdatingProfile(true);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/update-admin-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          villageId,
          adminName: profileForm.adminName,
          email: profileForm.email,
          phone: profileForm.phone,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [villageId, profileForm, toast]);

  const handleUpdateVillage = useCallback(async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();

    setIsUpdatingVillage(true);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/update-village-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          villageId,
          name: villageForm.villageName,
          district: villageForm.district,
          state: villageForm.state,
          pinCode: villageForm.pinCode,
          postOffice: villageForm.postOffice,
          policeStation: villageForm.policeStation,
          subDivision: villageForm.subDivision
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Village Updated',
          description: 'Village information has been updated successfully.',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update village information.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update village information. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdatingVillage(false);
    }
  }, [villageId, villageForm, toast]);

  const handleChangePassword = useCallback(async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return false;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return false;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/.netlify/functions/change-village-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          villageId
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Password Changed',
          description: 'Your password has been updated successfully.',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to change password.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  }, [villageId, passwordForm, toast]);

  const resetProfilePasswordFields = useCallback(() => {
    setProfileForm(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  }, []);

  const resetPasswordForm = useCallback(() => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  }, []);

  return {
    profileForm,
    setProfileForm,
    villageForm,
    setVillageForm,
    passwordForm,
    setPasswordForm,
    isUpdatingProfile,
    isUpdatingVillage,
    isChangingPassword,
    isLoadingVillageInfo,
    loadProfileInfo,
    loadVillageInfo,
    handleUpdateProfile,
    handleUpdateVillage,
    handleChangePassword,
    resetProfilePasswordFields,
    resetPasswordForm,
  };
};
