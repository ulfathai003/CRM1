import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Invoice } from '../types';
import { UploadCloud, FileSpreadsheet, Trash2, Loader2, Filter, FileText, ChevronDown, ChevronRight, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import gsap from 'gsap';
import Lenis from 'lenis';

export default function Invoices() {
  const { invoices, projects, addInvoice, updateInvoice, deleteInvoice } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterProject, setFilterProject] = useState('');
  
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (containerRef.current) {
      gsap.fromTo(containerRef.current.children, 
        { y: 30, opacity: 0, rotateX: 5, transformPerspective: 1000 }, 
        { y: 0, opacity: 1, rotateX: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      );
    }

    return () => {
      lenis.destroy();
    };
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    if (filterMonth && !inv.date.startsWith(filterMonth)) return false;
    if (filterProject && inv.projectId !== filterProject) return false;
    return true;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!filterProject) {
      alert("Please select a Project first to assign this invoice to.");
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/extract-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to extract invoice');
        }

        const data = await res.json();
        
        // Append to state
        addInvoice({
          id: 'inv_' + Date.now(),
          projectId: filterProject,
          payee: data.payee || 'Unknown',
          amountPaid: Number(data.amountPaid) || 0,
          date: data.date || new Date().toISOString().split('T')[0],
          description: data.description || 'Processed invoice',
          category: data.category || 'Other',
          status: 'Pending',
          documentUrl: base64,
          rawText: data.rawText || ''
        });

      };
    } catch (err: any) {
       alert("Error processing invoice: " + err.message);
    } finally {
       setIsProcessing(false);
       e.target.value = '';
    }
  };

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) return;
    
    const headers = ['Payee', 'Date', 'Description', 'Category', 'Status', 'Project', 'Amount (Rs)', 'Raw Text'];
    const rows = filteredInvoices.map(inv => {
      const proj = projects.find(p => p.id === inv.projectId);
      return [
        inv.payee, 
        inv.date, 
        inv.description, 
        inv.category,
        inv.status,
        proj ? proj.name : 'Unknown',
        inv.amountPaid.toString(),
        inv.rawText ? inv.rawText.replace(/"/g, '""').replace(/\n/g, ' ') : ''
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookkeeping_${filterMonth || 'all'}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    if (filteredInvoices.length === 0) return;
    
    const doc = new jsPDF();
    doc.text('Bookkeeping Report', 14, 15);
    
    const tableColumn = ["Date", "Payee", "Category", "Status", "Project", "Amount (Rs)"];
    const tableRows = filteredInvoices.map(inv => {
      const proj = projects.find(p => p.id === inv.projectId);
      return [
        inv.date,
        inv.payee,
        inv.category,
        inv.status,
        proj ? proj.name : 'Unknown',
        inv.amountPaid.toString()
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`bookkeeping_${filterMonth || 'all'}.pdf`);
  };

  const handleSaveNotes = (id: string) => {
    updateInvoice(id, { description: editDesc, detailedNotes: editNotes });
    setExpandedInvId(null);
  };

  const handleExpand = (inv: Invoice) => {
    if (expandedInvId === inv.id) {
      setExpandedInvId(null);
    } else {
      setExpandedInvId(inv.id);
      setEditDesc(inv.description || '');
      setEditNotes(inv.detailedNotes || '');
    }
  };

  return (
    <div ref={containerRef} className="space-y-8 pb-10" style={{ perspective: '1000px' }}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl heavy-text uppercase tracking-widest mb-2">Bookkeeping</h1>
          <div className="h-2 w-32 bg-[#E63946] border-2 border-black"></div>
        </div>
        
        <div className="flex gap-4">
          <button onClick={exportToCSV} className="px-4 py-2 bg-[#FFB703] text-black bauhaus-button flex items-center gap-2">
             <FileSpreadsheet size={18} /> Export CSV
          </button>
          <button onClick={exportToPDF} className="px-4 py-2 bg-[#1D3557] text-white bauhaus-button flex items-center gap-2">
             <FileText size={18} /> Export PDF
          </button>
        </div>
      </header>

      <div className="bauhaus-card flex flex-col md:flex-row gap-6 p-6">
         <div className="flex-1 space-y-4">
             <h2 className="heavy-text uppercase flex items-center gap-2"><Filter size={18}/> Filters & Routing</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-light uppercase block mb-1">Target Project</label>
                   <select value={filterProject} onChange={e=>setFilterProject(e.target.value)} className="bauhaus-input py-2">
                     <option value="">-- View All / Select to Upload --</option>
                     {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-light uppercase block mb-1">Month (YYYY-MM)</label>
                   <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="bauhaus-input py-2" />
                </div>
             </div>
         </div>
         
         <div className="md:border-l-4 border-black md:pl-6 flex flex-col justify-center">
             <h2 className="heavy-text uppercase mb-2">Upload Invoice / Budget Entry</h2>
             <label className="cursor-pointer relative z-10 block w-full max-w-sm">
                <div 
                  className={`px-6 py-4 w-full border-3 border-black heavy-text uppercase tracking-widest flex justify-center items-center gap-2 transition-all rounded-[16px] ${isProcessing ? 'bg-gray-200 text-gray-500' : 'bg-[#1D3557] text-white active:translate-[2px_2px]'}`}
                  style={{
                    boxShadow: isProcessing 
                      ? 'none' 
                      : '4px 4px 0px 0px #000000, inset 4px 4px 6px rgba(255, 255, 255, 0.35), inset -4px -4px 6px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {isProcessing ? <div className="w-4 h-4 animate-bauhaus"></div> : <UploadCloud size={20} />}
                  {isProcessing ? 'Processing AI...' : 'One-Click Scan'}
                </div>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={isProcessing}
                />
             </label>
             <p className="text-[10px] uppercase font-light mt-2 font-mono max-w-[200px]">Select a project first to tie the incoming receipt to its budget.</p>
         </div>
      </div>

      <div className="bauhaus-card overflow-hidden p-0 relative">
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-4 border-black bg-[#E0E5EC]">
                <th className="p-4 w-10 border-r-4 border-black text-center"></th>
                <th className="p-4 heavy-text uppercase text-sm border-r-4 border-black">Date</th>
                <th className="p-4 heavy-text uppercase text-sm border-r-4 border-black">Payee</th>
                <th className="p-4 heavy-text uppercase text-sm hidden md:table-cell border-r-4 border-black">Desc</th>
                <th className="p-4 heavy-text uppercase text-sm border-r-4 border-black">Category</th>
                <th className="p-4 heavy-text uppercase text-sm text-center border-r-4 border-black">Status</th>
                <th className="p-4 heavy-text uppercase text-sm text-right border-r-4 border-black">Amount</th>
                <th className="p-4 heavy-text uppercase text-sm text-center border-r-4 border-black">Doc</th>
                <th className="p-4 heavy-text uppercase text-sm bg-black w-12 text-white text-center">Act</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                 <tr><td colSpan={9} className="p-8 text-center heavy-text uppercase text-gray-400">No invoices found for current filters</td></tr>
              ) : filteredInvoices.map((inv) => {
                const isExpanded = expandedInvId === inv.id;
                return (
                 <React.Fragment key={inv.id}>
                  <tr className={`border-b-4 border-black bg-white hover:bg-[#F4F4F0] transition-colors ${isExpanded ? 'bg-[#FFB703]' : ''}`}>
                    <td className="p-4 border-r-4 border-black text-center cursor-pointer hover:bg-black/10 transition-colors" onClick={() => handleExpand(inv)}>
                      {isExpanded ? <ChevronDown size={18} className="mx-auto" /> : <ChevronRight size={18} className="mx-auto" />}
                    </td>
                    <td className="p-4 font-mono text-sm whitespace-nowrap border-r-4 border-black">{inv.date}</td>
                    <td className="p-4 heavy-text border-r-4 border-black">{inv.payee}</td>
                    <td className="p-4 text-sm hidden md:table-cell max-w-xs truncate border-r-4 border-black" title={inv.description}>{inv.description}</td>
                    <td className="p-4 text-sm heavy-text uppercase opacity-75 border-r-4 border-black">{inv.category}</td>
                    <td className="p-4 text-center border-r-4 border-black">
                      <span className={`text-[10px] heavy-text uppercase px-2 py-1 border-2 border-black ${inv.status === 'Paid' ? 'bg-[#1D3557] text-white' : 'bg-white text-black'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-light text-right border-r-4 border-black">\u20B9{inv.amountPaid.toLocaleString()}</td>
                    <td className="p-4 text-center border-r-4 border-black">
                      {inv.documentUrl ? (
                         <span className="text-[#E63946] font-light text-xs uppercase" title="Expand to view Document">
                           Attached
                         </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center cursor-pointer transition-colors hover:bg-[#E63946] hover:text-white border-l-4 border-black" onClick={() => deleteInvoice(inv.id)}>
                      <Trash2 size={18} className="mx-auto" />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b-4 border-black relative">
                      <td colSpan={9} className="p-0 bg-[#F4F4F0] border-t-2 border-black border-dashed">
                        <div className="flex flex-col lg:flex-row divide-y-4 divide-black lg:divide-y-0 lg:divide-x-4 divide-black">
                          <div className="flex-1 p-6 space-y-6 bg-white min-h-[300px]">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-2xl heavy-text uppercase">Invoice Ledger Details</h3>
                              <button onClick={() => handleSaveNotes(inv.id)} className="bauhaus-button py-2 px-4 bg-[#1D3557] text-white flex items-center gap-2">
                                <Save size={16} /> Save Notes
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="block heavy-text text-xs uppercase mb-1">Ledger Description</label>
                                <input 
                                  value={editDesc} 
                                  onChange={e => setEditDesc(e.target.value)} 
                                  className="bauhaus-input text-sm" 
                                  placeholder="Short description..."
                                />
                              </div>
                              
                              <div>
                                <label className="block heavy-text text-xs uppercase mb-1">Detailed Log Notes</label>
                                <textarea 
                                  value={editNotes} 
                                  onChange={e => setEditNotes(e.target.value)} 
                                  className="bauhaus-input text-sm min-h-[100px] resize-y" 
                                  placeholder="Add extended context, approval notes, or tracking details here..."
                                />
                              </div>

                              {inv.rawText && (
                                <div className="mt-8 pt-4 border-t-4 border-black border-dashed">
                                  <label className="block heavy-text text-xs uppercase mb-2">Raw Data Dump from AI Lens</label>
                                  <div className="bg-[#2D3436] text-white p-4 font-mono text-xs max-h-40 overflow-y-auto border-4 border-black">
                                    <pre className="whitespace-pre-wrap">{inv.rawText}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full lg:w-1/3 p-6 bg-[#E0E5EC] flex flex-col pt-6 lg:pt-6">
                             <h4 className="heavy-text uppercase text-xs mb-4">Attached Document</h4>
                             {inv.documentUrl ? (
                               <div className="bg-white border-4 border-black p-2 flex-1 flex items-center justify-center min-h-[250px] shadow-[4px_4px_0_0_#000]">
                                 <img src={inv.documentUrl} alt="Invoice Document" className="max-w-full max-h-[300px] object-contain" />
                               </div>
                             ) : (
                               <div className="flex-1 flex items-center justify-center border-4 border-dashed border-black/20 opacity-50 heavy-text uppercase text-center p-4">
                                  No Document Attached
                               </div>
                             )}
                          </div>
                        </div>
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
