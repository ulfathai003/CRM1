import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Search, X, FolderKanban, Receipt, Users, Shield, ArrowRight, 
  CornerDownRight, Eye, Sparkles, Database, HelpCircle, FileText
} from 'lucide-react';

interface MatchedItem {
  type: 'Project' | 'Invoice' | 'Lead' | 'Expenditure' | 'System Log';
  sourceId: string;
  title: string;
  subtitle: string;
  metadata: Record<string, any>;
  previewLines: string[];
  routeHash: string;
}

export default function GlobalCrmSearch() {
  const { projects, invoices, leads, expenditures, logs } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MatchedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MatchedItem | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Run deep keyword search across all objects
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const matches: MatchedItem[] = [];

    // Helper to format currency
    const formatINR = (val: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(val);
    };

    // 1. Scan Projects
    projects.forEach(p => {
      const matchFields: { key: string; val: string }[] = [
        { key: 'ID', val: p.id },
        { key: 'Project Name', val: p.name },
        { key: 'Type', val: p.type },
        { key: 'Status', val: p.status },
        { key: 'Location', val: p.location },
        { key: 'Budget', val: formatINR(p.budget) },
        { key: 'Amount Spent', val: formatINR(p.spent) },
        { key: 'Progress', val: `${p.progress}%` }
      ];

      // Add project logs
      if (p.logs && p.logs.length > 0) {
        p.logs.forEach(log => {
          matchFields.push(
            { key: 'Project Log Text', val: log.text },
            { key: 'Log Author', val: log.author }
          );
        });
      }

      const matchingProps = matchFields.filter(f => f.val.toLowerCase().includes(q));

      if (matchingProps.length > 0) {
        matches.push({
          type: 'Project',
          sourceId: p.id,
          title: p.name,
          subtitle: `${p.type} Project • ${p.status} • Progress: ${p.progress}%`,
          routeHash: '#projects',
          metadata: {
            'Project ID': p.id,
            'Project Name': p.name,
            'Type': p.type,
            'Status': p.status,
            'Overall Progress': `${p.progress}%`,
            'Assigned Budget': formatINR(p.budget),
            'Logged Expenditures': formatINR(p.spent),
            'Location / Venue': p.location,
            'Associated LogsCount': p.logs?.length || 0
          },
          previewLines: matchingProps.map(f => `Matched ${f.key}: "${f.val}"`)
        });
      }
    });

    // 2. Scan Invoices
    invoices.forEach(i => {
      const matchFields: { key: string; val: string }[] = [
        { key: 'Invoice ID', val: i.id },
        { key: 'Payee / Contractor', val: i.payee },
        { key: 'Amount Paid', val: formatINR(i.amountPaid) },
        { key: 'Date Created', val: i.date },
        { key: 'Description', val: i.description },
        { key: 'Category', val: i.category },
        { key: 'Payment Status', val: i.status }
      ];

      if (i.detailedNotes) matchFields.push({ key: 'Detailed Notes', val: i.detailedNotes });
      if (i.rawText) matchFields.push({ key: 'OCR Scan Raw Text', val: i.rawText });

      const matchingProps = matchFields.filter(f => f.val.toLowerCase().includes(q));

      if (matchingProps.length > 0) {
        matches.push({
          type: 'Invoice',
          sourceId: i.id,
          title: `Invoice to: ${i.payee}`,
          subtitle: `${i.category} • ${formatINR(i.amountPaid)} • Status: ${i.status}`,
          routeHash: '#invoices',
          metadata: {
            'Invoice Reference ID': i.id,
            'Contractor Name (Payee)': i.payee,
            'Category Code': i.category,
            'Processed Amount': formatINR(i.amountPaid),
            'Transaction Date': i.date,
            'General Description': i.description,
            'Settlement Status': i.status,
            'Detailed Notes': i.detailedNotes || 'None entered',
            'OcrRawTextSize': i.rawText?.length ? `${i.rawText.length} characters` : 'No Attachment'
          },
          previewLines: matchingProps.slice(0, 3).map(f => `Matched ${f.key}: "${f.val}"`)
        });
      }
    });

    // 3. Scan Leads
    leads.forEach(l => {
      const matchFields: { key: string; val: string }[] = [
        { key: 'Lead Name', val: l.name },
        { key: 'Contact Info', val: l.contact },
        { key: 'Lead Location', val: l.location },
        { key: 'Interest Level', val: l.interestLevel },
        { key: 'Internal Note', val: l.notes }
      ];

      if (l.comments && l.comments.length > 0) {
        l.comments.forEach(comment => {
          matchFields.push(
            { key: 'Lead Comment', val: comment.text },
            { key: 'Commenter', val: comment.author }
          );
        });
      }

      const matchingProps = matchFields.filter(f => f.val.toLowerCase().includes(q));

      if (matchingProps.length > 0) {
        matches.push({
          type: 'Lead',
          sourceId: l.id,
          title: `Lead: ${l.name}`,
          subtitle: `${l.interestLevel} Interest • Location: ${l.location} • Contact: ${l.contact}`,
          routeHash: '#leads',
          metadata: {
            'Lead ID': l.id,
            'Prospect Name': l.name,
            'Contact Method': l.contact,
            'Location Focus': l.location,
            'Current Interest Rating': l.interestLevel,
            'Lead Background Memo': l.notes,
            'Comments Count': l.comments?.length || 0
          },
          previewLines: matchingProps.slice(0, 3).map(f => `Matched ${f.key}: "${f.val}"`)
        });
      }
    });

    // 4. Scan Expenditures
    expenditures.forEach(e => {
      const matchFields: { key: string; val: string }[] = [
        { key: 'Expenditure Purpose', val: e.purpose },
        { key: 'Recipient / Pay To', val: e.paidTo },
        { key: 'Approving Person', val: e.personName },
        { key: 'Amount Paid', val: formatINR(e.amount) },
        { key: 'Date Created', val: e.date }
      ];

      const matchingProps = matchFields.filter(f => f.val.toLowerCase().includes(q));

      if (matchingProps.length > 0) {
        matches.push({
          type: 'Expenditure',
          sourceId: e.id,
          title: `Expenditure: ${e.purpose}`,
          subtitle: `Amount: ${formatINR(e.amount)} • Paid to ${e.paidTo} • Handled by ${e.personName}`,
          routeHash: '#expenditures',
          metadata: {
            'Expenditure ID': e.id,
            'Purpose Description': e.purpose,
            'Recipient (Paid To)': e.paidTo,
            'Processed Amount': formatINR(e.amount),
            'Assigned Project Code': e.projectId,
            'Handling Officer': e.personName,
            'Filing date': e.date
          },
          previewLines: matchingProps.map(f => `Matched ${f.key}: "${f.val}"`)
        });
      }
    });

    // 5. Scan System Activity Logs
    logs.forEach(log => {
      const matchFields: { key: string; val: string }[] = [
        { key: 'Action Trigger', val: log.action },
        { key: 'Operational Details', val: log.details },
        { key: 'Officer User', val: log.userName },
        { key: 'Timestamp', val: log.timestamp }
      ];

      const matchingProps = matchFields.filter(f => f.val.toLowerCase().includes(q));

      if (matchingProps.length > 0) {
        matches.push({
          type: 'System Log',
          sourceId: log.id,
          title: `Audit: ${log.action}`,
          subtitle: `Details: ${log.details} • Verified User: ${log.userName}`,
          routeHash: '#logs',
          metadata: {
            'Log Reference ID': log.id,
            'Operations Action': log.action,
            'Execution Details': log.details,
            'Operator Username': log.userName,
            'Registry Timestamp': log.timestamp
          },
          previewLines: matchingProps.map(f => `Matched ${f.key}: "${f.val}"`)
        });
      }
    });

    setResults(matches);
  }, [query, projects, invoices, leads, expenditures, logs]);

  const handleSelectResult = (item: MatchedItem) => {
    setSelectedItem(item);
  };

  const handleNavigateToResult = (item: MatchedItem) => {
    window.location.hash = item.routeHash;
    setIsOpen(false);
    setQuery('');
  };

  // Icon switcher helper
  const renderIcon = (type: MatchedItem['type']) => {
    switch (type) {
      case 'Project':
        return <FolderKanban size={15} className="text-[#FFB703]" />;
      case 'Invoice':
        return <Receipt size={15} className="text-[#10B981]" />;
      case 'Lead':
        return <Users size={15} className="text-[#1D3557]" />;
      case 'Expenditure':
        return <FileText size={15} className="text-[#3F51B5]" />;
      case 'System Log':
        return <Shield size={15} className="text-[#E63946]" />;
    }
  };

  return (
    <div ref={searchContainerRef} className="relative w-full z-40 max-w-2xl">
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-white border-2 border-black rounded-[14px] shadow-[4px_4px_0_0_#000] p-1.5 focus-within:translate-y-0.5 focus-within:shadow-[2px_2px_0_0_#000] transition-all">
        <Search className="text-gray-400 ml-2 mr-1 animate-pulse" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="🔎 Deep CRM Search (Scan leads, invoices, project notes, logs...)"
          className="w-full text-xs p-2 focus:outline-none font-sans font-medium text-black placeholder:text-gray-400"
        />
        {query && (
          <button 
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer mr-1"
          >
            <X size={14} className="text-gray-500" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            if (!query.trim()) {
              // focus input if empty to encourage typing
              const inputEl = document.querySelector('input[placeholder*="Deep CRM Search"]') as HTMLInputElement;
              if (inputEl) inputEl.focus();
            }
          }}
          className="ml-1 px-3.5 py-1.5 bg-[#1D3557] hover:bg-[#E63946] text-white rounded-[10px] text-[10px] heavy-text uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_0_#000] transition-all active:translate-y-0.5 shrink-0 flex items-center gap-1 font-bold"
        >
          <Search size={11} /> Search
        </button>
      </div>

      {/* Results Modal/Dropdown popover */}
      {isOpen && query.trim() !== '' && (
        <div className="absolute top-[54px] left-0 right-0 max-h-[420px] bg-white border-3 border-black rounded-[16px] shadow-[8px_8px_0_0_#000] z-50 overflow-hidden flex flex-col">
          
          {/* Header info */}
          <div className="p-3 bg-black text-white flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
            <span className="flex items-center gap-1.5"><Database size={11} className="text-[#FFB703]" /> Match Results: {results.length} found</span>
            <span className="text-[8px] opacity-70 font-mono">Press ESC to exit</span>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[340px]">
            {results.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <HelpCircle className="text-gray-300 mb-2" size={32} />
                <span className="text-[10px] heavy-text uppercase tracking-widest text-[#E63946]">Zero Matches Found</span>
                <p className="text-[9px] text-gray-500 leading-normal max-w-[280px] mt-1 font-sans">
                  No matching keyword matches found. Our search queries deep properties (OCR scans, user comments, budgets, expenditure purposes, log states) across the complete CRM system.
                </p>
              </div>
            ) : (
              results.map((item, index) => (
                <div 
                  key={`${item.type}_${item.sourceId}_${index}`}
                  className="p-3 border-[1.5px] border-black rounded-[12px] hover:bg-[#FAF9F5] transition-all flex items-start justify-between cursor-pointer gap-2 group hover:translate-x-0.5"
                  onClick={() => handleSelectResult(item)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-gray-100 border border-black rounded-[6px]">
                        {renderIcon(item.type)}
                      </div>
                      <span className="text-[8px] heavy-text uppercase tracking-widest px-1.5 py-0.5 rounded-[4px] bg-black text-white">
                        {item.type}
                      </span>
                      <span className="text-[10px] heavy-text tracking-wide text-black block truncate max-w-[220px]">
                        {item.title}
                      </span>
                    </div>

                    <p className="text-[9px] text-gray-500 font-mono italic truncate">
                      {item.subtitle}
                    </p>

                    {/* Preview matching details snippet */}
                    <div className="bg-gray-50 border border-black/5 p-1.5 rounded-[6px] mt-1 space-y-0.5">
                      {item.previewLines.map((line, lIdx) => (
                        <div key={lIdx} className="text-[8.5px] text-gray-700 font-mono flex items-center gap-1">
                          <CornerDownRight size={8} className="text-gray-400 shrink-0" />
                          <span className="truncate">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectResult(item);
                      }}
                      className="p-1.5 bg-white hover:bg-[#FFB703] text-black border border-black rounded-[6px] text-[8px] heavy-text uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0_0_#000]"
                      title="Inspect record data"
                    >
                      <Eye size={10} /> Inspect
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToResult(item);
                      }}
                      className="p-1.5 bg-black hover:bg-gray-800 text-white border border-black rounded-[6px] text-[8px] heavy-text uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0_0_rgba(0,0,0,0.2)]"
                      title="Go to respective tab"
                    >
                      Go <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Inspect Item Overlay Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border-3 border-black rounded-[18px] shadow-[8px_8px_0_0_#000] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Title Banner */}
            <div className="bg-black text-white p-4 flex justify-between items-center border-b-2 border-black">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white rounded-[6px]">
                  {renderIcon(selectedItem.type)}
                </div>
                <div>
                  <div className="text-[9px] font-mono tracking-widest text-[#FFB703] uppercase">CRM Database Inspection</div>
                  <h3 className="text-sm heavy-text uppercase tracking-wider">
                    {selectedItem.type}: {selectedItem.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 bg-white hover:bg-red-500 rounded-full border-2 border-black text-black hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Properties Field list */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.entries(selectedItem.metadata).map(([key, val]) => (
                  <div key={key} className="p-2.5 border border-black rounded-[12px] bg-[#FAF9F5] shadow-[1.5px_1.5px_0_0_rgba(0,0,0,0.1)] flex flex-col justify-between">
                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                      {key}
                    </span>
                    <span className="text-xs heavy-text text-black block mt-0.5 truncate font-bold font-mono">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Matches feedback */}
              <div className="p-3 border-2 border-dashed border-gray-300 rounded-[12px] bg-[#FAF9F5]">
                <span className="text-[8px] heavy-text text-gray-500 uppercase tracking-widest block mb-1">Matching Keyword Lines:</span>
                <div className="space-y-1 font-mono text-[9px] text-[#E63946] font-bold">
                  {selectedItem.previewLines.map((line, lIdx) => (
                    <div key={lIdx} className="bg-gray-100 p-1 border border-black/5 rounded">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions for Modal */}
            <div className="p-4 border-t-2 border-black bg-gray-50 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black border-2 border-black rounded-[10px] text-[10px] heavy-text uppercase tracking-widest cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5 transition-all"
              >
                Close View
              </button>
              <button
                type="button"
                onClick={() => {
                  handleNavigateToResult(selectedItem);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 bg-[#FFB703] hover:bg-[#E5A500] text-black border-2 border-black rounded-[10px] text-[10px] heavy-text uppercase tracking-widest cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                Go to Record Sector <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
