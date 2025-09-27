import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Eye, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface Voucher {
  id: string;
  code: string;
  pointValue: number;
  monetaryValue: number;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  targetUser: {
    username: string;
    email: string;
    fullName: string;
    role: string;
  };
  generatedAt: string;
  redeemedAt?: string;
  expiresAt: string;
  generatedBy: string;
  generatedByRole: string;
  administrativeNotes?: string;
}

interface QuotaInfo {
  used: number;
  total: number;
  remaining: number;
  totalGenerated: number;
  lastGeneration?: string;
}

const VoucherManagement: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [quota, setQuota] = useState<QuotaInfo>({ used: 0, total: 5, remaining: 5, totalGenerated: 0 });
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationForm, setGenerationForm] = useState({
    targetUserId: '',
    targetUserSearch: '',
    pointValue: 500,
    administrativeNotes: ''
  });
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    dateFrom: '',
    dateTo: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Verify user has permission to access voucher management
  const hasVoucherPermission = user?.role === 'super_admin' || user?.role === 'admin';

  // Load voucher data and statistics
  const loadVoucherData = async () => {
    if (!hasVoucherPermission) return;
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/.netlify/functions/track-vouchers?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVouchers(data.vouchers);
        setQuota(data.quota);
      } else {
        throw new Error('Failed to load voucher data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load voucher information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search for users when generating vouchers
  const searchUsersForVoucher = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await fetch(`/.netlify/functions/search-users?q=${encodeURIComponent(searchTerm)}&roles=user,applicant`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchUsers(data.users || []);
      }
    } catch (error) {
      console.error('User search failed:', error);
    }
  };

  // Generate new voucher
  const generateVoucher = async () => {
    if (!generationForm.targetUserId || generationForm.pointValue < 500) {
      toast({
        title: "Validation Error",
        description: "Please select a target user and ensure minimum point value of 500.",
        variant: "destructive"
      });
      return;
    }

    if (quota.remaining <= 0) {
      toast({
        title: "Quota Exceeded",
        description: "You have reached the maximum limit of 5 unredeemed vouchers.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/generate-voucher', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: generationForm.targetUserId,
          pointValue: generationForm.pointValue,
          administrativeNotes: generationForm.administrativeNotes
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Voucher Generated Successfully",
          description: `Voucher code: ${result.voucher.code}`,
        });
        
        setShowGenerateForm(false);
        setGenerationForm({
          targetUserId: '',
          targetUserSearch: '',
          pointValue: 500,
          administrativeNotes: ''
        });
        setSearchUsers([]);
        
        // Reload voucher data
        await loadVoucherData();
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate voucher.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate voucher. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasVoucherPermission) {
      loadVoucherData();
    }
  }, [filters, hasVoucherPermission]);

  useEffect(() => {
    if (generationForm.targetUserSearch) {
      const debounceTimer = setTimeout(() => {
        searchUsersForVoucher(generationForm.targetUserSearch);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [generationForm.targetUserSearch]);

  // Access control check
  if (!hasVoucherPermission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only System Administrators and Super Administrators can access voucher management.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'redeemed': return 'secondary';
      case 'expired': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Voucher Management</h2>
          <p className="text-muted-foreground">
            Generate and track system vouchers for users and applicants
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadVoucherData()}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowGenerateForm(true)}
            disabled={quota.remaining <= 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Voucher
          </Button>
        </div>
      </div>

      {/* Role Permissions Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>Access Level:</strong> {user?.role === 'super_admin' ? 'Super Administrator' : 'System Administrator'} | 
              <strong> Can generate vouchers for:</strong> Users and Applicants only
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quota Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quota.used}/{quota.total}</div>
            <p className="text-xs text-muted-foreground">
              {quota.remaining} remaining slots
            </p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  quota.used >= 4 ? 'bg-red-500' : quota.used >= 3 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${(quota.used / quota.total) * 100}%` }}
              />
            </div>
            {quota.used >= 4 && (
              <p className="text-xs text-red-600 mt-1">
                Approaching quota limit
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quota.totalGenerated}</div>
            <p className="text-xs text-muted-foreground">
              All time vouchers created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Voucher Generation Form */}
      {showGenerateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New Voucher</CardTitle>
            <CardDescription>
              Create a new voucher for a user or applicant. Minimum value is 500 points (₹500).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user-search">Target User (Users and Applicants only)</Label>
              <div className="relative">
                <Input
                  id="user-search"
                  placeholder="Search by username, email, or name..."
                  value={generationForm.targetUserSearch}
                  onChange={(e) => setGenerationForm(prev => ({ 
                    ...prev, 
                    targetUserSearch: e.target.value,
                    targetUserId: ''
                  }))}
                />
                {searchUsers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto">
                    {searchUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setGenerationForm(prev => ({
                            ...prev,
                            targetUserId: user.id,
                            targetUserSearch: `${user.username} (${user.email}) - ${user.role}`
                          }));
                          setSearchUsers([]);
                        }}
                      >
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-blue-600 capitalize">{user.role}</div>
                        {user.fullName && (
                          <div className="text-sm text-gray-500">{user.fullName}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="point-value">Point Value</Label>
              <Input
                id="point-value"
                type="number"
                min="500"
                step="50"
                value={generationForm.pointValue}
                onChange={(e) => setGenerationForm(prev => ({ 
                  ...prev, 
                  pointValue: parseInt(e.target.value) || 500 
                }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum value: 500 points (₹500)
              </p>
            </div>

            <div>
              <Label htmlFor="admin-notes">Administrative Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Internal notes for tracking purposes..."
                value={generationForm.administrativeNotes}
                onChange={(e) => setGenerationForm(prev => ({ 
                  ...prev, 
                  administrativeNotes: e.target.value 
                }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateVoucher}
                disabled={!generationForm.targetUserId || generationForm.pointValue < 500 || isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Voucher'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerateForm(false);
                  setGenerationForm({
                    targetUserId: '',
                    targetUserSearch: '',
                    pointValue: 500,
                    administrativeNotes: ''
                  });
                  setSearchUsers([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <Label htmlFor="search-filter">Search</Label>
              <Input
                id="search-filter"
                placeholder="Code, user, email..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Vouchers</CardTitle>
          <CardDescription>
            Track and manage your generated vouchers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading vouchers...</p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No vouchers found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vouchers.map((voucher) => (
                <div key={voucher.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-semibold">{voucher.code}</span>
                        <Badge variant={getStatusBadgeVariant(voucher.status)}>
                          {voucher.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {voucher.targetUser.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Target:</strong> {voucher.targetUser.username} ({voucher.targetUser.email})</p>
                        <p><strong>Value:</strong> {voucher.pointValue.toLocaleString()} points (₹{voucher.monetaryValue})</p>
                        <p><strong>Generated:</strong> {new Date(voucher.generatedAt).toLocaleString()}</p>
                        <p><strong>Expires:</strong> {new Date(voucher.expiresAt).toLocaleString()}</p>
                        {voucher.redeemedAt && (
                          <p><strong>Redeemed:</strong> {new Date(voucher.redeemedAt).toLocaleString()}</p>
                        )}
                        {voucher.administrativeNotes && (
                          <p><strong>Notes:</strong> {voucher.administrativeNotes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {voucher.pointValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoucherManagement;
