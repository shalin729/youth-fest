# 🙏 Religious Program Registration — Next.js + MongoDB

Full-stack registration form with UPI payment, MongoDB storage, Google Sheets sync, and Admin dashboard.

---

## 🗂️ Project Structure

```
religious-registration/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Registration form (public)
│   │   ├── page.module.css       ← Styles
│   │   ├── admin/page.tsx        ← Admin dashboard
│   │   ├── api/register/route.ts ← POST: save registration
│   │   └── api/registrations/route.ts ← GET/PATCH: admin API
│   ├── lib/mongodb.ts            ← DB connection
│   └── models/Registration.ts   ← Mongoose schema
├── .env.local                    ← Your secrets (never commit this)
├── render.yaml                   ← Render deploy config
└── package.json
```

---

## ⚙️ Step 1 — MongoDB Atlas Setup (Free)

1. Go to **https://cloud.mongodb.com** → Create free account
2. Create a free **M0 cluster**
3. Under **Database Access** → Add user with password
4. Under **Network Access** → Add IP: `0.0.0.0/0` (allow all)
5. Click **Connect** → **Drivers** → Copy the connection string
6. Replace `<password>` with your DB user password

---

## ⚙️ Step 2 — Configure .env.local

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/religious-registration?retryWrites=true&w=majority
UPI_ID=yourname@okicici
UPI_PAYEE_NAME=Your Name or Org
GOOGLE_SHEET_URL=https://script.google.com/...  (optional)
ADMIN_PASSWORD=your_secret_password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Also add these to `next.config.js` for public env vars:
```js
const nextConfig = {
  env: {
    NEXT_PUBLIC_UPI_ID: process.env.UPI_ID,
    NEXT_PUBLIC_UPI_PAYEE: process.env.UPI_PAYEE_NAME,
  }
};
module.exports = nextConfig;
```

---

## 🚀 Step 3 — Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## ☁️ Step 4 — Deploy to Render (Free)

1. Push this project to **GitHub**
2. Go to **https://render.com** → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node version:** 18+
5. Add **Environment Variables** (same as .env.local):
   - `MONGODB_URI`
   - `ADMIN_PASSWORD`
   - `UPI_ID`
   - `UPI_PAYEE_NAME`
   - `NEXT_PUBLIC_APP_URL` = your Render URL
6. Click **Deploy** → Get your live URL like `https://religious-registration.onrender.com`

---

## 📱 Share on WhatsApp

Once deployed, share the Render URL directly in WhatsApp:
```
https://religious-registration.onrender.com
```
Anyone can open it on their phone and register!

---

## 🔐 Admin Dashboard

Visit: `https://your-app.onrender.com/admin`
- Enter your `ADMIN_PASSWORD`
- See all registrations with stats
- Filter by paid/pending/online/cash
- Search by name, mobile, village
- Mark cash payments as paid ✓

---

## 📊 Google Sheets Sync (Optional)

1. Create a Google Sheet with headers:
   `Timestamp | Reg ID | Name | Mobile | Email | Village | Mandal | Payment | Txn ID | Status`
2. Extensions → Apps Script → paste:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.timestamp, data.regId, data.name, data.mobile,
    data.email, data.village, data.mandal, data.payment,
    data.txnId, data.status
  ]);
  return ContentService.createTextOutput("OK");
}
```

3. Deploy → Web App → Anyone → Copy URL → paste in `GOOGLE_SHEET_URL`

---

## 🛡️ Features

- ✅ MongoDB stores all registrations permanently
- ✅ Duplicate mobile number detection
- ✅ UPI deep links (GPay, PhonePe, Paytm, BHIM)
- ✅ Admin dashboard with stats & search
- ✅ Google Sheets backup sync
- ✅ Unique Registration ID per user
- ✅ Cash payment tracking
- ✅ Mobile responsive design
