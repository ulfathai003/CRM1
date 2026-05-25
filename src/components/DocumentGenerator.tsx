import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { VmsLogo } from './VmsLogo';
import { 
  FileText, Download, Plus, Trash2, IndianRupee, Layers, CheckCircle, 
  FilePlus2, Receipt, Calculator, Camera, UploadCloud, Sparkles, BookOpen, ArrowRight, History, HelpCircle, PenTool, RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getOrCreateFolder, 
  uploadFileToGoogleDrive 
} from '../utils/googleDriveAuth';
import { SignaturePad } from './SignaturePad';

// Excel-like safe mathematical expression parser
const evalExpression = (val: string | number | undefined): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return 0;
  
  // Strip equal sign if typed like Excel (e.g. "=10*2")
  let sanitized = str.startsWith('=') ? str.slice(1) : str;
  
  // Support custom characters like 'x' for multiplication and '%' for percentage
  sanitized = sanitized
    .toLowerCase()
    .replace(/x/g, '*')
    .replace(/%/g, '/100')
    .replace(/[^0-9+\-*/().\s]/g, ''); // strip unsafe characters
    
  try {
    // Evaluate standard math formulas safely
    const result = new Function(`return (${sanitized})`)();
    return isNaN(result) || !isFinite(result) ? 0 : Number(result);
  } catch {
    const rawVal = parseFloat(str);
    return isNaN(rawVal) ? 0 : rawVal;
  }
};

interface DocItem {
  id: string;
  name: string;
  phase: string; // e.g., 'Modular Kitchen', 'Living Room Partition', 'Tile work'
  description: string; // Material specs, thickness, laminate, brand
  quantity: number;
  quantityExpr: string; // Excel-like formula e.g. "12 * 10 * 1.15"
  unit: string; // Sft, Rft, Lms, Nos
  rate: number;
  rateExpr: string; // Excel-like formula e.g. "1200 * 0.95"
}

interface Milestone {
  id: string;
  title: string;
  percentage: number;
}

export default function DocumentGenerator() {
  const { projects, leads, addExpenditure, addInvoice, addProjectLog, currentUser, logActivity } = useAppContext();
  
  // Document Type selection: 'invoice' or 'quotation'
  const [docType, setDocType] = useState<'invoice' | 'quotation'>('invoice');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState('');
  const [docDueDate, setDocDueDate] = useState('');
  
  // Client Info
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientProject, setClientProject] = useState(''); // Selected project linkage

  useEffect(() => {
    const hashData = window.location.hash;
    const match = hashData.match(/[?&]id=([^&]+)/) || hashData.match(/[?&]projectId=([^&]+)/);
    if (match && match[1]) {
      const pId = match[1];
      const foundProj = projects.find(p => p.id === pId);
      if (foundProj) {
        setClientProject(foundProj.id);
        setClientAddress(foundProj.location);
        setProjectType(foundProj.type || 'Interior');
        
        // Find matching lead in directory to autofill prospective info
        const matchingLead = leads.find(l => l.name.toLowerCase().includes(foundProj.name.toLowerCase()));
        if (matchingLead) {
          setClientName(matchingLead.name);
          setClientContact(matchingLead.contact);
        } else {
          setClientName(foundProj.name);
        }
      }
    }
  }, [projects, leads]);
  
  // Scope / Phase
  const [projectType, setProjectType] = useState<'Construction' | 'Interior'>('Interior');
  
  // Line Items with Excel and math expressions
  const [items, setItems] = useState<DocItem[]>([
    {
      id: 'item_1',
      name: 'Modular Wardrobe (MDF laminate)',
      phase: 'Wardrobe Joinery',
      description: '18mm Century ply exterior, Hafele soft-close hinges, premium matte laminate',
      quantity: 120,
      quantityExpr: '10 * 12', // 120 Sft
      unit: 'Sft',
      rate: 1450,
      rateExpr: '1450'
    },
    {
      id: 'item_2',
      name: 'Vitrified Tiling Work',
      phase: 'Flooring',
      description: 'Double-charged Kajaria vitrified tiles 4x2ft, epoxy grouted',
      quantity: 450,
      quantityExpr: '15 * 30', // 450 Sft
      unit: 'Sft',
      rate: 180,
      rateExpr: '180'
    }
  ]);

  // Tax/Discount details
  const [gstPercentage, setGstPercentage] = useState<number>(18); // default for construction/interior
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [transportCharges, setTransportCharges] = useState<number>(0);
  const [interiorDesignFee, setInteriorDesignFee] = useState<number>(0);
  
  // Milestone Payments
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: 'm1', title: 'Advance Deposit upon Sign-off', percentage: 40 },
    { id: 'm2', title: 'On material delivery at site', percentage: 40 },
    { id: 'm3', title: 'Upon final handover & snagging', percentage: 20 }
  ]);

  // Notes and banking details
  const [paymentNotes, setPaymentNotes] = useState(
    '1. Bank Transfer: VMS Group, HDFC Bank, A/C: 50200029388122, IFSC: HDFCO000122.\n2. Please mention the reference document number in transport slips.'
  );

  // Digital Signatures from HTML5 Signature Canvas
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [officerSignature, setOfficerSignature] = useState<string | null>(null);

  // Signature Presets / Library state (Typed, drawn, or uploaded)
  interface SignaturePreset {
    id: string;
    name: string;
    role: 'client' | 'officer' | 'general';
    dataUrl: string;
  }

  const [signaturePresets, setSignaturePresets] = useState<SignaturePreset[]>(() => {
    try {
      const saved = localStorage.getItem('inside-vms-signature-presets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load signature presets from localStorage:', e);
    }
    // Return standard initial design presets to showcase immediately
    return [
      {
        id: 'p1',
        name: 'G. K. Bhasin (Director)',
        role: 'officer',
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="380" height="90"><text x="190" y="45" font-family="cursive" font-size="34" font-style="italic" fill="%231D3557" text-anchor="middle" dominant-baseline="middle">G. K. Bhasin</text><line x1="80" y1="65" x2="300" y2="65" stroke="%231D3557" stroke-width="2" /></svg>'
      }
    ];
  });

  const [presetRoleInput, setPresetRoleInput] = useState<'client' | 'officer' | 'general'>('general');
  const [typedSignText, setTypedSignText] = useState('');
  const [typedSignStyle, setTypedSignStyle] = useState<number>(1);

  useEffect(() => {
    try {
      localStorage.setItem('inside-vms-signature-presets', JSON.stringify(signaturePresets));
    } catch (e) {
      console.error('Failed to save signature presets to localStorage:', e);
    }
  }, [signaturePresets]);

  // Global reset for digital signatures
  const handleClearAllSignatures = () => {
    setClientSignature(null);
    setOfficerSignature(null);
    logActivity(
      'Signature Reset',
      'Cleared all active signatures from the current invoice'
    );
  };

  // Convert currently drawn signature to Preset Library
  const saveCurrentToLibrary = (role: 'client' | 'officer') => {
    const signatureToSave = role === 'client' ? clientSignature : officerSignature;
    if (!signatureToSave) {
      alert(`No active drawn signature found for "${role === 'client' ? 'Client' : 'Officer'}". Draw on the pad first.`);
      return;
    }

    const defaultName = role === 'client' ? 'Client Design Approval' : 'VMS Exec Stamp';
    const label = prompt(`Enter a label/name for this saved ${role === 'client' ? 'Client' : 'Officer'} signature:`, defaultName);
    if (!label || !label.trim()) return;

    const newPreset: SignaturePreset = {
      id: 'preset_' + Date.now() + Math.random().toString(36).substring(2, 5),
      name: label.trim(),
      role,
      dataUrl: signatureToSave
    };

    setSignaturePresets(prev => [newPreset, ...prev]);
    logActivity('Preset Added', `Saved active signature "${label.trim()}" to preset library`);
  };

  // Delete preset signature from list
  const deletePresetSignature = (id: string, name: string) => {
    setSignaturePresets(prev => prev.filter(p => p.id !== id));
    logActivity('Preset Deleted', `Removed signature preset "${name}" from the library`);
  };

  // Generate a signature using a Canvas typing engine
  const handleCreateTypedSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignText || !typedSignText.trim()) return;

    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Select elegant cursive/handwriting style settings
      const fonts = [
        "italic bold 28px sans-serif",
        "italic 38px 'Brush Script MT', 'Dancing Script', 'Pacifico', cursive",
        "italic bold 28px 'Courier New', monospace",
        "italic 30px 'Georgia', serif"
      ];
      ctx.font = fonts[typedSignStyle] || fonts[1];
      ctx.fillStyle = '#1D3557'; // Classical midnight blue ink
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignText.trim(), canvas.width / 2, canvas.height / 2 - 5);
      
      // Elegant underline pen stroke
      ctx.beginPath();
      ctx.strokeStyle = '#1D3557';
      ctx.lineWidth = 1.8;
      ctx.moveTo(canvas.width / 5, canvas.height * 0.75);
      ctx.quadraticCurveTo(canvas.width / 2, canvas.height * 0.88, (canvas.width * 4) / 5, canvas.height * 0.78);
      ctx.stroke();

      const dataUrl = canvas.toDataURL('image/png');
      const newPreset: SignaturePreset = {
        id: 'preset_' + Date.now(),
        name: `${typedSignText.trim()} (Typed)`,
        role: presetRoleInput,
        dataUrl
      };

      setSignaturePresets(prev => [newPreset, ...prev]);
      setTypedSignText('');
      logActivity('Preset Added', `Generated and saved typed cursive signature for "${typedSignText}"`);
    }
  };

  // Import uploaded image file as signature preset
  const handleUploadSignaturePreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const label = prompt('Enter a label for this uploaded signature image:', file.name.replace(/\.[^/.]+$/, ""));
          if (!label || !label.trim()) return;

          const newPreset: SignaturePreset = {
            id: 'preset_' + Date.now(),
            name: `${label.trim()} (Uploaded)`,
            role: 'general',
            dataUrl: reader.result as string
          };

          setSignaturePresets(prev => [newPreset, ...prev]);
          logActivity('Preset Added', `Imported signature file: "${label.trim()}"`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Screenshots state & Central ledger bookkeeping logs
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postCategory, setPostCategory] = useState<'Materials' | 'Labor' | 'Legal' | 'Logistics' | 'Other'>('Materials');
  const [postPayee, setPostPayee] = useState('');
  const [bookingLogs, setBookingLogs] = useState<{ id: string; timestamp: Date; docNumber: string; amount: number; payee: string; isComplete: boolean }[]>([]);

  // Google Drive Integration States
  const [isDriveAuthed, setIsDriveAuthed] = useState(false);
  const [driveUser, setDriveUser] = useState<any>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveUploadError, setDriveUploadError] = useState<string | null>(null);
  const [driveUploadSuccess, setDriveUploadSuccess] = useState<boolean>(false);
  const [driveFileLink, setDriveFileLink] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsDriveAuthed(true);
        setDriveUser(user);
        setDriveToken(token);
      },
      () => {
        setIsDriveAuthed(false);
        setDriveUser(null);
        setDriveToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectDrive = async () => {
    try {
      setDriveUploadError(null);
      const res = await googleSignIn();
      if (res) {
        setIsDriveAuthed(true);
        setDriveUser(res.user);
        setDriveToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Drive Auth error:', err);
      setDriveUploadError('Auth failed: ' + err.message);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await logout();
      setIsDriveAuthed(false);
      setDriveUser(null);
      setDriveToken(null);
      setDriveFileLink(null);
      setDriveUploadSuccess(false);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleUploadToDrive = async () => {
    if (!driveToken) {
      setDriveUploadError("Not connected to Google Drive");
      return;
    }
    
    setIsDriveUploading(true);
    setDriveUploadError(null);
    setDriveUploadSuccess(false);

    try {
      // 1. Get or create folder
      const folderId = await getOrCreateFolder(driveToken, "Inside VMS Invoices");
      
      // 2. Build the PDF doc to Blob
      const doc = buildPDFDoc();
      const pdfBlob = doc.output('blob');
      const filename = `${docType.toUpperCase()}_${docNumber || 'NoNumber'}.pdf`;

      // 3. Upload PDF to Google Drive
      const uploadResult: any = await uploadFileToGoogleDrive(driveToken, pdfBlob, filename, folderId);
      
      if (uploadResult && uploadResult.id) {
        setDriveUploadSuccess(true);
        if (uploadResult.webViewLink) {
          setDriveFileLink(uploadResult.webViewLink);
        } else {
          setDriveFileLink(`https://drive.google.com/open?id=${uploadResult.id}`);
        }
        
        // Log to project activities
        if (clientProject) {
          addProjectLog(
            clientProject,
            `Uploaded ${docType.toUpperCase()} ${docNumber} directly to user Google Drive under folder "Inside VMS Invoices"`,
            0
          );
        }
        logActivity(
          'Google Drive Sync',
          `Saved invoice ${docNumber} to Google Drive folder 'Inside VMS Invoices'`
        );
      } else {
        throw new Error("Invalid response from Google Drive upload");
      }
    } catch (err: any) {
      console.error("Upload to google drive failed:", err);
      setDriveUploadError(err.message || "Unknown error during upload");
    } finally {
      setIsDriveUploading(false);
    }
  };

  // Multi-screenshot file reader handler
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      filesArray.forEach((file: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setScreenshots(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePostToLedger = () => {
    if (!clientProject) {
      alert("Please link this document to a Project first to post onto its Ledger.");
      return;
    }
    
    setIsPosting(true);
    
    // Calculate total
    const itemSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const itemGst = Math.round((itemSubtotal - discountAmount) * (gstPercentage / 100));
    const calculatedTotal = itemSubtotal - discountAmount + itemGst + Number(transportCharges) + Number(interiorDesignFee);

    const invoicePayee = postPayee || clientName || 'Linked Project Client';

    // 1. Save as direct project expenditure
    addExpenditure({
      id: 'exp_' + Date.now(),
      amount: calculatedTotal,
      purpose: `${docType.toUpperCase()} ${docNumber} Billing: ${items.map(it => it.name || 'Deliverable').join(', ')}`,
      paidTo: invoicePayee,
      projectId: clientProject,
      personName: currentUser?.name || 'VMS Coordinator',
      attachmentData: screenshots[0] || undefined, // link first uploaded screenshot as receipt attachment!
      date: docDate || new Date().toISOString()
    });

    // 2. Add Invoice object
    addInvoice({
      id: 'inv_' + Date.now(),
      projectId: clientProject,
      payee: invoicePayee,
      amountPaid: calculatedTotal,
      date: docDate || new Date().toISOString(),
      description: `${docType.toUpperCase()} ${docNumber}: Materials & Installations`,
      category: postCategory,
      status: 'Paid',
      documentUrl: screenshots[0] || '#'
    });

    // 3. Post to logs & activity
    addProjectLog(
      clientProject,
      `Posted straight-line bookkeeping record for ${docType.toUpperCase()} ${docNumber} (${items.length} materials tracked). Total Expenditure logged: ₹${calculatedTotal.toLocaleString()}. Attached ${screenshots.length} screenshot(s).`,
      calculatedTotal
    );

    logActivity(
      'Ledger Posting',
      `Synchronized document ${docNumber} for linked project in a straight-line ledger entry.`
    );

    setBookingLogs(prev => [
      {
        id: 'book_' + Date.now(),
        timestamp: new Date(),
        docNumber: docNumber,
        amount: calculatedTotal,
        payee: invoicePayee,
        isComplete: true
      },
      ...prev
    ]);

    setIsPosting(false);
  };

  // Auto-set Doc Number and Date on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDocDate(today);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDocDueDate(nextMonth.toISOString().split('T')[0]);
    
    const prefix = docType === 'invoice' ? 'INV' : 'QTN';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setDocNumber(`${prefix}-${new Date().getFullYear()}-${rand}`);
  }, [docType]);

  // Auto-fill details if project is selected
  const handleProjectLinkSelect = (projectId: string) => {
    setClientProject(projectId);
    const selected = projects.find(p => p.id === projectId);
    if (selected) {
      setClientName(selected.name || '');
      setClientAddress(selected.location || '');
      setClientCompany('Inside VMS Linked Project');
      // Set type
      if (selected.type === 'Construction') {
        setProjectType('Construction');
      } else {
        setProjectType('Interior');
      }
    }
  };

  const handleAddItem = () => {
    const newItem: DocItem = {
      id: 'item_' + Date.now(),
      name: '',
      phase: projectType === 'Interior' ? 'Design & Joinery' : 'Structural Works',
      description: '',
      quantity: 1,
      quantityExpr: '1',
      unit: 'Sft',
      rate: 0,
      rateExpr: '0'
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof DocItem, val: any) => {
    setItems(items.map(it => {
      if (it.id === id) {
        const updated = { ...it, [field]: val };
        if (field === 'quantityExpr') {
          updated.quantity = evalExpression(val);
        } else if (field === 'rateExpr') {
          updated.rate = evalExpression(val);
        }
        return updated;
      }
      return it;
    }));
  };

  const handleAddMilestone = () => {
    const newM: Milestone = {
      id: 'm_' + Date.now(),
      title: 'Next Progress Stage Milestone',
      percentage: 0
    };
    setMilestones([...milestones, newM]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleUpdateMilestone = (id: string, field: keyof Milestone, val: any) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  // Computations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const gstAmount = Math.round((subtotal - discountAmount) * (gstPercentage / 100));
  const finalTotal = subtotal - discountAmount + gstAmount + Number(transportCharges) + Number(interiorDesignFee);

  // Generate PDF via jsPDF with AutoTable
  const buildPDFDoc = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header Style with high contrast
    doc.setFillColor(0, 90, 140); // Hex #005a8c
    doc.rect(0, 0, 210, 40, 'F');
    
    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('INSIDE VMS GROUP', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text('PREMIUM CONSTRUCTION & INTERIORS', 14, 25);
    doc.text('Est. 1989', 14, 31);
    
    // Doc Type Banner
    doc.setFillColor(230, 32, 32); // Banner Red
    doc.rect(140, 0, 70, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.text(docType.toUpperCase(), 145, 18);
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Doc No: ${docNumber}`, 145, 26);
    doc.text(`Date: ${docDate}`, 145, 32);

    // Reset details
    doc.setTextColor(45, 52, 54); // Slate text
    doc.setFontSize(11);
    
    // Row layout for client and project metadata
    doc.setFont('Helvetica', 'bold');
    doc.text('BILL TO / CLIENT DETAILS:', 14, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Client Name: ${clientName || 'N/A'}`, 14, 58);
    doc.text(`Company/Proj: ${clientCompany || 'N/A'}`, 14, 63);
    doc.text(`Address: ${clientAddress || 'N/A'}`, 14, 68);
    doc.text(`Email & Mob: ${clientEmail || 'N/A'} | ${clientContact || 'N/A'}`, 14, 73);

    // Right Column: Professional layout Info
    doc.setFont('Helvetica', 'bold');
    doc.text('DOCUMENT DETAILS:', 125, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Project Category: ${projectType} Works`, 125, 58);
    doc.text(`Tax Scheme: Standard GST (${gstPercentage}%)`, 125, 63);
    doc.text(`Due Date: ${docDueDate || 'On Receipt'}`, 125, 68);
    doc.text(`Linked ID: ${clientProject || 'None'}`, 125, 73);

    // Add border spacer
    doc.setDrawColor(224, 229, 236);
    doc.line(14, 78, 196, 78);

    // Build the dynamic Item Table
    const tableColumns = ['Phase / Segment', 'Description / Laminate Specifications', 'Qty', 'Unit', 'Rate (Rs)', 'Total (Rs)'];
    const tableRows = items.map(item => [
      item.phase,
      `${item.name}\n${item.description}`,
      item.quantity.toLocaleString(),
      item.unit,
      item.rate.toLocaleString(),
      (item.quantity * item.rate).toLocaleString()
    ]);

    autoTable(doc, {
      startY: 83,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 90, 140], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [45, 52, 54] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 70 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });

    // Subtotal placement block
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Left-side milestone rendering
    let milestoneY = finalY;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PROPOSED PAYMENT TERMS:', 14, milestoneY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    
    milestones.forEach((m, idx) => {
      milestoneY += 5;
      const expectedAmount = Math.round(finalTotal * (m.percentage / 100));
      doc.text(`${idx + 1}. ${m.title} (${m.percentage}%): Rs ${(expectedAmount).toLocaleString()}`, 14, milestoneY);
    });

    // Right-side Ledger Summary
    let totalTextY = finalY;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    
    doc.text(`Subtotal:`, 130, totalTextY);
    doc.text(`Rs ${subtotal.toLocaleString()}`, 170, totalTextY, { align: 'right' });
    
    if (discountAmount > 0) {
      totalTextY += 5;
      doc.text(`Discount:`, 130, totalTextY);
      doc.text(`-Rs ${discountAmount.toLocaleString()}`, 170, totalTextY, { align: 'right' });
    }
    
    if (transportCharges > 0) {
      totalTextY += 5;
      doc.text(`Transport/Site:`, 130, totalTextY);
      doc.text(`Rs ${Number(transportCharges).toLocaleString()}`, 170, totalTextY, { align: 'right' });
    }

    if (interiorDesignFee > 0) {
      totalTextY += 5;
      doc.text(`Design / Engg Fee:`, 130, totalTextY);
      doc.text(`Rs ${Number(interiorDesignFee).toLocaleString()}`, 170, totalTextY, { align: 'right' });
    }

    totalTextY += 5;
    doc.text(`GST (${gstPercentage}%):`, 130, totalTextY);
    doc.text(`Rs ${gstAmount.toLocaleString()}`, 170, totalTextY, { align: 'right' });

    totalTextY += 7;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total Amount due:`, 130, totalTextY);
    doc.text(`Rs ${finalTotal.toLocaleString()}`, 170, totalTextY, { align: 'right' });

    // Footer Block
    const bottomY = Math.max(milestoneY, totalTextY) + 15;
    doc.line(14, bottomY, 196, bottomY);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Instructions & Payment Details:', 14, bottomY + 6);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    
    const splitNotes = doc.splitTextToSize(paymentNotes, 180);
    doc.text(splitNotes, 14, bottomY + 11);

    // Sign-off
    const signY = bottomY + 30;

    // Direct Signature Overlays
    if (clientSignature) {
      try {
        doc.addImage(clientSignature, 'PNG', 16, signY - 14, 46, 13);
      } catch (e) {
        console.error('Failed to embed client signature in PDF:', e);
      }
    }
    if (officerSignature) {
      try {
        doc.addImage(officerSignature, 'PNG', 137, signY - 14, 46, 13);
      } catch (e) {
        console.error('Failed to embed officer signature in PDF:', e);
      }
    }

    doc.line(14, signY, 65, signY);
    doc.line(135, signY, 186, signY);
    doc.text('Client Signature / Approval', 14, signY + 4);
    doc.text('Authorized VMS Officer', 135, signY + 4);

    return doc;
  };

  const generatePDF = () => {
    const doc = buildPDFDoc();
    doc.save(`${docType.toUpperCase()}_${docNumber}.pdf`);
  };

  // Generate MS Word Document compatible Rich Content
  const generateWord = () => {
    const docTitle = docType === 'invoice' ? 'TAX INVOICE' : 'QUOTATION / PROPOSAL';
    
    let itemsRows = '';
    items.forEach(it => {
      itemsRows += `
        <tr>
          <td style="border: 1px solid #CCCCCC; padding: 10px; font-weight: bold; font-family: Arial;">${it.phase}</td>
          <td style="border: 1px solid #CCCCCC; padding: 10px; font-family: Arial;">
            <b>${it.name}</b><br/><span style="color:#555555; font-size:11px;">${it.description}</span>
          </td>
          <td style="border: 1px solid #CCCCCC; padding: 10px; text-align: center; font-family: Arial;">${it.quantity}</td>
          <td style="border: 1px solid #CCCCCC; padding: 10px; text-align: center; font-family: Arial;">${it.unit}</td>
          <td style="border: 1px solid #CCCCCC; padding: 10px; text-align: right; font-family: Arial;">Rs ${it.rate.toLocaleString()}</td>
          <td style="border: 1px solid #CCCCCC; padding: 10px; text-align: right; font-family: Arial; font-weight: bold;">Rs ${(it.quantity * it.rate).toLocaleString()}</td>
        </tr>
      `;
    });

    let milestonesRows = '';
    milestones.forEach((m, idx) => {
      const milestoneVal = Math.round(finalTotal * (m.percentage / 100));
      milestonesRows += `
        <li style="margin-bottom:6px; font-family: Arial; font-size:13px;">
          <b>${m.title}</b> (${m.percentage}%): Rs ${milestoneVal.toLocaleString()}
        </li>
      `;
    });

    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>VMS ${docTitle}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #2D3436; line-height: 1.4; padding: 20px; }
          .vms-brand { border-bottom: 4px solid #005a8c; padding-bottom: 20px; margin-bottom: 25px; }
          .brand-title { font-size: 26px; font-weight: bold; color: #005a8c; text-transform: uppercase; margin: 0; }
          .brand-subtitle { font-size: 11px; letter-spacing: 2px; color: #e62020; font-weight: bold; margin: 3px 0 0 0; }
          .meta-table { width: 100%; margin-bottom: 30px; border: none; }
          .meta-section { vertical-align: top; width: 50%; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { background-color: #005a8c; color: white; padding: 12px; font-size: 13px; text-align: left; text-transform: uppercase; }
          .items-table td { padding: 10px; border: 1px solid #E0E5EC; font-size: 12px; }
          .ledger-summary { width: 320px; float: right; margin-bottom: 30px; border-collapse: collapse; }
          .ledger-summary td { padding: 6px; font-size: 12px; }
          .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #e62020; color: #e62020; }
          .milestones-card { background-color: #F8F9FA; padding: 15px; border-left: 4px solid #005a8c; margin-bottom: 30px; clear: both; }
          .notes-box { font-size: 11px; color: #555555; background-color: #F1F3F5; padding: 15px; border: 1px dashed gray; margin-top: 40px; }
          .sign-boxes { width: 100%; margin-top: 50px; border-collapse: collapse; }
          .sign-boxes td { text-align: center; font-size: 12px; padding-top: 40px; border: none; }
        </style>
      </head>
      <body>
        <div class="vms-brand">
          <table style="width:100%; border:none;">
            <tr>
              <td style="border:none;">
                <h1 class="brand-title">INSIDE VMS GROUP</h1>
                <p class="brand-subtitle">PREMIUM CONSTRUCTION & INTERIORS LEDGER</p>
                <span style="font-size:11px; color:#555555;">Est. 1989 | Systems & Information Panel</span>
              </td>
              <td style="text-align:right; border:none; vertical-align:middle;">
                <h2 style="color:#e62020; margin:0; text-transform:uppercase; font-size:22px; font-weight:bold;">${docTitle}</h2>
                <span style="font-family: monospace; font-size:12px; font-weight:bold; background:#005a8c; color:white; padding:4px 8px;">DOC: ${docNumber}</span>
              </td>
            </tr>
          </table>
        </div>

        <table class="meta-table" style="width:100%;">
          <tr>
            <td class="meta-section" style="border:none; padding-right:20px;">
              <h3 style="color:#005a8c; border-bottom:1px solid #005a8c; padding-bottom:5px; font-size:14px; margin-top:0;">BILL TO / CLIENT DETAILS</h3>
              <p style="font-size:13px; margin:4px 0;"><b>Name/Client:</b> ${clientName || 'N/A'}</p>
              <p style="font-size:13px; margin:4px 0;"><b>Company:</b> ${clientCompany || 'N/A'}</p>
              <p style="font-size:13px; margin:4px 0;"><b>Location Address:</b> ${clientAddress || 'N/A'}</p>
              <p style="font-size:13px; margin:4px 0;"><b>Contact & Email:</b> ${clientContact || 'N/A'} | ${clientEmail || 'N/A'}</p>
            </td>
            <td class="meta-section" style="border:none; padding-left:20px;">
              <h3 style="color:#005a8c; border-bottom:1px solid #005a8c; padding-bottom:5px; font-size:14px; margin-top:0;">DOCUMENT SPECIFICATIONS</h3>
              <p style="font-size:13px; margin:4px 0;"><b>Category Scope:</b> ${projectType} Phase Works</p>
              <p style="font-size:13px; margin:4px 0;"><b>Taxation Setup:</b> GST (${gstPercentage}%)</p>
              <p style="font-size:13px; margin:4px 0;"><b>Date of Issue:</b> ${docDate}</p>
              <p style="font-size:13px; margin:4px 0;"><b>Valid Until / Due:</b> ${docDueDate || 'Upon Presentation'}</p>
            </td>
          </tr>
        </table>

        <h3 style="color:#005a8c; font-size:14px; margin-bottom:10px;">BILLABLE LINE ITEMS (CONSTRUCTION & INTERIOR ESTIMATE)</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:18%;">Phase/Segment</th>
              <th style="width:45%;">Item / Specs Details</th>
              <th style="width:8%; text-align:center;">Qty</th>
              <th style="width:8%; text-align:center;">Unit</th>
              <th style="width:11%; text-align:right;">Rate</th>
              <th style="width:11%; text-align:right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- SUMMARY BLOCK -->
        <table class="ledger-summary" align="right" style="border:none;">
          <tr>
            <td style="border:none;">Subtotal:</td>
            <td style="text-align:right; border:none; font-weight:bold;">Rs ${subtotal.toLocaleString()}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td style="border:none; color: #e62020;">Discount Applied:</td>
            <td style="text-align:right; border:none; font-weight:bold; color: #e62020;">-Rs ${discountAmount.toLocaleString()}</td>
          </tr>
          ` : ''}
          ${transportCharges > 0 ? `
          <tr>
            <td style="border:none;">Transport & Logistics:</td>
            <td style="text-align:right; border:none; font-weight:bold;">Rs ${Number(transportCharges).toLocaleString()}</td>
          </tr>
          ` : ''}
          ${interiorDesignFee > 0 ? `
          <tr>
            <td style="border:none;">Design / Consultancy Fee:</td>
            <td style="text-align:right; border:none; font-weight:bold;">Rs ${Number(interiorDesignFee).toLocaleString()}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="border:none;">GST (${gstPercentage}%):</td>
            <td style="text-align:right; border:none; font-weight:bold;">Rs ${gstAmount.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td style="border:none;">TOTAL AMOUNT:</td>
            <td style="text-align:right; border:none; font-weight:bold;">Rs ${finalTotal.toLocaleString()}</td>
          </tr>
        </table>

        <div class="milestones-card" style="margin-top:20px; display:inline-block; width:100%;">
          <h4 style="color:#005a8c; margin-top:0; margin-bottom:10px; font-size:14px;">PROPOSED MILESTONE TERMS</h4>
          <ol style="margin:0; padding-left:20px;">
            ${milestonesRows}
          </ol>
        </div>

        <div class="notes-box">
          <h4 style="margin-top:0; margin-bottom:5px; color:#005a8c; font-size:12px;">INSTRUCTIONS & NOTES:</h4>
          <p style="white-space: pre-wrap; margin:0; line-height:1.4;">${paymentNotes}</p>
        </div>

        <table class="sign-boxes">
          <tr>
            <td style="border:none; border-top: 1px solid #CCCCCC; width: 40%;">
              Client Signature / Seal Approval
            </td>
            <td style="width:20%; border:none;"></td>
            <td style="border:none; border-top: 1px solid #CCCCCC; width: 40%;">
              Authorized VMS signatory
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType.toUpperCase()}_${docNumber}.doc`;
    a.click();
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl heavy-text uppercase tracking-widest mb-2">Billing Doc Engine</h1>
          <div className="h-2 w-48 bg-[#E63946] border-2 border-black rounded-[4px]"></div>
        </div>
        
        {/* Claymorphic selector for Document Selector */}
        <div className="flex bg-[#E0E5EC] border-3 border-black p-1.5 rounded-[16px] gap-2 shadow-[4px_4px_0_0_#000]">
          <button 
            type="button"
            onClick={() => setDocType('invoice')}
            className={`px-4 py-1.5 text-xs heavy-text uppercase rounded-[10px] transition-all flex items-center gap-1.5 ${docType === 'invoice' ? 'bg-[#1D3557] text-white' : 'text-gray-600 hover:text-black'}`}
          >
            <Receipt size={14}/> Invoice Mode
          </button>
          <button 
            type="button"
            onClick={() => setDocType('quotation')}
            className={`px-4 py-1.5 text-xs heavy-text uppercase rounded-[10px] transition-all flex items-center gap-1.5 ${docType === 'quotation' ? 'bg-[#FFB703] text-black border-2 border-black/10' : 'text-gray-600 hover:text-black'}`}
          >
            <FileText size={14}/> Quotation Mode
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Form parameters */}
        <div className="space-y-6">
          <div className="bauhaus-card relative overflow-hidden bg-white">
            <h2 className="text-2xl heavy-text uppercase tracking-wider mb-6 pb-2 border-b-2 border-dashed border-gray-300 flex items-center gap-2">
              <CheckCircle className="text-[#005a8c]" size={22} /> Document Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Doc Number</label>
                <input 
                  type="text" 
                  value={docNumber} 
                  onChange={e => setDocNumber(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Link to Project Database</label>
                <select 
                  value={clientProject} 
                  onChange={e => handleProjectLinkSelect(e.target.value)} 
                  className="bauhaus-input"
                >
                  <option value="">-- Manual Mode / Unlinked --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Date of Issue</label>
                <input 
                  type="date" 
                  value={docDate} 
                  onChange={e => setDocDate(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Due / Valid Until Date</label>
                <input 
                  type="date" 
                  value={docDueDate} 
                  onChange={e => setDocDueDate(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
            </div>
          </div>

          <div className="bauhaus-card relative overflow-hidden bg-white">
            <h2 className="text-2xl heavy-text uppercase tracking-wider mb-6 pb-2 border-b-2 border-dashed border-gray-300 flex items-center gap-2">
              <VmsLogo className="w-6 h-6 shrink-0 inline-block text-[#005a8c]" /> Recipient Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Client Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sarah Connor"
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Client Business / Phase</label>
                <input 
                  type="text" 
                  placeholder="e.g. TechCorp Office"
                  value={clientCompany} 
                  onChange={e => setClientCompany(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Deliverables Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 14 Sector-A, West End"
                  value={clientAddress} 
                  onChange={e => setClientAddress(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Contact Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98877112"
                  value={clientContact} 
                  onChange={e => setClientContact(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. sarah@example.com"
                  value={clientEmail} 
                  onChange={e => setClientEmail(e.target.value)} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase tracking-wider mb-1">Scope Category</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm uppercase heavy-text cursor-pointer">
                    <input 
                      type="radio" 
                      name="projtype"
                      checked={projectType === 'Interior'}
                      onChange={() => setProjectType('Interior')}
                      className="accent-[#005a8c]"
                    />
                    Inteiors Works
                  </label>
                  <label className="flex items-center gap-2 text-sm uppercase heavy-text cursor-pointer">
                    <input 
                      type="radio" 
                      name="projtype"
                      checked={projectType === 'Construction'}
                      onChange={() => setProjectType('Construction')}
                      className="accent-[#e62020]"
                    />
                    Construction Works
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bauhaus-card relative overflow-hidden bg-white">
            <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-dashed border-gray-300">
              <h2 className="text-2xl heavy-text uppercase tracking-wider flex items-center gap-2">
                <Layers className="text-[#005a8c]" size={22} /> Billable Deliverables
              </h2>
              <button 
                type="button" 
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-[#1D3557] text-white text-xs font-light uppercase rounded-[12px] border-2 border-black hover:bg-[#FFB703] hover:text-black transition-all flex items-center gap-1 active:translate-y-0.5 cursor-pointer"
                style={{
                  boxShadow: '2px 2px 0px 0px #000000, inset 2px 2px 4px rgba(255, 255, 255, 0.35), inset -2px -2px 4px rgba(0, 0, 0, 0.2)'
                }}
              >
                <Plus size={14}/> Add Item
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {items.map((it, idx) => (
                <div key={it.id} className="p-4 border-2 border-black rounded-[16px] bg-[#F8F9FA] relative shadow-[3px_3px_0_0_rgba(0,0,0,0.15)] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light font-mono text-[#005a8c]">Item #{idx + 1}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-red-500 hover:text-red-700 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] heavy-text uppercase mb-0.5">Title / Material Block</label>
                      <input 
                        type="text" 
                        required
                        value={it.name} 
                        placeholder="Modular design, Vitrified tiling..."
                        onChange={e => handleUpdateItem(it.id, 'name', e.target.value)}
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-light bg-white w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] heavy-text uppercase mb-0.5">Phase</label>
                      <input 
                        type="text" 
                        value={it.phase} 
                        placeholder="Flooring, Joinery..."
                        onChange={e => handleUpdateItem(it.id, 'phase', e.target.value)}
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-medium bg-white w-full"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] heavy-text uppercase mb-0.5">Descriptions (Laminate Thickness / Specifications)</label>
                      <input 
                        type="text" 
                        value={it.description} 
                        placeholder="18mm marine plywood waterproof, Kajaria 4x2 premium laminate"
                        onChange={e => handleUpdateItem(it.id, 'description', e.target.value)}
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-normal bg-white w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] heavy-text uppercase mb-0.5 flex items-center gap-1 justify-center">
                        <Calculator size={10} className="text-[#005a8c]" />
                        Qty (Formula OK)
                      </label>
                      <input 
                        type="text" 
                        value={it.quantityExpr !== undefined ? it.quantityExpr : String(it.quantity)} 
                        onChange={e => handleUpdateItem(it.id, 'quantityExpr', e.target.value)}
                        placeholder="e.g. 15 * 30"
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-light bg-white w-full text-center font-mono focus:bg-blue-50 focus:border-[#005a8c] transition-all"
                      />
                      <span className="text-[9px] text-[#005a8c] block text-center font-bold mt-1 bg-blue-100/50 rounded py-0.5 border border-[#005a8c]/20">
                        = {it.quantity.toLocaleString()} {it.unit || 'Units'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] heavy-text uppercase mb-0.5 text-center">Unit (Sft/Nos)</label>
                      <input 
                        type="text" 
                        value={it.unit} 
                        placeholder="Sft, Rft, Nos"
                        onChange={e => handleUpdateItem(it.id, 'unit', e.target.value)}
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-light bg-white w-full text-center focus:bg-yellow-50 focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] heavy-text uppercase mb-0.5 flex items-center gap-1 justify-end">
                        <Calculator size={10} className="text-emerald-700" />
                        Rate (₹ Formula)
                      </label>
                      <input 
                        type="text" 
                        value={it.rateExpr !== undefined ? it.rateExpr : String(it.rate)} 
                        onChange={e => handleUpdateItem(it.id, 'rateExpr', e.target.value)}
                        placeholder="e.g. 1500 - 150"
                        className="p-1 px-2 border-2 border-black rounded-[8px] text-xs font-light bg-white w-full text-right font-mono focus:bg-emerald-50 focus:border-emerald-700 transition-all"
                      />
                      <span className="text-[9px] text-emerald-700 block text-right font-bold mt-1 bg-emerald-100/50 rounded py-0.5 border border-emerald-700/20 px-1">
                        = ₹{it.rate.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Surcharges / Adjustments */}
          <div className="bauhaus-card relative overflow-hidden bg-white">
            <h2 className="text-2xl heavy-text uppercase tracking-wider mb-6 pb-2 border-b-2 border-dashed border-gray-300">
              Tax Adjustments & Fees
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs heavy-text uppercase mb-1">GST Tax (%)</label>
                <input 
                  type="number" 
                  value={gstPercentage} 
                  onChange={e => setGstPercentage(Number(e.target.value))} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase mb-1">Discount (₹)</label>
                <input 
                  type="number" 
                  value={discountAmount} 
                  onChange={e => setDiscountAmount(Number(e.target.value))} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase mb-1">Logistics / Safe Transport (₹)</label>
                <input 
                  type="number" 
                  value={transportCharges} 
                  onChange={e => setTransportCharges(Number(e.target.value))} 
                  className="bauhaus-input" 
                />
              </div>
              <div>
                <label className="block text-xs heavy-text uppercase mb-1">Interior / Eng Fee (₹)</label>
                <input 
                  type="number" 
                  value={interiorDesignFee || ''} 
                  onChange={e => setInteriorDesignFee(Number(e.target.value))} 
                  className="bauhaus-input" 
                />
              </div>
            </div>
          </div>

          {/* Payment Terms Milestone schedule */}
          <div className="bauhaus-card relative overflow-hidden bg-white">
            <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-dashed border-gray-300">
              <h2 className="text-2xl heavy-text uppercase tracking-wider">Payment Installations</h2>
              <button 
                type="button" 
                onClick={handleAddMilestone}
                className="px-3 py-1 bg-gray-200 text-black text-[11px] font-light uppercase rounded-[10px] border-2 border-black active:translate-y-0.5 cursor-pointer"
                style={{
                  boxShadow: '1.5px 1.5px 0px 0px #000, inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.5), inset -1.5px -1.5px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                + Add Milestone
              </button>
            </div>

            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div key={m.id} className="flex gap-2 items-center bg-[#F3F4F6] p-2 border-2 border-black rounded-[12px]">
                  <span className="text-xs font-medium font-mono">#{idx+1}</span>
                  <input 
                    type="text" 
                    value={m.title} 
                    onChange={e => handleUpdateMilestone(m.id, 'title', e.target.value)}
                    className="flex-1 p-1 bg-white border border-black text-xs font-light rounded-[6px]"
                  />
                  <input 
                    type="number" 
                    placeholder="%" 
                    value={m.percentage} 
                    onChange={e => handleUpdateMilestone(m.id, 'percentage', Number(e.target.value))}
                    className="w-16 p-1 bg-white border border-black text-xs font-light rounded-[6px] text-center"
                  />
                  <button type="button" onClick={() => handleRemoveMilestone(m.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-xs heavy-text uppercase mb-1">Terms Instructions & Notes</label>
              <textarea 
                value={paymentNotes} 
                onChange={e => setPaymentNotes(e.target.value)} 
                className="bauhaus-input h-24 text-xs font-medium resize-none" 
              />
            </div>
          </div>

          {/* Screenshot Voucher Upload Section */}
          <div className="bauhaus-card relative overflow-hidden bg-white">
            <h2 className="text-2xl heavy-text uppercase tracking-wider mb-2 flex items-center gap-2">
              <Camera className="text-[#005a8c]" size={22} /> Screenshots & Documents
            </h2>
            <p className="text-[11px] text-[#7F8C8D] uppercase tracking-wider mb-4">
              Add transfer screenshots, cash receipts, and supplier bills
            </p>

            {/* Custom drag-n-drop or click selector */}
            <div className="border-3 border-dashed border-black rounded-[20px] p-6 bg-[#F8F9FA] text-center hover:bg-[#F1F3F5] transition-all relative">
              <input 
                type="file" 
                multiple
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-xs font-bold uppercase text-black">Drag & Drop or Click to Upload</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase">Supports JPEG, PNG payments proof & screenshots</p>
            </div>

            {/* Screenshots Gallery View */}
            {screenshots.length > 0 && (
              <div className="mt-4 space-y-3">
                <span className="text-[10px] heavy-text uppercase text-[#e62020] tracking-wider block font-bold">
                  Active Vouchers ({screenshots.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((src, index) => (
                    <div key={index} className="relative group border-2 border-black rounded-[12px] overflow-hidden bg-gray-100 shadow-[2px_2px_0_0_#000] aspect-video">
                      <img src={src} alt="screenshot attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button" 
                        onClick={() => removeScreenshot(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 border border-black hover:bg-red-700 cursor-pointer"
                        title="Remove attachment"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Straight-line Bookkeeping Poster */}
          <div className="bauhaus-card relative overflow-hidden bg-white border-4">
            <div className="absolute top-0 right-0 bg-[#e62020] text-white text-[9px] heavy-text uppercase tracking-widest px-3 py-1 rounded-bl-[12px] border-b-2 border-l-2 border-black">
              Direct Sync
            </div>
            
            <h2 className="text-2xl heavy-text uppercase tracking-wider mb-2 flex items-center gap-2">
              <Receipt className="text-[#005a8c]" size={22} /> Straight-Line expenditure
            </h2>
            <p className="text-[11px] text-[#7F8C8D] uppercase tracking-wider mb-4">
              Instantly book this invoice amount onto the main projects database
            </p>

            {clientProject ? (
              <div className="space-y-4 pt-1">
                <div className="bg-[#EFFFF6] border-2 border-[#10B981] p-3 rounded-[16px] text-xs flex items-start gap-2">
                  <CheckCircle className="text-[#10B981] shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-bold block uppercase text-[#065F46]">Linked Project Status</span>
                    <p className="text-gray-600 mt-0.5 font-medium">
                      All calculations are linked straight to project ID: <strong className="font-mono bg-white px-1 border border-black/10 rounded text-black">{clientProject}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs heavy-text uppercase mb-1">Payee/Supplier Vendor</label>
                    <input 
                      type="text"
                      placeholder="e.g. Centuryply House"
                      value={postPayee}
                      onChange={e => setPostPayee(e.target.value)}
                      className="bauhaus-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs heavy-text uppercase mb-1">Expenditure Ledger group</label>
                    <select
                      value={postCategory}
                      onChange={e => setPostCategory(e.target.value as any)}
                      className="bauhaus-input"
                    >
                      <option value="Materials">Materials & Plywood</option>
                      <option value="Labor">Contractor Labor</option>
                      <option value="Logistics">Logistics Transport</option>
                      <option value="Legal">Legal & Permits</option>
                      <option value="Other">Other Miscellaneous</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePostToLedger}
                  disabled={isPosting}
                  className="w-full py-3 bg-[#e62020] hover:bg-[#b51414] text-white rounded-[16px] border-3 border-black text-xs heavy-text uppercase tracking-wider transition-all flex justify-center items-center gap-2 cursor-pointer shadow-[3px_3px_0_0_#000] active:translate-y-0.5"
                >
                  <Sparkles size={16} /> {isPosting ? 'Booking transaction...' : 'Book Direct Expenditure (₹' + finalTotal.toLocaleString() + ')'}
                </button>

                {bookingLogs.length > 0 && (
                  <div className="border-t-2 border-black border-dashed pt-4">
                    <span className="text-[10px] heavy-text uppercase tracking-wider text-gray-500 block mb-2 flex items-center gap-1">
                      <History size={12} /> Post history for this session ({bookingLogs.length})
                    </span>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {bookingLogs.map(log => (
                        <div key={log.id} className="text-xs bg-[#F8F9FA] p-2 border border-black rounded-[8px] flex justify-between items-center font-mono text-black">
                          <div>
                            <span className="font-bold text-[#005a8c]">{log.docNumber}</span>
                            <span className="text-gray-400 block text-[9px]">{log.timestamp.toLocaleTimeString()} - Paid to {log.payee}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-red-600">₹{log.amount.toLocaleString()}</span>
                            <span className="text-green-600 block text-[9px] font-bold">● Synchronized</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-[20px] text-xs text-yellow-800">
                <p className="font-bold uppercase mb-1">⚠️ Offline Mode / Unlinked</p>
                To utilize straight-line expenditure mapping, select a linked project in the <strong>"Document Details"</strong> panel above. Doing so will enable direct budgeting entries with your attached receipts/screenshots.
              </div>
            )}
          </div>

          {/* Excel & Mathematical Formula Cheat Sheet Guide */}
          <div className="bauhaus-card relative overflow-hidden bg-[#FBF9F1] border-2 border-dashed border-gray-400">
            <h2 className="text-xl heavy-text uppercase tracking-wider mb-2 text-[#005a8c] flex items-center gap-1.5">
              <Calculator size={18} /> Excel estimation formulas logic
            </h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
              Surveyor and architect guide to automatic spreadsheets
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-black">
              <div className="bg-white p-2 border border-black/10 rounded-[8px]">
                <strong className="text-[10.5px] text-[#e62020] uppercase font-bold block mb-1">📐 Area with wastage</strong>
                <code className="bg-gray-100 p-0.5 block text-[10px] select-all cursor-pointer hover:bg-yellow-50 mb-1 rounded text-center">Length * Width * 1.15</code>
                <span className="text-[9px] text-gray-400 block font-sans">e.g. 15ft * 30ft with 15% wastage allowance.</span>
              </div>
              <div className="bg-white p-2 border border-black/10 rounded-[8px]">
                <strong className="text-[10.5px] text-[#e62020] uppercase font-bold block mb-1">🪵 Wood density cube</strong>
                <code className="bg-gray-100 p-0.5 block text-[10px] select-all cursor-pointer hover:bg-yellow-50 mb-1 rounded text-center">4 * 0.75 * 0.75 * 45</code>
                <span className="text-[9px] text-gray-400 block font-sans">Sft multiplied by density for brass/weight metrics.</span>
              </div>
              <div className="bg-white p-2 border border-black/10 rounded-[8px]">
                <strong className="text-[10.5px] text-[#e62020] uppercase font-bold block mb-1">🏷️ Custom discounts</strong>
                <code className="bg-gray-100 p-0.5 block text-[10px] select-all cursor-pointer hover:bg-yellow-50 mb-1 rounded text-center">1500 * 0.90</code>
                <span className="text-[9px] text-gray-400 block font-sans">Evaluates 10% cash discount directly inside rate cells.</span>
              </div>
              <div className="bg-white p-2 border border-black/10 rounded-[8px]">
                <strong className="text-[10.5px] text-[#e62020] uppercase font-bold block mb-1">⏳ Progress ratio</strong>
                <code className="bg-gray-100 p-0.5 block text-[10px] select-all cursor-pointer hover:bg-yellow-50 mb-1 rounded text-center">(450 / 9) * 1.2</code>
                <span className="text-[9px] text-gray-400 block font-sans">Evaluate nested division quotients quickly.</span>
              </div>
            </div>
          </div>

          {/* Digital Signature Pad Panel */}
          <div className="bauhaus-card relative overflow-hidden bg-white mb-6">
            <div className="absolute top-0 right-0 bg-[#E63946] text-white text-[9px] heavy-text uppercase tracking-widest px-3 py-1 rounded-bl-[12px] border-b-2 border-l-2 border-black">
              Sign-Off
            </div>
            
            <h2 className="text-xl heavy-text uppercase tracking-wider mb-1 flex items-center gap-2 text-black">
              <PenTool className="text-[#E63946]" size={20} /> Digital Signatures
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">
              Draw approvals to be embedded directly into the generated document
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad
                label="Client Approval"
                signature={clientSignature}
                onSave={(dataUrl) => setClientSignature(dataUrl)}
                onClear={() => setClientSignature(null)}
              />
              
              <SignaturePad
                label="Authorized Officer"
                signature={officerSignature}
                onSave={(dataUrl) => setOfficerSignature(dataUrl)}
                onClear={() => setOfficerSignature(null)}
              />
            </div>

            {/* Active Drawing Actions */}
            <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 flex flex-wrap gap-2 justify-between items-center bg-gray-50 p-2.5 rounded-[12px] border border-black/10">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveCurrentToLibrary('client')}
                  disabled={!clientSignature}
                  className={`px-3 py-1.5 text-[10px] heavy-text uppercase tracking-wider border-2 border-black rounded-[10px] cursor-pointer transition-all flex items-center gap-1 ${
                    clientSignature 
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-[2px_2px_0_0_#000]' 
                      : 'bg-gray-100 text-gray-400 border-gray-300 opacity-60 cursor-not-allowed'
                  }`}
                  title="Save drawn client signature to your local preset list"
                >
                  <Sparkles size={11} /> Save Client to Presets
                </button>
                <button
                  type="button"
                  onClick={() => saveCurrentToLibrary('officer')}
                  disabled={!officerSignature}
                  className={`px-3 py-1.5 text-[10px] heavy-text uppercase tracking-wider border-2 border-black rounded-[10px] cursor-pointer transition-all flex items-center gap-1 ${
                    officerSignature 
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white shadow-[2px_2px_0_0_#000]' 
                      : 'bg-gray-100 text-gray-400 border-gray-300 opacity-60 cursor-not-allowed'
                  }`}
                  title="Save drawn officer signature to your local preset list"
                >
                  <Sparkles size={11} /> Save Officer to Presets
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearAllSignatures}
                className="px-3 py-1.5 bg-[#E63946] hover:bg-[#D62828] text-white text-[10px] heavy-text uppercase tracking-wider border-2 border-black rounded-[10px] cursor-pointer shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-1 active:translate-y-0.5"
                title="Reset both active signature grids immediately"
              >
                <Trash2 size={11} /> Reset All Active
              </button>
            </div>

            {/* Signature Presets Library Divider */}
            <div className="mt-6 pt-6 border-t-4 border-black relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white text-[8px] tracking-widest uppercase heavy-text px-3 py-0.5 rounded border border-black">
                Preset Storage & Tools
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                
                {/* Typed Handwriting & Upload Generator Column */}
                <div className="bg-slate-50 p-4 border-2 border-black rounded-[16px] shadow-[2.5px_2.5px_0_0_#000] flex flex-col justify-between">
                  <div>
                    <span className="text-xs heavy-text uppercase tracking-wider text-black block mb-2 font-bold font-sans">
                      ✍️ Generate Digital Signature
                    </span>
                    
                    <form onSubmit={handleCreateTypedSignature} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={typedSignText}
                          onChange={(e) => setTypedSignText(e.target.value)}
                          placeholder="Type Name (e.g., Jane Cooper)"
                          className="w-full text-xs p-2.5 border-2 border-black rounded-[12px] bg-white font-sans text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFB703]"
                          maxLength={35}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                        <div>
                          <label className="block text-[8px] heavy-text uppercase text-gray-500 mb-1">Assigned Role</label>
                          <select
                            value={presetRoleInput}
                            onChange={(e: any) => setPresetRoleInput(e.target.value)}
                            className="w-full p-2 border-2 border-black rounded-[8px] bg-white font-bold uppercase text-black"
                          >
                            <option value="general">General</option>
                            <option value="client">Client</option>
                            <option value="officer">Officer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] heavy-text uppercase text-gray-500 mb-1">Cursive Style</label>
                          <select
                            value={typedSignStyle}
                            onChange={(e) => setTypedSignStyle(Number(e.target.value))}
                            className="w-full p-2 border-2 border-black rounded-[8px] bg-white font-bold uppercase text-black"
                          >
                            <option value={1}>Elegante Cursive</option>
                            <option value={0}>Modern Sans</option>
                            <option value={2}>Monospace Type</option>
                            <option value={3}>Classic Serif</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!typedSignText.trim()}
                        className={`w-full py-2 bg-black text-white text-[10px] heavy-text uppercase tracking-wider rounded-[10px] border-2 border-black transition-all flex items-center justify-center gap-1.5 ${
                          typedSignText.trim() ? 'hover:bg-gray-900 cursor-pointer shadow-[2px_2px_0_0_#FFB703]' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={11} strokeWidth={3} /> Create Typed Preset
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/10">
                    <span className="text-[9px] heavy-text uppercase tracking-wider text-gray-500 block mb-1.5 font-sans">
                      📁 Import Scan File (.PNG / .JPG)
                    </span>
                    <label className="w-full py-2 bg-white hover:bg-gray-100 text-black text-[10px] heavy-text uppercase tracking-wider rounded-[10px] border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer transition-all flex justify-center items-center gap-1.5 text-center font-sans">
                      <UploadCloud size={11} /> Upload Image Signature
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadSignaturePreset}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Saved Library Column */}
                <div className="flex flex-col">
                  <span className="text-xs heavy-text uppercase tracking-wider text-black block mb-2 font-bold font-sans">
                    📚 Signature Library Presets ({signaturePresets.length})
                  </span>

                  <div className="border-2 border-black rounded-[16px] bg-[#FAF9F5] p-3 shadow-[2.5px_2.5px_0_0_#000] max-h-[195px] overflow-y-auto space-y-2 flex-grow">
                    {signaturePresets.length === 0 ? (
                      <div className="h-full flex flex-col justify-center items-center text-center p-4">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-sans">Empty Library Folder</span>
                        <p className="text-[9px] text-gray-400 leading-normal max-w-[200px] mt-1 font-sans">
                          No active signature presets. Draw above and save, import an image, or type custom ones to preserve and reuse signatures instantly.
                        </p>
                      </div>
                    ) : (
                      signaturePresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="p-2 border border-black rounded-[12px] bg-white flex flex-col gap-1.5 shadow-[1.5px_1.5px_0_0_rgba(0,0,0,0.15)] relative group hover:border-black transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-bold text-black uppercase tracking-wide truncate max-w-[140px]">
                                {preset.name}
                              </span>
                              <span className={`text-[7px] font-bold uppercase px-1 rounded-sm tracking-widest ${
                                preset.role === 'client' 
                                  ? 'bg-[#E3F2FD] text-[#0D47A1]' 
                                  : preset.role === 'officer' 
                                  ? 'bg-[#E8F5E9] text-[#1B5E20]' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {preset.role}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => deletePresetSignature(preset.id, preset.name)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer rounded"
                              title="Delete preset from library permanently"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>

                          <div className="h-[36px] bg-gray-50 border border-black/5 rounded-[6px] flex items-center justify-center p-1.5 relative overflow-hidden">
                            <img
                              src={preset.dataUrl}
                              alt="Signature preview"
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setClientSignature(preset.dataUrl);
                                logActivity('Preset Applied', `Applied "${preset.name}" as Client Approval`);
                              }}
                              className="flex-1 py-1 px-1.5 text-[8px] heavy-text text-black bg-gray-100 hover:bg-yellow-100 border border-black rounded-[6px] tracking-wider uppercase transition-all cursor-pointer text-center font-sans"
                            >
                              Apply Client
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOfficerSignature(preset.dataUrl);
                                logActivity('Preset Applied', `Applied "${preset.name}" as Officer Stamp`);
                              }}
                              className="flex-1 py-1 px-1.5 text-[8px] heavy-text text-black bg-gray-100 hover:bg-[#E3F2FD] border border-black rounded-[6px] tracking-wider uppercase transition-all cursor-pointer text-center font-sans"
                            >
                              Apply Officer
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Real-time Live Document Preview with VMS Logo */}
        <div className="space-y-6 lg:sticky lg:top-4">
          <div className="border-4 border-black rounded-[32px] bg-white p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)] text-[#2C3E50] overflow-hidden relative max-h-[85vh] overflow-y-auto">
            {/* Top branding bar */}
            <div className="flex justify-between items-start border-b-4 border-[#005a8c] pb-6 mb-6">
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-white border-2 border-black p-1 flex items-center justify-center rounded-[12px] shadow-[3px_3px_0_0_#000]">
                  <VmsLogo className="w-12 h-16" />
                </div>
                <div>
                  <h3 className="text-2xl heavy-text uppercase text-[#005a8c]">Inside VMS Group</h3>
                  <p className="text-[9px] heavy-text tracking-widest text-[#e62020]">PREMIUM DESIGN & STRUCTURAL WORKS</p>
                  <p className="text-[9px] text-[#7F8C8D] font-mono mt-0.5">SINCE 1989 | INTEGRATED SYSTEM</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block text-xs heavy-text uppercase tracking-widest px-3 py-1 bg-[#005a8c] text-white border-2 border-black rounded-[10px] mb-2 shadow-[2px_2px_0_0_#000]`}>
                  {docType}
                </span>
                <p className="text-xs font-light font-mono text-gray-700">DOC: {docNumber}</p>
                <p className="text-[10px] font-mono text-gray-500">Date: {docDate}</p>
              </div>
            </div>

            {/* Recipient meta panels */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-[#F8F9FA] p-4 border-2 border-black rounded-[20px]">
              <div>
                <h4 className="heavy-text text-[#005a8c] uppercase mb-1 border-b border-gray-300 pb-0.5">Sender Info</h4>
                <p className="font-light">INSIDE VMS PROJECTS LEDGER</p>
                <p className="text-[#7F8C8D]">HQs Complex Logistics Base</p>
                <p className="text-[#7F8C8D]">Email: help@vmsledger.in</p>
              </div>
              <div>
                <h4 className="heavy-text text-[#005a8c] uppercase mb-1 border-b border-gray-300 pb-0.5">Recipient Info</h4>
                <p className="font-light">{clientName || 'Unnamed Client'}</p>
                <p className="text-[#34495E] font-medium">{clientCompany || 'N/A'}</p>
                <p className="text-[#7F8C8D] truncate">{clientAddress || 'Address not listed'}</p>
                <p className="text-[#7F8C8D]">Tel: {clientContact || 'N/A'}</p>
              </div>
            </div>

            {/* Itemized Estimate lists */}
            <div className="space-y-2 mb-6 text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#005a8c] text-white border-2 border-black">
                     <th className="p-2 border-r border-black text-left uppercase">Segment</th>
                     <th className="p-2 border-r border-black text-left uppercase">Description Spec details</th>
                     <th className="p-2 border-r border-black text-center uppercase">Qty</th>
                     <th className="p-2 border-r border-black text-center uppercase">Rate</th>
                     <th className="p-2 text-right uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b-2 border-black bg-[#FFFFFF] hover:bg-[#F2F4F4]">
                      <td className="p-2 border-r border-black font-light uppercase text-[9px]">{it.phase}</td>
                      <td className="p-2 border-r border-black">
                        <div className="font-light">{it.name || 'Untitled item'}</div>
                        <div className="text-[10px] text-gray-500 leading-tight">{it.description}</div>
                      </td>
                      <td className="p-2 border-r border-black text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="p-2 border-r border-black text-center font-mono">₹{it.rate.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-light">₹{(it.quantity * it.rate).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ledger summary box */}
            <div className="flex flex-col md:flex-row justify-between pt-4 border-t-2 border-black border-dashed gap-4">
              <div className="flex-1 bg-yellow-50 p-3 border-2 border-black rounded-[16px] text-xs">
                 <h4 className="heavy-text text-[#005a8c] uppercase mb-1.5">Installment Terms</h4>
                 <div className="space-y-1">
                   {milestones.map((m, idx) => (
                     <div key={m.id} className="flex justify-between items-center text-[10px] font-medium">
                       <span>{idx+1}. {m.title} ({m.percentage}%):</span>
                       <span className="font-mono font-light">₹{Math.round(finalTotal * (m.percentage / 100)).toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
              </div>
              
              {/* Calculations ledger */}
              <div className="w-full md:w-64 space-y-1.5 text-xs text-right">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Subtotal:</span>
                  <span className="font-mono font-light">₹{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span className="font-medium">Discount Applied:</span>
                    <span className="font-mono font-light">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {transportCharges > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Logistics Transport:</span>
                    <span className="font-mono font-light">₹{Number(transportCharges).toLocaleString()}</span>
                  </div>
                )}
                {interiorDesignFee > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Design Consultation Fee:</span>
                    <span className="font-mono font-light">₹{Number(interiorDesignFee).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">GST ({gstPercentage}%):</span>
                  <span className="font-mono font-light">₹{gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-black font-light text-sm text-[#e62020] bg-red-50 p-1.5 rounded-[8px]">
                  <span>Total Due:</span>
                  <span className="font-mono">₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Notes Section Preview */}
            <div className="mt-6 bg-gray-50 p-4 border border-black rounded-[14px] text-[10px] font-mono">
               <span className="heavy-text text-[#005a8c] block uppercase mb-1">Preview Payment & Account Info:</span>
               <p className="whitespace-pre-wrap leading-relaxed text-gray-600">{paymentNotes}</p>
            </div>

            {/* Screenshots Attachments on Preview */}
            {screenshots.length > 0 && (
              <div className="mt-4 border-2 border-black rounded-[20px] p-3 bg-white">
                <span className="heavy-text text-[#e62020] text-[9px] tracking-widest block uppercase mb-2 font-bold flex items-center gap-1">
                   📎 Attached Voucher Proofs ({screenshots.length})
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((src, idx) => (
                    <div key={idx} className="border border-black rounded-[8px] overflow-hidden bg-gray-50 aspect-[4/3]">
                      <img src={src} className="w-full h-full object-cover" alt="Receipt voucher proof" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Sign-off Live Preview */}
            <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 grid grid-cols-2 gap-8 text-center text-black">
              <div className="flex flex-col items-center justify-end min-h-[50px]">
                {clientSignature ? (
                  <img src={clientSignature} className="max-h-[44px] object-contain mb-1" alt="Client dynamic signature" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-8 w-full bg-slate-50 border border-dashed border-gray-200 rounded-[10px] flex items-center justify-center text-[8px] uppercase text-gray-400 tracking-wider font-mono">
                    Awaiting Sign-off
                  </div>
                )}
                <div className="w-full border-t border-black my-1"></div>
                <span className="text-[9px] heavy-text uppercase tracking-widest text-[#7F8C8D]">Client Signature / Approval</span>
              </div>

              <div className="flex flex-col items-center justify-end min-h-[50px]">
                {officerSignature ? (
                  <img src={officerSignature} className="max-h-[44px] object-contain mb-1" alt="Officer dynamic signature" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-8 w-full bg-slate-50 border border-dashed border-gray-200 rounded-[10px] flex items-center justify-center text-[8px] uppercase text-gray-400 tracking-wider font-mono">
                    Awaiting Officer Stamp
                  </div>
                )}
                <div className="w-full border-t border-black my-1"></div>
                <span className="text-[9px] heavy-text uppercase tracking-widest text-[#7F8C8D]">Authorized VMS Officer</span>
              </div>
            </div>
          </div>

          {/* Google Drive Integration Panel */}
          <div className="p-5 border-3 border-black rounded-[20px] bg-white relative overflow-hidden shadow-[4px_4px_0_0_#000]">
            <div className="absolute top-0 right-0 bg-[#4285F4] text-white text-[9px] heavy-text uppercase tracking-widest px-3 py-1 rounded-bl-[12px] border-b-2 border-l-2 border-black">
              Google Drive Sync
            </div>
            
            <h3 className="text-lg heavy-text uppercase tracking-wider mb-2 flex items-center gap-2 text-black">
              <UploadCloud className="text-[#4285F4]" size={20} /> Google Drive Cloud Backup
            </h3>
            
            {isDriveAuthed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 border-2 border-black rounded-[12px] font-mono text-black">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#4285F4]">CONNECTED ACCOUNT</span>
                    <span className="text-gray-600 text-[10px] break-all">{driveUser?.email || "Connected"}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 border border-black rounded-[8px] text-[10px] heavy-text uppercase tracking-widest cursor-pointer transition-all font-sans"
                  >
                    Disconnect
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleUploadToDrive}
                  disabled={isDriveUploading}
                  className="w-full py-3 bg-[#4285F4] hover:bg-[#357AE8] text-white rounded-[16px] border-3 border-black text-xs heavy-text uppercase tracking-wider transition-all flex justify-center items-center gap-2 cursor-pointer shadow-[3px_3px_0_0_#000] active:translate-y-0.5"
                >
                  {isDriveUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Backing up to Google Drive...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Save PDF directly to Google Drive
                    </>
                  )}
                </button>

                {driveUploadSuccess && (
                  <div className="bg-[#EFFFF6] border-2 border-[#10B981] p-3 rounded-[16px] text-xs flex flex-col gap-1.5 text-black">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-[#10B981] shrink-0 mt-0.5" size={16} />
                      <div>
                        <span className="font-bold block uppercase text-[#065F46]">Upload Successful!</span>
                        <p className="text-gray-600 mt-0.5 font-medium">
                          The document has been successfully backed up in folder <strong className="font-mono bg-white px-1 border border-black/10 rounded text-black">"Inside VMS Invoices"</strong>.
                        </p>
                      </div>
                    </div>
                    {driveFileLink && (
                      <a 
                        href={driveFileLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="self-end text-[10px] bg-[#10B981] text-white px-3 py-1.5 heavy-text rounded-[8px] hover:bg-[#059669] border border-black uppercase tracking-widest text-center flex items-center gap-1 cursor-pointer transition-all"
                      >
                         View on Google Drive <ArrowRight size={10} />
                      </a>
                    )}
                  </div>
                )}

                {driveUploadError && (
                  <div className="bg-[#FFB703] p-3 text-xs border-2 border-black text-center font-bold uppercase rounded-[12px] text-black">
                    ⚠️ UPLOAD ERROR: {driveUploadError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-600 uppercase tracking-wide leading-relaxed">
                  Link your Google account to back up and sync this {docType} directly onto your Google Drive storage. It creates a dedicated directory inside your cloud storage.
                </p>
                
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="w-full py-3 bg-white hover:bg-gray-50 text-black rounded-[16px] border-3 border-black text-xs heavy-text uppercase tracking-wider transition-all flex justify-center items-center gap-3 cursor-pointer shadow-[3px_3px_0_0_#000] active:translate-y-0.5 font-sans"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  Sign in with Google Account
                </button>
                
                {driveUploadError && (
                  <div className="bg-[#FFB703] p-3 text-xs border-2 border-black text-center font-bold uppercase rounded-[12px] text-black">
                    ⚠️ AUTH ERROR: {driveUploadError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Claymorphic Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={generatePDF}
              className="py-4 bg-[#1D3557] hover:bg-[#005a8c] text-white rounded-[16px] border-3 border-black text-sm heavy-text uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-[4px_4px_0_0_#1D3557_inset] cursor-pointer"
              style={{
                boxShadow: '4px 4px 0px 0px #000000, inset 4px 4px 6px rgba(255, 255, 255, 0.35), inset -4px -4px 6px rgba(0, 0, 0, 0.2)'
              }}
            >
              <Download size={18}/> Download PDF
            </button>
            <button 
              type="button"
              onClick={generateWord}
              className="py-4 bg-[#FFB703] hover:bg-[#e2a303] text-black rounded-[16px] border-3 border-black text-sm heavy-text uppercase tracking-wider transition-all flex justify-center items-center gap-2 cursor-pointer"
              style={{
                boxShadow: '4px 4px 0px 0px #000000, inset 4px 4px 6px rgba(255, 255, 255, 0.5), inset -4px -4px 6px rgba(0, 0, 0, 0.15)'
              }}
            >
              <FileText size={18}/> Download Word (.doc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
