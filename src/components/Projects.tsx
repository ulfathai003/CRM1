import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Project, ProjectDocument } from '../types';
import { ChevronLeft, MessageSquare, DollarSign, Plus, Receipt } from 'lucide-react';

export default function Projects() {
  const { projects, currentUser, users, addProject, assignProject, addProjectLog, addProjectDocument, deleteProjectDocument } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);
  
  const [logText, setLogText] = useState('');
  const [logExpenditure, setLogExpenditure] = useState<number>(0);

  const handleFileUpload = (projectId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const newDoc = {
          id: 'doc_' + Date.now() + Math.random().toString(36).substring(7),
          name: file.name,
          fileType: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.name || 'VMS Specialist',
          data: base64Data
        };
        addProjectDocument(projectId, newDoc);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Check hash for pre-selected project
    const hashData = window.location.hash.split('?id=');
    if (hashData.length > 1 && hashData[1]) {
      setExpandedProjectId(hashData[1]);
    }
  }, []);

  const handleCardClick = (id: string, e: React.MouseEvent) => {
    // Don't expand if clicking on a select dropdown
    if ((e.target as HTMLElement).tagName === 'SELECT') {
      return;
    }
    setExpandedProjectId(id);
    window.location.hash = `#projects?id=${id}`;
  };

  const handleBack = () => {
    setExpandedProjectId(null);
    window.location.hash = `#projects`;
  };

  const [formData, setFormData] = useState({
    name: '', type: 'Interior', budget: 0, location: '', assignedUserId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    addProject({
      id: 'prj_' + Date.now(),
      name: formData.name,
      type: formData.type as any,
      status: 'Planning',
      progress: 0,
      budget: Number(formData.budget),
      spent: 0,
      location: formData.location,
      assignedUserId: formData.assignedUserId || undefined
    });
    setShowAddForm(false);
  };

  const handleAddLog = (projectId: string) => {
    if (!logText && !logExpenditure) return;
    addProjectLog(projectId, logText || 'Log updated', Number(logExpenditure));
    setLogText('');
    setLogExpenditure(0);
  };

  if (expandedProjectId) {
    const p = projects.find(pr => pr.id === expandedProjectId);
    if (!p) return null;
    const assignedUser = users.find(u => u.id === p.assignedUserId);

    return (
      <div className="space-y-6 pb-10 flex-col flex animate-fade-in">
        <button onClick={handleBack} className="bauhaus-button bg-white px-4 py-2 flex items-center gap-2 mb-4 self-start">
          <ChevronLeft size={20} /> Back to Projects
        </button>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
             <div className="bauhaus-card p-0 flex flex-col">
               <div className="p-4 border-b-4 border-black flex justify-between items-center bg-[#FFB703]">
                 <span className="heavy-text text-xs uppercase bg-white border-2 border-black px-2 py-1">{p.type}</span>
                 <span className="text-[10px] heavy-text uppercase tracking-widest">{p.status}</span>
               </div>
                <div className="p-6 relative overflow-hidden">
                 <div className="flex justify-between items-start mb-6 z-10 relative">
                   <div>
                     <h3 className="text-4xl heavy-text mb-2 uppercase">{p.name}</h3>
                     <p className="text-lg font-mono font-light bg-[#E0E5EC] px-2 py-1 inline-block border-2 border-black tracking-wider">{p.location}</p>
                   </div>
                   <div className="w-40 shrink-0">
                      <label className="block text-xs heavy-text uppercase mb-1">Assigned To</label>
                      <select 
                        value={p.assignedUserId || ''} 
                        onChange={(e) => assignProject(p.id, e.target.value)}
                        disabled={currentUser?.role !== 'ADMIN'}
                        className="w-full bg-white border-2 border-black p-2 text-xs heavy-text uppercase"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                   </div>
                 </div>
                 
                 <div className="space-y-6 z-10 relative">
                   <div>
                     <div className="flex justify-between text-sm heavy-text uppercase mb-2">
                       <span>Progress</span>
                       <span className={p.progress > 80 ? "text-[#E63946]" : "text-[#1D3557]"}>{p.progress}%</span>
                     </div>
                     <div className="h-4 w-full bg-[#F4F4F0] border-2 border-black overflow-hidden relative">
                       <div className={`h-full border-r-2 border-black transition-all duration-500 ease-out ${p.progress > 80 ? 'bg-[#E63946]' : 'bg-[#1D3557]'}`} style={{ width: `${p.progress}%` }}></div>
                     </div>
                   </div>
                   
                   <div className="pt-6 border-t-4 border-black border-dashed">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs heavy-text uppercase mb-1">Total Budget</div>
                          <div className="font-mono text-2xl font-light">\u20B9{p.budget.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs heavy-text uppercase mb-1">Total Spent</div>
                          <div className={`font-mono text-2xl font-light ${p.spent > p.budget ? "text-[#E63946] border-b-4 border-[#E63946]" : ""}`}>\u20B9{p.spent.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="h-4 w-full bg-[#F4F4F0] border-2 border-black overflow-hidden relative flex mt-4">
                        <div 
                          className={`h-full border-r-2 border-black transition-all ${p.spent > p.budget ? 'bg-[#E63946]' : 'bg-[#FFB703]'}`} 
                          style={{ width: `${Math.min((p.spent / p.budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {p.spent > p.budget && (
                        <div className="text-xs heavy-text uppercase text-[#E63946] mt-3 text-right">
                           OVER BUDGET BY \u20B9{(p.spent - p.budget).toLocaleString()}
                        </div>
                      )}
                      <div className="clear-both"></div>
                   </div>

                    {/* Integrated Documents Workspace inside Expanded View */}
                    <div className="pt-6 border-t-4 border-black border-dashed">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-xs heavy-text uppercase flex items-center gap-1.5 font-black text-black">
                          📁 Project Attachments ({p.documents?.length || 0})
                        </label>
                        <label className="cursor-pointer bg-[#FFB703] hover:bg-[#F2A702] border-2 border-black shadow-[2px_2px_0_0_#000] text-[10px] heavy-text uppercase py-1 px-2.5 rounded-[6px] font-bold active:translate-y-0.5 transition-all text-black hover:-translate-y-0.5">
                          + Add File/PDF
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(p.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {(!p.documents || p.documents.length === 0) ? (
                        <div className="text-[11px] font-mono text-gray-500 py-5 text-center border-2 border-dashed border-black/20 rounded-[8px] bg-black/5">
                          No attached documents. Upload PDF records or images.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1">
                          {p.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between text-xs bg-white border-2 border-black p-2 shadow-[2px_2px_0_0_#000] rounded-[8px]">
                              <div className="flex items-center gap-2 min-w-0 pr-1.5">
                                {doc.fileType.includes('pdf') ? (
                                  <span className="bg-red-100 text-red-700 font-bold px-1 rounded text-[9px] border border-red-200 shrink-0">PDF</span>
                                ) : (
                                  <span className="bg-cyan-100 text-cyan-700 font-bold px-1 rounded text-[9px] border border-cyan-200 shrink-0">IMG</span>
                                )}
                                <div className="truncate min-w-0">
                                  <p className="font-bold truncate text-black text-[11px]" title={doc.name}>{doc.name}</p>
                                  <p className="text-[8px] text-gray-400 font-mono leading-none">by {doc.uploadedBy}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDoc(doc)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#1D3557] hover:bg-[#2A4468] border-2 border-black rounded"
                                >
                                  View
                                </button>
                                <a
                                  href={doc.data}
                                  download={doc.name}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#10B981] hover:bg-[#059669] border-2 border-black rounded"
                                >
                                  Down
                                </a>
                                <button
                                  type="button"
                                  onClick={() => deleteProjectDocument(p.id, doc.id)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-[#E63946] hover:bg-[#C52B37] border-2 border-black rounded"
                                >
                                  Del
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                 </div>
               </div>
             </div>
          </div>
          
          <div className="w-full lg:w-[450px] bg-[#E0E5EC] border-4 border-black p-6 flex flex-col min-h-[500px]">
             <h4 className="heavy-text uppercase text-xl mb-4 border-b-4 border-black pb-4 flex items-center gap-2">
               <MessageSquare size={24} /> Daily Logs & Expenditure
             </h4>
             
             <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
               {!p.logs || p.logs.length === 0 ? (
                 <div className="heavy-text uppercase text-center opacity-50 border-4 border-dashed border-black/20 p-6 flex items-center justify-center h-full">No Logs Recorded</div>
               ) : (
                 p.logs.map(log => (
                   <div key={log.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_0_#000]">
                     <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-2">
                       <span className="heavy-text text-sm bg-[#1D3557] text-white px-2 py-1 uppercase tracking-widest">
                         {log.author}
                       </span>
                       <span className="font-mono text-xs font-light opacity-70">{new Date(log.timestamp).toLocaleString()}</span>
                     </div>
                     <p className="text-sm font-medium leading-relaxed mb-2">{log.text}</p>
                     {log.addedExpenditure ? (
                       <div className="text-xs heavy-text bg-[#E63946] text-white px-2 py-1 inline-block uppercase border-2 border-black shadow-[2px_2px_0_0_#000]">
                         New Expenditure: \u20B9{log.addedExpenditure.toLocaleString()}
                       </div>
                     ) : null}
                   </div>
                 ))
               )}
             </div>
             
             <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0_0_#000] mt-auto relative z-10">
                <div className="mb-3">
                  <label className="block heavy-text text-xs uppercase mb-1">Log Daily Update</label>
                  <textarea 
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    placeholder="Progress notes, decisions..."
                    className="bauhaus-input h-[80px] w-full text-sm resize-none"
                  />
                </div>
                <div className="mb-4">
                  <label className="block heavy-text text-xs uppercase mb-1 flex items-center gap-1"><DollarSign size={14}/> Add Manual Expenditure (\u20B9)</label>
                  <input 
                    type="number"
                    value={logExpenditure || ''}
                    onChange={(e) => setLogExpenditure(Number(e.target.value))}
                    placeholder="Amount to add to spent..."
                    className="bauhaus-input w-full"
                  />
                </div>
                <button onClick={() => handleAddLog(p.id)} className="w-full py-3 bg-[#E63946] text-white bauhaus-button text-sm flex justify-center items-center gap-2">
                  <Plus size={18} /> Record Update
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl heavy-text uppercase tracking-widest mb-2">Projects</h1>
          <div className="h-2 w-32 bg-[#1D3557] border-2 border-black"></div>
        </div>
        
        {currentUser?.role === 'ADMIN' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`bauhaus-button py-2 px-4 ${showAddForm ? 'bg-[#FFB703] text-black' : 'bg-[#E63946] text-white'}`}
          >
            {showAddForm ? 'Cancel' : 'Create New Project'}
          </button>
        )}
      </header>

      {showAddForm && currentUser?.role === 'ADMIN' && (
        <div className="bauhaus-card mb-8">
           <h2 className="text-2xl heavy-text uppercase mb-6">New Project Setup</h2>
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block heavy-text text-sm uppercase mb-2">Project Name</label>
                <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bauhaus-input" placeholder="e.g. Skyline Villa" />
              </div>
              <div>
                <label className="block heavy-text text-sm uppercase mb-2">Type</label>
                <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="bauhaus-input">
                   <option>Interior</option>
                   <option>Construction</option>
                   <option>Real Estate</option>
                </select>
              </div>
              <div>
                <label className="block heavy-text text-sm uppercase mb-2">Budget (\u20B9)</label>
                <input required type="number" value={formData.budget} onChange={e=>setFormData({...formData, budget: Number(e.target.value)})} className="bauhaus-input" placeholder="e.g. 5000000" />
              </div>
              <div>
                <label className="block heavy-text text-sm uppercase mb-2">Location</label>
                <input required value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="bauhaus-input" placeholder="e.g. Beverly Hills" />
              </div>
              <div className="md:col-span-2 border-t-4 border-black pt-4">
                <label className="block heavy-text text-sm uppercase mb-2">Assign To Lead Agent</label>
                <select value={formData.assignedUserId} onChange={e=>setFormData({...formData, assignedUserId: e.target.value})} className="bauhaus-input">
                   <option value="">-- Unassigned --</option>
                   {users.filter(u => u.role === 'USER').map(u => (
                     <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                   ))}
                </select>
              </div>
              <button type="submit" className="md:col-span-2 py-4 bg-[#1D3557] text-white bauhaus-button mt-4">
                Create Project
              </button>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {projects.map(p => {
           const assignedUser = users.find(u => u.id === p.assignedUserId);
           
           return (
             <div 
               key={p.id} 
               onClick={(e) => handleCardClick(p.id, e)}
               className="bauhaus-card p-0 flex flex-col cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[10px_10px_0_0_rgba(0,0,0,1)] hover:border-b-8"
             >
               <div className="p-4 border-b-4 border-black flex justify-between items-center bg-[#FFB703]">
                 <span className="heavy-text text-xs uppercase bg-white border-2 border-black px-2 py-1 pointer-events-none">{p.type}</span>
                 <span className="text-[10px] heavy-text uppercase tracking-widest pointer-events-none">{p.status}</span>
               </div>
                <div className="flex-1 p-6 relative overflow-hidden flex flex-col pointer-events-none">
                 <div className="flex justify-between items-start mb-6 z-10 relative">
                   <div>
                     <h3 className="text-2xl heavy-text mb-1 uppercase">{p.name}</h3>
                     <p className="text-sm font-mono font-light max-w-[150px]">{p.location}</p>
                   </div>
                   <div className="w-28 shrink-0 pointer-events-auto">
                      <label className="block text-[9px] heavy-text uppercase mb-1">Assigned To</label>
                      <select 
                        value={p.assignedUserId || ''} 
                        onChange={(e) => assignProject(p.id, e.target.value)}
                        disabled={currentUser?.role !== 'ADMIN'}
                        className="w-full bg-white border-2 border-black p-1 text-[10px] heavy-text uppercase"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                   </div>
                 </div>
                 
                 <div className="space-y-6 z-10 relative flex-1">
                   <div>
                     <div className="flex justify-between text-xs heavy-text uppercase mb-2">
                       <span>Progress</span>
                       <span className={p.progress > 80 ? "text-[#E63946]" : "text-[#1D3557]"}>{p.progress}%</span>
                     </div>
                     <div className="h-3 w-full bg-[#F4F4F0] border-2 border-black overflow-hidden relative">
                       <div className={`h-full border-r-2 border-black transition-all duration-500 ease-out ${p.progress > 80 ? 'bg-[#E63946]' : 'bg-[#1D3557]'}`} style={{ width: `${p.progress}%` }}></div>
                     </div>
                   </div>
                   
                   <div className="pt-4 border-t-4 border-black border-dashed">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-[10px] heavy-text uppercase mb-1">Budget</div>
                          <div className="font-mono text-sm font-light">\u20B9{p.budget.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] heavy-text uppercase mb-1">Spent</div>
                          <div className={`font-mono text-sm font-light ${p.spent > p.budget ? "text-[#E63946] border-b-2 border-[#E63946]" : ""}`}>\u20B9{p.spent.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-[#F4F4F0] border-2 border-black overflow-hidden relative flex">
                        <div 
                          className={`h-full border-r-2 border-black transition-all ${p.spent > p.budget ? 'bg-[#E63946]' : 'bg-[#FFB703]'}`} 
                          style={{ width: `${Math.min((p.spent / p.budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {p.spent > p.budget && (
                        <div className="text-[10px] heavy-text uppercase text-[#E63946] mt-2 text-right">
                           OVER BUDGET BY \u20B9{(p.spent - p.budget).toLocaleString()}
                        </div>
                      )}
                      <div className="clear-both"></div>
                   </div>
                 </div>
                 
                 <button 
                   onClick={() => setExpandedProjectId(p.id)} 
                   className="w-full mt-6 py-3 bg-[#1D3557] text-white bauhaus-button text-xs flex justify-center items-center gap-2"
                 >
                   Project Logs & Edit
                  </button>
                  <div className="flex gap-2 mt-4 pt-4 border-t-2 border-dashed border-black/20 pointer-events-auto">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.hash = `#generator?id=${p.id}`;
                      }}
                      className="flex-grow py-2 px-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-[10px] heavy-text uppercase tracking-wider rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 font-bold"
                      title="Instantly generate an invoice prefilled with this project's information"
                    >
                      <Receipt size={11} /> + Invoice
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.hash = `#expenditures?id=${p.id}`;
                      }}
                      className="flex-grow py-2 px-2.5 bg-[#E63946] hover:bg-[#C52B37] text-white text-[10px] heavy-text uppercase tracking-wider rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 font-bold"
                      title="Directly log an expenditure linked to this project"
                    >
                      <DollarSign size={11} /> + Expense
                    </button>
                  </div>

                  {/* Documents Section inside Project Card Grid */}
                  <div 
                    className="mt-4 pt-4 border-t-2 border-dashed border-black/20 pointer-events-auto flex flex-col width-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] heavy-text uppercase tracking-wider text-black flex items-center gap-1.5 font-black">
                        📁 Documents ({p.documents?.length || 0})
                      </span>
                      <label className="cursor-pointer bg-[#FFB703] hover:bg-[#F2A702] border border-black shadow-[1px_1px_0_0_#000] text-[9px] heavy-text uppercase py-0.5 px-2 rounded-[4px] font-bold active:translate-y-0.5 transition-all text-black">
                        + ADD
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(p.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {(!p.documents || p.documents.length === 0) ? (
                      <div className="text-[9px] font-mono text-gray-500 py-2 text-center border-2 border-dashed border-black/10 rounded-[6px] bg-black/5">
                        No attached documents
                      </div>
                    ) : (
                      <div className="max-h-[85px] overflow-y-auto space-y-1.5 pr-1">
                        {p.documents.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between text-[10px] bg-[#FAF9F5] border-2 border-black p-1.5 shadow-[1px_1px_0_0_#000] rounded-[6px]">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {doc.fileType.includes('pdf') ? (
                                <span className="bg-red-100 text-red-700 font-bold px-1 rounded text-[8px] border border-red-200 shrink-0">PDF</span>
                              ) : (
                                <span className="bg-cyan-100 text-cyan-700 font-bold px-1 rounded text-[8px] border border-cyan-200 shrink-0">IMG</span>
                              )}
                              <span className="truncate font-mono text-black pl-0.5" title={doc.name}>{doc.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDoc(doc)}
                                className="text-[9px] text-[#1D3557] hover:underline font-extrabold uppercase"
                              >
                                View
                              </button>
                              <a
                                href={doc.data}
                                download={doc.name}
                                className="text-[9px] text-[#10B981] hover:underline font-extrabold uppercase"
                              >
                                Down
                              </a>
                              <button
                                type="button"
                                onClick={() => deleteProjectDocument(p.id, doc.id)}
                                className="text-[9px] text-[#E63946] hover:underline font-extrabold uppercase"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button style={{ display: 'none' }}>
                 </button>
               </div>
             </div>
           );
        })}
      </div>

      {/* High-fidelity Document Attachment Viewer Modal with base64 render controls */}
      {selectedDoc && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
          onClick={() => setSelectedDoc(null)}
        >
          <div 
            className="w-full max-w-4xl bg-[#FAF9F5] border-4 border-black p-6 rounded-[16px] shadow-[8px_8px_0_0_#000] relative max-h-[90vh] flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button icon */}
            <button 
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 bg-[#E63946] hover:bg-[#C52B37] text-white border-2 border-black font-bold p-1.5 rounded-[8px] hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0_0_#000]"
              title="Close Panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Title / Attributes */}
            <div className="border-b-4 border-dashed border-black/20 pb-4 mb-4 pr-10">
              <span className="text-[10px] tracking-widest bg-[#1D3557] border border-black text-white px-2 py-0.5 uppercase heavy-text inline-block mb-1.5 rounded shadow-[1px_1px_0_0_#000]">
                {selectedDoc.fileType}
              </span>
              <h3 className="text-xl heavy-text uppercase text-black font-black truncate max-w-[80%]">
                {selectedDoc.name}
              </h3>
              <p className="text-xs font-mono text-gray-500 leading-none mt-1 font-semibold">
                Filing Author: {selectedDoc.uploadedBy} • Registered: {new Date(selectedDoc.uploadedAt).toLocaleString()}
              </p>
            </div>

            {/* Document Render Window Canvas */}
            <div className="flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-black/5 border-2 border-black rounded-[12px] p-4 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]">
              {selectedDoc.fileType.includes('image') ? (
                <img
                  src={selectedDoc.data}
                  alt={selectedDoc.name}
                  className="max-w-full max-h-[50vh] object-contain rounded-[8px] border-2 border-black shadow-[4px_4px_0_0_#000]"
                  referrerPolicy="no-referrer"
                />
              ) : selectedDoc.fileType.includes('pdf') ? (
                <iframe
                  src={selectedDoc.data}
                  title={selectedDoc.name}
                  className="w-full h-[55vh] border-2 border-black rounded-[8px] bg-white"
                />
              ) : (
                <div className="text-center p-6 space-y-4">
                  <div className="text-4xl">⚠️</div>
                  <h4 className="heavy-text uppercase text-black text-sm">Preview Unsupported Inline</h4>
                  <p className="text-xs font-mono text-gray-500 max-w-sm leading-normal font-semibold">
                    This attachment container doesn't support live render inside browser sandbox contexts.
                  </p>
                  <a
                    href={selectedDoc.data}
                    download={selectedDoc.name}
                    className="inline-block py-2 px-6 bg-[#10B981] hover:bg-[#059669] text-white rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] heavy-text uppercase tracking-wider text-xs active:translate-y-0.5 font-bold"
                  >
                    Direct Download Original
                  </a>
                </div>
              )}
            </div>

            {/* Footer Signoff Controls */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t-2 border-dashed border-black/20">
              <a
                href={selectedDoc.data}
                download={selectedDoc.name}
                className="py-2 px-5 bg-[#10B981] hover:bg-[#059669] text-white rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] heavy-text uppercase tracking-wider text-xs active:translate-y-0.5 transition-all font-bold flex items-center justify-center"
              >
                Download Document
              </a>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="py-2 px-5 bg-[#1D3557] hover:bg-[#2A4468] text-white rounded-[8px] border-2 border-black shadow-[2px_2px_0_0_#000] heavy-text uppercase tracking-wider text-xs active:translate-y-0.5 transition-all font-bold"
              >
                Dismiss Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
