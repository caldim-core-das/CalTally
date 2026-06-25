const PDFDocument = require('pdfkit');

const CURRENCY_SYMBOLS = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'Fr',
    'CNY': '¥',
    'AED': 'د.إ',
    'SAR': '﷼',
    'SGD': 'S$',
    'KWD': 'د.ك',
    'OMR': 'ر.ع.',
    'BHD': '.د.ب',
    'QAR': 'ر.ق'
};

function getCurrencySymbol(currency) {
    if (!currency) return '₹';
    const code = currency.split(/[ -]/)[0].trim().toUpperCase();
    return CURRENCY_SYMBOLS[code] || code;
}

function formatAmount(amount, currencyCode) {
    const code = currencyCode ? currencyCode.split(/[ -]/)[0].trim().toUpperCase() : 'INR';
    const locale = (code === 'INR') ? 'en-IN' : 'en-US';
    return parseFloat(amount || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

class PDFService {
    static async generateRetainerInvoice(retainer, items, company = {}) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const currency = retainer.CustomerLedger?.currency || company.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            const companyName = company.name || 'Your Company';
            const companyState = company.state || '';
            const companyEmail = company.email || '';

            // --- HEADER ---
            doc.fillColor('#000000')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(companyName, 50, 50);
            
            doc.fontSize(10)
               .font('Helvetica');
            
            let headerY = 65;
            if (companyState) { doc.text(companyState, 50, headerY); headerY += 13; }
            if (companyEmail) { doc.text(companyEmail, 50, headerY); }

            doc.fontSize(36)
               .font('Helvetica-Bold')
               .text('RETAINER INVOICE', 250, 50, { align: 'right' });

            doc.fontSize(12)
               .text(`Retainer# ${retainer.invoiceNumber}`, 250, 95, { align: 'right' });

            // --- BALANCE DUE BOX ---
            doc.fontSize(10)
               .fillColor('#888888')
               .text('Balance Due', 400, 130, { align: 'right' });
            
            doc.fontSize(18)
               .fillColor('#000000')
               .text(`${currencySymbol} ${format(retainer.totalAmount)}`, 400, 145, { align: 'right' });

            // --- BILL TO ---
            doc.fillColor('#888888')
               .fontSize(10)
               .text('Bill To', 50, 200);
            
            doc.fillColor('#000000')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(retainer.customerName, 50, 215);

            doc.font('Helvetica')
               .fontSize(10)
               .text('Retainer Date :', 350, 215)
               .text(new Date(retainer.invoiceDate).toLocaleDateString('en-GB'), 500, 215, { align: 'right' });

            // --- TABLE HEADER ---
            const tableTop = 260;
            doc.rect(50, tableTop, 500, 25).fill('#444444');
            
            doc.fillColor('#ffffff')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('#', 60, tableTop + 8)
               .text('Description', 100, tableTop + 8)
               .text('Amount', 450, tableTop + 8, { width: 90, align: 'right' });

            // --- TABLE ITEMS ---
            let currentCursor = tableTop + 25;
            doc.fillColor('#000000').font('Helvetica');

            items.forEach((item, index) => {
                doc.text(index + 1, 60, currentCursor + 10)
                   .text(item.description || 'Retainer Amount', 100, currentCursor + 10)
                   .text(format(item.amount), 450, currentCursor + 10, { width: 90, align: 'right' });
                
                currentCursor += 30;
                doc.moveTo(50, currentCursor).lineTo(550, currentCursor).strokeColor('#eeeeee').stroke();
            });

            // --- TOTALS ---
            const totalStart = currentCursor + 20;
            doc.fillColor('#555555')
               .fontSize(10)
               .text('Sub Total', 350, totalStart)
               .fillColor('#000000')
               .text(format(retainer.totalAmount), 450, totalStart, { width: 90, align: 'right' });

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Total', 350, totalStart + 25)
               .text(`${currencySymbol} ${format(retainer.totalAmount)}`, 450, totalStart + 25, { width: 90, align: 'right' });

            doc.rect(350, totalStart + 50, 200, 30).fill('#f9f9f9');
            doc.fillColor('#000000')
               .text('Balance Due', 360, totalStart + 60)
               .text(`${currencySymbol} ${format(retainer.totalAmount)}`, 450, totalStart + 60, { width: 90, align: 'right' });

            // --- WORDS ---
            doc.fillColor('#888888')
               .fontSize(9)
               .font('Helvetica-Oblique')
               .text('Total In Words:', 350, totalStart + 100);
            
            doc.fillColor('#333333')
               .fontSize(10)
               .font('Helvetica-BoldOblique')
               .text(`${currency === 'INR' ? 'Indian Rupee Only' : currency + ' Only'}`, 420, totalStart + 100);

            // --- SIGNATURE ---
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .text('Authorized Signature', 50, totalStart + 150);
            
            doc.moveTo(160, totalStart + 160).lineTo(350, totalStart + 160).strokeColor('#000000').stroke();

            doc.end();
        });
    }

    static async generateQuote(quote, items, company = {}) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const currency = quote.Customer?.currency || company.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            const companyName = company.name || 'Your Company';
            const companyState = company.state || '';
            const companyEmail = company.email || '';

            // --- HEADER ---
            doc.fillColor('#000000')
               .fontSize(14)
               .font('Helvetica-Bold')
               .text(companyName, 50, 50);
            
            doc.fontSize(10)
               .font('Helvetica');

            let headerY = 68;
            if (companyState) { doc.text(companyState, 50, headerY); headerY += 13; }
            if (companyEmail) { doc.text(companyEmail, 50, headerY); }

            doc.fontSize(36)
               .font('Helvetica-Bold')
               .text('QUOTE', 250, 50, { align: 'right' });

            doc.fontSize(12)
               .text(`Quote# ${quote.quoteNumber}`, 250, 95, { align: 'right' });

            // --- QUOTE DETAILS ---
            doc.fontSize(10)
               .fillColor('#666666')
               .text('Quote Date :', 50, 150)
               .fillColor('#000000')
               .text(new Date(quote.quoteDate).toLocaleDateString('en-GB'), 120, 150);

            if (quote.expiryDate) {
                doc.fillColor('#666666')
                   .text('Valid Until  :', 50, 165)
                   .fillColor('#000000')
                   .text(new Date(quote.expiryDate).toLocaleDateString('en-GB'), 120, 165);
            }

            // --- BILL TO ---
            doc.fillColor('#888888')
               .fontSize(10)
               .text('Customer Details', 50, 200);
            
            doc.fillColor('#000000')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text(quote.customerName, 50, 215);

            // --- TABLE HEADER ---
            const tableTop = 260;
            doc.rect(50, tableTop, 500, 25).fill('#444444');
            
            doc.fillColor('#ffffff')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('#', 60, tableTop + 8)
               .text('Description', 100, tableTop + 8)
               .text('Qty', 350, tableTop + 8, { width: 50, align: 'center' })
               .text('Rate', 400, tableTop + 8, { width: 70, align: 'right' })
               .text('Total', 470, tableTop + 8, { width: 80, align: 'right' });

            // --- TABLE ITEMS ---
            let currentCursor = tableTop + 25;
            doc.fillColor('#000000').font('Helvetica');

            items.forEach((item, index) => {
                doc.text(index + 1, 60, currentCursor + 10)
                   .text(item.itemDetails, 100, currentCursor + 10, { width: 240 })
                   .text(item.quantity, 350, currentCursor + 10, { width: 50, align: 'center' })
                   .text(format(item.rate), 400, currentCursor + 10, { width: 70, align: 'right' })
                   .text(format(item.amount), 470, currentCursor + 10, { width: 80, align: 'right' });
                
                currentCursor += 30;
                doc.moveTo(50, currentCursor).lineTo(550, currentCursor).strokeColor('#eeeeee').stroke();
            });

            // --- TOTALS ---
            const totalStart = currentCursor + 20;
            doc.fillColor('#555555')
               .fontSize(10)
               .text('Sub Total', 350, totalStart)
               .fillColor('#000000')
               .text(format(quote.subTotal), 470, totalStart, { width: 80, align: 'right' });

            if (quote.taxAmount > 0) {
                doc.fillColor('#555555')
                   .text(`Tax (${quote.selectedTax || 'GST'})`, 350, totalStart + 20)
                   .fillColor('#000000')
                   .text(format(quote.taxAmount), 470, totalStart + 20, { width: 80, align: 'right' });
            }

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Total', 350, totalStart + 50)
               .text(`${currencySymbol} ${format(quote.totalAmount)}`, 470, totalStart + 50, { width: 80, align: 'right' });

            // --- TERMS & NOTES ---
            if (quote.termsConditions) {
                doc.fontSize(9)
                   .fillColor('#888888')
                   .text('Terms & Conditions:', 50, totalStart + 100);
                doc.fontSize(9)
                   .fillColor('#555555')
                   .font('Helvetica')
                   .text(quote.termsConditions, 50, totalStart + 115, { width: 250 });
            }

            // --- SIGNATURE ---
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .text('Authorized Signature', 400, totalStart + 150, { align: 'right' });
            
            doc.moveTo(350, totalStart + 190).lineTo(550, totalStart + 190).strokeColor('#000000').stroke();

            doc.end();
        });
    }

    static async generateInvoice(invoice, items, company) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const currency = invoice.CustomerLedger?.currency || company?.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            // --- HEADER ---
            doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text(company?.name || 'Indus CAI private Ltd', 50, 50);
            doc.fontSize(10).font('Helvetica').text(company?.state || 'Tamil Nadu', 50, 68).text('India', 50, 81).text(company?.email || 'support@induscai.com', 50, 94);
            doc.fontSize(36).font('Helvetica-Bold').text('TAX INVOICE', 250, 50, { align: 'right' });
            doc.fontSize(12).text(`Invoice# ${invoice.invoiceNumber}`, 250, 95, { align: 'right' });

            // --- BILL TO ---
            doc.fillColor('#888888').fontSize(10).text('Bill To', 50, 200);
            doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(invoice.CustomerLedger?.name || 'Customer Name', 50, 215);
            
            // Format Address for PDF
            let addrStr = '';
            const rawAddr = invoice.CustomerLedger?.billingAddress || invoice.CustomerLedger?.address;
            if (rawAddr) {
                try {
                    const parsed = typeof rawAddr === 'string' ? JSON.parse(rawAddr) : rawAddr;
                    addrStr = [parsed.street1, parsed.street2, parsed.city, parsed.state, parsed.pinCode].filter(Boolean).join(', ');
                } catch (e) {
                    addrStr = rawAddr;
                }
            }
            doc.font('Helvetica').fontSize(10).text(addrStr, 50, 230, { width: 250 });

            doc.font('Helvetica').fontSize(10).text('Invoice Date :', 350, 215).text(new Date(invoice.date).toLocaleDateString('en-GB'), 500, 215, { align: 'right' });
            doc.text('Due Date :', 350, 230).text(new Date(invoice.dueDate || invoice.date).toLocaleDateString('en-GB'), 500, 230, { align: 'right' });

            // --- TABLE HEADER ---
            const tableTop = 280;
            doc.rect(50, tableTop, 500, 25).fill('#333333');
            doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('#', 60, tableTop + 8).text('Item & Description', 100, tableTop + 8).text('Qty', 350, tableTop + 8, { width: 50, align: 'center' }).text('Rate', 400, tableTop + 8, { width: 70, align: 'right' }).text('Amount', 470, tableTop + 8, { width: 80, align: 'right' });

            // --- TABLE ITEMS ---
            let currentCursor = tableTop + 25;
            doc.fillColor('#000000').font('Helvetica');
            items.forEach((item, index) => {
                const itemName = item.Item?.name || 'Service Item';
                doc.text(index + 1, 60, currentCursor + 10).text(`${itemName}\n${item.description || ''}`, 100, currentCursor + 10, { width: 240 }).text(item.quantity, 350, currentCursor + 10, { width: 50, align: 'center' }).text(format(item.rate), 400, currentCursor + 10, { width: 70, align: 'right' }).text(format(item.amount || (item.quantity * item.rate)), 470, currentCursor + 10, { width: 80, align: 'right' });
                currentCursor += 40;
                doc.moveTo(50, currentCursor).lineTo(550, currentCursor).strokeColor('#eeeeee').stroke();
            });

            // --- TOTALS ---
            const totalStart = Math.max(currentCursor + 20, 500);
            doc.fillColor('#555555').fontSize(10).text('Sub Total', 350, totalStart).fillColor('#000000').text(format(invoice.subTotal || 0), 470, totalStart, { width: 80, align: 'right' });
            doc.text(`GST (18%)`, 350, totalStart + 20).text(format(invoice.gstAmount || 0), 470, totalStart + 20, { width: 80, align: 'right' });
            doc.font('Helvetica-Bold').fontSize(12).text('Total', 350, totalStart + 50).text(`${currencySymbol} ${format(invoice.totalAmount || 0)}`, 470, totalStart + 50, { width: 80, align: 'right' });

            doc.end();
        });
    }

    static async generateDeliveryChallan(challan, items, company) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const currency = challan.Customer?.currency || company?.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            // --- HEADER ---
            doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text(company?.name || 'Indus CAI private Ltd', 50, 50);
            doc.fontSize(10).font('Helvetica').text(company?.state || 'Tamil Nadu', 50, 68).text('India', 50, 81).text(company?.email || 'support@induscai.com', 50, 94);
            doc.fontSize(36).font('Helvetica-Bold').text('DELIVERY CHALLAN', 100, 50, { align: 'right' });
            doc.fontSize(12).text(`Challan# ${challan.challanNumber}`, 250, 95, { align: 'right' });

            // --- BILL TO ---
            doc.fillColor('#888888').fontSize(10).text('Deliver To', 50, 200);
            doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(challan.Customer?.name || 'Customer Name', 50, 215);

            doc.font('Helvetica').fontSize(10).text('Challan Date :', 350, 215).text(new Date(challan.date).toLocaleDateString('en-GB'), 500, 215, { align: 'right' });

            // --- TABLE HEADER ---
            const tableTop = 260;
            doc.rect(50, tableTop, 500, 25).fill('#333333');
            doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('#', 60, tableTop + 8).text('Item & Description', 100, tableTop + 8).text('Qty', 350, tableTop + 8, { width: 50, align: 'center' }).text('Rate', 400, tableTop + 8, { width: 70, align: 'right' }).text('Amount', 470, tableTop + 8, { width: 80, align: 'right' });

            // --- TABLE ITEMS ---
            let currentCursor = tableTop + 25;
            doc.fillColor('#000000').font('Helvetica');
            items.forEach((item, index) => {
                const itemName = item.Item?.name || 'Product Item';
                doc.text(index + 1, 60, currentCursor + 10).text(`${itemName}\n${item.description || ''}`, 100, currentCursor + 10, { width: 240 }).text(item.quantity, 350, currentCursor + 10, { width: 50, align: 'center' }).text(format(item.rate), 400, currentCursor + 10, { width: 70, align: 'right' }).text(format(item.amount), 470, currentCursor + 10, { width: 80, align: 'right' });
                currentCursor += 40;
                doc.moveTo(50, currentCursor).lineTo(550, currentCursor).strokeColor('#eeeeee').stroke();
            });

            // --- TOTALS ---
            const totalStart = Math.max(currentCursor + 20, 500);
            doc.fillColor('#555555').fontSize(10).text('Sub Total', 350, totalStart).fillColor('#000000').text(format(challan.subTotal || 0), 470, totalStart, { width: 80, align: 'right' });
            doc.font('Helvetica-Bold').fontSize(12).text('Total', 350, totalStart + 25).text(`${currencySymbol} ${format(challan.totalAmount || 0)}`, 470, totalStart + 25, { width: 80, align: 'right' });

            doc.end();
        });
    }

    static async generatePurchaseOrder(order, items, company, vendor) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const currency = vendor?.currency || company?.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            const companyName = company?.name || 'Our Company';
            const vendorName = vendor?.name || order.vendorName || 'Vendor';

            // ── Date formatter (no timezone shift) ──────────────────
            const formatDate = (dateVal) => {
                if (!dateVal) return '—';
                try {
                    const match = String(dateVal).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
                    const d = new Date(dateVal);
                    if (isNaN(d.getTime())) return '—';
                    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                } catch (e) { return '—'; }
            };

            const primaryColor = '#0f172a'; // dark slate
            const accentColor = '#2563eb'; // blue
            const labelColor = '#3b82f6'; // light blue for labels
            const textColor = '#334155'; // gray-700
            const lightText = '#64748b'; // gray-500

            // ─── HEADER ──────────────────────────────────────────────────
            doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
               .text(company?.name || 'Your Company', 40, 40);
            
            let companyInfoY = 60;
            doc.fontSize(9).font('Helvetica').fillColor(lightText);
            if (company?.state) {
                doc.text(company.state, 40, companyInfoY);
                companyInfoY += 14;
            }
            if (company?.location) {
                doc.text(company.location, 40, companyInfoY);
                companyInfoY += 14;
            }
            if (company?.email) {
                doc.text(company.email, 40, companyInfoY);
            }

            // Right side: TITLE
            doc.fontSize(24).font('Times-Bold').fillColor(primaryColor)
               .text('PURCHASE ORDER', 250, 40, { width: 305, align: 'right' });

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
               .text(`# ${order.orderNumber || order.poNumber || '—'}`, 250, 68, { width: 305, align: 'right' });

            // ─── VENDOR / DELIVER-TO ───────────────────────────────────────
            const addressY = 130;

            // Vendor Address
            doc.fillColor(labelColor).fontSize(8).font('Helvetica-Bold')
               .text('VENDOR ADDRESS', 40, addressY);
            
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
               .text(vendorName, 40, addressY + 13);

            const vendorLines = [];
            const rawVendorAddr = vendor?.billingAddressJson || vendor?.billingAddress || vendor?.address;
            if (rawVendorAddr) {
                try {
                    const p = typeof rawVendorAddr === 'string' && rawVendorAddr.startsWith('{') ? JSON.parse(rawVendorAddr) : rawVendorAddr;
                    if (p && typeof p === 'object') {
                        const street = [p.street1 || p.address1, p.street2 || p.address2].filter(Boolean).join(', ');
                        if (street) vendorLines.push(street);
                        const city = [p.city, p.state, p.pinCode || p.zip].filter(Boolean).join(', ');
                        if (city) vendorLines.push(city);
                        if (p.country) vendorLines.push(p.country);
                    } else if (typeof rawVendorAddr === 'string') {
                        vendorLines.push(rawVendorAddr);
                    }
                } catch (e) { if (typeof rawVendorAddr === 'string') vendorLines.push(rawVendorAddr); }
            }
            if (vendor?.country && !vendorLines.some(l => l.includes(vendor.country))) vendorLines.push(vendor.country || 'India');

            doc.font('Helvetica').fontSize(9).fillColor(textColor);
            let currentVendorY = addressY + 28;
            vendorLines.forEach(line => {
                doc.text(line, 40, currentVendorY, { width: 220 });
                currentVendorY += 12;
            });

            // Deliver To
            doc.fillColor(labelColor).fontSize(8).font('Helvetica-Bold')
               .text('DELIVER TO', 280, addressY);
            
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
               .text(companyName, 280, addressY + 13);

            const deliveryLines = [];
            let parsedDelivery = null;
            try {
                if (order.deliveryAddress) {
                    parsedDelivery = typeof order.deliveryAddress === 'string' ? JSON.parse(order.deliveryAddress) : order.deliveryAddress;
                }
            } catch (e) {}
            if (parsedDelivery) {
                if (parsedDelivery.attention) deliveryLines.push(parsedDelivery.attention);
                const st = [parsedDelivery.street1, parsedDelivery.street2].filter(Boolean).join(', ');
                if (st) deliveryLines.push(st);
                const cv = [parsedDelivery.city, parsedDelivery.state, parsedDelivery.zip || parsedDelivery.zipCode].filter(Boolean).join(', ');
                if (cv) deliveryLines.push(cv);
                if (parsedDelivery.country) deliveryLines.push(parsedDelivery.country);
            } else if (order.deliveryAddressText) {
                deliveryLines.push(order.deliveryAddressText);
            }

            doc.font('Helvetica').fontSize(9).fillColor(textColor);
            let currentDeliveryY = addressY + 28;
            deliveryLines.forEach(line => {
                doc.text(line, 280, currentDeliveryY, { width: 220 });
                currentDeliveryY += 12;
            });

            // ─── HORIZONTAL DIVIDER ───────────────────────────────────────
            let dateDividerY = Math.max(currentVendorY, currentDeliveryY) + 20;
            doc.moveTo(40, dateDividerY).lineTo(555, dateDividerY).strokeColor('#e2e8f0').lineWidth(1).stroke();

            // 3. Date / Order Info
            const orderDate = formatDate(order.date);
            const deliveryDate = formatDate(order.deliveryDate);
            
            let dateY = dateDividerY + 15;
            
            doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold');
            doc.text('DATE', 40, dateY);
            doc.text('DELIVERY DATE', 160, dateY);
            doc.text('PAYMENT TERMS', 280, dateY);
            
            doc.fillColor(textColor).fontSize(9).font('Helvetica');
            doc.text(orderDate, 40, dateY + 12);
            doc.text(deliveryDate, 160, dateY + 12);
            doc.text(order.paymentTerms || '—', 280, dateY + 12);
            
            const maxAddressEnd = dateY + 35;
            doc.moveTo(40, maxAddressEnd).lineTo(555, maxAddressEnd).strokeColor('#e2e8f0').lineWidth(1).stroke();

            // ─── TABLE HEADER ─────────────────────────────────────────────
            const tableTop = maxAddressEnd + 20;
            doc.rect(40, tableTop, 515, 25).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
               .text('#', 50, tableTop + 8)
               .text('ITEM & DESCRIPTION', 80, tableTop + 8)
               .text('QTY', 340, tableTop + 8, { width: 50, align: 'center' })
               .text('RATE', 400, tableTop + 8, { width: 70, align: 'right' })
               .text('AMOUNT', 480, tableTop + 8, { width: 70, align: 'right' });

            // ─── TABLE ROWS ───────────────────────────────────────────────
            let currentY = tableTop + 25;
            let parsedItems = items;
            if (!Array.isArray(items)) {
                try { parsedItems = JSON.parse(items || '[]'); } catch (e) { parsedItems = []; }
            }

            doc.font('Helvetica');

            parsedItems.forEach((item, idx) => {
                const itemName = item.itemDetails || item.itemName || item.name || item.description || 'Item';
                const qty = parseFloat(item.quantity || item.qty || 0);
                const rate = parseFloat(item.rate || item.unitPrice || 0);
                const amount = parseFloat(item.amount || item.total || (qty * rate) || 0);
                const account = item.account ? `Account: ${item.account}` : '';

                // Estimate row height
                const textHeight = Math.max(30, Math.ceil(itemName.length / 45) * 12 + (account ? 15 : 0) + 10);
                
                doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
                   .text(idx + 1, 50, currentY + 10)
                   .text(itemName, 80, currentY + 10, { width: 250 });
                
                if (account) {
                    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
                       .text(account, 80, currentY + 22, { width: 250 });
                }
                   
                doc.fillColor(textColor).fontSize(9).font('Helvetica')
                   .text(qty.toFixed(2), 340, currentY + 10, { width: 50, align: 'center' })
                   .text(format(rate), 400, currentY + 10, { width: 70, align: 'right' });
                   
                doc.fillColor(primaryColor).font('Helvetica-Bold')
                   .text(format(amount), 480, currentY + 10, { width: 70, align: 'right' });

                currentY += textHeight;
                doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#f1f5f9').lineWidth(1).stroke();
            });

            if (parsedItems.length === 0) {
                doc.fillColor(lightText).fontSize(9).font('Helvetica-Oblique')
                   .text('No items found.', 80, currentY + 10);
                currentY += 30;
            }

            // ─── TOTALS ───────────────────────────────────────────────────
            const totalStart = currentY + 20;
            const subtotal = parseFloat(order.subtotal || order.subTotal || 0);
            const discountAmt = parseFloat(order.discountAmount || 0);
            const taxAmt = parseFloat(order.taxAmount || 0);
            const tdsAmt = parseFloat(order.tdsAmount || 0);
            const adjustment = parseFloat(order.adjustment || 0);
            const total = parseFloat(order.totalAmount || 0);

            let totY = totalStart;
            
            // Sub Total
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
               .text('Sub Total', 350, totY)
               .fillColor(primaryColor).font('Helvetica-Bold')
               .text(format(subtotal), 450, totY, { width: 100, align: 'right' });
            totY += 20;

            if (discountAmt > 0) {
                doc.fillColor(primaryColor).font('Helvetica-Bold').text(`Discount (${order.discount || 0}%)`, 350, totY);
                doc.fillColor('#ef4444').font('Helvetica-Bold').text(`- ${format(discountAmt)}`, 450, totY, { width: 100, align: 'right' });
                totY += 20;
            }
            if (taxAmt > 0) {
                const taxLabel = order.taxRate ? `Tax (${order.taxRate}%)` : `Tax`;
                doc.fillColor(primaryColor).font('Helvetica-Bold').text(taxLabel, 350, totY);
                doc.fillColor(primaryColor).font('Helvetica-Bold').text(`+ ${format(taxAmt)}`, 450, totY, { width: 100, align: 'right' });
                totY += 20;
            }
            if (tdsAmt > 0) {
                const tdsLabel = order.tdsName ? `TDS (${order.tdsName} - ${order.tdsRate}%)` : `TDS`;
                doc.fillColor(primaryColor).font('Helvetica-Bold').text(tdsLabel, 350, totY, { width: 130 });
                doc.fillColor('#ef4444').font('Helvetica-Bold').text(`- ${format(tdsAmt)}`, 450, totY, { width: 100, align: 'right' });
                totY += Math.max(20, doc.heightOfString(tdsLabel, { width: 130 }) + 5);
            }
            if (adjustment !== 0) {
                doc.fillColor(primaryColor).font('Helvetica-Bold').text('Adjustment', 350, totY);
                doc.fillColor(primaryColor).font('Helvetica-Bold').text(`${adjustment > 0 ? '+' : ''} ${format(adjustment)}`, 450, totY, { width: 100, align: 'right' });
                totY += 20;
            }

            doc.moveTo(350, totY).lineTo(555, totY).strokeColor('#e2e8f0').lineWidth(1).stroke();
            totY += 15;
            
            // Grand Total
            doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
               .text('Total', 350, totY)
               .fillColor(accentColor)
               .text(`${currencySymbol} ${format(total)}`, 450, totY, { width: 100, align: 'right' });

            // ─── NOTES / TERMS ──────────────────────────────────────────────
            if (order.notes || order.terms) {
                const notesY = totY + 40;
                if (order.notes) {
                    doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique')
                       .text('Notes:', 40, notesY);
                    doc.fillColor('#555555').font('Helvetica').fontSize(9)
                       .text(order.notes, 40, notesY + 13, { width: 250 });
                }
                if (order.terms) {
                    doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique')
                       .text('Terms & Conditions:', 310, notesY);
                    doc.fillColor('#555555').font('Helvetica').fontSize(9)
                       .text(order.terms, 310, notesY + 13, { width: 240 });
                }
            }

            // ─── AUTHORIZED SIGNATURE ───────────────────────────────────────
            const sigY = Math.max(totY + 120, 710);
            doc.fillColor('#000000').fontSize(9).font('Helvetica')
               .text('Authorized Signature ____________________', 40, sigY);

            doc.end();
        });
    }




    static async generateEmployeeProfile(employee, company) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // --- HEADER ---
            doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
               .text(company?.name || 'Company Profile', 40, 40);
            
            doc.fontSize(9).font('Helvetica').fillColor('#444444')
               .text(company?.state || '', 40, 56)
               .text(company?.email || '', 40, 68);

            doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a')
               .text('EMPLOYEE PROFILE', 250, 40, { width: 305, align: 'right' });

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
               .text(`ID: ${employee.employeeId}`, 250, 66, { width: 305, align: 'right' });

            doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#dddddd').lineWidth(0.5).stroke();

            let y = 110;

            const printSectionHeader = (title) => {
                if (y > 700) {
                    doc.addPage();
                    y = 40;
                }
                doc.rect(40, y, 515, 18).fill('#f1f5f9');
                doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica-Bold').text(title, 48, y + 5);
                y += 25;
            };

            const printField = (label, value, x) => {
                doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(label, x, y);
                doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(value || 'â€”', x, y + 10);
            };

            // 1. Personal Details
            printSectionHeader('1. PERSONAL DETAILS');
            printField('First Name', employee.firstName, 45);
            printField('Middle Name', employee.middleName, 210);
            printField('Last Name', employee.lastName, 380);
            y += 28;

            printField('Gender', employee.gender, 45);
            printField('Date of Birth', employee.dob, 210);
            printField('Blood Group', employee.bloodGroup, 380);
            y += 28;

            printField('Father\'s Name', employee.fatherName, 45);
            printField('Mother\'s Name', employee.motherName, 210);
            printField('Marital Status', employee.maritalStatus, 380);
            y += 35;

            // 2. Contact Details
            printSectionHeader('2. CONTACT DETAILS');
            printField('Work Email', employee.email, 45);
            printField('Personal Email', employee.personalEmail, 210);
            printField('Mobile Number', employee.phone, 380);
            y += 28;

            printField('Emergency Contact Name', employee.emergencyContactName, 45);
            printField('Relationship', employee.emergencyContactRelation, 210);
            printField('Emergency Contact Phone', employee.emergencyContactPhone, 380);
            y += 35;

            // 3. Address Details
            printSectionHeader('3. ADDRESS DETAILS');
            const presentAddr = [
                employee.presentAddressLine1,
                employee.presentAddressLine2,
                [employee.presentAddressCity, employee.presentAddressState].filter(Boolean).join(', '),
                [employee.presentAddressCountry, employee.presentAddressZip].filter(Boolean).join(' - ')
            ].filter(Boolean).join('\n');
            
            const permanentAddr = employee.sameAsPresentAddress ? 'Same as Present Address' : [
                employee.permanentAddressLine1,
                employee.permanentAddressLine2,
                [employee.permanentAddressCity, employee.permanentAddressState].filter(Boolean).join(', '),
                [employee.permanentAddressCountry, employee.permanentAddressZip].filter(Boolean).join(' - ')
            ].filter(Boolean).join('\n');

            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Present Address', 45, y);
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(presentAddr || 'â€”', 45, y + 10, { width: 240, lineGap: 2 });

            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Permanent Address', 300, y);
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(permanentAddr || 'â€”', 300, y + 10, { width: 240, lineGap: 2 });
            y += 65;

            // 4. Employment Details
            printSectionHeader('4. EMPLOYMENT DETAILS');
            printField('Employee ID', employee.employeeId, 45);
            printField('Date of Joining', employee.dateOfJoining, 210);
            printField('Employment Type', employee.employmentType, 380);
            y += 28;

            printField('Department', employee.department, 45);
            printField('Designation', employee.designation, 210);
            printField('Work Location', employee.workLocation, 380);
            y += 28;

            printField('Status', employee.status, 45);
            printField('Resignation Date', employee.resignationDate, 210);
            y += 35;

            // 5. Bank Details
            printSectionHeader('5. BANK DETAILS');
            printField('Bank Name', employee.bankName, 45);
            printField('Account Number', employee.bankAccountNumber, 210);
            printField('Account Type', employee.bankAccountType, 380);
            y += 28;

            printField('IFSC Code', employee.ifscCode, 45);
            printField('Branch Name', employee.bankBranchName, 210);
            y += 35;

            // 6. Tax & Compliance Details
            printSectionHeader('6. TAX & COMPLIANCE');
            printField('PAN Number', employee.panNumber, 45);
            printField('Aadhaar Number', employee.aadhaarNumber, 210);
            printField('UAN / PF Number', employee.pfNumber, 380);
            y += 28;

            printField('ESI Number', employee.esiNumber, 45);
            printField('PRAN Number', employee.pranNumber, 210);
            y += 35;

            // 7. Education & Experience Details
            printSectionHeader('7. EDUCATION & EXPERIENCE');
            printField('Highest Qualification', employee.highestQualification, 45);
            printField('University/College', employee.universityCollege, 210);
            printField('Year of Passing', employee.yearOfPassing ? employee.yearOfPassing.toString() : 'â€”', 380);
            y += 28;

            printField('Previous Company', employee.previousCompany, 45);
            printField('Years of Experience', employee.previousExperience ? employee.previousExperience.toString() : 'â€”', 210);
            y += 35;

            doc.end();
        });
    }
    static async generateSalesOrder(order, items, company = {}) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const currency = order.Customer?.currency || company?.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            const companyName = company.name || order.companyName || 'Your Company';
            const customerName = order.customerName || order.Customer?.displayName || order.Customer?.name || 'Customer';

            const formatDate = (d) => {
                if (!d) return 'â€”';
                try {
                    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
                    return new Date(d).toLocaleDateString('en-IN');
                } catch (e) { return 'â€”'; }
            };

            // â”€â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold')
               .text(companyName, 40, 40);

            let companyInfoY = 58;
            doc.fontSize(9).font('Helvetica').fillColor('#444444');
            if (company.state)  { doc.text(company.state,  40, companyInfoY); companyInfoY += 12; }
            if (company.location) { doc.text(company.location, 40, companyInfoY); companyInfoY += 12; }
            if (company.email)  { doc.text(company.email,  40, companyInfoY); companyInfoY += 12; }

            // Right side: TITLE
            doc.fontSize(22).font('Helvetica-Bold').fillColor('#000000')
               .text('SALES ORDER', 250, 40, { width: 305, align: 'right' });

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
               .text(`# ${order.orderNumber || 'PENDING'}`, 250, 68, { width: 305, align: 'right' });

            // â”€â”€â”€ BILL TO / SHIP TO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const addressY = 130;

            // Bill To
            doc.fillColor('#555555').fontSize(9).font('Helvetica-Bold')
               .text('Bill To', 40, addressY);
            doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
               .text(customerName, 40, addressY + 13);

            // Build customer address
            const customerLines = [];
            try {
                const raw = order.Customer?.billingAddress || order.billingAddress;
                if (raw) {
                    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const street = [p.street1, p.street2].filter(Boolean).join(', ');
                    if (street) customerLines.push(street);
                    const cityState = [p.city, p.state, p.pinCode].filter(Boolean).join(', ');
                    if (cityState) customerLines.push(cityState);
                    if (p.country) customerLines.push(p.country);
                }
            } catch (e) {}

            doc.font('Helvetica').fontSize(9).fillColor('#444444');
            doc.x = 40; doc.y = addressY + 28;
            customerLines.forEach(line => { doc.text(line, { width: 170 }); });

            // Date / Order Info (right side)
            let dateY = addressY + 13;
            doc.fillColor('#555555').fontSize(9).font('Helvetica');
            doc.text('Date :', 380, dateY);
            doc.fillColor('#000000').text(formatDate(order.date), 455, dateY, { width: 100, align: 'right' });
            dateY += 15;

            if (order.expectedShipmentDate) {
                doc.fillColor('#555555').text('Shipment Date :', 380, dateY);
                doc.fillColor('#000000').text(formatDate(order.expectedShipmentDate), 455, dateY, { width: 100, align: 'right' });
                dateY += 15;
            }
            if (order.paymentTerms) {
                doc.fillColor('#555555').text('Payment Terms :', 380, dateY);
                doc.fillColor('#000000').text(order.paymentTerms, 455, dateY, { width: 100, align: 'right' });
                dateY += 15;
            }
            if (order.referenceNumber) {
                doc.fillColor('#555555').text('Reference :', 380, dateY);
                doc.fillColor('#000000').text(order.referenceNumber, 455, dateY, { width: 100, align: 'right' });
                dateY += 15;
            }

            // â”€â”€â”€ HORIZONTAL DIVIDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const dividerY = Math.max(doc.y + 10, dateY + 10, 230);
            doc.moveTo(40, dividerY).lineTo(555, dividerY).strokeColor('#dddddd').lineWidth(0.5).stroke();

            // â”€â”€â”€ TABLE HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const tableTop = dividerY + 15;
            doc.rect(40, tableTop, 515, 20).fill('#3c3c3c');
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
               .text('#', 50, tableTop + 6)
               .text('Item & Description', 80, tableTop + 6)
               .text('Qty', 330, tableTop + 6, { width: 50, align: 'right' })
               .text('Rate', 390, tableTop + 6, { width: 70, align: 'right' })
               .text('Amount', 468, tableTop + 6, { width: 80, align: 'right' });

            // â”€â”€â”€ TABLE ROWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            let parsedItems = items;
            if (!Array.isArray(items)) {
                try { parsedItems = JSON.parse(items || '[]'); } catch (e) { parsedItems = []; }
            }

            let currentY = tableTop + 20;
            doc.fillColor('#000000').font('Helvetica');

            parsedItems.forEach((item, idx) => {
                const itemName = item.detail || item.itemName || item.name || item.description || 'Item';
                const qty      = parseFloat(item.quantity || item.qty || 0);
                const rate     = parseFloat(item.rate || 0);
                const amount   = parseFloat(item.amount || qty * rate || 0);

                const textHeight = Math.max(20, Math.ceil(itemName.length / 45) * 12 + 8);

                doc.fillColor('#000000').fontSize(9)
                   .text(idx + 1, 50, currentY + 6)
                   .text(itemName, 80, currentY + 6, { width: 240 })
                   .text(qty.toString(), 330, currentY + 6, { width: 50, align: 'right' })
                   .text(format(rate), 390, currentY + 6, { width: 70, align: 'right' })
                   .text(format(amount), 468, currentY + 6, { width: 80, align: 'right' });

                currentY += textHeight;
                doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#eeeeee').lineWidth(0.5).stroke();
            });

            if (parsedItems.length === 0) {
                doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique')
                   .text('No items found.', 80, currentY + 8);
                currentY += 24;
            }

            // â”€â”€â”€ TOTALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const totalStart  = currentY + 15;
            const subTotal    = parseFloat(order.subTotal || 0);
            const discountAmt = parseFloat(order.discountAmount || order.discount || 0);
            const taxAmt      = parseFloat(order.taxAmount || order.tax || 0);
            const taxPct      = order.taxPercent || order.taxRate || 0;
            const grandTotal  = parseFloat(order.totalAmount || 0);

            let totY = totalStart;

            // Sub Total
            doc.fillColor('#555555').fontSize(9).font('Helvetica')
               .text('Sub Total', 380, totY)
               .fillColor('#000000')
               .text(format(subTotal), 468, totY, { width: 80, align: 'right' });
            totY += 15;

            if (discountAmt > 0) {
                doc.fillColor('#555555').text('Discount', 380, totY)
                   .fillColor('#000000').text(`-${format(discountAmt)}`, 468, totY, { width: 80, align: 'right' });
                totY += 15;
            }

            if (taxAmt > 0) {
                const taxLabel = taxPct > 0 ? `Tax (${taxPct}%)` : 'Tax';
                doc.fillColor('#555555').text(taxLabel, 380, totY)
                   .fillColor('#000000').text(format(taxAmt), 468, totY, { width: 80, align: 'right' });
                totY += 15;
            }

            // Divider line before grand total
            doc.moveTo(380, totY).lineTo(555, totY).strokeColor('#dddddd').lineWidth(0.5).stroke();
            totY += 5;

            // Grand Total
            doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
               .text('Total', 380, totY)
               .text(`${currencySymbol} ${format(grandTotal)}`, 468, totY, { width: 80, align: 'right' });

            // â”€â”€â”€ NOTES / TERMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (order.customerNotes || order.termsConditions) {
                const notesY = totY + 40;
                if (order.customerNotes) {
                    doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique')
                       .text('Notes:', 40, notesY);
                    doc.fillColor('#555555').font('Helvetica').fontSize(9)
                       .text(order.customerNotes, 40, notesY + 13, { width: 250 });
                }
                if (order.termsConditions) {
                    doc.fillColor('#888888').fontSize(9).font('Helvetica-Oblique')
                       .text('Terms & Conditions:', 310, notesY);
                    doc.fillColor('#555555').font('Helvetica').fontSize(9)
                       .text(order.termsConditions, 310, notesY + 13, { width: 240 });
                }
            }

            // â”€â”€â”€ AUTHORIZED SIGNATURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const sigY = 710;
            doc.fillColor('#000000').fontSize(9).font('Helvetica')
               .text('Authorized Signature ____________________', 40, sigY);

            doc.end();
        });
    }

    static async generateReceipt(payment, company = {}) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const companyName = company.name || 'Your Company';
            const companyState = company.state || '';
            const companyEmail = company.email || '';

            // Derived receipt data
            const amount = payment.Transactions.reduce((s, t) => s + parseFloat(t.credit || 0), 0);
            const customer = payment.Transactions.find(t => {
                const groupName = (t.Ledger?.Group?.name || t.Ledger?.group?.name || '').toLowerCase();
                return groupName.includes('debtors') || 
                       groupName.includes('customer') || 
                       (parseFloat(t.credit || 0) > 0 && !groupName.includes('bank') && !groupName.includes('cash'));
            })?.Ledger;
            const bank = payment.Transactions.find(t => {
                const groupName = (t.Ledger?.Group?.name || t.Ledger?.group?.name || '').toLowerCase();
                return groupName.includes('bank') || 
                       groupName.includes('cash') || 
                       (parseFloat(t.debit || 0) > 0 && !groupName.includes('debtors') && !groupName.includes('customer'));
            })?.Ledger;

            const currency = customer?.currency || company?.baseCurrency || 'INR';
            const currencySymbol = getCurrencySymbol(currency);
            const format = (val) => formatAmount(val, currency);

            const customerName = customer?.name || 'Customer';
            const bankName = bank?.name || 'Bank Transfer';

            // --- HEADER ---
            doc.fillColor('#1e1b4b') // deep indigo
               .fontSize(16)
               .font('Helvetica-Bold')
               .text(companyName.toUpperCase(), 50, 50);
            
            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#64748b');

            let headerY = 70;
            if (companyState) { doc.text(companyState, 50, headerY); headerY += 13; }
            if (companyEmail) { doc.text(companyEmail, 50, headerY); }

            doc.fontSize(28)
               .font('Helvetica-Bold')
               .fillColor('#4338ca') // indigo 700
               .text('RECEIPT', 250, 50, { align: 'right' });

            doc.fontSize(10)
               .fillColor('#64748b')
               .text(`Receipt Number: ${payment.voucherNumber}`, 250, 85, { align: 'right' });

            // --- DECORATIVE LINE ---
            doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#e2e8f0').lineWidth(1).stroke();

            // --- HERO BANNER ---
            const bannerY = 130;
            doc.rect(50, bannerY, 500, 70).fill('#4f46e5'); // indigo 600

            doc.fillColor('#e0e7ff')
               .fontSize(9)
               .font('Helvetica-Bold')
               .text('TOTAL AMOUNT RECEIVED', 70, bannerY + 18);

            doc.fillColor('#ffffff')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text(`${currencySymbol} ${format(amount)}`, 70, bannerY + 34);

            doc.fillColor('#e0e7ff')
               .fontSize(9)
               .font('Helvetica-Bold')
               .text('PAYMENT DATE', 380, bannerY + 18, { align: 'right', width: 150 });

            doc.fillColor('#ffffff')
               .fontSize(14)
               .font('Helvetica-Bold')
               .text(new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }), 380, bannerY + 34, { align: 'right', width: 150 });

            // --- TRANSACTION DETAILS GRID ---
            const gridY = 225;
            doc.rect(50, gridY, 240, 70).strokeColor('#e2e8f0').lineWidth(1).stroke();
            doc.fillColor('#4f46e5').fontSize(8).font('Helvetica-Bold').text('RECEIVED FROM', 65, gridY + 15);
            doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(customerName, 65, gridY + 28, { width: 210, ellipsis: true });
            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Premium Partner Account', 65, gridY + 45);

            doc.rect(310, gridY, 240, 70).strokeColor('#e2e8f0').lineWidth(1).stroke();
            doc.fillColor('#4f46e5').fontSize(8).font('Helvetica-Bold').text('SETTLEMENT ACCOUNT', 325, gridY + 15);
            doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(bankName, 325, gridY + 28, { width: 210, ellipsis: true });
            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Verified Payment', 325, gridY + 45);

            // --- REMARKS ---
            const remarksY = 320;
            doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('SETTLEMENT REMARKS', 50, remarksY);
            doc.rect(50, remarksY + 15, 500, 60).fill('#f8fafc');
            doc.fillColor('#334155')
               .fontSize(10)
               .font('Helvetica-Oblique')
               .text(`"${payment.narration || 'Payment received from customer via Bank Transfer.'}"`, 65, remarksY + 30, { width: 470 });

            // --- COMPLIANCE / FOOTER ---
            const footerY = 410;
            doc.moveTo(50, footerY).lineTo(550, footerY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

            doc.fillColor('#10b981').fontSize(8).font('Helvetica-Bold').text('DIGITAL AUDIT LOGGED', 50, footerY + 20);
            doc.fillColor('#64748b').fontSize(8).font('Helvetica')
               .text(`This is an electronically generated receipt issued under the authority of ${companyName}.`, 50, footerY + 32, { width: 250 });

            // Stamp Circle
            const stampX = 350;
            const stampY = footerY + 25;
            doc.circle(stampX + 25, stampY + 25, 25).strokeColor('#c7d2fe').lineWidth(1.5).stroke();
            doc.fillColor('#4f46e5').fontSize(5).font('Helvetica-Bold')
               .text('SECURED', stampX + 11, stampY + 15, { align: 'center', width: 28 })
               .text('VERIFIED', stampX + 11, stampY + 24, { align: 'center', width: 28 })
               .text('CALTALLY', stampX + 11, stampY + 33, { align: 'center', width: 28 });

            // Signature
            const sigX = 420;
            doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Authorized Signature', sigX, footerY + 20, { align: 'center', width: 130 });
            doc.moveTo(sigX, footerY + 60).lineTo(sigX + 130, footerY + 60).strokeColor('#94a3b8').lineWidth(0.5).stroke();
            
            // Signature text placeholder
            const signatureText = (() => {
                const clean = companyName.toUpperCase().startsWith('THE ') ? companyName.slice(4) : companyName;
                const word = clean.split(' ')[0] || 'Manager';
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })();
            doc.fillColor('#4f46e5').fontSize(14).font('Helvetica-Oblique').text(signatureText, sigX, footerY + 42, { align: 'center', width: 130 });

            // --- BARCODE ---
            const barcodeY = 520;
            doc.fillColor('#0f172a');
            let barX = 220;
            const barWidths = [2, 1, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2];
            barWidths.forEach(w => {
                doc.rect(barX, barcodeY, w, 20).fill();
                barX += w + 1;
            });
            doc.fillColor('#64748b').fontSize(8).font('Courier-Bold').text(payment.voucherNumber, 220, barcodeY + 24, { tracking: 2 });

            doc.end();
        });
    }
}

module.exports = PDFService;

