# CalBooks — Complete Feature Testing Guide
## End-to-End Testing with Sample Data

> **Company Name:** (Your newly created company)
> **Financial Year:** April 2026 – March 2027
> This guide follows a real-world business flow from Day 1 setup to final reports.

---

## 📋 Phase 1: Initial Setup (Accounting Foundation)

### Step 1.1 — Verify Default Ledgers & Groups
**Where:** Sidebar → **Accounting** → **Ledgers**

After creating the company, these should already exist automatically:

| Ledger Name | Group | Nature |
|---|---|---|
| Cash | Cash-in-Hand | Assets |
| Capital Account | Capital Account | Liabilities |
| Purchase Account | Purchase Accounts | Expenses |
| Sales Account | Sales Accounts | Income |
| CGST Input | Duties & Taxes | Liabilities |
| CGST Output | Duties & Taxes | Liabilities |
| SGST Input | Duties & Taxes | Liabilities |
| SGST Output | Duties & Taxes | Liabilities |
| IGST Input | Duties & Taxes | Liabilities |
| IGST Output | Duties & Taxes | Liabilities |

✅ **Check:** All 10 ledgers + 25 groups should be present.

---

### Step 1.2 — Create Additional Ledgers You'll Need
**Where:** Sidebar → **Accounting** → **Ledgers** → Click **"+ New Ledger"**

Create these ledgers one by one:

| # | Ledger Name | Group | Opening Balance |
|---|---|---|---|
| 1 | SBI Bank Account | Bank Accounts | ₹500,000 |
| 2 | HDFC Bank Account | Bank Accounts | ₹200,000 |
| 3 | Rent Expense | Indirect Expenses | ₹0 |
| 4 | Salary Expense | Indirect Expenses | ₹0 |
| 5 | Electricity Expense | Indirect Expenses | ₹0 |
| 6 | Office Supplies | Indirect Expenses | ₹0 |
| 7 | Furniture & Fixtures | Fixed Assets | ₹0 |

✅ **Check:** After creating, go back to Ledgers list. You should now see 17 ledgers total.

---

## 📋 Phase 2: Customer & Vendor Setup

### Step 2.1 — Create Customers
**Where:** Sidebar → **Sales** → **Customers** → Click **"+ New"**

| Field | Customer 1 | Customer 2 |
|---|---|---|
| **Name** | Rajesh Electronics | Priya Textiles |
| **Email** | rajesh@electronics.com | priya@textiles.in |
| **Phone** | 9876543210 | 9876543211 |
| **GSTIN** | 33AABCR1234A1Z5 | 29AADCP5678B1Z6 |
| **State** | Tamil Nadu | Karnataka |
| **Address** | 45 Mount Road, Chennai | 12 MG Road, Bangalore |
| **Opening Balance** | ₹0 | ₹0 |

✅ **Check:** Both customers appear in the Customers list.

---

### Step 2.2 — Create Vendors (Suppliers)
**Where:** Sidebar → **Purchases** → **Vendors** → Click **"+ New"**

| Field | Vendor 1 | Vendor 2 |
|---|---|---|
| **Name** | Kumar Suppliers | National Traders |
| **Email** | kumar@suppliers.in | info@nationaltraders.com |
| **Phone** | 9988776655 | 9988776656 |
| **GSTIN** | 33AABCK9876C1Z2 | 27AAACN5432D1Z7 |
| **State** | Tamil Nadu | Maharashtra |
| **Address** | 78 Anna Nagar, Chennai | 56 Nariman Point, Mumbai |
| **Opening Balance** | ₹0 | ₹0 |

✅ **Check:** Both vendors appear in the Vendors list.

---

## 📋 Phase 3: Inventory Setup

### Step 3.1 — Create Stock Items
**Where:** Sidebar → **Inventory** → Click **"+ New Item"**

| Field | Item 1 | Item 2 | Item 3 |
|---|---|---|---|
| **Name** | Laptop Dell Inspiron | USB-C Cable | Wireless Mouse |
| **SKU/Code** | LAP-001 | CAB-001 | MOU-001 |
| **Unit** | Nos | Nos | Nos |
| **GST Rate** | 18% | 18% | 18% |
| **Selling Price** | ₹55,000 | ₹500 | ₹1,200 |
| **Purchase Price** | ₹45,000 | ₹300 | ₹800 |
| **Opening Stock** | 0 | 0 | 0 |

✅ **Check:** All 3 items appear in the Inventory list with ₹0 stock value.

---

## 📋 Phase 4: Core Accounting Transactions (Voucher Engine)

### Step 4.1 — Owner's Capital Investment (Receipt Voucher)
**Where:** Sidebar → **Accounting** → **Vouchers** → **"+ New Voucher"**

> **Scenario:** Owner invests ₹5,00,000 as starting capital into the SBI bank account.

| Field | Value |
|---|---|
| **Voucher Type** | Receipt |
| **Date** | 01-04-2026 |
| **Narration** | Owner capital investment - Starting capital |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | SBI Bank Account | 500000 |
| 2 | **Cr** | Capital Account | 500000 |

✅ **Check:** SBI Bank balance should increase. Capital Account should show ₹5,00,000 credit.

---

### Step 4.2 — Test UNBALANCED Entry (Must FAIL!)
**Where:** Same → **"+ New Voucher"**

> **Scenario:** Intentionally create a wrong entry.

| Field | Value |
|---|---|
| **Voucher Type** | Journal |
| **Date** | 01-04-2026 |
| **Narration** | This should fail - unbalanced test |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Cash | 10000 |
| 2 | **Cr** | Sales Account | 7000 |

✅ **Check:** System MUST show error: **"INTEGRITY ERROR: Unbalanced journal entry"**. The entry should NOT be saved.

---

### Step 4.3 — Purchase on Credit (Journal Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Purchased goods worth ₹90,000 from Kumar Suppliers on credit (within Tamil Nadu → CGST + SGST).

| Field | Value |
|---|---|
| **Voucher Type** | Journal |
| **Date** | 05-04-2026 |
| **Narration** | Credit purchase from Kumar Suppliers - Laptops |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Purchase Account | 90,000 |
| 2 | **Dr** | CGST Input | 8,100 |
| 3 | **Dr** | SGST Input | 8,100 |
| 4 | **Cr** | Kumar Suppliers* | 1,06,200 |

> *If Kumar Suppliers doesn't appear as a ledger, it may have been auto-created under Sundry Creditors when you added them as a vendor. Check your Ledgers list.

✅ **Check:** 
- Total Dr (90,000 + 8,100 + 8,100) = ₹1,06,200 = Total Cr. ✓ Balanced.
- Kumar Suppliers ledger shows ₹1,06,200 outstanding.

---

### Step 4.4 — Sale on Credit (Journal Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Sold goods worth ₹1,50,000 to Rajesh Electronics on credit (within Tamil Nadu → CGST + SGST).

| Field | Value |
|---|---|
| **Voucher Type** | Journal |
| **Date** | 10-04-2026 |
| **Narration** | Credit sale to Rajesh Electronics - Laptops |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Rajesh Electronics* | 1,77,000 |
| 2 | **Cr** | Sales Account | 1,50,000 |
| 3 | **Cr** | CGST Output | 13,500 |
| 4 | **Cr** | SGST Output | 13,500 |

> *Same as above — check if Rajesh Electronics exists as a ledger under Sundry Debtors.

✅ **Check:**
- Total Dr ₹1,77,000 = Total Cr (1,50,000 + 13,500 + 13,500). ✓ Balanced.
- Rajesh Electronics owes you ₹1,77,000.

---

### Step 4.5 — Payment to Vendor (Payment Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Paid Kumar Suppliers ₹50,000 from SBI bank.

| Field | Value |
|---|---|
| **Voucher Type** | Payment |
| **Date** | 15-04-2026 |
| **Narration** | Part payment to Kumar Suppliers via bank transfer |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Kumar Suppliers | 50,000 |
| 2 | **Cr** | SBI Bank Account | 50,000 |

✅ **Check:**
- Kumar Suppliers balance reduces from ₹1,06,200 to ₹56,200.
- SBI Bank balance decreases by ₹50,000.

---

### Step 4.6 — Receipt from Customer (Receipt Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Received ₹1,00,000 from Rajesh Electronics into SBI bank.

| Field | Value |
|---|---|
| **Voucher Type** | Receipt |
| **Date** | 20-04-2026 |
| **Narration** | Received partial payment from Rajesh Electronics |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | SBI Bank Account | 1,00,000 |
| 2 | **Cr** | Rajesh Electronics | 1,00,000 |

✅ **Check:**
- Rajesh Electronics balance reduces from ₹1,77,000 to ₹77,000.
- SBI Bank increases by ₹1,00,000.

---

### Step 4.7 — Pay Rent (Payment Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Paid ₹25,000 office rent from SBI.

| Field | Value |
|---|---|
| **Voucher Type** | Payment |
| **Date** | 01-05-2026 |
| **Narration** | Office rent for April 2026 |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Rent Expense | 25,000 |
| 2 | **Cr** | SBI Bank Account | 25,000 |

---

### Step 4.8 — Pay Electricity (Payment Voucher)
**Where:** **"+ New Voucher"**

| Field | Value |
|---|---|
| **Voucher Type** | Payment |
| **Date** | 05-05-2026 |
| **Narration** | Electricity bill for April 2026 |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Electricity Expense | 5,000 |
| 2 | **Cr** | SBI Bank Account | 5,000 |

---

### Step 4.9 — Cash Withdrawal from Bank (Contra Voucher)
**Where:** **"+ New Voucher"**

> **Scenario:** Withdraw ₹20,000 from SBI for petty cash.

| Field | Value |
|---|---|
| **Voucher Type** | Contra |
| **Date** | 10-05-2026 |
| **Narration** | Cash withdrawn from SBI ATM for petty cash |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Cash | 20,000 |
| 2 | **Cr** | SBI Bank Account | 20,000 |

✅ **Check:**
- Cash increases by ₹20,000.
- SBI decreases by ₹20,000.
- **Net total assets unchanged** (money just moved internally).

---

### Step 4.10 — Pay Salary (Payment Voucher)
**Where:** **"+ New Voucher"**

| Field | Value |
|---|---|
| **Voucher Type** | Payment |
| **Date** | 30-05-2026 |
| **Narration** | Staff salary for May 2026 |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Salary Expense | 40,000 |
| 2 | **Cr** | SBI Bank Account | 40,000 |

---

## 📋 Phase 5: Verify Reports

### Step 5.1 — Trial Balance
**Where:** Sidebar → **Reports** → **Trial Balance**

After entering ALL the above transactions, your Trial Balance should show:

| Ledger | Debit (₹) | Credit (₹) |
|---|---|---|
| **SBI Bank Account** | 9,85,000* | — |
| **Cash** | 20,000 | — |
| **Purchase Account** | 90,000 | — |
| **CGST Input** | 8,100 | — |
| **SGST Input** | 8,100 | — |
| **Rent Expense** | 25,000 | — |
| **Electricity Expense** | 5,000 | — |
| **Salary Expense** | 40,000 | — |
| **Rajesh Electronics** | 77,000 | — |
| **Capital Account** | — | 5,00,000 |
| **Sales Account** | — | 1,50,000 |
| **CGST Output** | — | 13,500 |
| **SGST Output** | — | 13,500 |
| **Kumar Suppliers** | — | 56,200 |
| **HDFC Bank Account** | 2,00,000 | — |
| **TOTAL** | **15,58,200** | **7,33,200** |

> *SBI = Opening 5,00,000 + Capital 5,00,000 + Receipt 1,00,000 − Payment 50,000 − Rent 25,000 − Electricity 5,000 − Cash 20,000 − Salary 40,000 = **9,60,000**

> ⚠️ Note: The exact balances depend on whether your ledgers track opening balances within the Trial Balance or separately. The KEY check is: **Total Debits = Total Credits** (perfectly balanced).

✅ **Check:** The bottom line MUST show equal Debit and Credit totals. If not, something is broken.

---

### Step 5.2 — Profit & Loss
**Where:** Sidebar → **Reports** → **Profit & Loss**

| Category | Amount (₹) |
|---|---|
| **Income** | |
| Sales Account | 1,50,000 |
| **Total Income** | **1,50,000** |
| | |
| **Expenses** | |
| Purchase Account | 90,000 |
| Rent Expense | 25,000 |
| Salary Expense | 40,000 |
| Electricity Expense | 5,000 |
| **Total Expenses** | **1,60,000** |
| | |
| **Net Profit (Loss)** | **(10,000)** ← Loss |

✅ **Check:** You should see a net **loss of ₹10,000** (expenses exceed income for this period). This is expected for a new business!

---

### Step 5.3 — Balance Sheet
**Where:** Sidebar → **Reports** → **Balance Sheet**

| Category | Amount (₹) |
|---|---|
| **ASSETS** | |
| SBI Bank Account | 9,60,000 |
| HDFC Bank Account | 2,00,000 |
| Cash | 20,000 |
| Rajesh Electronics (Debtor) | 77,000 |
| CGST Input | 8,100 |
| SGST Input | 8,100 |
| **Total Assets** | **12,73,200** |
| | |
| **LIABILITIES** | |
| Capital Account | 5,00,000 |
| Kumar Suppliers (Creditor) | 56,200 |
| CGST Output | 13,500 |
| SGST Output | 13,500 |
| **Total Liabilities** | **5,83,200** |
| | |
| **Owner's Equity + Liabilities** | Must equal Total Assets |

---

### Step 5.4 — Audit Trail
**Where:** Sidebar → **Reports** → **Audit Trails**

✅ **Check:** Every voucher you created should appear here with timestamp, user name, and action type (CREATE).

---

## 📋 Phase 6: Period Lock (Fiscal Control)

### Step 6.1 — Lock a Period
**Where:** Sidebar → **Accounting** → Look for **Period Lock** or **Settings**

1. Set a **Lock Date** to `31-05-2026`
2. Save the lock

### Step 6.2 — Try Backdated Entry (Must FAIL!)
**Where:** **Vouchers** → **"+ New Voucher"**

| Field | Value |
|---|---|
| **Voucher Type** | Journal |
| **Date** | **15-04-2026** (before the lock date!) |
| **Narration** | This should be blocked by period lock |

| Row | Type | Ledger | Amount |
|---|---|---|---|
| 1 | **Dr** | Cash | 1,000 |
| 2 | **Cr** | Sales Account | 1,000 |

✅ **Check:** System MUST show error: **"PERIOD LOCKED: Transaction date is within a locked period."** Entry should NOT be saved.

---

## 📊 Summary Checklist

| # | Feature | Test | Expected |
|---|---|---|---|
| 1 | Default Groups & Ledgers | Check after company creation | 25 groups + 10 ledgers auto-created |
| 2 | Create Ledger | Create SBI Bank, Rent, etc. | Appears in list ✓ |
| 3 | Create Customer | Add Rajesh Electronics | Appears in customer list ✓ |
| 4 | Create Vendor | Add Kumar Suppliers | Appears in vendor list ✓ |
| 5 | Create Inventory Item | Add Laptop, Cable, Mouse | Appears in inventory ✓ |
| 6 | Unbalanced Entry | Dr ≠ Cr | **BLOCKED** with integrity error ✓ |
| 7 | Balanced Journal | Dr = Cr | Saved with auto voucher number ✓ |
| 8 | Payment Voucher | Pay vendor / expense | SBI balance decreases ✓ |
| 9 | Receipt Voucher | Receive from customer | SBI balance increases ✓ |
| 10 | Contra Voucher | Bank → Cash transfer | Internal transfer only ✓ |
| 11 | Trial Balance | After all entries | Total Dr = Total Cr ✓ |
| 12 | Profit & Loss | After entries | Shows ₹10,000 loss ✓ |
| 13 | Balance Sheet | After entries | Assets = Liabilities + Equity ✓ |
| 14 | Audit Trail | Check report | All actions logged ✓ |
| 15 | Period Lock | Lock + backdate test | Backdated entry **BLOCKED** ✓ |

---

> 💡 **Tip:** Follow the steps in order (Phase 1 → 2 → 3 → 4 → 5 → 6) because each phase builds on the data from the previous one.
