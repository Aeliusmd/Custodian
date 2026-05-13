export interface DashboardKpi {
  label: string;
  value: string;
  delta: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

export interface DashboardTopUpStat {
  label: string;
  value: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

export interface RecentActivityItem {
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
  action: string;
  org: string;
  time: string;
  admin: string;
}

export interface SuperAdminDashboardSummary {
  kpis: DashboardKpi[];
  topupStats: DashboardTopUpStat[];
  recentActivity: RecentActivityItem[];
}
