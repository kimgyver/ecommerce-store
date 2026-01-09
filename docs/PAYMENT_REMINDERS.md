# Payment Reminder System

## Overview

Automated payment reminder system for B2B customers with Purchase Orders (PO). The system sends email reminders at strategic intervals before and after the payment due date.

## Reminder Schedule

The system sends reminders at the following intervals:

1. **7 Days Before Due Date** - Early friendly reminder
2. **1 Day Before Due Date** - Urgent reminder (yellow/warning)
3. **Due Date** - Payment due today (orange)
4. **1 Day Overdue** - Overdue notice (red)
5. **7 Days Overdue** - Serious overdue escalation (dark red)

## How It Works

### 1. Database Tracking

- **Field**: `Order.paymentRemindersSent` (String array)
- **Purpose**: Tracks which reminder types have been sent
- **Example**: `["7_days_before", "1_day_before"]`
- **Prevents**: Duplicate reminders for the same order

### 2. Daily Cron Job

The system runs a daily check at 9:00 AM UTC via Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/payment-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 3. Reminder Logic (`lib/payment-reminders.ts`)

- Queries all `pending_payment` orders with PO numbers
- Calculates days until/since due date
- Checks if reminder should be sent today
- Verifies reminder hasn't been sent before
- Sends email and updates database

### 4. Email Templates

Professional HTML emails with:

- Urgency-based color coding (blue → yellow → orange → red)
- Order details (PO number, amount, due date)
- Payment instructions
- Overdue warnings (if applicable)

## Setup Instructions

### Option 1: Vercel Cron (Recommended for Vercel Deployments)

1. **Deploy to Vercel**

   ```bash
   vercel deploy --prod
   ```

2. **Verify Cron Configuration**

   - The `vercel.json` file is already configured
   - Vercel will automatically detect and schedule the cron job
   - Check Vercel Dashboard → Project → Settings → Cron Jobs

3. **Add Environment Variable (Optional)**

   ```bash
   # Add CRON_SECRET for authentication (optional but recommended)
   vercel env add CRON_SECRET
   # Enter a secure random string (e.g., generated with: openssl rand -base64 32)
   ```

4. **Monitor Execution**
   - View logs in Vercel Dashboard → Deployments → Functions
   - Check for "[Cron] Payment reminders job completed" messages

### Option 2: External Cron Service (For Non-Vercel Deployments)

If not using Vercel, use an external cron service:

#### **Services:**

- [cron-job.org](https://cron-job.org) (Free)
- [EasyCron](https://www.easycron.com) (Free tier)
- [UptimeRobot](https://uptimerobot.com) (Free monitoring + cron)

#### **Configuration:**

1. Create account on chosen service
2. Add new cron job:
   - **URL**: `https://your-domain.com/api/cron/payment-reminders`
   - **Schedule**: Daily at 9:00 AM (0 9 \* \* \*)
   - **Method**: GET or POST
   - **Headers** (if CRON_SECRET is set):
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

### Option 3: Manual Trigger (Testing)

For testing or manual execution:

```bash
# Without authentication
curl https://your-domain.com/api/cron/payment-reminders

# With authentication (if CRON_SECRET is set)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-domain.com/api/cron/payment-reminders
```

Or visit the URL in your browser (for development):

```
http://localhost:3000/api/cron/payment-reminders
```

## Email Configuration

### Development Mode

- All reminder emails sent to `ADMIN_EMAIL` (jinyoung777@gmail.com)
- Prevents accidental emails to real customers during testing

### Production Mode

- Emails sent to actual customer email addresses
- Set `NODE_ENV=production` in Vercel environment variables

## Testing the System

### 1. Create Test Order with Due Date

```sql
-- Set a test order's due date to trigger reminders
UPDATE "Order"
SET
  "paymentDueDate" = CURRENT_DATE + INTERVAL '1 day',  -- Due tomorrow
  "paymentRemindersSent" = ARRAY[]::TEXT[]              -- Reset reminders
WHERE "poNumber" = 'PO-2026-0009';
```

### 2. Run Manual Trigger

```bash
# Trigger the cron job manually
curl http://localhost:3000/api/cron/payment-reminders
```

### 3. Check Results

- **Email**: Check jinyoung777@gmail.com for reminder email
- **Database**: Verify `paymentRemindersSent` was updated
- **Console**: Look for "[Payment Reminders]" log messages

## Monitoring & Maintenance

### Check Overdue Orders

The system provides helper functions:

```typescript
import { getOverdueOrders, getUpcomingPayments } from "@/lib/payment-reminders";

// Get all overdue orders
const overdueOrders = await getOverdueOrders();

// Get orders due in next 7 days
const upcomingPayments = await getUpcomingPayments();
```

### Logs to Monitor

- `[Payment Reminders] Starting reminder check...`
- `[Payment Reminders] Found X PO orders to check`
- `[Payment Reminders] Sending {type} for order {id}`
- `[Payment Reminders] ✓ Sent {type} for {poNumber}`
- `[Payment Reminders] Completed: Processed X orders, sent Y reminders`

### Troubleshooting

**No reminders sent:**

- Check if cron job is running (Vercel logs)
- Verify orders have `status: "pending_payment"` and `paymentMethod: "po"`
- Ensure `paymentDueDate` is set
- Check `paymentRemindersSent` array hasn't already recorded the reminder

**Emails not received:**

- Verify `RESEND_API_KEY` is set
- Check spam folder
- Review email logs for errors
- Confirm `ADMIN_EMAIL` in development mode

**Duplicate reminders:**

- This should not happen due to `paymentRemindersSent` tracking
- If it does, check database for race conditions
- Review logs for duplicate executions

## Security

### Authentication

The cron endpoint supports optional authentication:

1. **Set CRON_SECRET in environment variables:**

   ```bash
   CRON_SECRET=your-secure-random-string-here
   ```

2. **Include in cron service configuration:**
   ```
   Authorization: Bearer your-secure-random-string-here
   ```

### Rate Limiting

- Consider adding rate limiting for the cron endpoint
- Vercel automatically limits concurrent executions

## Future Enhancements

Potential improvements:

- [ ] Customizable reminder schedules per distributor
- [ ] Admin dashboard showing upcoming reminders
- [ ] Manual "send reminder now" button in admin
- [ ] SMS reminders for critical overdue payments
- [ ] Automatic escalation to account managers
- [ ] Payment history and reminder analytics

## File Structure

```
lib/
  ├── email.ts                    # Email templates and sending logic
  ├── payment-reminders.ts        # Reminder scheduling and processing
  └── pdf-generator.ts            # PDF generation (for PO emails)

app/api/
  └── cron/
      └── payment-reminders/
          └── route.ts            # Cron endpoint

prisma/
  └── schema.prisma               # Order.paymentRemindersSent field

vercel.json                       # Cron job configuration
```

## Related Documentation

- [SETUP_DB.md](./SETUP_DB.md) - Database setup and migrations
- [SECURITY.md](./SECURITY.md) - Security best practices
- PO System - Main purchase order implementation
