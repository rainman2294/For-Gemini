import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnrichedActivity } from '@/types/activity';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  Target,
  Download,
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

interface AnalyticsDashboardProps {
  className?: string;
}

interface RealAnalyticsData {
  totalProjects: number;
  totalActivities: number;
  projectsByStatus: Record<string, number>;
  activitiesByType: Record<string, number>;
  recentActivities: Array<{
    id: string;
    type: string;
    userName: string;
    projectName?: string;
    createdAt: string;
  }>;
  topUsers: Array<{
    userName: string;
    activityCount: number;
  }>;
  lastUpdated: Date;
}

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState({
    dateRange: '30d'
  });
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<RealAnalyticsData | null>(null);

  const apiConfig = typeof window !== 'undefined' && window.pulse2 ? window.pulse2 : null;
  const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('jwtToken') || '' : '';

  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const headers = { ...(options.headers || {}) } as Record<string, string>;
    if (apiConfig?.nonce) headers['X-WP-Nonce'] = apiConfig.nonce;
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    return fetch(url, { ...options, headers });
  };

  const fetchAnalyticsData = useCallback(async () => {
    if (!apiConfig) return;
    
    setLoading(true);
    try {
      // Try to fetch pre-aggregated analytics first, fallback to manual processing
      const analyticsRes = await fetchWithAuth(`${apiConfig.apiUrl}/analytics/summary`);
      
      if (analyticsRes.ok) {
        // Use server-side aggregated data if available
        const analyticsData = await analyticsRes.json();
        setAnalyticsData({
          ...analyticsData,
          lastUpdated: new Date()
        });
      } else {
        // Fallback to manual processing with reduced data
        const [projectsRes, activitiesRes, recentActivitiesRes] = await Promise.all([
          fetchWithAuth(`${apiConfig.apiUrl}/projects`),
          fetchWithAuth(`${apiConfig.apiUrl}/activities?limit=200&analytics=true`), // Reduced from 1000 to 200
          fetchWithAuth(`${apiConfig.apiUrl}/activities?limit=10&sort=desc`) // Separate call for recent activities
        ]);

        if (projectsRes.ok && activitiesRes.ok && recentActivitiesRes.ok) {
          const projects = await projectsRes.json();
          const activities = await activitiesRes.json();
          const recentActivities = await recentActivitiesRes.json();

          // Process projects data
          const projectsByStatus: Record<string, number> = {};
          projects.forEach((project: Project) => {
            const status = project.status || 'Unknown';
            projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
          });

          // Process activities data with memoization for performance
          const activitiesByType: Record<string, number> = {};
          const userActivityCount: Record<string, number> = {};
          
          activities.forEach((activity: { type: string; userName: string }) => {
            // Count by type
            const type = activity.type || 'unknown';
            activitiesByType[type] = (activitiesByType[type] || 0) + 1;
            
            // Count by user
            const userName = activity.userName || 'Unknown User';
            userActivityCount[userName] = (userActivityCount[userName] || 0) + 1;
          });

          // Get top users
          const topUsers = Object.entries(userActivityCount)
            .map(([userName, count]) => ({ userName, activityCount: count }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 5);

          // Map recent activities
          const mappedRecentActivities = recentActivities
            .slice(0, 10)
            .map((activity: EnrichedActivity) => ({
              id: activity.id,
              type: activity.type,
              userName: activity.userName,
              projectName: activity.projectName,
              createdAt: activity.createdAt
            }));

          setAnalyticsData({
            totalProjects: projects.length,
            totalActivities: activities.length,
            projectsByStatus,
            activitiesByType,
            recentActivities: mappedRecentActivities,
            topUsers,
            lastUpdated: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiConfig]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    if (!analyticsData) return;
    
    if (format === 'json') {
      const dataStr = JSON.stringify(analyticsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      downloadFile(url, `analytics.json`);
    } else if (format === 'csv') {
      const csvData = Papa.unparse([
        ['Metric', 'Value'],
        ['Total Projects', analyticsData.totalProjects],
        ['Total Activities', analyticsData.totalActivities],
        // Add more rows for other data
      ]);
      const dataBlob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      downloadFile(url, `analytics.csv`);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text('Analytics Report', 10, 10);
      doc.text(`Total Projects: ${analyticsData.totalProjects}`, 10, 20);
      doc.text(`Total Activities: ${analyticsData.totalActivities}`, 10, 30);
      // Add more content
      doc.save('analytics.pdf');
    }
  };
  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'planning': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getActivityTypeColor = (type: string) => {
    const colors = {
      'project_created': 'bg-green-100 text-green-800',
      'note_added': 'bg-blue-100 text-blue-800',
      'status_changed': 'bg-purple-100 text-purple-800',
      'member_added': 'bg-indigo-100 text-indigo-800',
      'media_uploaded': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!analyticsData) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <Button onClick={handleRefresh} disabled={loading} variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Last updated {formatDistanceToNow(analyticsData.lastUpdated, { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={loading} variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline">CSV</Button>
          <Button onClick={() => handleExport('json')} variant="outline">JSON</Button>
          <Button onClick={() => handleExport('pdf')} variant="outline">PDF</Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalActivities}</div>
            <p className="text-xs text-muted-foreground">
              Actions performed by users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.topUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Users with recent activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Activities/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.totalActivities > 0 ? Math.round(analyticsData.totalActivities / 30) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Projects by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analyticsData.projectsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{count}</p>
                  <Badge className={getStatusColor(status)}>
                    {status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activities by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activities by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analyticsData.activitiesByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{count}</p>
                  <Badge className={getActivityTypeColor(type)}>
                    {type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.topUsers.map((user, index) => (
              <div key={user.userName} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{user.userName}</p>
                    <p className="text-sm text-muted-foreground">{user.activityCount} activities</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getActivityTypeColor(activity.type)}>
                    {activity.type.replace('_', ' ')}
                  </Badge>
                  <div>
                    <p className="font-medium">{activity.userName}</p>
                    {activity.projectName && (
                      <p className="text-sm text-muted-foreground">Project: {activity.projectName}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsDashboard;