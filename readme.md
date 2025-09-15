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
```
##📝 Rules

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
```
Example Rules JSON
[
  { "field": "Total Spend", "operator": ">", "value": "1000", "logic": "AND" },
  { "field": "Last Visit Date", "operator": ">", "value": "2025-01-01" }
]
```
##⚙️ Query Builder
```
Example:
Rules:

[
  { "field": "Total Spend", "operator": ">", "value": "1000" }
]


Generated SQL:

SELECT * FROM customers WHERE total_spend > $1


With params: [1000]
```
##DEMO
<img width="1919" height="1019" alt="image" src="https://github.com/user-attachments/assets/720b99d7-ec44-4dfa-bc35-6d73931bcb30" />
<img width="1918" height="1009" alt="image" src="https://github.com/user-attachments/assets/26cadd30-f611-4f40-bafb-23989368326d" />
<img width="1909" height="930" alt="image" src="https://github.com/user-attachments/assets/8814c7c6-340c-4922-8fdb-3b9942818476" />
<img width="1917" height="1012" alt="image" src="https://github.com/user-attachments/assets/3f3e20cd-1cd7-4152-8cc1-5488de08d37e" />
<img width="1918" height="1022" alt="image" src="https://github.com/user-attachments/assets/a64187c7-d65b-4870-82b3-8ce0fdf53dbe" />
<img width="1919" height="1020" alt="image" src="https://github.com/user-attachments/assets/e4c7e6fe-5b9d-40b8-8268-f9ef3ec18d41" />
<img width="1919" height="1017" alt="image" src="https://github.com/user-attachments/assets/44a9ec7b-42a8-4f6f-9a1a-0d52dfdbb223" />
<img width="1361" height="906" alt="image" src="https://github.com/user-attachments/assets/30ad92ee-d629-4483-96c7-f56c94798fba" />
<img width="1443" height="995" alt="image" src="https://github.com/user-attachments/assets/9387d111-71c7-4c06-92d2-c4cfc9714816" />
<img width="1442" height="939" alt="image" src="https://github.com/user-attachments/assets/85a8c2f4-e4bb-45a5-b424-d82ed74b08a2" />









