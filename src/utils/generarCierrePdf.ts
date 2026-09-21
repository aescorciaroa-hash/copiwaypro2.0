import { jsPDF } from 'jspdf';

export interface CierreDataForPDF {
  date: string;
  totalVentas: number;
  totalOrdenes: number;
  activeOrdersCount: number;
  desglose: {
    efectivo: number;
    digital: number;
  };
  insumosConsumidos: Array<{ name: string; used: number; unit?: string }>;
}

export function generateCierrePDF(data: CierreDataForPDF, orders: any[] = []): { doc: jsPDF; blobUrl: string; download: () => void } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const formatCOP = (val: number) => `$ ${val.toLocaleString('es-CO')}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(234, 88, 12); // brand orange #ea580c
  doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('HAMBURGUER COPIWAY', 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 240, 230);
  doc.text('DARK KITCHEN — REPORTE OFICIAL DE CIERRE DE CAJA', 20, y + 16);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(8);
  doc.text(`Fecha: ${data.date} | ${timeStr}`, pageWidth - 20, y + 13, { align: 'right' });

  y += 28;

  // Warning if active orders
  if (data.activeOrdersCount > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text(`ADVERTENCIA: Cierre efectuado con ${data.activeOrdersCount} orden(es) aun activa(s).`, 18, y + 7);
    y += 16;
  }

  // Summary Metrics Section (2x2 Grid)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text('RESUMEN GENERAL DE INGRESOS', 14, y);
  y += 5;

  const cardWidth = (pageWidth - 28 - 6) / 2;
  const cardHeight = 18;

  // Card 1: Total Ventas
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL VENTAS DEL TURNO', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(234, 88, 12);
  doc.text(formatCOP(data.totalVentas), 18, y + 14);

  // Card 2: Total Órdenes
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(14 + cardWidth + 6, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL DE ÓRDENES PROCESADAS', 14 + cardWidth + 10, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(28, 25, 23);
  doc.text(`${data.totalOrdenes} pedidos`, 14 + cardWidth + 10, y + 14);

  y += cardHeight + 4;

  // Card 3: Efectivo
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('RECAUDO EN EFECTIVO (CASH)', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text(formatCOP(data.desglose.efectivo), 18, y + 14);

  // Card 4: Digital
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(14 + cardWidth + 6, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('PAGOS DIGITALES / TRANSFERENCIAS', 14 + cardWidth + 10, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text(formatCOP(data.desglose.digital), 14 + cardWidth + 10, y + 14);

  y += cardHeight + 10;

  // Insumos Consumidos Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text('CRUCE Y CONSUMO DE INSUMOS (ESCANDALLO)', 14, y);
  y += 5;

  // Table header
  doc.setFillColor(231, 229, 228);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(68, 64, 60);
  doc.text('INSUMO / INGREDIENTE', 18, y + 5);
  doc.text('CANTIDAD CONSUMIDA', pageWidth - 20, y + 5, { align: 'right' });
  y += 7;

  if (!data.insumosConsumidos || data.insumosConsumidos.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text('No se registraron consumos de insumos en este turno.', 18, y + 6);
    y += 10;
  } else {
    data.insumosConsumidos.slice(0, 12).forEach((insumo, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, y, pageWidth - 28, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(41, 37, 36);
      doc.text(insumo.name, 18, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(`${insumo.used} unidades`, pageWidth - 20, y + 4.2, { align: 'right' });
      y += 6;
    });
  }

  y += 8;

  // Orders List Breakdown (if available)
  if (orders && orders.length > 0 && y < 220) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text('DETALLE DE ÚLTIMAS ÓRDENES DEL TURNO', 14, y);
    y += 5;

    // Header
    doc.setFillColor(231, 229, 228);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    doc.text('PEDIDO', 18, y + 5);
    doc.text('CLIENTE', 55, y + 5);
    doc.text('MÉTODO', 115, y + 5);
    doc.text('TOTAL', pageWidth - 20, y + 5, { align: 'right' });
    y += 7;

    const sampleOrders = orders.slice(0, 8);
    sampleOrders.forEach((ord, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, y, pageWidth - 28, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(41, 37, 36);
      doc.text(ord.id || `#${idx + 1}`, 18, y + 4.2);
      doc.text((ord.client || 'Cliente').substring(0, 26), 55, y + 4.2);
      doc.text(ord.paymentMethod === 'cash' ? 'Efectivo' : 'Digital', 115, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(ord.total || 0), pageWidth - 20, y + 4.2, { align: 'right' });
      y += 6;
    });
  }

  // Footer & Signatures (placed near bottom of page)
  const footerY = Math.max(y + 12, 260);
  doc.setDrawColor(214, 211, 209);
  doc.line(14, footerY, pageWidth - 20, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Hamburguer Copiway • Sistema de Conciliación y Liquidación Automática', 14, footerY + 5);
  doc.text('Firma Responsable Turno / Administrador: _________________________', pageWidth - 14, footerY + 5, { align: 'right' });

  // Generate Blob and Object URL
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const download = () => {
    const filename = `cierre_caja_${data.date.replace(/\//g, '-')}.pdf`;
    try {
      doc.save(filename);
    } catch {
      // Fallback anchor download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return { doc, blobUrl, download };
}
