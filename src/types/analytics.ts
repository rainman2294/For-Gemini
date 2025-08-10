export interface UserActivity {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByDate: Record<string, number>;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: Date;
  }>;
  averageActionsPerDay: number;
  totalActiveDays: number;
}

export interface ProjectMetrics {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  projectsByPriority: Record<string, number>;
  averageProjectDuration: number; // in days
  projectsCompletedThisMonth: number;
  projectsOverdue: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  averageCompletionTime: number; // in days
  projectSuccessRate: number; // percentage
}

export interface TeamPerformance {
  memberActivity: Array<{
    userId: string;
    userName: string;
    projectsWorkedOn: number;
    notesAdded: number;
    mediaUploaded: number;
    statusChanges: number;
    totalActions: number;
    lastActivity: Date;
  }>;
  responseTimes: Record<string, number>; // Average response time per user in hours
  teamEfficiency: number; // percentage
  averageTasksPerMember: number;
  memberEngagement: Array<{
    userId: string;
    userName: string;
    engagementScore: number; // 0-100
    activeDays: number;
    lastActive: Date;
  }>;
}

export interface Timeline {
  dailyActivity: Array<{
    date: string;
    activityCount: number;
    projectCount: number;
    userCount: number;
  }>;
  weeklyTrends: Array<{
    week: string;
    activityCount: number;
    newProjects: number;
    completedProjects: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    newProjects: number;
    completedProjects: number;
    activeUsers: number;
    totalActivity: number;
  }>;
  yearlyOverview: Array<{
    year: string;
    totalProjects: number;
    completedProjects: number;
    totalActivity: number;
    averageResponseTime: number;
  }>;
}

export interface AnalyticsData {
  userActivity: UserActivity;
  projectMetrics: ProjectMetrics;
  teamPerformance: TeamPerformance;
  timeline: Timeline;
  lastUpdated: Date;
  dataRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface AnalyticsFilters {
  dateRange: '7d' | '30d' | '90d' | '1y' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  projectId?: string;
  userId?: string;
  activityType?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }>;
}

export interface AnalyticsExport {
  format: 'csv' | 'json' | 'pdf';
  data: AnalyticsData;
  filters: AnalyticsFilters;
  generatedAt: Date;
} 