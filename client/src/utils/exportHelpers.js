import * as XLSX from 'xlsx';

/**
 * Compiles a transaction array into a CSV file and triggers a browser download
 */
export const exportToCSV = (transactions, filename = 'transactions_report.csv') => {
  if (!transactions || transactions.length === 0) return;

  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Note'];
  
  const rows = transactions.map(t => [
    new Date(t.date).toLocaleDateString(),
    t.type.toUpperCase(),
    t.description,
    t.category,
    t.amount,
    t.note || ''
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Uses the standard 'xlsx' library to generate a rich formatted Excel sheet
 */
export const exportToExcel = (transactions, filename = 'aura_financial_report.xlsx') => {
  if (!transactions || transactions.length === 0) return;

  // 1. Format transaction array for Excel rows
  const formattedData = transactions.map((t, idx) => ({
    '#': idx + 1,
    'Date': new Date(t.date).toLocaleDateString(),
    'Type': t.type.toUpperCase(),
    'Description': t.description,
    'Category': t.category,
    'Amount (₹)': parseFloat(t.amount),
    'Notes': t.note || ''
  }));

  // 2. Compile worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Transactions');

  // 3. Set column widths automatically
  const maxProps = [
    { wch: 5 },  // #
    { wch: 12 }, // Date
    { wch: 10 }, // Type
    { wch: 30 }, // Description
    { wch: 15 }, // Category
    { wch: 12 }, // Amount
    { wch: 40 }  // Notes
  ];
  worksheet['!cols'] = maxProps;

  // 4. Trigger download
  XLSX.writeFile(workbook, filename);
};

/**
 * Triggers standard browser print routines to print or save the ledger list
 */
export const printToPDF = () => {
  window.print();
};
