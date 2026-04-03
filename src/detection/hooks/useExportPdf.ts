import { useCallback, useState } from 'react';

export function useExportPdf() {
  const [exporting, setExporting] = useState(false);

  const exportSessionPdf = useCallback(async (
    elementId: string,
    filename: string,
  ) => {
    setExporting(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0e0f1a',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportSessionPdf, exporting };
}
