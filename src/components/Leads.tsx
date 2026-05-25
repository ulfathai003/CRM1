import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MapPin, MessageSquare, Edit2, ChevronDown, ChevronRight, Save, Trash2 } from 'lucide-react';

export default function Leads() {
  const { leads, addLead, assignLead, updateLead, deleteLead, addLeadComment, currentUser, users, projects } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact: '', location: '', interestLevel: 'Medium', notes: '', assignedUserId: '' });
  
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  
  const [newComment, setNewComment] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLead({
      id: 'ld_' + Date.now(),
      name: formData.name,
      contact: formData.contact,
      location: formData.location,
      interestLevel: formData.interestLevel as 'High'|'Medium'|'Low',
      notes: formData.notes,
      assignedUserId: formData.assignedUserId || undefined,
      comments: []
    });
    setShowAddForm(false);
    setFormData({ name: '', contact: '', location: '', interestLevel: 'Medium', notes: '', assignedUserId: '' });
  };

  const handleEditClick = (lead: any) => {
    setEditMode(lead.id);
    setEditData({
      name: lead.name,
      contact: lead.contact,
      location: lead.location,
      interestLevel: lead.interestLevel,
      notes: lead.notes,
      assignedUserId: lead.assignedUserId || ''
    });
  };

  const handleSaveEdit = (id: string) => {
    updateLead(id, editData);
    if (editData.assignedUserId) {
      assignLead(id, editData.assignedUserId);
    }
    setEditMode(null);
  };

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return;
    addLeadComment(id, newComment, selectedProjectId || undefined);
    setNewComment('');
    setSelectedProjectId('');
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl heavy-text uppercase tracking-widest mb-2">Leads Tracking</h1>
          <div className="h-2 w-32 bg-[#1D3557] border-2 border-black"></div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`bauhaus-button py-2 px-4 ${showAddForm ? 'bg-[#FFB703] text-black' : 'bg-[#E63946] text-white'}`}
        >
          {showAddForm ? 'Close' : 'Add New Lead'}
        </button>
      </header>

      {showAddForm && (
        <div className="bauhaus-card mb-8">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Name</label>
                <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bauhaus-input" placeholder="Client Name" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Contact</label>
                <input required value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="bauhaus-input" placeholder="Email or Phone" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Location</label>
                <input required value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="bauhaus-input" placeholder="City, Region" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Interest Level</label>
                <select value={formData.interestLevel} onChange={e=>setFormData({...formData, interestLevel: e.target.value})} className="bauhaus-input">
                   <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="md:col-span-2">
                 <label className="block heavy-text text-xs uppercase mb-2">Notes</label>
                 <textarea required value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="bauhaus-input min-h-[80px]" placeholder="Brief background or requirements..." />
              </div>
              <div className="md:col-span-2 border-t-4 border-black pt-4 mt-2">
                <label className="block heavy-text text-xs uppercase mb-2">Assign To Agent</label>
                <select value={formData.assignedUserId} onChange={e=>setFormData({...formData, assignedUserId: e.target.value})} className="bauhaus-input">
                   <option value="">-- Unassigned --</option>
                   {users.map(u => (
                     <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                   ))}
                </select>
              </div>
              <button type="submit" className="md:col-span-2 py-4 bg-[#1D3557] text-white bauhaus-button mt-4">
                Save Lead
              </button>
           </form>
        </div>
      )}

      <div className="bauhaus-card p-0 overflow-hidden relative">
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-4 border-black bg-[#E0E5EC]">
                <th className="p-4 w-10 text-center border-r-4 border-black"></th>
                <th className="p-4 heavy-text uppercase text-sm border-r-4 border-black">Lead Name</th>
                <th className="p-4 heavy-text uppercase text-sm hidden md:table-cell border-r-4 border-black">Contact</th>
                <th className="p-4 heavy-text uppercase text-sm text-center border-r-4 border-black">Interest</th>
                <th className="p-4 heavy-text uppercase text-sm">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center heavy-text uppercase text-gray-500">No leads found</td></tr>
              ) : leads.map((ld) => {
                const assignedUser = users.find(u => u.id === ld.assignedUserId);
                const isExpanded = expandedLeadId === ld.id;
                const isEditing = editMode === ld.id;
                
                return (
                  <React.Fragment key={ld.id}>
                    <tr className={`border-b-4 border-black bg-white hover:bg-[#F4F4F0] transition-colors ${isExpanded ? 'bg-[var(--color-bauhaus-yellow)]' : ''}`}>
                      <td className="p-4 text-center border-r-4 border-black cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setExpandedLeadId(isExpanded ? null : ld.id)}>
                        {isExpanded ? <ChevronDown size={18} className="mx-auto" /> : <ChevronRight size={18} className="mx-auto" />}
                      </td>
                      <td className="p-4 heavy-text text-lg border-r-4 border-black">{ld.name}</td>
                      <td className="p-4 text-sm font-mono border-r-4 border-black hidden md:table-cell">{ld.contact}</td>
                      <td className="p-4 text-center border-r-4 border-black">
                        <span className={`text-[10px] heavy-text uppercase tracking-widest px-2 py-1 border-2 border-black ${ld.interestLevel === 'High' ? 'bg-[#E63946] text-white' : ld.interestLevel === 'Medium' ? 'bg-[#FFB703] text-black' : 'bg-[#1D3557] text-white'}`}>
                          {ld.interestLevel}
                        </span>
                      </td>
                      <td className="p-4 text-sm heavy-text uppercase">
                        {assignedUser ? assignedUser.name : <span className="opacity-50 italic">Unassigned</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b-4 border-black relative">
                        <td colSpan={5} className="p-0 bg-[#F4F4F0] border-t-2 border-dashed border-black">
                          {isEditing ? (
                            <div className="p-6 bg-white border-b-4 border-black">
                              <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl heavy-text uppercase">Edit Lead</h3>
                                <div className="flex gap-2">
                                  <button onClick={() => setEditMode(null)} className="bauhaus-button px-4 py-2 bg-white">Cancel</button>
                                  <button onClick={() => handleSaveEdit(ld.id)} className="bauhaus-button px-4 py-2 bg-[#1D3557] text-white flex items-center gap-1.5"><Save size={14}/> Save</button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block heavy-text text-xs uppercase mb-1">Name</label>
                                  <input value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="bauhaus-input" />
                                </div>
                                <div>
                                  <label className="block heavy-text text-xs uppercase mb-1">Contact</label>
                                  <input value={editData.contact} onChange={e=>setEditData({...editData, contact: e.target.value})} className="bauhaus-input" />
                                </div>
                                <div>
                                  <label className="block heavy-text text-xs uppercase mb-1">Location</label>
                                  <input value={editData.location} onChange={e=>setEditData({...editData, location: e.target.value})} className="bauhaus-input" />
                                </div>
                                <div>
                                  <label className="block heavy-text text-xs uppercase mb-1">Interest Level</label>
                                  <select value={editData.interestLevel} onChange={e=>setEditData({...editData, interestLevel: e.target.value})} className="bauhaus-input">
                                     <option>High</option><option>Medium</option><option>Low</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block heavy-text text-xs uppercase mb-1">Original Notes</label>
                                  <textarea value={editData.notes} onChange={e=>setEditData({...editData, notes: e.target.value})} className="bauhaus-input min-h-[80px]" />
                                </div>
                                {currentUser?.role === 'ADMIN' && (
                                  <div className="md:col-span-2">
                                    <label className="block heavy-text text-xs uppercase mb-1">Assigned Agent</label>
                                    <select value={editData.assignedUserId} onChange={e=>setEditData({...editData, assignedUserId: e.target.value})} className="bauhaus-input">
                                       <option value="">Unassigned</option>
                                       {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row divide-y-4 md:divide-y-0 md:divide-x-4 divide-black">
                              <div className="flex-1 p-6 bg-white min-h-[300px] flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between items-start mb-6">
                                    <div>
                                      <h3 className="text-3xl heavy-text uppercase mb-2">{ld.name}</h3>
                                      <p className="font-mono font-light bg-[#E0E5EC] px-2 py-1 inline-block border-2 border-black tracking-wider">{ld.contact}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleEditClick(ld)} className="bauhaus-button p-2 bg-white" title="Edit">
                                        <Edit2 size={16} />
                                      </button>
                                      <button onClick={() => deleteLead(ld.id)} className="bauhaus-button p-2 bg-[#E63946] text-white" title="Delete">
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <p className="heavy-text uppercase flex items-center gap-2 mb-6 text-sm"><MapPin size={16} className="text-[#E63946]" /> {ld.location}</p>
                                  
                                  <div className="border-t-4 border-black pt-4">
                                    <h4 className="heavy-text uppercase text-[10px] tracking-widest mb-2 opacity-70">Original Context Notes</h4>
                                    <p className="font-mono text-sm leading-relaxed p-4 bg-[#F4F4F0] border-2 border-black border-dashed">"{ld.notes}"</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="w-full md:w-[400px] bg-[#E0E5EC] p-6 flex flex-col h-auto min-h-[400px]">
                                <h4 className="heavy-text uppercase text-sm mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                                  <MessageSquare size={16} /> Comments Log
                                </h4>
                                
                                <div className="flex-1 overflow-y-auto max-h-[250px] space-y-4 mb-4 pr-2">
                                  {!ld.comments || ld.comments.length === 0 ? (
                                    <div className="heavy-text uppercase text-center opacity-50 border-4 border-dashed border-black/20 p-6 flex items-center justify-center h-full">No Comments Logged</div>
                                  ) : ld.comments.map(c => {
                                    const relatedProject = projects.find(p => p.id === c.relatedProjectId);
                                    return (
                                      <div key={c.id} className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000]">
                                        <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-1">
                                          <span className="heavy-text text-xs bg-[#1D3557] text-white px-1.5 py-0.5 uppercase tracking-widest">
                                            {c.author}
                                          </span>
                                          <span className="font-mono text-[9px] font-light opacity-70">{new Date(c.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm font-medium leading-tight">{c.text}</p>
                                        {relatedProject && (
                                          <div className="mt-2 text-[10px] heavy-text bg-[#FFB703] border-2 border-black px-2 py-0.5 uppercase inline-block">
                                            Ref: {relatedProject.name}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                
                                <div className="mt-auto bg-white border-4 border-black p-4 shadow-[6px_6px_0_0_#000]">
                                  <select 
                                    value={selectedProjectId} 
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="bauhaus-input mb-3 text-xs w-full py-2"
                                  >
                                    <option value="">-- Mention Project (Optional) --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                  <textarea 
                                    value={newComment} 
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Log interaction..."
                                    className="bauhaus-input py-2 h-[60px] resize-none mb-3 text-xs w-full"
                                  />
                                  <button onClick={() => handleAddComment(ld.id)} className="w-full py-2 bg-[#E63946] text-white bauhaus-button text-xs flex justify-center items-center gap-2">
                                    <MessageSquare size={14} /> Record Entry
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
