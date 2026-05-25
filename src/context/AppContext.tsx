import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Project, Invoice, Lead, ActivityLog, Expenditure, ProjectDocument } from '../types';

interface AppState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  invoices: Invoice[];
  leads: Lead[];
  logs: ActivityLog[];
  expenditures: Expenditure[];
}

interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  toggleRole: () => void;
  addProject: (p: Project) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  assignProject: (projectId: string, userId: string) => void;
  addProjectLog: (id: string, text: string, amount: number) => void;
  addExpenditure: (e: Expenditure) => void;
  deleteExpenditure: (id: string) => void;
  addInvoice: (i: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addLead: (l: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLeadComment: (id: string, text: string, relatedProjectId?: string) => void;
  deleteLead: (id: string) => void;
  assignLead: (leadId: string, userId: string) => void;
  logActivity: (action: string, details: string) => void;
  addProjectDocument: (projectId: string, doc: ProjectDocument) => void;
  deleteProjectDocument: (projectId: string, docId: string) => void;
}

const mockUsers: User[] = [
  { id: 'usr_1', email: 'admin@archcon.com', role: 'ADMIN', name: 'Master Admin' },
  { id: 'usr_2', email: 'sarah.m@archcon.com', role: 'USER', name: 'Sarah Manager' },
  { id: 'usr_3', email: 'john.d@archcon.com', role: 'USER', name: 'John Doe' },
];

const mockProjects: Project[] = [
  { id: '1', name: 'Downtown Penthouse', type: 'Interior', status: 'In Progress', progress: 45, budget: 500000, spent: 120000, location: 'City Center' },
  { id: '2', name: 'Sunrise Villas', type: 'Construction', status: 'Planning', progress: 10, budget: 15000000, spent: 500000, location: 'East Side', assignedUserId: 'usr_2' },
];

const mockInvoices: Invoice[] = [
  { id: '1', projectId: '1', payee: 'Lumber Inc', amountPaid: 45000, date: '2023-10-15', description: 'Hardwood Flooring', category: 'Materials', status: 'Paid', documentUrl: '#' },
  { id: '2', projectId: '1', payee: 'Expert Plumbers', amountPaid: 15000, date: '2023-11-02', description: 'Pipe installation', category: 'Labor', status: 'Pending', documentUrl: '#' },
];

const mockLeads: Lead[] = [
  { id: '1', name: 'Sarah Connor', contact: 'sarah@example.com', location: 'West End', interestLevel: 'High', notes: 'Looking for full house renovation' },
];

const mockExpenditures: Expenditure[] = [
  { id: '1', amount: 15000, purpose: 'Plumbing Materials', paidTo: 'Expert Plumbers', projectId: '1', personName: 'Sarah Manager', date: new Date().toISOString() }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: mockUsers,
    projects: mockProjects,
    invoices: mockInvoices,
    leads: mockLeads,
    logs: [],
    expenditures: mockExpenditures,
  });

  const generateLog = (s: AppState, action: string, details: string): ActivityLog | null => {
    if (!s.currentUser) return null;
    return {
      id: 'log_' + Date.now() + Math.random().toString(36).substring(7),
      userId: s.currentUser.id,
      userName: s.currentUser.name,
      action,
      details,
      timestamp: new Date().toISOString()
    };
  };

  const withLog = (s: AppState, action: string, details: string) => {
    const log = generateLog(s, action, details);
    return log ? { logs: [log, ...s.logs] } : {};
  };

  const login = (user: User) => setState(s => {
    const newState = { ...s, currentUser: user };
    return { ...newState, ...withLog(newState, 'Login', 'User successfully logged into the system') };
  });

  const logout = () => setState(s => {
    const logState = withLog(s, 'Logout', 'User logged out of the system');
    return { ...s, ...logState, currentUser: null };
  });

  const toggleRole = () => setState(s => {
    if (!s.currentUser) return s;
    const newRole = s.currentUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    return { 
      ...s, 
      currentUser: { ...s.currentUser, role: newRole },
      ...withLog(s, 'Role Switch', `Role changed to ${newRole}`)
    };
  });

  const addProject = (p: Project) => setState(s => ({ 
    ...s, 
    projects: [...s.projects, p],
    ...withLog(s, 'Project Created', `Created new project: ${p.name}`)
  }));

  const updateProjectProgress = (id: string, progress: number) => setState(s => {
    const proj = s.projects.find(p => p.id === id);
    return {
      ...s,
      projects: s.projects.map(p => p.id === id ? { ...p, progress } : p),
      ...withLog(s, 'Progress Updated', `Updated progress for ${proj?.name || id} to ${progress}%`)
    };
  });

  const assignProject = (projectId: string, userId: string) => setState(s => {
    const proj = s.projects.find(p => p.id === projectId);
    const assignedUser = s.users.find(u => u.id === userId);
    return {
      ...s,
      projects: s.projects.map(p => p.id === projectId ? { ...p, assignedUserId: userId } : p),
      ...withLog(s, 'Project Assigned', `Assigned ${proj?.name || projectId} to ${assignedUser?.name || userId}`)
    };
  });

  const addProjectLog = (id: string, text: string, amount: number) => setState(s => {
    const proj = s.projects.find(p => p.id === id);
    if (!proj) return s;
    const author = s.currentUser?.name || 'System';
    const newLog = {
      id: 'pl_' + Date.now(),
      text,
      author,
      timestamp: new Date().toISOString(),
      addedExpenditure: amount
    };
    return {
      ...s,
      projects: s.projects.map(p => p.id === id ? { 
        ...p, 
        spent: p.spent + (amount || 0),
        logs: [...(p.logs || []), newLog] 
      } : p),
      ...withLog(s, 'Project Log Added', `Added log to project ${proj.name}`)
    };
  });

  const addExpenditure = (e: Expenditure) => setState(s => {
    const proj = s.projects.find(p => p.id === e.projectId);
    if (!proj) return s;
    return {
      ...s,
      expenditures: [...s.expenditures, e],
      projects: s.projects.map(p => p.id === e.projectId ? { ...p, spent: p.spent + e.amount } : p),
      ...withLog(s, 'Expenditure Added', `Logged ₹${e.amount} for ${e.purpose} in ${proj.name}`)
    };
  });

  const deleteExpenditure = (id: string) => setState(s => {
    const exp = s.expenditures.find(e => e.id === id);
    if (!exp) return s;
    return {
      ...s,
      expenditures: s.expenditures.filter(e => e.id !== id),
      projects: s.projects.map(p => p.id === exp.projectId ? { ...p, spent: p.spent - exp.amount } : p),
      ...withLog(s, 'Expenditure Deleted', `Deleted expenditure for ${exp.purpose}`)
    };
  });

  const addInvoice = (i: Invoice) => setState(s => {
    const proj = s.projects.find(p => p.id === i.projectId);
    return {
      ...s,
      invoices: [...s.invoices, i],
      ...withLog(s, 'Invoice Added', `Added invoice for ₹${i.amountPaid} under ${proj?.name || 'Unknown'}`)
    };
  });

  const updateInvoice = (id: string, updates: Partial<Invoice>) => setState(s => {
    const inv = s.invoices.find(i => i.id === id);
    return {
      ...s,
      invoices: s.invoices.map(i => i.id === id ? { ...i, ...updates } : i),
      ...withLog(s, 'Invoice Updated', `Updated invoice records for ${inv?.payee || id}`)
    };
  });

  const deleteInvoice = (id: string) => setState(s => {
    const inv = s.invoices.find(i => i.id === id);
    return {
      ...s,
      invoices: s.invoices.filter(i => i.id !== id),
      ...withLog(s, 'Invoice Deleted', `Deleted invoice for ${inv?.payee || id}`)
    };
  });

  const addLead = (l: Lead) => setState(s => ({
    ...s,
    leads: [...s.leads, l],
    ...withLog(s, 'Lead Added', `Added new lead: ${l.name}`)
  }));

  const assignLead = (leadId: string, userId: string) => setState(s => {
    const lead = s.leads.find(l => l.id === leadId);
    const assignedUser = s.users.find(u => u.id === userId);
    return {
      ...s,
      leads: s.leads.map(l => l.id === leadId ? { ...l, assignedUserId: userId } : l),
      ...withLog(s, 'Lead Assigned', `Assigned lead ${lead?.name || leadId} to ${assignedUser?.name || userId}`)
    };
  });

  const updateLead = (id: string, updates: Partial<Lead>) => setState(s => {
    const lead = s.leads.find(l => l.id === id);
    return {
      ...s,
      leads: s.leads.map(l => l.id === id ? { ...l, ...updates } : l),
      ...withLog(s, 'Lead Updated', `Updated lead details for ${lead?.name || id}`)
    };
  });

  const addLeadComment = (id: string, text: string, relatedProjectId?: string) => setState(s => {
    const lead = s.leads.find(l => l.id === id);
    if (!lead) return s;
    const author = s.currentUser?.name || 'System';
    const newComment = {
      id: 'lc_' + Date.now(),
      text,
      author,
      timestamp: new Date().toISOString(),
      relatedProjectId
    };
    return {
      ...s,
      leads: s.leads.map(l => l.id === id ? { ...l, comments: [...(l.comments || []), newComment] } : l),
      ...withLog(s, 'Lead Comment Added', `Added comment to lead ${lead.name}`)
    };
  });

  const deleteLead = (id: string) => setState(s => {
    const lead = s.leads.find(l => l.id === id);
    return {
      ...s,
      leads: s.leads.filter(l => l.id !== id),
      ...withLog(s, 'Lead Deleted', `Deleted lead ${lead?.name || id}`)
    };
  });

  const logActivity = (action: string, details: string) => setState(s => ({
    ...s,
    ...withLog(s, action, details)
  }));

  const addProjectDocument = (projectId: string, doc: ProjectDocument) => setState(s => {
    const proj = s.projects.find(p => p.id === projectId);
    if (!proj) return s;
    return {
      ...s,
      projects: s.projects.map(p => p.id === projectId ? {
        ...p,
        documents: [...(p.documents || []), doc]
      } : p),
      ...withLog(s, 'Document Uploaded', `Uploaded document "${doc.name}" to project ${proj.name}`)
    };
  });

  const deleteProjectDocument = (projectId: string, docId: string) => setState(s => {
    const proj = s.projects.find(p => p.id === projectId);
    if (!proj) return s;
    const doc = proj.documents?.find(d => d.id === docId);
    return {
      ...s,
      projects: s.projects.map(p => p.id === projectId ? {
        ...p,
        documents: (p.documents || []).filter(d => d.id !== docId)
      } : p),
      ...withLog(s, 'Document Deleted', `Deleted document "${doc?.name || docId}" from project ${proj.name}`)
    };
  });

  return (
    <AppContext.Provider value={{
      ...state,
      login, logout, toggleRole,
      addProject, updateProjectProgress, assignProject, addProjectLog,
      addExpenditure, deleteExpenditure,
      addInvoice, updateInvoice, deleteInvoice, 
      addLead, updateLead, deleteLead, addLeadComment, assignLead,
      logActivity, addProjectDocument, deleteProjectDocument
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
