import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, Plus, Search, User, AlertTriangle, CheckCircle } from 'lucide-react';

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  pointBalance: number;
  dailyRecharged: number;
  remainingDailyLimit: number;
}

interface PointTransaction {
  amount: number;
  previousBalance: number;
  newBalance: number;
  dailyRecharged: number;
  remainingDailyLimit: number;
}

const SimplePointManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [reason, setReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<PointTransaction | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Check permissions
  const hasPermission = user?.role === 'system_admin' || user?.role === 'super_admin';

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/.netlify/functions/search-users?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.users);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('User search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addPoints = async (amount: 500 | 1000) => {
    if (!selectedUser || !reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a user and provide a reason.",
        variant: "destructive"
      });
      return;
    }

    if (reason.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Reason must be at least 5 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/.netlify/functions/admin-add-points', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: amount,
          reason: reason.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        setLastTransaction(result.transaction);
        setReason('');
        
        // Update selected user's info
        setSelectedUser(prev => prev ? {
          ...prev,
          pointBalance: result.transaction.newBalance,
          dailyRecharged: result.transaction.dailyRecharged,
          remainingDailyLimit: result.transaction.remainingDailyLimit
        } : null);

        toast({
          title: "Points Added Successfully",
          description: `${amount} points added to ${selectedUser.username}`,
        });
      } else {
        toast({
          title: "Failed to Add Points",
          description: result.error || 'Unknown error occurred',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTerm) {
      const debounceTimer = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only System Administrators can manage points.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Add Points to User Account
          </CardTitle>
          <CardDescription>
            Add 500 or 1000 points to user accounts. Daily limit: 1000 points per user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Search */}
          <div>
            <Label htmlFor="user-search">Search User *</Label>
            <div className="relative">
              <Input
                id="user-search"
                placeholder="Search by username, email, or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedUser(null);
                }}
              />
              {isSearching && (
                <div className="absolute right-3 top-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
              {searchResults.length > 0 && !selectedUser && (
                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchTerm(`${user.username} (${user.email})`);
                        setSearchResults([]);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-sm text-gray-400">{user.fullName}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">{user.role}</Badge>
                          <div className="text-sm text-gray-500">
                            {user.pointBalance.toLocaleString()} points
                          </div>
                          <div className="text-xs text-amber-600">
                            Daily: {user.dailyRecharged}/1000
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600 font-medium">✓ Selected User:</p>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    <p className="font-medium">{selectedUser.username}</p>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Balance: {selectedUser.pointBalance.toLocaleString()}</p>
                    <p className="text-xs text-amber-600">
                      Daily Limit: {selectedUser.remainingDailyLimit}/1000 remaining
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for Point Addition *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why points are being added (minimum 5 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {reason.length}/5 characters minimum
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => addPoints(500)}
              disabled={isAdding || !selectedUser || reason.trim().length < 5}
              className="h-16 text-lg"
              variant="outline"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add 500 Points
            </Button>
            
            <Button 
              onClick={() => addPoints(1000)}
              disabled={isAdding || !selectedUser || reason.trim().length < 5}
              className="h-16 text-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add 1000 Points
            </Button>
          </div>

          {isAdding && (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Adding points...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Transaction Result */}
      {lastTransaction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transaction Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Amount Added</p>
                <p className="text-lg font-semibold text-green-600">
                  +{lastTransaction.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous Balance</p>
                <p className="text-lg font-semibold">
                  {lastTransaction.previousBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Balance</p>
                <p className="text-lg font-semibold">
                  {lastTransaction.newBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Total</p>
                <p className="text-lg font-semibold text-amber-600">
                  {lastTransaction.dailyRecharged}/1000
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimplePointManagement;
