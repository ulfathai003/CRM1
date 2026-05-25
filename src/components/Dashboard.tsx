import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, IndianRupee, Users, FolderKanban, Receipt, ShieldCheck, 
  PieChart as PieIcon, BarChart3, Clock, ArrowUpRight, Search, Activity,
  FileDown, Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Dashboard() {
  const { projects, invoices, leads, expenditures, logs, logActivity } = useAppContext();
  const [logFilter, setLogFilter] = useState<'all' | 'login' | 'financial' | 'project'>('all');

  // Month-Year states for the PDF Progress Report
  const [reportMonth, setReportMonth] = useState<number>(4); // Default to index 4 (May)
  const [reportYear, setReportYear] = useState<number>(2026); // Default to year 2026

  // Multi-dimensional metrics processing
  const totalBudget = projects.reduce((acc, curr) => acc + curr.budget, 0);
  const totalSpent = projects.reduce((acc, curr) => acc + curr.spent, 0);
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const totalInvoicesPaid = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalInvoicesPending = invoices.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalExpendituresAmount = expenditures.reduce((acc, curr) => acc + curr.amount, 0);

  // 1. Project Budget vs Spent Data Formatting
  const barChartData = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    Budget: p.budget,
    Spent: p.spent,
    Progress: p.progress
  }));

  // Fallback visual data if no projects are recorded
  const finalBarChartData = barChartData.length > 0 ? barChartData : [
    { name: 'Sample Penthouse', Budget: 500000, Spent: 120000, Progress: 45 },
    { name: 'Sunrise Villas', Budget: 1500000, Spent: 500000, Progress: 10 },
    { name: 'Metropolitan Mall', Budget: 2800000, Spent: 2200000, Progress: 85 }
  ];

  // 2. Expenditure and Invoices allocation by Category (Doughnut)
  const categoryMap: Record<string, number> = {
    Materials: 0,
    Labor: 0,
    Legal: 0,
    Logistics: 0,
    Other: 0
  };

  // Add all invoices grouped by category
  invoices.forEach(i => {
    if (categoryMap[i.category] !== undefined) {
      categoryMap[i.category] += i.amountPaid;
    } else {
      categoryMap.Other += i.amountPaid;
    }
  });

  // Convert categories into standard data layout
  const pieChartData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);

  const finalPieChartData = pieChartData.length > 0 ? pieChartData : [
    { name: 'Materials', value: 165000 },
    { name: 'Labor', value: 85000 },
    { name: 'Logistics', value: 35000 },
    { name: 'Legal', value: 12000 },
    { name: 'Other', value: 8000 }
  ];

  const COLORS = ['#1D3557', '#E63946', '#FFB703', '#10B981', '#7F8C8D'];

  // Filtering System Activity & Log entries
  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    if (logFilter === 'login') return l.action.toLowerCase().includes('login') || l.action.toLowerCase().includes('logout');
    if (logFilter === 'financial') return l.action.toLowerCase().includes('invoice') || l.action.toLowerCase().includes('expenditure');
    if (logFilter === 'project') return l.action.toLowerCase().includes('project');
    return true;
  });

  // Calculate percentage ratios
  const overallSpentPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Monthly Progress Report PDF Generator
  const generateMonthlyReportPDF = (year: number, monthIndex: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    const targetMonthName = monthNames[monthIndex];
    
    // 1. FILTER EXPENDITURE DATA FOR THE MONTH
    const monthlyExpenditures = expenditures.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getFullYear() === year && expDate.getMonth() === monthIndex;
    });

    // 2. FILTER PROJECT LOGS FOR THE MONTH
    const monthlyLogs: { projectId: string; projectName: string; text: string; author: string; timestamp: string; addedExpenditure?: number }[] = [];
    projects.forEach(p => {
      if (p.logs) {
        p.logs.forEach(log => {
          const logDate = new Date(log.timestamp);
          if (logDate.getFullYear() === year && logDate.getMonth() === monthIndex) {
            monthlyLogs.push({
              projectId: p.id,
              projectName: p.name,
              text: log.text,
              author: log.author,
              timestamp: log.timestamp,
              addedExpenditure: log.addedExpenditure
            });
          }
        });
      }
    });

    // 3. PROJECT-BY-PROJECT BUDGET & PROGRESS METRICS
    const projectSummaryRows = projects.map(p => {
      const monthExpSum = monthlyExpenditures
        .filter(e => e.projectId === p.id)
        .reduce((sum, e) => sum + e.amount, 0);
        
      const monthLogExpSum = monthlyLogs
        .filter(l => l.projectId === p.id)
        .reduce((sum, l) => sum + (l.addedExpenditure || 0), 0);

      const totalSpentThisMonth = monthExpSum + monthLogExpSum;
      const progressPercent = p.progress;
      const budgetRemaining = Math.max(0, p.budget - p.spent);

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        budget: p.budget,
        spentOverall: p.spent,
        spentThisMonth: totalSpentThisMonth,
        remaining: budgetRemaining,
        progress: progressPercent
      };
    });

    // 4. GENERATE PDF via jsPDF
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header Style
    doc.setFillColor(29, 53, 87); // Primary dark blue #1D3557
    doc.rect(0, 0, 210, 36, 'F');
    
    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('INSIDE VMS GROUP', 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('SYSTEM SECTOR MONTHLY OPERATIONS AUDIT', 14, 21);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 26);
    
    // Accent block
    doc.setFillColor(230, 57, 70); // Accent red
    doc.rect(135, 0, 75, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('Helvetica', 'bold');
    doc.text('PROGRESS REPORT', 140, 14);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Timeline: ${targetMonthName.toUpperCase()} ${year}`, 140, 20);
    doc.text(`Classification: CRM Ledger Summary`, 140, 25);
    
    // Section headers
    const drawSectionHeader = (title: string, yPos: number) => {
      doc.setFillColor(250, 249, 245);
      doc.rect(14, yPos - 5, 182, 7, 'F');
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(14, yPos - 5, 196, yPos - 5);
      doc.line(14, yPos + 2, 196, yPos + 2);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(title.toUpperCase(), 16, yPos);
    };

    // Part 1: Financial Overview
    drawSectionHeader('1. Executive Month Financial Summary', 48);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    
    const monthlySpentTotal = monthlyExpenditures.reduce((sum, e) => sum + e.amount, 0);
    const cumulativeSystemBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const cumulativeSystemSpent = projects.reduce((sum, p) => sum + p.spent, 0);
    
    doc.text(`Selected Operational Month:`, 16, 59);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${targetMonthName} ${year}`, 80, 59);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Total Expenditures Filed in ${targetMonthName}:`, 16, 64);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(230, 57, 70); 
    doc.text(`Rs ${monthlySpentTotal.toLocaleString('en-IN')}`, 80, 64);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`Total Month Site Activity Logs Posted:`, 16, 69);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${monthlyLogs.length} updates logged`, 80, 69);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Overall Enterprise Ledger Budget:`, 115, 59);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Rs ${cumulativeSystemBudget.toLocaleString('en-IN')}`, 170, 59);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Overall Cumulative Site Spent:`, 115, 64);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Rs ${cumulativeSystemSpent.toLocaleString('en-IN')}`, 170, 64);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Unified Burn-Efficiency Rate:`, 115, 69);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${cumulativeSystemBudget > 0 ? Math.round((cumulativeSystemSpent / cumulativeSystemBudget) * 100) : 0}%`, 170, 69);

    // Part 2: Project Performance
    drawSectionHeader('2. Project-by-Project Month Progress & Budget Variance', 80);
    
    const projectColumns = ['Project Name', 'Type / Style', 'Month Spent', 'Cumulative Spent', 'Budget Allocation', 'Progress (%)', 'Status'];
    const projectRows = projectSummaryRows.map(row => [
      row.name,
      row.type,
      `Rs ${row.spentThisMonth.toLocaleString('en-IN')}`,
      `Rs ${row.spentOverall.toLocaleString('en-IN')}`,
      `Rs ${row.budget.toLocaleString('en-IN')}`,
      `${row.progress}%`,
      row.status
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [projectColumns],
      body: projectRows,
      theme: 'grid',
      headStyles: { fillColor: [29, 53, 87], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 24 },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // Part 3: Activity Logs
    drawSectionHeader(`3. Consolidated Project Activity Logs - ${targetMonthName}`, currentY);
    currentY += 6;

    if (monthlyLogs.length === 0) {
      doc.setFont('Helvetica', 'oblique');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text('No active logs or event modifications recorded on site during this timeline period.', 16, currentY);
      currentY += 8;
    } else {
      const logColumns = ['Time', 'Linked Project', 'Operational site activities & updates logs', 'Author'];
      const logRows = monthlyLogs.map(log => [
        new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        log.projectName,
        log.text,
        log.author
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [logColumns],
        body: logRows,
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [45, 52, 54] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 40 },
          2: { cellWidth: 104 },
          3: { cellWidth: 20 }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Part 4: Expenditures Ledger
    if (currentY > 210) {
      doc.addPage();
      currentY = 25;
    }
    drawSectionHeader(`4. Recorded Expenditures Ledger - ${targetMonthName}`, currentY);
    currentY += 6;

    if (monthlyExpenditures.length === 0) {
      doc.setFont('Helvetica', 'oblique');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Zero monetary payouts logged in general ledger sheets for this period.', 16, currentY);
      currentY += 8;
    } else {
      const expColumns = ['Ref ID', 'Filing Date', 'Purpose / Detailed Invoice Linkage', 'Paid To / Payee', 'Project Code', 'Officer', 'Amount'];
      const expRows = monthlyExpenditures.map(exp => [
        exp.id.substring(4, 10).toUpperCase(),
        new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        exp.purpose,
        exp.paidTo,
        projects.find(p => p.id === exp.projectId)?.name || 'General',
        exp.personName,
        `Rs ${exp.amount.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [expColumns],
        body: expRows,
        theme: 'grid',
        headStyles: { fillColor: [230, 57, 70], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [45, 52, 54] },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 20 },
          2: { cellWidth: 60 },
          3: { cellWidth: 32 },
          4: { cellWidth: 26 },
          5: { cellWidth: 14 },
          6: { cellWidth: 16, halign: 'right' }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Signatures / certification
    if (currentY > 240) {
      doc.addPage();
      currentY = 25;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);
    
    currentY += 8;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('AUDIT & ADMINISTRATIVE SIGN-OFF', 14, currentY);
    
    currentY += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('This monthly operations summary report has been automatically aggregated through the VMS CRM Engine.', 14, currentY);
    doc.text('Values retrieved represent the exact ledger state, including user-validated logs, pending/paid contractor invoices & site receipts.', 14, currentY + 3.5);

    currentY += 15;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 70, currentY);
    doc.line(130, currentY, 186, currentY);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Filing Officer Signature', 14, currentY + 4);
    doc.text('Managing Auditor / Executive', 130, currentY + 4);
    
    doc.setFont('Helvetica', 'normal');
    doc.text('VMS Lead Administrator', 14, currentY + 8);
    doc.text('System Operations Board', 130, currentY + 8);

    doc.save(`VMS_Monthly_Progress_Report_${targetMonthName}_${year}.pdf`);

    logActivity?.(
      'Report Generation',
      `Exported summarized Monthly Progress & Budget Auditor PDF report for ${targetMonthName} ${year}`
    );
  };

  return (
    <div className="space-y-8 pb-10 text-black">
      {/* Dynamic Header Sector */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] tracking-widest bg-[#FFB703] border-2 border-black text-black px-2.5 py-1 uppercase heavy-text inline-block mb-2 rounded shadow-[1.5px_1.5px_0_0_#000]">
            VMS System Command Center
          </span>
          <h1 className="text-4xl heavy-text uppercase tracking-widest">Analytics Dashboard</h1>
          <div className="h-1.5 w-44 bg-black border border-black mt-1"></div>
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="bg-[#FAF9F5] border-2 border-black p-2.5 rounded-[12px] shadow-[3px_3px_0_0_#000] text-center min-w-[110px]">
            <span className="block text-[8px] text-gray-500 uppercase tracking-widest">Total Active Files</span>
            <span className="text-lg heavy-text block font-mono">
              {projects.length + invoices.length + expenditures.length}
            </span>
          </div>
          <div className="bg-black text-white p-2.5 rounded-[12px] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] text-center min-w-[110px] border border-black">
            <span className="block text-[8px] text-[#FFB703] uppercase tracking-widest font-mono">Operations Status</span>
            <span className="text-xs heavy-text block uppercase font-bold text-green-400 mt-1 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span> Live Security
            </span>
          </div>
        </div>
      </header>

      {/* Grid containing rich numeric stat counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={activeProjects} 
          subtitle={`${projects.length - activeProjects} in planning or completed`}
          icon={<FolderKanban size={18} />} 
          color="bg-[#1D3557] text-white" 
        />
        <StatCard 
          title="New Engagements" 
          value={leads.length} 
          subtitle="Warm prospective project clients"
          icon={<Users size={18} />} 
          color="bg-[#FFB703] text-black" 
        />
        <StatCard 
          title="Total Invoice Cash" 
          value={`₹${(totalInvoicesPaid + totalInvoicesPending).toLocaleString('en-IN')}`} 
          subtitle={`₹${totalInvoicesPaid.toLocaleString('en-IN')} Secured | ₹${totalInvoicesPending.toLocaleString('en-IN')} In transit`}
          icon={<Receipt size={18} />} 
          color="bg-white text-black border-4 border-black" 
        />
        <StatCard 
          title="Expenditures Filed" 
          value={`₹${totalExpendituresAmount.toLocaleString('en-IN')}`} 
          subtitle={`${expenditures.length} individual ledger payouts`}
          icon={<IndianRupee size={18} className="text-[#E63946]" />} 
          color="bg-[#E63946] text-white" 
        />
      </div>

      {/* Expanded visual summary bar */}
      <div className="bg-[#FAF9F5] border-3 border-black p-4 rounded-[16px] shadow-[4px_4px_0_0_#000] flex flex-col md:flex-row justify-between items-stretch gap-6">
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-[9px] text-[#E63946] uppercase tracking-widest heavy-text">Ledger Summary Balance</span>
          <h3 className="text-xl heavy-text uppercase tracking-wider text-black mt-1">Unified Funds Allocation Rate</h3>
          <p className="text-xs text-gray-500 mt-1">Showing general utilization of overall estimated budgets relative to system expenses logged.</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 shrink-0 md:border-l-2 md:border-dashed md:border-black/20 md:pl-8">
          <div className="text-center font-mono">
            <span className="block text-[8.5px] text-gray-400 uppercase tracking-widest">Cumulative Budget</span>
            <span className="text-xl heavy-text text-black">₹{totalBudget.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-center font-mono">
            <span className="block text-[8.5px] text-gray-400 uppercase tracking-widest">Total Spent Onsite</span>
            <span className="text-xl heavy-text text-[#E63946]">₹{totalSpent.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-center font-mono flex items-center justify-center p-3.5 bg-black text-white rounded-[12px] border border-black shadow-[2px_2px_0_0_#FFB703]">
            <div>
              <span className="block text-[8px] text-[#FFB703] uppercase tracking-widest">Burn Efficiency</span>
              <span className="text-2xl heavy-text block">{overallSpentPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Progress Report Card Panel */}
      <div className="bg-[#FAF9F5] border-3 border-black p-5 rounded-[16px] shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-dashed border-black/20 pb-3 gap-3">
          <div>
            <span className="text-[10px] tracking-widest bg-[#E63946] border border-black text-white px-2 py-0.5 uppercase heavy-text inline-block mb-1.5 rounded shadow-[1px_1px_0_0_#000]">
              Operational Audit Panel
            </span>
            <h3 className="text-xl heavy-text uppercase tracking-wider text-black flex items-center gap-2 font-black">
              <Calendar size={18} className="text-[#1D3557]" /> Monthly Progress Audit PDF Report
            </h3>
            <p className="text-xs text-gray-500 max-w-2xl mt-0.5">
              Aggregate all project logs, milestones & expenditures logged during the specified month into a high-fidelity PDF ledger document showing budget variances.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto">
            {/* Month Selector */}
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border-2 border-black rounded-[8px] font-mono text-xs font-bold shadow-[2px_2px_0_0_#000] focus:translate-y-0.5 focus:shadow-[1px_1px_0_0_#000] transition-all outline-none"
            >
              {[
                "January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"
              ].map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border-2 border-black rounded-[8px] font-mono text-xs font-bold shadow-[2px_2px_0_0_#000] focus:translate-y-0.5 focus:shadow-[1px_1px_0_0_#000] transition-all outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Aggregation Summary Stats in Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(() => {
            const tempMExp = expenditures.filter(exp => {
              const expDate = new Date(exp.date);
              return expDate.getFullYear() === reportYear && expDate.getMonth() === reportMonth;
            });
            const tempMSpent = tempMExp.reduce((sum, e) => sum + e.amount, 0);
            
            let tempMLogsCount = 0;
            projects.forEach(p => {
              if (p.logs) {
                p.logs.forEach(log => {
                  const logDate = new Date(log.timestamp);
                  if (logDate.getFullYear() === reportYear && logDate.getMonth() === reportMonth) {
                    tempMLogsCount++;
                  }
                });
              }
            });

            return (
              <>
                <div className="bg-white border-2 border-black p-3 rounded-[10px] shadow-[2px_2px_0_0_#000] flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] text-gray-400 uppercase tracking-widest leading-none font-mono mb-1">Monthly Cost Sum</span>
                    <span className="text-sm heavy-text tracking-wide font-mono text-[#E63946]">₹{tempMSpent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-1.5 bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/20 rounded-md text-[10px] heavy-text">
                    COSTS
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-3 rounded-[10px] shadow-[2px_2px_0_0_#000] flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] text-gray-400 uppercase tracking-widest leading-none font-mono mb-1">Expenditures Logged</span>
                    <span className="text-sm heavy-text tracking-wide font-mono">{tempMExp.length} Transactions</span>
                  </div>
                  <div className="p-1.5 bg-[#1D3557]/10 text-[#1D3557] border border-[#1D3557]/20 rounded-md text-[10px] heavy-text">
                    LEDS
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-3 rounded-[10px] shadow-[2px_2px_0_0_#000] flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] text-gray-400 uppercase tracking-widest leading-none font-mono mb-1">Total Month Site Logs</span>
                    <span className="text-sm heavy-text tracking-wide font-mono">{tempMLogsCount} Updates</span>
                  </div>
                  <div className="p-1.5 bg-[#FFB703]/10 text-black border border-[#FFB703]/20 rounded-md text-[10px] heavy-text">
                    LOGS
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        <button
          type="button"
          onClick={() => generateMonthlyReportPDF(reportYear, reportMonth)}
          className="w-full py-3 bg-[#1D3557] hover:bg-[#E63946] text-white rounded-[12px] heavy-text uppercase tracking-wider text-xs border-2 border-black shadow-[4px_4px_0_0_#000] transition-all active:translate-y-0.5 active:shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-2 cursor-pointer outline-none font-bold"
        >
          <FileDown size={14} className="animate-bounce" /> Generate & Download Monthly PDF Report
        </button>
      </div>

      {/* Interactive visual analytical panels with Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project Budget vs Spent (Wide Bar Chart Panel) */}
        <div className="lg:col-span-2 bauhaus-card bg-white flex flex-col min-h-[350px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b-2 border-black pb-3">
            <div>
              <h2 className="text-xl heavy-text uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="text-[#1D3557]" size={20} /> Budget vs. Spent Matrix
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Graphical alignment of individual project ledger allocations</p>
            </div>
            
            <div className="flex items-center gap-1.5 text-[8.5px] font-mono font-bold bg-[#FAF9F5] p-1 rounded border border-black/10">
              <span className="inline-block w-2.5 h-2.5 bg-[#1D3557] border border-black"></span>
              <span>Budget</span>
              <span className="inline-block w-2.5 h-2.5 bg-[#E63946] border border-black ml-1.5"></span>
              <span>Spent</span>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={finalBarChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis 
                  dataKey="name" 
                  stroke="#000000" 
                  tick={{ fontSize: 9, fontWeight: 'bold' }} 
                  axisLine={{ strokeWidth: 1.5 }}
                />
                <YAxis 
                  stroke="#000000" 
                  tick={{ fontSize: 9, fontWeight: 'bold' }} 
                  axisLine={{ strokeWidth: 1.5 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ 
                    backgroundColor: '#FAF9F5', 
                    border: '3px solid #000000', 
                    borderRadius: '12px', 
                    fontFamily: 'monospace', 
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar 
                  dataKey="Budget" 
                  fill="#1D3557" 
                  name="Budget" 
                  stroke="#000000" 
                  strokeWidth={1.8} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="Spent" 
                  fill="#E63946" 
                  name="Spent" 
                  stroke="#000000" 
                  strokeWidth={1.8} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenditure Division Ratio (Doughnut Chart Panel) */}
        <div className="bauhaus-card bg-white flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="border-b-2 border-black pb-3 mb-4">
              <h2 className="text-xl heavy-text uppercase tracking-widest flex items-center gap-2">
                <PieIcon className="text-[#FFB703]" size={20} /> Allocation Share
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Financial metrics categorized by invoice channels</p>
            </div>

            <div className="h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalPieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="#000000"
                    strokeWidth={2}
                  >
                    {finalPieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
                    contentStyle={{ 
                      backgroundColor: '#FAF9F5', 
                      border: '2px solid #000000', 
                      borderRadius: '8px', 
                      fontFamily: 'monospace',
                      fontSize: '10px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Absolute center graphic for doughnut hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">Categories</span>
                <span className="text-sm heavy-text tracking-wide font-mono mt-0.5">₹{finalPieChartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-black/10 pt-3 space-y-1">
            {finalPieChartData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-black">
                  <span className="w-2.5 h-2.5 rounded-sm border border-black shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="font-bold tracking-wide">{entry.name}</span>
                </div>
                <span className="font-mono text-gray-500">₹{entry.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid containing Project Progression list & System Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Onsite Project progression ledger */}
        <div className="bauhaus-card bg-white flex flex-col justify-between max-h-[460px]">
          <div>
            <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-center bg-[#FAF9F5] p-2.5 rounded-[12px] border border-black/10">
              <div>
                <h3 className="text-md heavy-text uppercase tracking-wider text-black">Project Status Gauge</h3>
                <span className="text-[8.5px] uppercase tracking-widest text-[#E63946]">Current physical progression metrics</span>
              </div>
              <span className="text-[10px] tracking-wide font-mono bg-black text-white px-2 py-0.5 rounded-[6px]">
                {projects.length} Registered
              </span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <div className="text-center py-10 opacity-50 uppercase heavy-text text-sm">No Projects Available.</div>
              ) : (
                projects.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      window.location.hash = `#projects?id=${p.id}`;
                    }}
                    className="p-3 border-2 border-black bg-[#FAF9F5] hover:bg-[#FFB703] transition-all rounded-[12px] shadow-[2px_2px_0_0_#000] cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="text-[7px] uppercase tracking-wider font-mono text-gray-400">ID: {p.id}</span>
                        <h4 className="text-xs heavy-text uppercase tracking-tight text-black truncate max-w-[150px] leading-tight block">
                          {p.name}
                        </h4>
                      </div>
                      <span className={`text-[8px] heavy-text uppercase px-1.5 py-0.5 rounded ${
                        p.status === 'In Progress' 
                          ? 'bg-blue-100 text-blue-800' 
                          : p.status === 'Planning' 
                          ? 'bg-[#FFB703] text-black' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase mb-1.5">
                      <span className="text-gray-500">{p.type}</span>
                      <span className="text-black">{p.progress}% Completed</span>
                    </div>

                    <div className="h-3 bg-white border border-black rounded-[4px] overflow-hidden">
                      <div 
                        className={`h-full border-r border-black transition-all ${
                          p.progress > 80 ? 'bg-[#10B981]' : p.progress > 40 ? 'bg-[#FFB703]' : 'bg-[#E63946]'
                        }`} 
                        style={{ width: `${p.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-black/10 pt-3 text-center">
            <button
              type="button"
              onClick={() => window.location.hash = '#projects'}
              className="text-[9px] heavy-text uppercase tracking-widest bg-black hover:bg-gray-800 text-white w-full py-2 rounded-[8px] border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_0_#000]"
            >
              Open Project Vault <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        {/* Audit & security Timeline logs board (records login & all administrative updates) */}
        <div className="lg:col-span-2 bauhaus-card bg-black text-white flex flex-col max-h-[460px] relative overflow-hidden">
          <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-[#E63946] rounded-full filter blur-[120px] opacity-10 z-0 pointer-events-none"></div>
          
          <div className="bg-[#1a1a1a] p-3 border border-gray-800 rounded-[14px] flex flex-col gap-2.5 z-10 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 bg-[#E63946] text-white border border-black rounded-[6px]">
                  <Activity size={12} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs heavy-text uppercase tracking-widest text-[#FFB703]">Activity & Auth Logs</h3>
                  <span className="text-[8px] uppercase tracking-widest text-gray-400 font-mono">Operations Audit Trail</span>
                </div>
              </div>

              {/* Filtering pill controls */}
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'login', 'financial', 'project'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2 py-1 text-[8px] heavy-text uppercase tracking-wider rounded-[6px] transition-all cursor-pointer ${
                      logFilter === f 
                        ? 'bg-[#FFB703] text-black font-extrabold' 
                        : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological List */}
          <div className="flex-grow overflow-y-auto mt-4 pr-1.5 space-y-3 relative z-10 font-mono">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Clock className="text-gray-600 mb-1.5 animate-spin duration-[6000ms]" size={24} />
                <span className="text-[10px] text-gray-400 heavy-text uppercase tracking-widest">No matching activities found</span>
                <p className="text-[8.5px] text-gray-500 leading-normal max-w-[200px] mt-0.5">
                  Try adding some logs, logging in & out, uploading documents, or creating actions inside other departments.
                </p>
              </div>
            ) : (
              filteredLogs.map(l => (
                <div 
                  key={l.id}
                  className="p-3 bg-[#131313]/90 hover:bg-[#1C1C1C] transition-colors border border-gray-900 rounded-[12px] relative flex md:items-center justify-between gap-4 font-mono leading-relaxed"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[7.5px] text-gray-400 uppercase font-sans tracking-widest">
                        [{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : 'Recent'}]
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        l.action.toLowerCase().includes('login') 
                          ? 'bg-[#1D3557] text-white border border-blue-500/20' 
                          : l.action.toLowerCase().includes('invoice') || l.action.toLowerCase().includes('expenditure')
                          ? 'bg-[#10B981]/25 text-green-400 border border-green-500/10'
                          : 'bg-[#FFB703]/20 text-[#FFB703]'
                      }`}>
                        {l.action}
                      </span>
                      <span className="text-[9px] text-slate-300 font-bold uppercase font-sans">
                        • {l.userName}
                      </span>
                    </div>
                    
                    <p className="text-[9.5px] text-gray-300 line-clamp-2">
                      {l.details}
                    </p>
                  </div>

                  <span className="text-[6.5px] text-gray-600 uppercase font-mono tracking-widest select-none shrink-0 border border-gray-900 px-1 py-0.5 rounded">
                    REF:{l.id.substring(4, 9).toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Simple dynamic card component helper
function StatCard({ title, value, subtitle, icon, color }: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: React.ReactNode; 
  color: string;
}) {
  return (
    <div className={`p-5 rounded-[16px] border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition-all cursor-default flex flex-col justify-between min-h-[125px] ${color}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="heavy-text uppercase text-[9.5px] tracking-widest opacity-80 mb-0.5 font-sans">
            {title}
          </h3>
          <p className="text-3xl heavy-text font-mono leading-none font-extrabold tracking-wide">
            {value}
          </p>
        </div>
        <div className="p-2 bg-black/10 rounded-[10px] border border-black/5 shrink-0">
          {icon}
        </div>
      </div>
      <p className="text-[8.5px] font-mono leading-tight tracking-wide opacity-75 mt-2 line-clamp-1">
        {subtitle}
      </p>
    </div>
  );
}
