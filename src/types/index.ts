export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  pinCode: string;
  adminId: string;
  letterheadUrl?: string;
  signatureUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
}

export interface NOCApplication {
  id: string;
  applicantName: string;
  fatherName: string;
  address: string;
  villageId: string;
  purposeOfNOC: string;
  phone: string;
  email?: string;
  aadhaarUrl: string;
  passportUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_edit';
  adminNotes?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'village_admin' | 'applicant';
  villageId?: string;
  isApproved: boolean;
  createdAt: string;
}
