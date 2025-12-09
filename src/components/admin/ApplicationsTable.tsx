import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { Application } from '@/hooks/admin/useAdminApplications';

interface ApplicationsTableProps {
  isLoading: boolean;
  pendingApplications: Application[];
  approvedApplications: Application[];
  rejectedApplications: Application[];
  isLoadingDetails: boolean;
  onReview: (applicationId: string) => void;
  getStatusBadgeVariant: (status: string) => 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export const ApplicationsTable = ({
  isLoading,
  pendingApplications,
  approvedApplications,
  rejectedApplications,
  isLoadingDetails,
  onReview,
  getStatusBadgeVariant,
}: ApplicationsTableProps) => {
  const getStatusBadge = (status: string) => {
    const variant = getStatusBadgeVariant(status);
    const labels: Record<string, string> = {
      approved: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
    };
    
    return (
      <Badge 
        className={variant === 'success' ? 'bg-success text-success-foreground' : undefined}
        variant={variant === 'success' ? undefined : variant}
      >
        {labels[status] || 'Unknown'}
      </Badge>
    );
  };

  const renderPendingTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading applications...</div>
        </div>
      );
    }

    if (pendingApplications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pending applications</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingApplications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{app.applicant_name}</p>
                  <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                </div>
              </TableCell>
              <TableCell>NOC</TableCell>
              <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onReview(app.id)}
                    disabled={isLoadingDetails}
                    className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingDetails ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </>
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderApprovedTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading applications...</div>
        </div>
      );
    }

    if (approvedApplications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No approved applications</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Approved Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvedApplications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{app.applicant_name}</p>
                  <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                </div>
              </TableCell>
              <TableCell>NOC</TableCell>
              <TableCell>
                {app.approved_at ? new Date(app.approved_at).toLocaleDateString() : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(app.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderRejectedTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading applications...</div>
        </div>
      );
    }

    if (rejectedApplications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No rejected applications</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Rejection Reason</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rejectedApplications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-mono text-sm">{app.application_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{app.applicant_name}</p>
                  <p className="text-sm text-muted-foreground">S/o {app.father_name}</p>
                </div>
              </TableCell>
              <TableCell>NOC</TableCell>
              <TableCell className="max-w-xs truncate">{app.admin_notes || '-'}</TableCell>
              <TableCell>{getStatusBadge(app.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Management</CardTitle>
        <CardDescription>Review and manage certificate applications from villagers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedApplications.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {renderPendingTable()}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {renderApprovedTable()}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {renderRejectedTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
