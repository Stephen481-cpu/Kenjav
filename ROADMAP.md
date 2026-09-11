# KENJAV Roadmap

This roadmap covers both the **KENJAV-M online store** and the **KENJAV Wholesale** system.

## Phase 1 — Core Foundation

### KENJAV-M
- [x] React/Vite customer storefront
- [x] Express backend
- [x] PostgreSQL database
- [x] Product API
- [x] Offers API
- [x] Order API
- [x] Admin authentication
- [x] Admin product management
- [x] Admin offers management
- [x] Admin order management
- [x] Customer management
- [x] Order tracking
- [x] M-Pesa integration foundation
- [x] Google Maps directions

### Wholesale
- [x] React/Vite wholesale dashboard
- [x] Admin login
- [x] Shopkeeper management
- [x] Purchase recording
- [x] Payment recording
- [x] Credit balance calculation
- [x] Credit limit
- [x] Daily report

---

# Phase 2 — Combine the Systems

## Goal

Make KENJAV-M and Wholesale use one backend and one PostgreSQL database.

### Backend
- [ ] Add `shopkeepers` table
- [ ] Add `purchases` table
- [ ] Add `payments` table
- [ ] Add wholesale routes
- [ ] Connect wholesale routes to existing `adminAuth`
- [ ] Test all wholesale endpoints
- [ ] Confirm PostgreSQL-only architecture
- [ ] Remove any remaining MongoDB/Mongoose code

### Frontend
- [ ] Add `wholesale/` application to the KENJAV-M repository
- [ ] Point `VITE_API_URL` to the shared backend
- [ ] Confirm admin authentication
- [ ] Test shopkeeper dashboard
- [ ] Test purchase recording
- [ ] Test payment recording
- [ ] Test reports

---

# Phase 3 — Inventory Management

## KENJAV-M
- [ ] Product stock quantity
- [ ] Stock status
- [ ] Low-stock indicator
- [ ] Stock adjustment history
- [ ] Automatic stock reduction after completed orders

## Wholesale
- [ ] Wholesale stock allocation
- [ ] Stock deduction after wholesale purchase
- [ ] Stock replenishment
- [ ] Low-stock alerts
- [ ] Inventory dashboard

## Database
- [ ] `inventory`
- [ ] `stock_movements`
- [ ] Product-to-inventory relationships
- [ ] Transaction-safe stock updates

---

# Phase 4 — Wholesale Product & Pricing System

- [ ] Wholesale product catalogue
- [ ] Retail price
- [ ] Wholesale price
- [ ] Quantity-based pricing
- [ ] Minimum wholesale quantity
- [ ] Product availability
- [ ] Wholesale offers
- [ ] Shopkeeper-specific pricing

Example:

```text
Retail price:
1 item = KES 10

Wholesale:
100 items = KES 8 each
500 items = KES 7 each
1000 items = KES 6.50 each
```

---

# Phase 5 — Credit Management

- [ ] Credit limit
- [ ] Outstanding balance
- [ ] Payment history
- [ ] Purchase history
- [ ] Credit status
- [ ] Overdue debt detection
- [ ] Debt ageing
- [ ] Payment reminders
- [ ] Shopkeeper statement
- [ ] Printable/downloadable statement

Credit statuses:

```text
GOOD STANDING
APPROACHING LIMIT
OVER LIMIT
NO LIMIT SET
```

---

# Phase 6 — Wholesale Orders

Move from manually recording purchases to a proper wholesale ordering workflow.

- [ ] Create wholesale order
- [ ] Add multiple products
- [ ] Calculate order total
- [ ] Apply wholesale prices
- [ ] Apply credit rules
- [ ] Confirm order
- [ ] Prepare order
- [ ] Mark ready
- [ ] Dispatch/deliver
- [ ] Complete order
- [ ] Cancel order

Suggested statuses:

```text
PENDING
CONFIRMED
PREPARING
READY
DISPATCHED
COMPLETED
CANCELLED
```

---

# Phase 7 — Payments

## M-Pesa
- [ ] Wholesale M-Pesa payments
- [ ] Payment reference
- [ ] Automatic payment matching
- [ ] Payment reconciliation
- [ ] Failed-payment handling
- [ ] Refund handling

## Cash
- [ ] Record cash payment
- [ ] Receipt number
- [ ] Staff member who received payment

---

# Phase 8 — Shopkeeper Portal

Eventually shopkeepers should have their own accounts.

### Shopkeeper features

- [ ] Login
- [ ] Dashboard
- [ ] Browse wholesale products
- [ ] Place order
- [ ] View orders
- [ ] View outstanding credit
- [ ] View payment history
- [ ] Download statement
- [ ] View invoices
- [ ] Notifications
- [ ] Profile
- [ ] Settings

---

# Phase 9 — USSD / Low-Internet Support

For shopkeepers who do not always have reliable internet:

- [ ] USSD menu
- [ ] Check balance
- [ ] Check credit limit
- [ ] View recent purchases
- [ ] View recent payments
- [ ] Place simple order
- [ ] Receive confirmation
- [ ] Payment notifications

Example:

```text
*123#

1. My Balance
2. Credit Limit
3. Recent Orders
4. Make Payment
5. Place Order
6. Contact KENJAV
```

---

# Phase 10 — Notifications

- [ ] New order notification
- [ ] Order ready notification
- [ ] Payment confirmation
- [ ] Credit limit warning
- [ ] Overdue payment reminder
- [ ] Low-stock notification
- [ ] New offer notification

Possible channels:

- SMS
- WhatsApp
- Email
- Web push

---

# Phase 11 — Reporting & Analytics

## Retail reports
- [ ] Daily sales
- [ ] Weekly sales
- [ ] Monthly sales
- [ ] Best-selling products
- [ ] Order count
- [ ] Payment statistics

## Wholesale reports
- [ ] Daily wholesale sales
- [ ] Monthly wholesale sales
- [ ] Total outstanding debt
- [ ] Top shopkeepers
- [ ] Largest debtors
- [ ] Payment trends
- [ ] Product demand

## Combined business dashboard
- [ ] Retail revenue
- [ ] Wholesale revenue
- [ ] Total revenue
- [ ] Total outstanding credit
- [ ] Stock value
- [ ] Best-selling products
- [ ] Best customers/shopkeepers

---

# Phase 12 — Staff & Permissions

Move beyond a single admin account.

Roles:

```text
SUPER ADMIN
MANAGER
SALES STAFF
WHOLESALE STAFF
DELIVERY STAFF
ACCOUNTANT
```

Permissions should determine who can:

- View orders
- Edit products
- Record payments
- Change credit limits
- View financial reports
- Manage staff
- Access wholesale
- Change system settings

---

# Phase 13 — Invoices & Documents

- [ ] Wholesale invoice generation
- [ ] Retail receipts
- [ ] Payment receipts
- [ ] Shopkeeper statements
- [ ] PDF export
- [ ] Print support
- [ ] Invoice numbering

---

# Phase 14 — Delivery Management

- [ ] Delivery addresses
- [ ] Delivery zones
- [ ] Delivery fees
- [ ] Delivery assignment
- [ ] Driver dashboard
- [ ] Delivery status
- [ ] Customer delivery tracking
- [ ] Wholesale delivery scheduling

---

# Phase 15 — Reliability & Security

- [ ] Input validation
- [ ] Rate limiting
- [ ] Secure authentication
- [ ] Strong password handling
- [ ] Role-based permissions
- [ ] Audit logs
- [ ] Database backups
- [ ] Error monitoring
- [ ] API logging
- [ ] Transaction handling
- [ ] Production HTTPS
- [ ] CORS hardening
- [ ] Secret management

---

# Phase 16 — Performance

- [ ] Database indexes
- [ ] Pagination
- [ ] API response optimization
- [ ] PostgreSQL query optimization
- [ ] Image optimization
- [ ] Frontend code splitting
- [ ] Caching where appropriate
- [ ] Background jobs for notifications

---

# Phase 17 — Business Intelligence

Future analytics can answer:

```text
Which products sell most?

Which shopkeepers buy most?

Which shopkeepers pay late?

Which products generate the highest revenue?

How much money is currently tied up in credit?

What is the average order value?

What is the retail vs wholesale revenue split?

Which days have the highest sales?
```

---

# Phase 18 — Final KENJAV Platform

The long-term target is:

```text
                         KENJAV
                           |
        ┌──────────────────┼──────────────────┐
        |                  |                  |
      Retail           Wholesale          Operations
        |                  |                  |
    Customers         Shopkeepers        Staff/Drivers
        |                  |                  |
        └──────────────────┼──────────────────┘
                           |
                      Express API
                           |
                    PostgreSQL/Aiven
                           |
        ┌──────────────────┼──────────────────┐
        |                  |                  |
     Payments          Inventory          Analytics
        |                  |                  |
      M-Pesa            Stock             Reports
```

## Priority Order

If development time or money is limited, use this order:

### Highest priority
1. PostgreSQL stability
2. KENJAV-M ordering
3. Admin management
4. M-Pesa
5. Wholesale integration
6. Inventory
7. Credit management

### Medium priority
8. Wholesale orders
9. Shopkeeper portal
10. Reports
11. Notifications
12. Invoices
13. Delivery management

### Later
14. USSD
15. Advanced analytics
16. Staff roles
17. Automation
18. Business intelligence

---

# Definition of Success

KENJAV will be considered a mature platform when:

- Customers can order online.
- Customers can pay through M-Pesa.
- Admin can manage products and orders.
- Stock is tracked automatically.
- Wholesale customers can place orders.
- Shopkeeper credit is tracked accurately.
- Payments automatically update balances.
- Staff have appropriate permissions.
- Management can see retail and wholesale performance.
- Shopkeepers can access their own statements and orders.
- The entire business runs from one PostgreSQL database and one central API.
