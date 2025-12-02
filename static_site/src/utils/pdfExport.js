import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPDF = async () => {
    const reportElement = document.querySelector('.markdown-report');
    if (!reportElement) return;

    try {
        const clone = reportElement.cloneNode(true);
        Object.assign(clone.style, { width: '1200px', position: 'absolute', left: '-9999px' });
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#1a1f36',
        });

        document.body.removeChild(clone);

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`sprint-intelligence-report-${timestamp}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
};
