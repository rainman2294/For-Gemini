export const projectStatuses = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-500', borderColor: 'border-gray-500' },
  { value: 'preview', label: 'Preview', color: 'bg-blue-500', borderColor: 'border-blue-500' },
  { value: 'waiting-preview-reply', label: 'Waiting Preview Reply', color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  { value: 'preview-feedback', label: 'Preview Feedback', color: 'bg-orange-500', borderColor: 'border-orange-500' },
  { value: 'preview-approved', label: 'Preview Approved', color: 'bg-teal-500', borderColor: 'border-teal-500' },
  { value: 'rendering', label: 'Rendering', color: 'bg-primary text-primary-foreground', borderColor: 'border-primary' },
  { value: 'waiting-render-reply', label: 'Waiting Render Reply', color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
  { value: 'render-approved', label: 'Render Approved', color: 'bg-green-500', borderColor: 'border-green-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-600 text-white', borderColor: 'border-green-600' }
] as const;

export const statusValues = projectStatuses.map(s => s.value);

export const getStatusColorClass = (status: (typeof statusValues)[number]) => {
  return projectStatuses.find(s => s.value === status)?.color ?? 'bg-gray-500';
};

export const getStatusBorderColorClass = (status: (typeof statusValues)[number]) => {
  return projectStatuses.find(s => s.value === status)?.borderColor ?? 'border-gray-500';
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-green-600 text-white';
    case 'preview-approved': return 'bg-teal-500 text-white';
    case 'render-approved': return 'bg-green-500 text-white';
    case 'preview-feedback': return 'bg-orange-500 text-white';
    case 'waiting-preview-reply': return 'bg-yellow-500';
    case 'waiting-render-reply': return 'bg-yellow-500';
    case 'preview': return 'bg-blue-500 text-white';
    case 'rendering': return 'bg-primary text-primary-foreground';
    default: return 'bg-gray-700 text-white';
  }
}; 