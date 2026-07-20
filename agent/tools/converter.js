const XLSX = require('xlsx');
const { PDFDocument, rgb } = require('pdf-lib');
const mammoth = require('mammoth');

/**
 * Excel Buffer ko CSV Buffer me convert karta hai
 */
async function convertExcelToCsv(buffer) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        return Buffer.from(csvData, 'utf-8');
    } catch (error) {
        throw new Error('Excel to CSV conversion failed: ' + error.message);
    }
}

/**
 * CSV Buffer ko Excel Buffer me convert karta hai
 */
async function convertCsvToExcel(buffer) {
    try {
        const csvString = buffer.toString('utf-8');
        const rows = csvString.split('\n').map(row => row.split(','));
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
        throw new Error('CSV to Excel conversion failed: ' + error.message);
    }
}

/**
 * Raw Text ko PDF me convert karta hai
 */
async function convertTextToPdf(textString) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
        const { width, height } = page.getSize();
        
        page.drawText(textString, {
            x: 50,
            y: height - 50,
            size: 12,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: width - 100,
            lineHeight: 15
        });
        
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        throw new Error('Text to PDF conversion failed: ' + error.message);
    }
}

module.exports = {
    convertExcelToCsv,
    convertCsvToExcel,
    convertTextToPdf
};
