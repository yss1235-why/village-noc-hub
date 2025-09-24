import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

const Register: React.FC = () => {
const [formData, setFormData] = useState({
    full_name: '',
    aadhaar_number: '',
    aadhaar_document: null,
    passport_photo: null,
    id_code: '',
    police_verification_document: null,
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    center_shop_name: '',
    termsAccepted: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setError('Please accept the Terms and Conditions');
      setIsLoading(false);
      return;
    }

    // Convert files to base64 and prepare submission data
    const { confirmPassword, termsAccepted, ...baseData } = formData;
    
    // Convert files to base64
    const processFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    };

    const submitData = { ...baseData };

    if (formData.aadhaar_document) {
      submitData.aadhaar_document = await processFile(formData.aadhaar_document);
    }

    if (formData.passport_photo) {
      submitData.passport_photo = await processFile(formData.passport_photo);
    }

   if (formData.police_verification_document) {
      submitData.police_verification = await processFile(formData.police_verification_document);
    }

    // Remove file objects from submitData (keep only base64 strings and text fields)
    delete submitData.aadhaar_document;
    delete submitData.passport_photo; 
    delete submitData.police_verification_document;

    // Add passport_number as empty string since backend expects it
    submitData.passport_number = '';

    const result = await register(submitData);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-green-600">Registration Successful!</CardTitle>
              <CardDescription>
                Your account has been created and is pending admin approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <strong>Next Steps:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Wait for super admin to approve your account</li>
                    <li>You'll receive points after approval</li>
                    <li>Then you can submit NOC applications</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button onClick={() => navigate('/login')} className="w-full">
                  Go to Login
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/80">
            sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Fill in your details to create a new account. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  placeholder="Enter your phone number"
                />
              </div>

             <div>
                <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                <Input
                  id="aadhaar_number"
                  type="text"
                  value={formData.aadhaar_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, aadhaar_number: e.target.value }))}
                  required
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>

              <div>
                <Label htmlFor="aadhaar_document">Aadhaar Card Document</Label>
                <Input
                  id="aadhaar_document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({ ...prev, aadhaar_document: e.target.files?.[0] || null }))}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Upload PDF, JPG, or PNG (max 5MB)</p>
              </div>
              <div>
                <Label htmlFor="passport_photo">Passport Size Photo</Label>
                <Input
                  id="passport_photo"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({ ...prev, passport_photo: e.target.files?.[0] || null }))}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Upload JPG or PNG (max 2MB)</p>
              </div>

              <div>
                <Label htmlFor="id_code">ID Code</Label>
                <Input
                  id="id_code"
                  type="text"
                  value={formData.id_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_code: e.target.value }))}
                  required
                  placeholder="Enter your ID code"
                />
              </div>

              <div>
                <Label htmlFor="address">Complete Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  required
                  placeholder="Enter your complete address"
                />
              </div>

              <div>
                <Label htmlFor="center_shop_name">Center/Shop Name</Label>
                <Input
                  id="center_shop_name"
                  type="text"
                  value={formData.center_shop_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, center_shop_name: e.target.value }))}
                  required
                  placeholder="Enter your center or shop name"
                />
              </div>

              <div>
                <Label htmlFor="police_verification_document">Police Verification Document (Optional)</Label>
                <Input
                  id="police_verification_document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData(prev => ({ ...prev, police_verification_document: e.target.files?.[0] || null }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Upload PDF, JPG, or PNG (max 5MB)</p>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  placeholder="Confirm your password"
                />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, termsAccepted: checked === true }))
                  }
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  I agree to the{' '}
                  <Link 
                    to="/terms" 
                    target="_blank" 
                    className="text-primary hover:underline font-medium"
                  >
                    Terms and Conditions
                  </Link>
                  {' '}and understand that my account requires admin approval.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
