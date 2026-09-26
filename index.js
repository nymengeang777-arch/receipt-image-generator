const express = require('express');
const nodeHtmlToImage = require('node-html-to-image');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/generate-receipt', async (req, res) => {
  try {
    const {
      receiptNo = "1-1000",
      date = new Date().toLocaleString(),
      customer = "អតិថិជនទូទៅ",
      items = [],
      totalMoney = 0,
      totalUSD = "0.00",
      paymentType = "បង់ប្រាក់ពេលក្រោយ",
      isUnpaid = true,
      qrUrl = "https://i.imgur.com/39PcZgX.jpeg"
    } = req.body;

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            width: 480px;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            font-family: 'Kantumruy Pro', sans-serif;
            color: #333333;
          }
          .header { text-align: center; border-bottom: 2px dashed #e0e0e0; padding-bottom: 16px; margin-bottom: 16px; }
          .store-name { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
          .store-info { font-size: 13px; color: #666; line-height: 1.4; }
          .receipt-title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 10px; }
          
          .meta-table { width: 100%; font-size: 13px; margin-bottom: 16px; }
          .meta-table td { padding: 3px 0; }
          .meta-label { color: #666; width: 35%; }
          .meta-value { font-weight: 600; text-align: right; }
          
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .items-table th { text-align: left; border-bottom: 1px solid #1a1a1a; padding: 6px 0; font-size: 12px; color: #555; }
          .items-table td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .col-r { text-align: right; }
          
          .total-box { border-top: 2px dashed #e0e0e0; padding-top: 12px; margin-bottom: 16px; }
          .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 6px; }
          .grand-total { font-size: 18px; font-weight: 700; color: #dc2626; }
          
          .status-badge {
            text-align: center;
            padding: 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 16px;
            background: ${isUnpaid ? '#fef2f2' : '#f0fdf4'};
            color: ${isUnpaid ? '#dc2626' : '#16a34a'};
            border: 1px solid ${isUnpaid ? '#fecaca' : '#bbf7d0'};
          }

          .qr-section { text-align: center; margin-top: 12px; }
          .qr-img { width: 220px; height: 220px; object-fit: contain; border-radius: 8px; }
          .footer-note { text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">ហាង អ៊ាង ភារ៉ា (EANG PHEARA)</div>
          <div class="store-info">ផ្លូវ 73 កោះកណ្តាល ក្រុងក្រចេះ<br>ទូរស័ព្ទ៖ (097) 900 0030</div>
          <div class="receipt-title">វិក្កយបត្រ / RECEIPT</div>
        </div>

        <table class="meta-table">
          <tr><td class="meta-label">លេខវិក្កយបត្រ:</td><td class="meta-value">${receiptNo}</td></tr>
          <tr><td class="meta-label">កាលបរិច្ឆេទ:</td><td class="meta-value">${date}</td></tr>
          <tr><td class="meta-label">អតិថិជន:</td><td class="meta-value">${customer}</td></tr>
          <tr><td class="meta-label">វិធីទូទាត់:</td><td class="meta-value">${paymentType}</td></tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>ទំនិញ</th>
              <th class="col-r">ចំនួន</th>
              <th class="col-r">តម្លៃ</th>
              <th class="col-r">សរុប</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td><b>${it.name || "ទំនិញ"}</b></td>
                <td class="col-r">${it.qty || 1}</td>
                <td class="col-r">${(it.price || 0).toLocaleString()}៛</td>
                <td class="col-r"><b>${((it.qty || 1) * (it.price || 0)).toLocaleString()}៛</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row grand-total">
            <span>តម្លៃសរុប (KHR):</span>
            <span>${Number(totalMoney).toLocaleString()} ៛</span>
          </div>
          <div class="total-row" style="color: #666; font-size: 13px;">
            <span>ជាប្រាក់ដុល្លារ (USD):</span>
            <span>$ ${totalUSD}</span>
          </div>
        </div>

        <div class="status-badge">
          ${isUnpaid ? '⚠️ មិនទាន់ទូទាត់ (សូមស្កេន KHQR ខាងក្រោម)' : '✅ បានទូទាត់រួចរាល់'}
        </div>

        ${isUnpaid ? `
          <div class="qr-section">
            <img class="qr-img" src="${qrUrl}" />
            <div style="font-size: 11px; color: #666; margin-top: 4px;">ស្កេនទូទាត់ប្រាក់តាម KHQR</div>
          </div>
        ` : ''}

        <div class="footer-note">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត!</div>
      </body>
      </html>
    `;

    const imageBuffer = await nodeHtmlToImage({
      html: htmlTemplate,
      type: 'png',
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => res.send('Receipt Image Generator is Running!'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
