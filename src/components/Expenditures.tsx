import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Link as LinkIcon, Download } from 'lucide-react';

export default function Expenditures() {
  const { expenditures, projects, addExpenditure, deleteExpenditure, currentUser } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '', purpose: '', paidTo: '', projectId: '', personName: '', attachmentData: ''
  });

  useEffect(() => {
    const hashData = window.location.hash;
    const match = hashData.match(/[?&]id=([^&]+)/) || hashData.match(/[?&]projectId=([^&]+)/);
    if (match && match[1]) {
      const pId = match[1];
      const foundProj = projects.find(p => p.id === pId);
      if (foundProj) {
        setFormData(prev => ({
          ...prev,
          projectId: foundProj.id,
          personName: currentUser?.name || ''
        }));
        setShowAddForm(true);
      }
    }
  }, [projects, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, attachmentData: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpenditure({
      id: 'exp_' + Date.now(),
      amount: Number(formData.amount),
      purpose: formData.purpose,
      paidTo: formData.paidTo,
      projectId: formData.projectId,
      personName: formData.personName,
      attachmentData: formData.attachmentData,
      date: new Date().toISOString()
    });
    setFormData({ amount: '', purpose: '', paidTo: '', projectId: '', personName: '', attachmentData: '' });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in" style={{ animationFillMode: 'both' }}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl heavy-text uppercase tracking-widest mb-2">Expenditure Tracker</h1>
          <div className="h-2 w-32 bg-[#E63946] border-2 border-black"></div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`bauhaus-button py-2 px-4 ${showAddForm ? 'bg-[#FFB703] text-black' : 'bg-[#E63946] text-white'}`}
        >
          {showAddForm ? 'Close' : 'Add Entry'}
        </button>
      </header>

      {showAddForm && (
        <div className="bauhaus-card mb-8 animate-slide-up">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Amount (₹)</label>
                <input type="number" required value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="bauhaus-input" placeholder="e.g. 15000" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Purpose</label>
                <input required value={formData.purpose} onChange={e=>setFormData({...formData, purpose: e.target.value})} className="bauhaus-input" placeholder="What was it for?" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Paid To</label>
                <input required value={formData.paidTo} onChange={e=>setFormData({...formData, paidTo: e.target.value})} className="bauhaus-input" placeholder="Vendor / Person" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Responsible Person</label>
                <input required value={formData.personName} onChange={e=>setFormData({...formData, personName: e.target.value})} className="bauhaus-input" placeholder="Person making entry" />
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Related Project</label>
                <select required value={formData.projectId} onChange={e=>setFormData({...formData, projectId: e.target.value})} className="bauhaus-input">
                   <option value="">-- Select Project --</option>
                   {projects.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                </select>
              </div>
              <div>
                <label className="block heavy-text text-xs uppercase mb-2">Attachment (Bill/Receipt)</label>
                <input type="file" onChange={handleFileChange} className="bauhaus-input p-1" accept="image/*,.pdf" />
              </div>
              <button type="submit" className="md:col-span-2 py-4 bg-[#1D3557] text-white bauhaus-button mt-4">
                Save Expenditure
              </button>
           </form>
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFB703] rounded-full translate-x-1/4 -translate-y-1/4 border-4 border-black z-0 pointer-events-none"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        {expenditures.length === 0 ? (
          <div className="col-span-full bauhaus-card p-10 flex items-center justify-center border-dashed border-4 border-black/20">
             <span className="heavy-text uppercase text-xl opacity-50">No expenditures recorded</span>
          </div>
        ) : (
          expenditures.map((exp) => {
            const relatedProject = projects.find(p => p.id === exp.projectId);
            return (
              <div key={exp.id} className="bauhaus-card p-0 flex flex-col">
                <div className="p-4 border-b-4 border-black flex justify-between items-center bg-[#F4F4F0]">
                  <span className="heavy-text text-xs uppercase pointer-events-none">{new Date(exp.date).toLocaleDateString()}</span>
                  {currentUser?.role === 'ADMIN' && (
                    <button onClick={() => deleteExpenditure(exp.id)} className="text-[#E63946] hover:scale-110 transition-transform">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="p-6 relative overflow-hidden flex flex-col flex-1">
                  <div className="mb-2">
                    <h3 className="text-xl heavy-text uppercase mb-1">{exp.purpose}</h3>
                    <p className="font-mono text-sm font-light opacity-70">Paid To: {exp.paidTo}</p>
                  </div>
                  
                  <div className="flex-1 my-4 flex items-center">
                    <div className="font-mono text-3xl font-light bg-[#E63946] text-white px-3 py-1 inline-block border-4 border-black shadow-[4px_4px_0_0_#000]">
                      ₹{exp.amount.toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t-4 border-black border-dashed flex items-center justify-between">
                    <div>
                      <div className="text-[10px] heavy-text uppercase mb-1">Added By</div>
                      <div className="text-sm heavy-text uppercase">{exp.personName}</div>
                    </div>
                    {exp.attachmentData && (
                      <a href={exp.attachmentData} download={`receipt_${exp.id}`} className="p-2 border-2 border-black bg-white hover:bg-[#FFB703] transition-colors" title="Download Receipt">
                        <Download size={16} />
                      </a>
                    )}
                  </div>
                  
                  {relatedProject && (
                    <div className="mt-4 bg-[#1D3557] text-white p-2 border-2 border-black flex items-center gap-2 cursor-pointer hover:bg-[#E63946] transition-colors" onClick={() => window.location.hash = `#projects?id=${relatedProject.id}`}>
                      <LinkIcon size={14} />
                      <span className="heavy-text uppercase text-xs truncate">{relatedProject.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
