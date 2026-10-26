import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CertificateSnapshot } from '../types';
import { Download, Printer, RotateCw, AlertTriangle, ShieldCheck, ZoomIn, Maximize2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toJpeg, getFontEmbedCSS } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CertificateTheme, CertificatePatternLayer, getCertificateTheme } from './certificateThemes';

// A4 landscape at 96dpi — the single design canvas used for screen, PDF and print.
const A4_W = 1123;
const A4_H = 794;

const DANGER = '#e11d48';
const DANGER_SOFT = 'rgba(225, 29, 72, 0.12)';

interface CertificateRendererProps {
  serialNumber: string;
  verificationId: string;
  issueDate: string;
  completionDate?: string;
  status: 'VALID' | 'REVOKED';
  revocationReason?: string;
  snapshot: CertificateSnapshot;
  qrCodeDataUrl: string;
  verificationUrl?: string;
  showControls?: boolean;
}

/** Makes sure every certificate typeface is decoded before we rasterise / print. */
const waitForCertificateFonts = async () => {
  try {
    const specs = [
      '700 32px "Dancing Script"',
      '600 32px "Dancing Script"',
      '400 32px "Alex Brush"',
      '700 32px "Cinzel"',
      '600 32px "Playfair Display"',
      'italic 600 32px "Playfair Display"',
      '600 14px "Plus Jakarta Sans"',
      '800 14px "Plus Jakarta Sans"',
      '400 12px "JetBrains Mono"',
      '600 12px "Fira Code"',
    ];
    await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => undefined)));
    await document.fonts.ready;
  } catch {
    /* font loading diagnostics are non-fatal */
  }
};

export const CertificateRenderer: React.FC<CertificateRendererProps> = ({
  serialNumber,
  issueDate,
  status,
  revocationReason,
  snapshot,
  qrCodeDataUrl,
  showControls = true,
}) => {
  const { student, course, grading, institute, template } = snapshot;

  const theme = getCertificateTheme(template?.themeStyle);
  const isTech = theme.layout === 'tech';
  const isPrestige = theme.layout === 'prestige';

  const isCandidateEligible =
    snapshot.isEligibleForCertificate !== undefined
      ? snapshot.isEligibleForCertificate
      : grading.isPassed && grading.overallPercentage >= (grading.passingPercentage ?? 50);

  const accent = isCandidateEligible ? theme.accent : DANGER;
  const accent2 = isCandidateEligible ? theme.accent2 : DANGER;
  const accentSoft = isCandidateEligible ? theme.accentSoft : DANGER_SOFT;
  const ink = theme.ink;
  const inkSoft = theme.inkSoft;
  const inkFaint = theme.inkFaint;

  const instructorName = institute?.instructorName || 'M.Moiz Raza';
  const instructorTitle = institute?.instructorTitle || 'Course Instructor';
  const instructorSignature = institute?.instructorSignatureUrl || 'M. Moiz Raza';
  const instituteName = institute?.name || 'Tech For You';
  const accreditation =
    institute?.accreditationDetails || 'Centre of Advanced Software Engineering & Certified Computing';

  const [activeSide, setActiveSide] = useState<'front' | 'back'>(isCandidateEligible ? 'front' : 'back');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('/logo.png');
  const [fitScale, setFitScale] = useState(1);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const fitWrapRef = useRef<HTMLDivElement>(null);

  // Bake the logo into a data URL so html-to-image never taints the canvas.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setLogoDataUrl(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        console.warn('Could not convert logo to data URL:', e);
      }
    };
    img.src = '/logo.png';
  }, []);

  // The sheet is always laid out at exactly A4 landscape and scaled down to fit.
  useEffect(() => {
    const el = fitWrapRef.current;
    if (!el) return;
    const update = () => setFitScale(Math.min(1, el.clientWidth / A4_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = zoomMode === 'full' ? 1 : fitScale;

  /** Rasterise one sheet at full A4 resolution with fonts embedded. */
  const captureSheet = useCallback(async (el: HTMLElement, backgroundColor: string): Promise<string> => {
    const scaler = el.closest('[data-certificate-scaler]') as HTMLElement | null;
    const previousTransform = scaler?.style.transform ?? '';
    if (scaler) scaler.style.transform = 'none';

    // The inactive side is display:none — it must be laid out before capture,
    // otherwise it rasterises as a blank image.
    const wasHidden = el.classList.contains('hidden');
    const previousDisplay = el.style.display;
    if (wasHidden) {
      el.classList.remove('hidden');
      el.style.display = 'block';
      void el.offsetHeight; // force the browser to lay the sheet out now
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    try {
      await waitForCertificateFonts();

      let fontEmbedCSS: string | undefined;
      try {
        fontEmbedCSS = await getFontEmbedCSS(el);
      } catch (fontErr) {
        console.warn('Font embedding unavailable, falling back to declared faces:', fontErr);
      }

      const baseOptions = {
        width: A4_W,
        height: A4_H,
        pixelRatio: 2.5,
        quality: 0.95,
        backgroundColor,
      };

      try {
        return await toJpeg(el, {
          ...baseOptions,
          ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
        });
      } catch (firstErr) {
        console.warn('Primary capture failed, retrying without embedded webfonts:', firstErr);
        return await toJpeg(el, { ...baseOptions, skipFonts: true });
      }
    } catch (err) {
      console.warn('html-to-image failed, falling back to html2canvas:', err);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor,
      });
      return canvas.toDataURL('image/jpeg', 0.95);
    } finally {
      if (scaler) scaler.style.transform = previousTransform;
      if (wasHidden) {
        el.style.display = previousDisplay;
        el.classList.add('hidden');
      }
    }
  }, []);

  /** Strictly 2-page A4 landscape PDF: page 1 certificate, page 2 transcript. */
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setExportError('');
    const frontEl = frontRef.current;
    const backEl = backRef.current;
    if (!frontEl || !backEl) {
      setIsExporting(false);
      return;
    }

    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.setProperties({
        title: `Certificate ${serialNumber}`,
        subject: course.title,
        author: instituteName,
        creator: 'Tech For You Certificate System',
      });

      const frontImg = await captureSheet(frontEl, '#ffffff');
      pdf.addImage(frontImg, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

      pdf.addPage('a4', 'landscape');
      const backImg = await captureSheet(backEl, '#ffffff');
      pdf.addImage(backImg, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

      pdf.save(`Certificate-${serialNumber}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportError('PDF export failed. Use Print → Save as PDF as a fallback.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJPG = async (side: 'front' | 'back') => {
    setIsExporting(true);
    setExportError('');
    const el = side === 'front' ? frontRef.current : backRef.current;
    if (!el) {
      setIsExporting(false);
      return;
    }
    try {
      const dataUrl = await captureSheet(el, '#ffffff');
      const link = document.createElement('a');
      link.download = `Certificate-${serialNumber}-${side === 'front' ? 'CERTIFICATE' : 'TRANSCRIPT'}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
      setExportError('Image export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /** Prints only the certificate sheets, at true A4 landscape, with fonts loaded. */
  const handlePrint = async () => {
    const frontEl = frontRef.current;
    const backEl = backRef.current;
    if (!frontEl || !backEl) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    const existing = document.getElementById('certificate-print-iframe');
    if (existing && document.body.contains(existing)) document.body.removeChild(existing);

    const iframe = document.createElement('iframe');
    iframe.id = 'certificate-print-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.origin}/" />
          <title>Tech For You — Certificate ${serialNumber}</title>
          ${styleTags}
          <style>
            @page { size: A4 landscape; margin: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-page-sheet {
              width: 297mm !important;
              height: 210mm !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-page-sheet:last-child { page-break-after: avoid !important; break-after: avoid !important; }
            .print-page-sheet > .certificate-print-page {
              width: 297mm !important;
              height: 210mm !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div class="print-page-sheet">${frontEl.outerHTML}</div>
          <div class="print-page-sheet">${backEl.outerHTML}</div>
        </body>
      </html>`);
    doc.close();

    const win = iframe.contentWindow;
    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const timer = setTimeout(done, 4000);
        const fonts = win?.document.fonts;
        if (fonts?.ready) {
          fonts.ready.then(() => {
            clearTimeout(timer);
            done();
          }).catch(done);
        } else {
          clearTimeout(timer);
          setTimeout(done, 500);
        }
      });
      win?.focus();
      win?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 4000);
    }
  };

  const sheetBase: React.CSSProperties = {
    width: A4_W,
    height: A4_H,
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    background: theme.surface,
    color: ink,
    flexShrink: 0,
  };

  const frameInset = isPrestige ? 24 : 20;

  const renderFrame = () => (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          inset: frameInset,
          border: `${isPrestige ? 3 : 1.5}px solid ${accent}${isPrestige ? '' : '66'}`,
          borderRadius: isPrestige ? 4 : 8,
          opacity: isPrestige ? 0.9 : 0.7,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: frameInset + (isPrestige ? 8 : 6),
          border: `1px solid ${theme.line}`,
          borderRadius: 6,
        }}
      />
      {isTech && (
        <>
          {[
            { top: frameInset - 4, left: frameInset - 4, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` },
            { top: frameInset - 4, right: frameInset - 4, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` },
            { bottom: frameInset - 4, left: frameInset - 4, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` },
            { bottom: frameInset - 4, right: frameInset - 4, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` },
          ].map((style, i) => (
            <div key={i} className="absolute pointer-events-none" style={{ width: 34, height: 34, ...style }} />
          ))}
        </>
      )}
    </>
  );

  const renderSeal = () => (
    <div className="flex flex-col items-center justify-end">
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          border: `2px solid ${accent}`,
          padding: 4,
          background: theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
          boxShadow: `0 0 0 4px ${accentSoft}`,
        }}
      >
        <img src={logoDataUrl} alt="Institutional seal" className="w-full h-full rounded-full object-cover" />
      </div>
      <span
        className="font-mono font-bold uppercase"
        style={{ marginTop: 5, fontSize: 7, letterSpacing: '0.22em', color: theme.inkFaint }}
      >
        {isCandidateEligible ? 'OFFICIAL SEAL' : 'NOT ELIGIBLE'}
      </span>
    </div>
  );

  const renderSignature = () => (
    <div className="flex flex-col items-end text-right">
      <div
        className={`${theme.scriptClass}`}
        style={{
          fontSize: 34,
          lineHeight: 1,
          color: theme.isDark ? accent2 : '#16233a',
          transform: 'rotate(-1.5deg)',
          paddingBottom: 2,
        }}
      >
        {instructorSignature}
      </div>
      <div style={{ width: 190, height: 1.5, background: `linear-gradient(90deg, ${accent}, ${accent2})` }} />
      <div
        className="font-sans font-bold uppercase"
        style={{ marginTop: 5, fontSize: 10, letterSpacing: '0.08em', color: ink }}
      >
        {instructorName}
      </div>
      <div className="font-sans uppercase" style={{ fontSize: 8, letterSpacing: '0.18em', color: inkFaint }}>
        {instructorTitle} · {instituteName}
      </div>
    </div>
  );

  const dangerBlock = (message: string) => (
    <div
      className="font-sans"
      style={{
        border: `1px solid ${DANGER}55`,
        background: DANGER_SOFT,
        color: DANGER,
        borderRadius: 10,
        padding: '8px 18px',
        fontSize: 10.5,
        lineHeight: 1.5,
        fontWeight: 600,
      }}
    >
      {message}
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full">
      {/* Candidate Ineligibility Notice */}
      {!isCandidateEligible && (
        <div className="no-print w-full max-w-5xl mb-3 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-950 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <div className="font-extrabold text-rose-900 text-sm tracking-tight flex flex-wrap items-center gap-2">
                <span>Candidate is Not Eligible for Certificate</span>
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-mono text-[10px] uppercase">
                  Score: {grading.overallPercentage}% (Passing: {grading.passingPercentage}%)
                </span>
              </div>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Official Academic Transcript has been issued with institutional stamp on the reverse side.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSide('back')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeSide === 'back' ? 'bg-rose-700 text-white' : 'bg-white border border-rose-300 text-rose-800'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveSide('front')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeSide === 'front' ? 'bg-rose-700 text-white' : 'bg-white border border-rose-300 text-rose-800'
              }`}
            >
              Certificate Front
            </button>
          </div>
        </div>
      )}

      {exportError && (
        <div className="no-print w-full max-w-5xl mb-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] font-semibold text-amber-900">
          {exportError}
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="no-print flex flex-col md:flex-row items-center justify-between gap-3 w-full max-w-5xl mb-4 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveSide('front')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSide === 'front' ? 'bg-slate-900 text-emerald-400 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isCandidateEligible ? 'Front Certificate' : 'Certificate Front'}
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeSide === 'back' ? 'bg-slate-900 text-emerald-400 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Back Transcript
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                title="Fit to screen"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                  zoomMode === 'fit' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fit</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('full')}
                title="Full size (100%)"
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                  zoomMode === 'full' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">100%</span>
              </button>
            </div>

            <button
              onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Flip side"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Flip</span>
            </button>

            <button
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExporting ? 'Exporting…' : 'PDF'}</span>
            </button>

            <button
              disabled={isExporting}
              onClick={() => handleDownloadJPG(activeSide)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 min-h-[38px]"
              title={`Download ${activeSide === 'front' ? 'certificate' : 'transcript'} as image`}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">JPG</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Print in A4 landscape"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      )}

      <div className="no-print sm:hidden text-[11px] text-slate-500 flex items-center justify-center gap-1.5 py-1">
        <span>↔ Swipe horizontally to view the full certificate, or use PDF / Print</span>
      </div>

      <div className="certificate-viewer-wrapper w-full overflow-x-auto pb-6 pt-1">
        <div
          ref={fitWrapRef}
          className="certificate-fit-wrapper mx-auto w-full min-w-[680px] max-w-[1123px]"
          style={{ height: A4_H * scale }}
        >
          <div
            data-certificate-scaler
            className="certificate-scaler"
            style={{ width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            {/* ============================ FRONT ============================ */}
            <div
              ref={frontRef}
              className={`certificate-print-page certificate-sheet ${activeSide === 'front' ? 'block' : 'hidden print:block'}`}
              style={sheetBase}
            >
              <CertificatePatternLayer theme={theme} />
              {renderFrame()}

              {/* Ineligible watermark */}
              {!isCandidateEligible && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
                  <div
                    className="text-center font-mono font-black uppercase"
                    style={{
                      border: `4px solid ${DANGER}55`,
                      color: DANGER,
                      background: 'rgba(255,255,255,0.86)',
                      padding: '10px 26px',
                      borderRadius: 12,
                      transform: 'rotate(-12deg)',
                      letterSpacing: '0.14em',
                      fontSize: 24,
                    }}
                  >
                    NOT ELIGIBLE FOR CERTIFICATE
                  </div>
                </div>
              )}

              {status === 'REVOKED' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
                  <span
                    className="font-cinzel font-black uppercase"
                    style={{
                      color: `${DANGER}55`,
                      border: `4px solid ${DANGER}55`,
                      padding: '10px 42px',
                      borderRadius: 14,
                      transform: 'rotate(-18deg)',
                      fontSize: 64,
                      letterSpacing: '0.2em',
                    }}
                  >
                    REVOKED
                  </span>
                </div>
              )}

              <div
                data-cert-content="front"
                className="relative flex h-full flex-col"
                style={{
                  zIndex: 10,
                  padding: isPrestige ? '54px 92px 46px' : '46px 76px 40px',
                }}
              >
                {/* -------------------------------- HEADER -------------------------------- */}
                {isTech ? (
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="overflow-hidden shrink-0"
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          border: `1px solid ${accent}77`,
                          background: '#000',
                          padding: 3,
                          boxShadow: `0 0 18px ${accentSoft}`,
                        }}
                      >
                        <img src={logoDataUrl} alt={`${instituteName} logo`} className="w-full h-full object-cover" style={{ borderRadius: 9 }} />
                      </div>
                      <div>
                        <div
                          className={`${theme.headingClass} uppercase`}
                          style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.18em', color: ink }}
                        >
                          {instituteName}
                        </div>
                        <div
                          className="font-sans uppercase"
                          style={{ marginTop: 2, fontSize: 8.5, letterSpacing: '0.2em', color: inkFaint, maxWidth: 420 }}
                        >
                          {accreditation}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-right shrink-0" style={{ fontSize: 8.5, lineHeight: 1.6, color: inkFaint }}>
                      <div>
                        SERIAL <span style={{ color: ink, fontWeight: 700 }}>{serialNumber}</span>
                      </div>
                      <div>ISSUED {issueDate}</div>
                      <div style={{ color: accent, fontWeight: 700 }}>{isCandidateEligible ? 'VERIFIED · VALID' : 'NOT ELIGIBLE'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-6">
                    <div style={{ width: 92 }} className="flex items-center gap-2">
                      <div
                        className="overflow-hidden shrink-0"
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: isPrestige ? '50%' : 12,
                          border: `1.5px solid ${accent}aa`,
                          padding: 3,
                          background: '#fff',
                        }}
                      >
                        <img src={logoDataUrl} alt={`${instituteName} logo`} className="w-full h-full object-cover" style={{ borderRadius: '50%' }} />
                      </div>
                    </div>

                    <div className="text-center flex-1">
                      <div
                        className={`${theme.headingClass} uppercase`}
                        style={{ fontSize: 19, fontWeight: 800, letterSpacing: '0.22em', color: ink }}
                      >
                        {instituteName}
                      </div>
                      <div
                        className="font-sans uppercase"
                        style={{ marginTop: 3, fontSize: 8.5, letterSpacing: '0.18em', color: inkFaint }}
                      >
                        {accreditation}
                      </div>
                    </div>

                    <div className="font-mono text-right shrink-0" style={{ width: 92, fontSize: 8, lineHeight: 1.7, color: inkFaint }}>
                      <div>{serialNumber}</div>
                      <div>{issueDate}</div>
                    </div>
                  </div>
                )}

                <div
                  className="w-full"
                  style={{
                    height: 1,
                    marginTop: isTech ? 16 : 18,
                    background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
                  }}
                />

                {/* -------------------------------- BODY -------------------------------- */}
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div
                    className="font-sans font-semibold uppercase"
                    style={{ fontSize: 9, letterSpacing: '0.36em', color: accent }}
                  >
                    {course.category || theme.designation}
                  </div>

                  <h1
                    className={`${theme.headingClass} uppercase`}
                    style={{
                      marginTop: 10,
                      fontSize: isPrestige ? 31 : 27,
                      fontWeight: 800,
                      letterSpacing: isTech ? '0.12em' : '0.16em',
                      lineHeight: 1.15,
                      color: isCandidateEligible ? ink : DANGER,
                      maxWidth: 900,
                    }}
                  >
                    {isCandidateEligible
                      ? institute?.certificateTitle || 'Certificate of Professional Competence'
                      : 'Official Academic Record · Ineligibility Notice'}
                  </h1>

                  <div
                    style={{
                      marginTop: 12,
                      width: 150,
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                    }}
                  />

                  <p
                    className="font-sans italic"
                    style={{ marginTop: 16, fontSize: 11.5, letterSpacing: '0.04em', color: inkSoft }}
                  >
                    {isCandidateEligible
                      ? 'This is proudly presented and officially conferred upon'
                      : 'Academic examination record concerning the registered candidate'}
                  </p>

                  <div
                    className={`${theme.nameClass}`}
                    style={{
                      marginTop: 8,
                      fontSize: isPrestige ? 44 : 40,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: isCandidateEligible ? ink : DANGER,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {student.fullName}
                  </div>

                  <div style={{ marginTop: 8, width: 260, height: 1.5, background: `${accent}88` }} />

                  {template.showFatherName && student.fatherName && (
                    <p className="font-sans" style={{ marginTop: 8, fontSize: 10.5, color: inkSoft }}>
                      Son / Daughter of <span style={{ fontWeight: 700, color: ink }}>{student.fatherName}</span>
                    </p>
                  )}

                  {isCandidateEligible ? (
                    <>
                      <p className="font-sans" style={{ marginTop: 14, fontSize: 10.5, color: inkSoft }}>
                        in recognition of successful completion and rigorous examination in the specialized curriculum
                      </p>

                      <h3
                        className="font-sans"
                        style={{
                          marginTop: 6,
                          fontSize: 16,
                          fontWeight: 700,
                          color: ink,
                          maxWidth: 820,
                          lineHeight: 1.35,
                        }}
                      >
                        {course.title}
                      </h3>

                      <div className="flex items-center justify-center flex-wrap" style={{ marginTop: 14, gap: 8 }}>
                        {[course.code, course.duration, isCandidateEligible ? `Grade ${grading.grade}` : null]
                          .filter(Boolean)
                          .map((chip, i) => (
                            <span
                              key={i}
                              className="font-mono"
                              style={{
                                fontSize: 8.5,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: theme.isDark ? inkSoft : theme.accent2,
                                border: `1px solid ${theme.line}`,
                                background: accentSoft,
                                borderRadius: 999,
                                padding: '3px 10px',
                              }}
                            >
                              {chip}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: 16, maxWidth: 760 }}>
                      {dangerBlock(
                        `Passing criteria of ${grading.passingPercentage ?? 50}% not fulfilled — score achieved ${grading.overallPercentage}% (Grade ${grading.grade}). A formal certificate is withheld; the stamped official transcript is issued on the reverse side.`
                      )}
                    </div>
                  )}
                </div>

                {/* -------------------------------- FOOTER -------------------------------- */}
                <div
                  className="grid items-end"
                  style={{
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: 18,
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: `1px solid ${theme.line}`,
                  }}
                >
                  <div className="flex items-center gap-3 justify-self-start">
                    {template.showQR && qrCodeDataUrl && (
                      <div
        style={{
          background: theme.isDark ? 'rgba(255,255,255,0.1)' : '#fff',
          padding: 6,
          borderRadius: 8,
          border: `2px solid ${theme.accent}`,
          boxShadow: `0 0 12px ${theme.accentSoft}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        <img src={qrCodeDataUrl} alt="Scan to verify" style={{ width: 70, height: 70, display: 'block' }} />
      </div>
    )}
                    <div className="font-mono" style={{ fontSize: 8.5, lineHeight: 1.7, color: inkFaint }}>
                      <div>
                        <span style={{ color: inkSoft }}>SERIAL </span>
                        <span style={{ color: ink, fontWeight: 700 }}>{serialNumber}</span>
                      </div>
                      <div>
                        <span style={{ color: inkSoft }}>ISSUED </span>
                        {issueDate}
                      </div>
                      {template.showGradeFront && (
                        <div>
                          <span style={{ color: inkSoft }}>RESULT </span>
                          <span style={{ color: isCandidateEligible ? accent : DANGER, fontWeight: 700 }}>
                            {isCandidateEligible ? `${grading.grade} · ${grading.result}` : `INELIGIBLE · ${grading.grade}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1" style={{ marginTop: 3, fontSize: 8, color: isCandidateEligible ? accent : DANGER }}>
                        <ShieldCheck style={{ width: 11, height: 11 }} />
                        Cryptographically verified credential
                      </div>
                    </div>
                  </div>

                  <div className="justify-self-center">{template.showSeal && renderSeal()}</div>

                  <div className="justify-self-end">{template.showSignatures && renderSignature()}</div>
                </div>
              </div>
            </div>

            {/* ============================ BACK (TRANSCRIPT) ============================ */}
            <div
              ref={backRef}
              className={`certificate-print-page certificate-print-page-back certificate-sheet ${
                activeSide === 'back' ? 'block' : 'hidden print:block'
              }`}
              style={sheetBase}
            >
              <CertificatePatternLayer theme={{ ...theme, patternOpacity: theme.patternOpacity * 0.45 }} />
              <div
                className="absolute pointer-events-none"
                style={{ inset: 18, border: `1px solid ${accent}55`, borderRadius: 6 }}
              />

              <div
                data-cert-content="back"
                className="relative flex h-full flex-col"
                style={{ zIndex: 10, padding: '34px 46px 28px' }}
              >
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-5"
                  style={{ paddingBottom: 12, borderBottom: `1px solid ${theme.line}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="overflow-hidden shrink-0"
                      style={{ width: 44, height: 44, borderRadius: 9, padding: 2, background: '#000', border: `1px solid ${accent}66` }}
                    >
                      <img src={logoDataUrl} alt="logo" className="w-full h-full object-cover" style={{ borderRadius: 7 }} />
                    </div>
                    <div>
                      <h2
                        className={`${theme.headingClass} uppercase`}
                        style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', color: ink }}
                      >
                        Official Academic Transcript & Competency Record
                      </h2>
                      <p className="font-sans uppercase" style={{ fontSize: 8.5, letterSpacing: '0.12em', marginTop: 2, color: inkFaint }}>
                        {instituteName} · {course.title} ({course.code})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 shrink-0">
                    <div className="font-mono text-right" style={{ fontSize: 8.5, lineHeight: 1.7, color: inkFaint }}>
                      <div>
                        <span style={{ color: inkSoft }}>CANDIDATE </span>
                        <span style={{ color: ink, fontWeight: 700 }}>{student.fullName}</span>
                      </div>
                      <div>
                        <span style={{ color: inkSoft }}>SERIAL </span>
                        <span style={{ color: ink }}>{serialNumber}</span>
                      </div>
                      <div>
                        <span style={{ color: inkSoft }}>STUDENT ID </span>
                        <span style={{ color: ink }}>{student.studentIdNumber || serialNumber}</span>
                      </div>
                    </div>

                    <div
                      className="font-mono uppercase text-center"
                      style={{
                        border: `2.5px solid ${isCandidateEligible ? accent : DANGER}`,
                        color: isCandidateEligible ? accent : DANGER,
                        borderRadius: 10,
                        padding: '6px 10px',
                        transform: 'rotate(-5deg)',
                        lineHeight: 1.3,
                        maxWidth: 190,
                        background: isCandidateEligible ? accentSoft : DANGER_SOFT,
                      }}
                    >
                      <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.14em' }}>★ OFFICIAL TRANSCRIPT ★</div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: ink, letterSpacing: '0.08em' }}>{instituteName}</div>
                      <div style={{ fontSize: 7, fontWeight: 700 }}>ACADEMIC RECORD ISSUED &amp; VERIFIED</div>
                      <div style={{ fontSize: 6.5, marginTop: 2 }}>REF: {serialNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Two columns */}
                <div className="grid flex-1" style={{ gridTemplateColumns: '1fr 1.12fr', gap: 22, padding: '14px 0' }}>
                  <div className="flex flex-col">
                    <div
                      className="flex items-center justify-between"
                      style={{ paddingBottom: 5, borderBottom: `1px solid ${theme.line}` }}
                    >
                      <span className="font-sans font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: ink }}>
                        Verified Technical Competencies
                      </span>
                      <span
                        className="font-mono uppercase"
                        style={{ fontSize: 7.5, color: isCandidateEligible ? accent : DANGER, border: `1px solid ${theme.line}`, borderRadius: 4, padding: '1px 6px' }}
                      >
                        Evaluated
                      </span>
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {course.learningOutcomes.map((outcome, idx) => (
                        <div key={idx} className="flex items-start" style={{ gap: 7 }}>
                          <span className="font-bold shrink-0" style={{ color: accent, fontSize: 10 }}>
                            ✓
                          </span>
                          <span className="font-sans" style={{ fontSize: 9.5, lineHeight: 1.45, color: inkSoft }}>
                            {outcome}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      className="font-mono flex items-center justify-between"
                      style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${theme.line}`, fontSize: 8, color: inkFaint }}
                    >
                      <span>
                        DURATION <span style={{ color: ink }}>{course.duration}</span>
                      </span>
                      <span>
                        FACULTY <span style={{ color: ink }}>{instructorName}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div
                      className="flex items-center justify-between"
                      style={{ paddingBottom: 5, borderBottom: `1px solid ${theme.line}` }}
                    >
                      <span className="font-sans font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: ink }}>
                        Assessment Breakdown
                      </span>
                      <span className="font-mono" style={{ fontSize: 7.5, color: inkFaint }}>
                        {grading.method === 'weighted' ? 'Weighted scheme' : 'Total aggregate'}
                      </span>
                    </div>

                    <div style={{ marginTop: 8, border: `1px solid ${theme.line}`, borderRadius: 6, overflow: 'hidden' }}>
                      <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: 8.5 }}>
                        <thead>
                          <tr style={{ background: accentSoft, color: inkSoft }}>
                            <th style={{ padding: '4px 7px', fontWeight: 700 }}>Parameter</th>
                            <th style={{ padding: '4px 7px', fontWeight: 700, textAlign: 'right' }}>Max</th>
                            <th style={{ padding: '4px 7px', fontWeight: 700, textAlign: 'right' }}>Obtained</th>
                            {grading.method === 'weighted' && (
                              <th style={{ padding: '4px 7px', fontWeight: 700, textAlign: 'right' }}>Weight</th>
                            )}
                            <th style={{ padding: '4px 7px', fontWeight: 700, textAlign: 'right' }}>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grading.parameters.map((p, idx) => (
                            <tr key={idx} style={{ borderTop: `1px solid ${theme.line}`, color: inkSoft }}>
                              <td style={{ padding: '3.5px 7px' }}>{p.name}</td>
                              <td style={{ padding: '3.5px 7px', textAlign: 'right' }}>{p.maxMarks}</td>
                              <td style={{ padding: '3.5px 7px', textAlign: 'right', color: ink, fontWeight: 600 }}>{p.obtainedMarks}</td>
                              {grading.method === 'weighted' && (
                                <td style={{ padding: '3.5px 7px', textAlign: 'right' }}>{p.weightage}%</td>
                              )}
                              <td style={{ padding: '3.5px 7px', textAlign: 'right', color: accent, fontWeight: 700 }}>{p.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: `1px solid ${theme.line}`, background: accentSoft, color: ink, fontWeight: 700 }}>
                            <td style={{ padding: '4.5px 7px' }}>Overall Assessment</td>
                            <td style={{ padding: '4.5px 7px', textAlign: 'right' }}>{grading.totalMaxMarks}</td>
                            <td style={{ padding: '4.5px 7px', textAlign: 'right' }}>{grading.totalObtainedMarks}</td>
                            {grading.method === 'weighted' && <td style={{ padding: '4.5px 7px', textAlign: 'right' }}>100%</td>}
                            <td style={{ padding: '4.5px 7px', textAlign: 'right', color: isCandidateEligible ? accent : DANGER }}>
                              {grading.overallPercentage}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        marginTop: 10,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 6,
                        padding: '7px 10px',
                        gap: 8,
                        background: accentSoft,
                      }}
                    >
                      <div>
                        <div className="font-sans uppercase" style={{ fontSize: 7, letterSpacing: '0.1em', color: inkFaint }}>
                          Final Grade
                        </div>
                        <div className="font-sans font-extrabold" style={{ fontSize: 15, color: isCandidateEligible ? accent : DANGER }}>
                          {grading.grade}
                        </div>
                      </div>
                      <div>
                        <div className="font-sans uppercase" style={{ fontSize: 7, letterSpacing: '0.1em', color: inkFaint }}>
                          Result
                        </div>
                        <div className="font-sans font-semibold" style={{ fontSize: 9, color: isCandidateEligible ? ink : DANGER }}>
                          {grading.result}
                        </div>
                      </div>
                      <div>
                        <div className="font-sans uppercase" style={{ fontSize: 7, letterSpacing: '0.1em', color: inkFaint }}>
                          Status
                        </div>
                        <div className="font-sans font-bold" style={{ fontSize: 8.5, color: isCandidateEligible ? accent : DANGER }}>
                          {isCandidateEligible ? 'CONFIRMED PASS' : 'CERTIFICATE WITHHELD'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-end" style={{ marginTop: 10 }}>
                      <div className="text-right">
                        <div
                          className={theme.scriptClass}
                          style={{ fontSize: 24, lineHeight: 1, color: theme.isDark ? accent2 : '#16233a' }}
                        >
                          {instructorSignature}
                        </div>
                        <div style={{ width: 150, height: 1, marginLeft: 'auto', background: accent }} />
                        <div className="font-sans font-bold uppercase" style={{ fontSize: 8, marginTop: 3, color: ink }}>
                          {instructorName}
                        </div>
                        <div className="font-sans uppercase" style={{ fontSize: 7, letterSpacing: '0.14em', color: inkFaint }}>
                          {instructorTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div
                  className="flex items-start justify-between gap-6"
                  style={{ paddingTop: 9, borderTop: `1px solid ${theme.line}`, fontSize: 7.5, color: inkFaint }}
                >
                  <p className="font-sans" style={{ maxWidth: 620, lineHeight: 1.5 }}>
                    {institute?.verificationInstructions ||
                      'Official transcript generated directly from the Tech For You academic database ledger. Verification can be performed online anytime.'}
                  </p>
                  <div className="font-mono text-right shrink-0" style={{ lineHeight: 1.6 }}>
                    <div>INSTRUCTOR {instructorName}</div>
                    <div>REF {student.studentIdNumber || serialNumber}</div>
                    <div>{issueDate}</div>
                  </div>
                </div>

                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.line}`, fontSize: 7.2, color: inkFaint, lineHeight: 1.5 }}>
                  <span className="font-sans font-bold uppercase" style={{ letterSpacing: '0.1em', color: inkSoft }}>
                    Achievement Certificate Notice:{' '}
                  </span>
                  <span className="font-sans">
                    This document is an Achievement Certificate awarded by {instituteName} recognising completion of the stated curriculum and
                    competency assessments. It is NOT equivalent to any academic degree, diploma or formal qualification, confers no academic
                    title or professional licensure, and is issued solely as a professional achievement and skill-completion record.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateRenderer;
