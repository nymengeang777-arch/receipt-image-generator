const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/generate-receipt', async (req, res) => {
  let browser = null;
  try {
    const {
      receiptNo = '',
      date = '',
      customer = 'អតិថិជនទូទៅ',
      items = [],
      totalMoney = 0,
      currency = 'USD', // ទទួលរូបិយប័ណ្ណពី Loyverse (USD ឬ KHR)
      paymentType = 'Cash',
      isUnpaid = false,
      qrUrl = 'https://i.imgur.com/39PcZgX.jpeg'
    } = req.body;

    const exchangeRate = 4100; // អត្រាប្តូរប្រាក់
    const rawTotal = Number(totalMoney || 0);

    // ត្រួតពិនិត្យប្រភេទលុយ៖ បើមានពាក្យ USD ឬតម្លៃសរុបតូចជាង ១០០០ ចាត់ទុកជាដុល្លារ
    const isUSD = String(currency).toUpperCase() === 'USD' || (rawTotal < 1000 && rawTotal > 0);

    let displayPrimaryTotal = '';
    let displaySecondaryTotal = '';

    if (isUSD) {
      // ករណីជាប្រាក់ដុល្លារ ($)
      displayPrimaryTotal = `$${rawTotal.toFixed(2)}`;
      displaySecondaryTotal = `≈ ${(Math.round(rawTotal * exchangeRate)).toLocaleString()} ៛`;
    } else {
      // ករណីជាប្រាក់រៀល (៛)
      displayPrimaryTotal = `${Math.round(rawTotal).toLocaleString()} ៛`;
      displaySecondaryTotal = `≈ $${(rawTotal / exchangeRate).toFixed(2)}`;
    }

    // រៀបចំបន្ទាត់ទំនិញ (Item Rows) ដោយដាក់សញ្ញា $ ឬ ៛ តាមប្រភេទលុយ
    const itemsRows = items.map((it, idx) => {
      const priceNum = Number(it.price || 0);
      const qtyNum = Number(it.qty || 1);
      const itemTotal = qtyNum * priceNum;

      const priceText = isUSD ? `$${priceNum.toFixed(2)}` : `${Math.round(priceNum).toLocaleString()}៛`;
      const totalText = isUSD ? `$${itemTotal.toFixed(2)}` : `${Math.round(itemTotal).toLocaleString()}៛`;

      return `
        <tr>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; font-size: 13px;">${idx + 1}. ${it.name}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; font-size: 13px; text-align: center;">${qtyNum}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; font-size: 13px; text-align: right;">${priceText}</td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; font-size: 13px; text-align: right; font-weight: bold;">${totalText}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Kantumruy Pro', sans-serif; }
        body { margin: 0; padding: 20px; background-color: #f1f5f9; display: flex; justify-content: center; }
        .card { width: 380px; background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 14px; }
        .store-name { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0; }
        .store-info { font-size: 12px; color: #64748b; margin-top: 4px; }
        .meta-row { display: flex; justify-content: space-between; font-size: 13px; color: #334155; margin-bottom: 6px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 14px; }
        .table th { background: #f8fafc; font-size: 12px; color: #475569; padding: 8px 4px; border-bottom: 2px solid #e2e8f0; }
        .total-box { background: #f8fafc; border-radius: 10px; padding: 12px; margin-top: 10px; border: 1px solid #e2e8f0; }
        .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: 700; color: #0f172a; }
        .total-sub { font-size: 13px; color: #0284c7; font-weight: 600; text-align: right; margin-top: 2px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 6px; }
        .unpaid { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .paid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .qr-section { text-align: center; margin-top: 16px; padding-top: 14px; border-top: 2px dashed #cbd5e1; }
        .qr-img { width: 170px; height: 170px; border-radius: 10px; border: 1px solid #e2e8f0; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 14px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="card" id="receipt-card">
        <div class="header">
          <div class="store-name">ហាង អ៊ាង ភារ៉ា</div>
          <div class="store-info">ផ្លូវ 73 រកាកណ្តាល ក្រុងក្រចេះ | 097 900 0030</div>
        </div>
        <div class="meta-row"><span>វិក្កយបត្រ:</span><span style="font-weight: 700;">#${receiptNo}</span></div>
        <div class="meta-row"><span>កាលបរិច្ឆេទ:</span><span>${date}</span></div>
        <div class="meta-row"><span>អតិថិជន:</span><span style="font-weight: 600;">${customer}</span></div>
        <div class="meta-row"><span>វិធីទូទាត់:</span><span>${paymentType}</span></div>

        <table class="table">
          <thead>
            <tr>
              <th style="text-align: left;">ទំនិញ</th>
              <th>ចំនួន</th>
              <th style="text-align: right;">តម្លៃ</th>
              <th style="text-align: right;">សរុប</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="4" style="text-align:center; padding: 10px;">ទំនិញទូទៅ</td></tr>'}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>តម្លៃសរុប:</span>
            <span style="color: #b91c1c;">${displayPrimaryTotal}</span>
          </div>
          <div class="total-sub">${displaySecondaryTotal}</div>
          <div style="text-align: right;">
            <span class="status-badge ${isUnpaid ? 'unpaid' : 'paid'}">
              ${isUnpaid ? '⚠️ មិនទាន់ទូទាត់' : '✅ បានទូទាត់រួច'}
            </span>
          </div>
        </div>

        ${isUnpaid && qrUrl ? `
          <div class="qr-section">
            <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">ស្កេនទូទាត់ប្រាក់ (KHQR)</div>
            <img class="qr-img" src="${qrUrl}" />
          </div>
        ` : ''}

        <div class="footer">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត!</div>
      </div>
    </body>
    </html>
    `;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 800, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const element = await page.$('#receipt-card');
    const imageBuffer = await element.screenshot({ type: 'png' });

    await browser.close();
    browser = null;

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    if (browser) await browser.close();
    console.error('Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
