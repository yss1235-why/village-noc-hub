import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, User, CheckCircle } from 'lucide-react';

interface SearchUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  isApproved: boolean;
  pointBalance?: number;
}

interface UserSearchProps {
  onUserSelect: (user: SearchUser) => void;
  selectedUserId?: string;
  placeholder?: string;
  roles?: string[];
  label?: string;
  disabled?: boolean;
}

const UserSearch: React.FC<UserSearchProps> = ({
  onUserSelect,
  selectedUserId,
  placeholder = "Search by username, email, or name...",
  roles = ['user', 'applicant'],
  label = "Select User",
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { toast } = useToast();

  // Search for users with debouncing
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const rolesParam = roles.join(',');
      const response = await fetch(
        `/.netlify/functions/search-users?q=${encodeURIComponent(query)}&roles=${rolesParam}&approved=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
        setShowResults(true);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('User search failed:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search users. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchTerm(`${user.username} (${user.email})`);
    setShowResults(false);
    onUserSelect(user);
  };

  // Handle search term change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      setSelectedUser(null);
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (searchTerm && !selectedUser) {
      const debounceTimer = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, selectedUser]);

  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'applicant': return 'bg-green-100 text-green-800';
      case 'village_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'super_admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="user-search-container relative">
      <Label htmlFor="user-search">{label}</Label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          id="user-search"
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          disabled={disabled}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleUserSelect(user)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {user.username}
                    </span>
                    {user.isApproved && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {user.email}
                  </div>
                  {user.fullName && (
                    <div className="text-sm text-gray-500 truncate">
                      {user.fullName}
                    </div>
                  )}
                  {typeof user.pointBalance === 'number' && (
                    <div className="text-xs text-blue-600 mt-1">
                      Balance: {user.pointBalance.toLocaleString()} points
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleColor(user.role)}`}
                  >
                    {user.role.replace('_', ' ')}
                  </Badge>
                  {!user.isApproved && (
                    <Badge variant="destructive" className="text-xs">
                      Not Approved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md mt-1 p-3 text-center text-gray-500 shadow-lg">
          No users found matching "{searchTerm}"
        </div>
      )}

      {/* Selected User Display */}
      {selectedUser && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-blue-900">
                Selected: {selectedUser.username}
              </span>
            </div>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getRoleColor(selectedUser.role)}`}
            >
              {selectedUser.role.replace('_', ' ')}
            </Badge>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {selectedUser.email}
            {selectedUser.fullName && ` • ${selectedUser.fullName}`}
            {typeof selectedUser.pointBalance === 'number' && 
              ` • ${selectedUser.pointBalance.toLocaleString()} points`
            }
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-1">
        Search for {roles.join(' or ')} accounts{roles.includes('user') || roles.includes('applicant') ? ' only' : ''}
      </p>
    </div>
  );
};

export default UserSearch;
