# 📦 Monorepo: Server + Mini-CRM

This project is a **monorepo** containing two main parts:  
1. **Backend (server)**  
2. **Frontend (mini-crm)**  

---

## 🖥️ Backend (Server)

**Runtime:** Node.js  
**Framework:** Express.js  
**Authentication:** Passport.js with Google OAuth 2.0 Strategy  
**Database:** PostgreSQL (Supabase)  
**AI:** Google Gemini Pro API for content generation  
**Email:** Nodemailer for sending emails  
**Environment Management:** dotenv  

---

## 💻 Frontend (Mini-CRM)

**Framework:** React / Next.js  
**Styling:** Tailwind CSS  
**UI Components:** Shadcn UI  
**State Management:** React Context API  
**API Communication:** Axios (or fetch)  

---

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and testing.

### ✅ Prerequisites
- Node.js (v18 or later recommended)  
- npm or pnpm package manager  
- Supabase account for PostgreSQL database  
- Google Cloud Platform credentials for OAuth  
- Google AI API key for Gemini  

---

# 📩 Campaign Creation System (Backend)

This module enables users to create **targeted campaigns**, fetch matching customers based on rules, and send personalized campaign emails in a safe and scalable way.

---

## 🔎 How It Works

The system is composed of four main parts:

1. **Campaign API (`createCampaign`)**  
   Handles campaign creation, rule validation, customer matching, email sending, and final reporting.

2. **Rule Validation (`validateRules`)**  
   Ensures user-defined rules are valid and properly structured.

3. **Query Builder (`buildCustomerQuery`)**  
   Converts validated rules into safe, parameterized SQL queries.

4. **Customer Matching (`getMatchingCustomers`)**  
   Executes SQL queries against the `customers` table and returns matching rows.

---

## 🚀 Campaign Flow

### 1. Creating a Campaign
- Validate request:
  - `name` must be at least 3 characters.  
  - `message_template` must be at least 10 characters.  
  - `rules_json` must be a non-empty array.  
- Verify user exists.  
- Fetch matching customers using `getMatchingCustomers`.  
- Enforce optional limit (`MAX_CAMPAIGN_RECIPIENTS`, default `10,000`).  
- Insert campaign into the `campaigns` table with `status = processing`.  

### 2. Processing Customers
- Insert each customer into the `campaign_customers` table with status `PENDING`.  
- Send emails in **batches of 10** to avoid overwhelming the email service.  
- Update each record to `SENT` or `FAILED` with timestamps and error messages.  

### 3. Finalizing Campaign
- Update campaign with:
  - `emails_sent`  
  - `emails_failed`  
  - Final `status` (`completed`, `failed`, or `partially_completed`).  

### 4. API Response Example
```json
{
  "success": true,
  "message": "Campaign created and processed successfully",
  "campaign": {
    "id": 1,
    "name": "Loyal Customers Campaign",
    "totalCustomers": 120,
    "emailsSent": 110,
    "emailsFailed": 10,
    "status": "partially_completed"
  },
  "details": {
    "failureRate": "8.3%",
    "sampleErrors": [
      { "customerId": 12, "email": "x@example.com", "error": "SMTP error" }
    ]
  }
}

📝 Rules

Rules define how customers are selected for a campaign.

Supported Fields

Total Spend → maps to total_spend

Total Visits → maps to total_visits

Last Visit Date → maps to last_visit

Supported Operators

>

<

=

Supported Logic Operators

AND

OR

Example Rules JSON
[
  { "field": "Total Spend", "operator": ">", "value": "1000", "logic": "AND" },
  { "field": "Last Visit Date", "operator": ">", "value": "2025-01-01" }
]

⚙️ Query Builder

Example:
Rules:

[
  { "field": "Total Spend", "operator": ">", "value": "1000" }
]


Generated SQL:

SELECT * FROM customers WHERE total_spend > $1


With params: [1000]