import React, { useState, useEffect, useMemo } from 'react';
import { getDateRanges } from '../services/api';
import { 
  FileText, Download, Mail, Eye, 
  RotateCcw, CheckCircle, X, Loader2,
  Calendar as CalendarIcon, FileStack, AlertCircle, FileType, ChevronDown,
  Info, Sparkles, Send
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format, parse, isWithinInterval, startOfDay } from 'date-fns';
import { cn } from './ui/utils';

interface ReportsPageProps { 
  dateRange: string; 
  buId?: number;
}

type Stage = 'idle' | 'generating' | 'viewing' | 'error';
type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ReportsPage({ dateRange, buId }: ReportsPageProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [slides, setSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [buName, setBuName] = useState('Adani');
  const [slideData, setSlideData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'image' | 'web'>('image');
  const [showEmail, setShowEmail] = useState(false);
  const [showDownloadChoice, setShowDownloadChoice] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [email, setEmail] = useState('');
  const [availableRanges, setAvailableRanges] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>(dateRange || '');
  const [fetchingRanges, setFetchingRanges] = useState(false);
  const [downloadRange, setDownloadRange] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDownloadCalendarOpen, setIsDownloadCalendarOpen] = useState(false);

  useEffect(() => {
    if (selectedRange) setDownloadRange(selectedRange);
  }, [selectedRange]);

  useEffect(() => {
    async function fetchRanges() {
      if (!buId) return;
      setFetchingRanges(true);
      try {
        const data = await getDateRanges(buId);
        if (data && Array.isArray(data)) {
          // Normalize to array of strings for easier processing
          const normalized = data.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.DateRange) return item.DateRange;
            return null;
          }).filter((val): val is string => val !== null && val.trim() !== '');

          setAvailableRanges(normalized);
          
          // Logic to establish the best selected range:
          if (normalized.includes(dateRange)) {
            setSelectedRange(dateRange);
          } else if (normalized.length > 0) {
            setSelectedRange(normalized[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch date ranges for reports:", err);
      } finally {
        setFetchingRanges(false);
      }
    }
    fetchRanges();
  }, [buId, dateRange]);

  // The reportISO should be just the date from the dateRange prop
  // If dateRange is "latest" or a range like "27-Feb-26 vs 06-Mar-26", 
  // the backend knows how to handle it if we pass it as 'date' param.
  const { reportISO, displayDate } = useMemo(() => {
    if (!selectedRange || selectedRange === '') return { reportISO: 'latest', displayDate: 'Current Week' };
    
    if (selectedRange.includes(' vs ')) {
      const parts = selectedRange.split(' vs ');
      return { reportISO: selectedRange, displayDate: parts[1] };
    }
    
    return { reportISO: selectedRange, displayDate: selectedRange === 'latest' ? 'Current Week' : selectedRange };
  }, [selectedRange]);

  // Pre-calculate parsed date intervals for the calendar
  const parsedIntervals = useMemo(() => {
    return availableRanges.map(dr => {
      if (!dr || !dr.includes(' vs ')) return null;
      try {
        const [startStr, endStr] = dr.split(' vs ');
        return {
          start: startOfDay(parse(startStr, 'dd-MMM-yy', new Date())),
          end: startOfDay(parse(endStr, 'dd-MMM-yy', new Date())),
          original: dr
        };
      } catch (e) { return null; }
    }).filter((x): x is {start: Date, end: Date, original: string} => x !== null);
  }, [availableRanges]);

  const selectedInterval = useMemo(() => {
    return parsedIntervals.find(i => i.original === selectedRange);
  }, [parsedIntervals, selectedRange]);

  const downloadInterval = useMemo(() => {
    return parsedIntervals.find(i => i.original === downloadRange);
  }, [parsedIntervals, downloadRange]);

  const handleAction = async (action: 'view' | 'generate') => {
    if (!reportISO) return;
    setStage('generating');
    setErrorMsg('');
    try {
      const endpoint = action === 'view' ? 'preview-slides' : 'preview-pdf';
      const response = await fetch(`/shareholding-pattern/api/reports/${endpoint}?date=${encodeURIComponent(reportISO)}&bu_id=${buId || 1}`);
      if (!response.ok) {
          const body = await response.json();
          throw new Error(body.detail || 'Failed to connect to report engine');
      }
      
      if (action === 'view') {
        const data = await response.json();
        if (data.slides && data.slides.length > 0) {
          setSlides(data.slides);
          setBuName(data.bu_name || 'Adani');
          setCurrentSlide(0);
          setViewMode('image');
          setStage('viewing');
        } else if (data.data) {
          setSlideData(data.data);
          setBuName(data.bu_name || 'Adani');
          // Mock slides based on data presence
          const mockSlides = ['Title', 'TOC'];
          if (data.data.institutional?.length) mockSlides.push('Institutional');
          if (data.data.buyers?.length) mockSlides.push('Buyers');
          if (data.data.sellers?.length) mockSlides.push('Sellers');
          if (data.data.entry?.length || data.data.exit?.length) mockSlides.push('EntryExit');
          if (data.data.fii_fpi?.length) mockSlides.push('FII');
          if (data.data.mf_active?.length || data.data.mf_passive?.length) mockSlides.push('MF');
          if (data.data.insurance_pf?.length) mockSlides.push('Insurance');
          if (data.data.aif?.length) mockSlides.push('AIF');
          mockSlides.push('ThankYou');
          
          setSlides(mockSlides);
          setCurrentSlide(0);
          setViewMode('web');
          setStage('viewing');
        } else {
          throw new Error('No slides or data generated');
        }
      } else {
        // Just triggering generation logic if needed, but 'view' handles the slide logic now
        setStage('idle');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed');
      setStage('error');
    }
  };

  const handleDownload = async (format: 'pdf' | 'pptx', overrideRange?: string) => {
    setShowDownloadChoice(false);
    try {
      const endpoint = format === 'pdf' ? 'download-pdf' : 'download-pptx';
      const rangeToUse = overrideRange || reportISO;
      const response = await fetch(`/shareholding-pattern/api/reports/${endpoint}?date=${encodeURIComponent(rangeToUse)}&bu_id=${buId || 1}`);
      if (!response.ok) throw new Error(`Download failed`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rangeName = overrideRange || displayDate;
      a.download = `Weekly_Report_${rangeName?.replace(/-/g, '_') || 'latest'}_${buName.replace(/ /g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download Error`);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !reportISO) return;
    setEmailStatus('sending');
    try {
      const response = await fetch(`/shareholding-pattern/api/reports/send-email?bu_id=${buId || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: reportISO, email })
      });
      if (!response.ok) throw new Error('Email delivery failed');
      setEmailStatus('sent');
    } catch (err) {
      setEmailStatus('error');
    }
  };

  const onCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const selected = startOfDay(date);
    const match = parsedIntervals.find(i => isWithinInterval(selected, { start: i.start, end: i.end }));

    if (match) {
      setSelectedRange(match.original);
      setIsCalendarOpen(false);
    } else {
      alert(`No reporting period found for ${format(date, 'PPP')}. Please select a date within an available range.`);
    }
  };

  const onDownloadCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const selected = startOfDay(date);
    const match = parsedIntervals.find(i => isWithinInterval(selected, { start: i.start, end: i.end }));

    if (match) {
      setDownloadRange(match.original);
      setIsDownloadCalendarOpen(false);
    } else {
      alert(`No reporting period found for ${format(date, 'PPP')}. Please select a date within an available range.`);
    }
  };

  return (
    <div className="w-full h-full space-y-6 animate-in fade-in duration-500">
      {/* Control Card - Full Width Adani Sidebar-to-Sidebar style */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-xl bg-white dark:bg-slate-900 border">
        <div className="bg-[#002B5C] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white/90" />
            <h2 className="text-white font-black text-sm tracking-widest uppercase">Weekly Shareholder Report</h2>
          </div>
          <Badge className="bg-white/10 text-white border-none text-[10px] font-black px-3 py-1">
            {displayDate}
          </Badge>
        </div>
        
        <CardContent className="p-8">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
            
            {/* Date Selection and Filename Block */}
            <div className="flex flex-col md:flex-row items-center gap-6 flex-1 min-w-0">
               {/* Date Selector */}
                <div className="w-full md:w-80 shrink-0">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reporting Period</Label>
                  <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <Button 
                      onClick={() => setIsCalendarOpen(true)}
                      variant="outline" 
                      className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-[#002B5C] dark:text-sky-400 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-[#002B5C] dark:text-sky-400">
                          {displayDate}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                    <DialogContent className="sm:max-w-md p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
                      <div className="bg-[#002B5C] p-6 text-white text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Interactive Selection</p>
                        <h3 className="text-xl font-black">Select Reporting Week</h3>
                        <p className="text-white/50 text-xs mt-1">Select any date to pick the full reporting week</p>
                      </div>
                      
                      <div className="p-4 flex flex-col items-center">
                        <Calendar 
                          mode="single"
                          selected={selectedInterval?.start}
                          onSelect={onCalendarSelect}
                          initialFocus
                          className="bg-white mx-auto scale-110 my-4"
                          modifiers={{
                            selectedRange: selectedInterval ? { from: selectedInterval.start, to: selectedInterval.end } : [],
                            availableRange: parsedIntervals.map(i => ({ from: i.start, to: i.end }))
                          }}
                          modifiersClassNames={{
                            selectedRange: "bg-[#002B5C] text-white rounded-none first:rounded-l-md last:rounded-r-md !opacity-100",
                            availableRange: "font-black text-[#002B5C] hover:bg-sky-50"
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
               </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-4 flex-1 min-w-0 h-20">
                  <div className="w-10 h-10 rounded bg-[#002B5C]/10 flex items-center justify-center">
                    <FileType className="w-6 h-6 text-[#002B5C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Generated Output</p>
                    <p className="text-sm font-bold text-[#002B5C] dark:text-sky-400 truncate">
                      Weekly_Report_{displayDate?.replace(/-/g, '_') || 'latest'}_{buName.replace(/ /g, '_')}.pptx
                    </p>
                  </div>
               </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => handleAction('view')}
                disabled={stage === 'generating'}
                className="h-12 px-6 bg-[#002B5C] hover:bg-[#001a4d] text-white font-black text-xs gap-3 rounded transition-all active:scale-95"
              >
                {stage === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Generate & Preview
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowEmail(true)}
                className="h-12 px-5 border-slate-200 dark:border-slate-800 text-[#002B5C] dark:text-sky-400 font-black text-xs gap-2 rounded hover:bg-slate-50 hover:text-[#002B5C] transition-all"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowDownloadChoice(true)}
                className="h-12 px-5 border-slate-200 dark:border-slate-800 text-[#002B5C] dark:text-sky-400 font-black text-xs gap-2 rounded hover:bg-slate-50 hover:text-[#002B5C] transition-all"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>

          {stage === 'error' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-black">
              <AlertCircle className="w-5 h-5" />
              {errorMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {stage === 'viewing' && slides.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-2">
          <div className="bg-[#002B5C] px-6 py-3 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <Eye className="w-4 h-4 text-sky-400" />
              <div className="flex items-center gap-3">
                <span className="text-white font-black text-[10px] uppercase tracking-widest text-white/70">Presentation View</span>
                <Badge variant="outline" className="text-[9px] border-white/20 text-white/50 h-5">
                  SLIDE {currentSlide + 1} OF {slides.length}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setStage('idle')} className="text-white/50 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="relative p-6 flex flex-col items-center">
             {/* Slide Navigation Overlay */}
             <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between items-center z-20 pointer-events-none">
                <Button 
                  variant="secondary" size="icon" 
                  className="rounded-full shadow-xl pointer-events-auto h-12 w-12 bg-white/90 hover:bg-white text-[#002B5C] border border-slate-100"
                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                >
                  <ChevronDown className="w-6 h-6 rotate-90" />
                </Button>
                <Button 
                  variant="secondary" size="icon" 
                  className="rounded-full shadow-xl pointer-events-auto h-12 w-12 bg-white/90 hover:bg-white text-[#002B5C] border border-slate-100"
                  onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                  disabled={currentSlide === slides.length - 1}
                >
                  <ChevronDown className="w-6 h-6 -rotate-90" />
                </Button>
             </div>

             {/* Slide Image / Web Content Wrapper */}
             <div className="w-full max-w-5xl bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200 aspect-[16/9] relative">
                {viewMode === 'image' ? (
                  <img 
                    src={`data:image/png;base64,${slides[currentSlide]}`} 
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-contain select-none pointer-events-none"
                  />
                ) : (
                  <WebSlidePreview 
                    type={slides[currentSlide]} 
                    data={slideData} 
                    buName={buName} 
                    displayDate={displayDate}
                  />
                )}
             </div>

             {/* Slide Indicators */}
             <div className="flex items-center gap-2 mt-6 overflow-x-auto max-w-full py-2 px-1">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`transition-all h-2 rounded-full ${idx === currentSlide ? 'w-8 bg-[#002B5C]' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
             </div>
          </div>
        </Card>
      )}

      {(slides.length === 0 || stage === 'idle') && (
        <div className="py-24 text-center rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/20">
           <div className="w-20 h-20 bg-white dark:bg-slate-900 shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-800">
              <FileStack className="w-10 h-10 text-[#002B5C] dark:text-sky-500 opacity-20" />
           </div>
           <h3 className="text-[#002B5C] dark:text-sky-300 font-black text-lg tracking-tight">Report Engine Ready</h3>
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Generate report for global reporting period</p>
        </div>
      )}

      <Dialog open={showDownloadChoice} onOpenChange={setShowDownloadChoice}>
        <DialogContent className="sm:max-w-md p-8 rounded-2xl border-none shadow-2xl bg-white">
          <DialogTitle className="text-center font-black text-xl text-[#002B5C] mb-2">Export Report</DialogTitle>
          <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Select period and file format</p>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Download Period</Label>
              <Dialog open={isDownloadCalendarOpen} onOpenChange={setIsDownloadCalendarOpen}>
                <Button 
                  onClick={() => setIsDownloadCalendarOpen(true)}
                  variant="outline" 
                  className="w-full h-12 bg-slate-50 border-slate-200 flex items-center justify-between px-4 hover:bg-slate-100 transition-all font-bold text-[#002B5C]"
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5" />
                    <span>{downloadRange.includes(' vs ') ? downloadRange.replace(' vs ', ' to ') : (downloadRange || 'Select Period')}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
                <DialogContent className="sm:max-w-md p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
                  <div className="bg-[#002B5C] p-4 text-white text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Target Week</p>
                    <p className="text-sm font-bold">Pick date for export</p>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    <Calendar 
                      mode="single"
                      selected={downloadInterval?.start}
                      onSelect={onDownloadCalendarSelect}
                      initialFocus
                      className="bg-white"
                      modifiers={{
                        selectedRange: downloadInterval ? { from: downloadInterval.start, to: downloadInterval.end } : [],
                        availableRange: parsedIntervals.map(i => ({ from: i.start, to: i.end }))
                      }}
                      modifiersClassNames={{
                        selectedRange: "bg-[#002B5C] text-white rounded-none first:rounded-l-md last:rounded-r-md !opacity-100",
                        availableRange: "font-black text-[#002B5C] hover:bg-sky-50"
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="flex flex-col h-auto py-6 rounded-xl border-slate-100 hover:bg-slate-50 transition-all group" onClick={() => handleDownload('pdf', downloadRange)}>
                  <FileType className="w-10 h-10 text-rose-500 mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-black text-[#002B5C]">PDF</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-auto py-6 rounded-xl border-slate-100 hover:bg-slate-50 transition-all group" onClick={() => handleDownload('pptx', downloadRange)}>
                  <FileText className="w-10 h-10 text-orange-500 mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-black text-[#002B5C]">PPTX</span>
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmail} onOpenChange={setShowEmail}>
        <DialogContent className="sm:max-w-md p-10 rounded-2xl border-none shadow-2xl bg-white">
          {emailStatus === 'sent' ? (
              <div className="text-center py-6 animate-in zoom-in duration-300">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="font-black text-xl text-slate-900 tracking-tight">Email Sent</h3>
                <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest leading-relaxed">The report has been successfully<br/>distributed to the recipient</p>
                <Button className="mt-8 w-full bg-[#002B5C] h-12 rounded font-black text-sm" onClick={() => { setShowEmail(false); setEmailStatus('idle'); }}>Close</Button>
              </div>
          ) : (
            <>
                <DialogTitle className="font-black text-2xl text-[#002B5C] tracking-tight mb-2">Email Report</DialogTitle>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Send PDF copy via investor relations</p>
                <form onSubmit={handleSendEmail} className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recipient</Label>
                        <Input 
                            type="email" required placeholder="investor.relations@adani.com"
                            className="h-14 bg-slate-50 border-none rounded font-bold px-4"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button type="button" variant="ghost" className="flex-1 h-14 font-black rounded text-slate-400" onClick={() => setShowEmail(false)}>Cancel</Button>
                        <Button type="submit" className="flex-[2] bg-[#002B5C] hover:bg-[#001a4d] h-14 rounded font-black text-sm text-white" disabled={emailStatus === 'sending'}>
                            {emailStatus === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 mr-3" />}
                            {emailStatus === 'sending' ? 'Sending' : 'Send'}
                        </Button>
                    </div>
                </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebSlidePreview({ type, data, buName, displayDate }: { type: string, data: any, buName: string, displayDate: string }) {
  const renderTable = (rows: any[], columns: string[], title: string) => (
    <div className="w-full h-full flex flex-col p-8 bg-white">
      <div className="bg-[#002B5C] text-white p-4 mb-4 flex justify-between items-center h-12">
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
        <span className="text-[10px] opacity-70">{displayDate}</span>
      </div>
      <div className="flex-1 overflow-hidden border border-slate-200">
        <table className="w-full text-[9px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map(col => (
                <th key={col} className="p-1.5 text-left font-black text-[#002B5C] uppercase">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {columns.map(col => {
                  const val = row[col] || row[col.replace(/ /g, '')] || '';
                  const isChange = col.toLowerCase().includes('change') || col.toLowerCase().includes('bought') || col.toLowerCase().includes('sold');
                  const colorClass = isChange ? (parseFloat(val) > 0 ? 'text-green-600' : parseFloat(val) < 0 ? 'text-red-600' : '') : '';
                  return <td key={col} className={cn("p-1 font-medium", colorClass)}>{val}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between items-end border-t border-slate-100 pt-2 h-8">
        <span className="text-[8px] font-bold text-[#002B5C]">{buName} Portfolio</span>
        <span className="text-[8px] text-slate-400">Page 1</span>
      </div>
    </div>
  );

  switch (type) {
    case 'Title':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-20 bg-gradient-to-br from-[#002B5C] to-[#001a4d] text-white text-center">
          <div className="w-24 h-24 mb-10 bg-white/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white/50" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase">{buName} Portfolio</h1>
          <h2 className="text-xl font-bold opacity-60 uppercase tracking-[0.3em]">Weekly Shareholder Movement</h2>
          <div className="mt-20 px-8 py-3 bg-white/10 rounded-full text-sm font-black tracking-widest">
            {displayDate}
          </div>
        </div>
      );
    case 'TOC':
      return (
        <div className="w-full h-full p-16 bg-white">
          <h3 className="text-2xl font-black text-[#002B5C] mb-10 pb-4 border-b-4 border-slate-100">Table of Contents</h3>
          <div className="space-y-4">
            {['Top 20 Institutional Shareholders', 'Top 20 Buyers', 'Top 20 Sellers', 'New Entry / Exits', 'Top 10 FIIs & FPIs', 'Top 10 MFs', 'Top 10 Insurance & PFs', 'Top 10 AIFs'].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <span className="w-8 h-8 rounded bg-[#002B5C]/10 flex items-center justify-center text-[#002B5C] font-black text-xs">{i+1}</span>
                <span className="text-lg font-bold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'Institutional':
      return renderTable(data.institutional || [], ['Rank', 'Shareholder Name', 'Category', 'Holding %', 'Change %'], 'Top 20 Institutional Shareholders');
    case 'Buyers':
      return renderTable(data.buyers || [], ['Rank', 'Shareholder Name', 'Category', 'Shares Bought', 'Current%'], 'Top 20 Buyers During the Week');
    case 'Sellers':
      return renderTable(data.sellers || [], ['Rank', 'Shareholder Name', 'Category', 'Shares Sold', 'Current%'], 'Top 20 Sellers During the Week');
    case 'EntryExit':
       return (
         <div className="w-full h-full flex flex-col p-8 bg-white overflow-hidden">
            <div className="bg-[#002B5C] text-white p-4 mb-4 h-12 flex items-center"><h3 className="text-sm font-bold uppercase tracking-widest">New Entry / Exits</h3></div>
            <div className="flex gap-4 flex-1 min-h-0">
               <div className="flex-1 flex flex-col min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-green-600 mb-2">New Entries</h4>
                  <div className="flex-1 border border-slate-100 overflow-hidden text-[8px] p-2">
                     {data.entry?.map((e:any, i:number) => <div key={i} className="py-1 border-b">{e.ShareholderName || e.Name}</div>)}
                  </div>
               </div>
               <div className="flex-1 flex flex-col min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-red-600 mb-2">New Exits</h4>
                  <div className="flex-1 border border-slate-100 overflow-hidden text-[8px] p-2">
                     {data.exit?.map((e:any, i:number) => <div key={i} className="py-1 border-b">{e.ShareholderName || e.Name}</div>)}
                  </div>
               </div>
            </div>
         </div>
       );
    case 'FII':
      return renderTable(data.fii_fpi || [], ['Rank', 'Shareholder Name', 'Holding %', 'Change %'], "Top 10 FII's & FPI's");
    case 'MF':
      return renderTable(data.mf_active || [], ['Rank', 'Shareholder Name', 'Holding %', 'Change %'], "Top 10 MF's (Active & Passive)");
    case 'Insurance':
      return renderTable(data.insurance_pf || [], ['Rank', 'Shareholder Name', 'Holding %', 'Change %'], "Top 10 Insurance & PFs");
    case 'AIF':
      return renderTable(data.aif || [], ['Rank', 'Shareholder Name', 'Holding %', 'Change %'], "Top 10 AIFs");
    case 'ThankYou':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-20 bg-[#002B5C] text-white text-center">
          <h1 className="text-6xl font-black mb-4 italic tracking-tighter uppercase">Thank You</h1>
          <div className="w-20 h-1 bg-white/30 my-6"></div>
          <p className="text-sm font-bold opacity-60 tracking-[0.5em] uppercase">{buName} Investor Relations</p>
        </div>
      );
    default:
      return <div className="p-20 text-center">Loading Preview...</div>;
  }
}
