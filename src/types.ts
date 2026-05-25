export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'Completed' | 'On Hold';

export interface ProjectDocument {
  id: string;
  name: string;
  fileType: string; // e.g. 'application/pdf', 'image/png'
  uploadedAt: string;
  uploadedBy: string;
  data: string; // base64 string
}

export interface ProjectLog {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  addedExpenditure?: number;
}

export interface Project {
  id: string;
  name: string;
  type: 'Interior' | 'Construction' | 'Real Estate';
  status: ProjectStatus;
  progress: number; // 0-100
  budget: number;
  spent: number;
  location: string;
  assignedUserId?: string;
  logs?: ProjectLog[];
  documents?: ProjectDocument[];
}

export interface Invoice {
  id: string;
  projectId: string;
  payee: string;
  amountPaid: number;
  date: string;
  description: string;
  category: 'Materials' | 'Labor' | 'Legal' | 'Logistics' | 'Other';
  status: 'Paid' | 'Pending';
  documentUrl?: string; // e.g. base64 cache
  rawText?: string;
  detailedNotes?: string;
}

export interface LeadComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  relatedProjectId?: string;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  location: string;
  interestLevel: 'High' | 'Medium' | 'Low';
  notes: string;
  assignedUserId?: string;
  comments?: LeadComment[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Expenditure {
  id: string;
  amount: number;
  purpose: string;
  paidTo: string;
  projectId: string;
  personName: string;
  attachmentData?: string;
  date: string;
}
