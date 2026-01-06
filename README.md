# E-Commerce Store

A modern, full-stack e-commerce platform built with Next.js 16, React 19, and PostgreSQL. Features role-based B2B/B2C pricing, tiered volume discounts, complete admin dashboard, payment integration, and comprehensive product management system.

## Tech Stack

- **Frontend**: Next.js 16.1.0 with React 19 (App Router)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM v6.19.1
- **Authentication**: NextAuth.js (JWT-based sessions)
- **Payment**: Stripe integration with idempotent webhook handling
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript with full type coverage
- **File Storage**: Local filesystem (`/public/uploads/products/`)

## Features

### Core E-Commerce Features

- **Product Management** - Browse, search, and filter products by category
- **Shopping Cart** - Add/remove items with optimistic updates and real-time stock validation
- **User Authentication** - Register, login, and profile management with JWT sessions
- **Role-Based Pricing** - B2C (customer) vs B2B (distributor) pricing with automatic application
- **Tiered Volume Discounts** - Quantity-based pricing tiers for B2B customers
- **Order Management** - View order history with detailed status tracking and original price comparison
- **Payment System** - Stripe integration with idempotent webhook handling (prevents duplicate orders)
- **Inventory Management** - Automatic stock depletion on order completion with low stock alerts

### Admin Dashboard

- **Product CRUD** - Create, read, update, delete products with image uploads
- **B2B Pricing Management** - Set custom pricing and quantity-based discount tiers per distributor
- **Order Management** - View and update order statuses in real-time
- **User Management** - View and manage customer and distributor accounts
- **Statistics Dashboard** - View sales metrics and analytics
- **Responsive Admin Layout** - Collapsible sidebar with proper navigation

### User Experience

- **Stock Status Display** - Visual indicators for in-stock, low-stock, and out-of-stock items
- **Purchase Controls** - Disabled checkout for out-of-stock products with quantity validation
- **Direct Quantity Input** - Type quantity directly instead of using +/- buttons only
- **Volume Discount Visualization** - Real-time tier pricing display with cart quantity consideration
- **Price Comparison** - Original price shown with strikethrough when B2B discounts apply
- **Product Reviews** - Full review/rating system with 1-5 star ratings
- **Related Products** - Automatic category-based product recommendations
- **Instant Feedback** - Button loading states, success messages, and error handling

### Localization & Quality

- **Complete English Localization** - All UI text in English
- **Type Safety** - 100% TypeScript with strict type checking
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Error Handling** - Comprehensive error handling across all features

## Database Schema

### Core Models

- **User** - Authentication, profile management, and role-based access (customer/distributor/admin)
- **Product** - Product catalog with inventory tracking
- **Order** - Order management with payment intent tracking
- **OrderItem** - Line items with price and basePrice for discount tracking
- **Cart** - User shopping carts
- **CartItem** - Items in shopping carts
- **Review** - Product reviews and ratings
- **Wishlist** - User wishlist management
- **DistributorPrice** - B2B custom pricing and quantity-based discount tiers

## Key Implementation Details

### Payment Processing

- **Payment Flow**:

  1. Customer completes checkout and confirms payment
  2. Stripe processes payment and returns confirmation
  3. Webhook triggered on payment success
  4. Order created with `pending` status
  5. Stock automatically decremented for each item
  6. Cart cleared after successful order
  7. (Admin action needed) → `processing` → `shipped` → `delivered`

- Idempotent webhook handling using unique `paymentIntentId` (prevents duplicate orders)
- Automatic order creation on successful payment
- Stock depletion in atomic transaction with order creation
- Cart clearing after successful payment

### Cart Management

- Optimistic updates for better UX
- Real-time stock validation
- Quantity enforcement based on available stock
- Persistent cart storage per user

### Authentication

- JWT-based sessions with NextAuth.js
- Role-based access control (customer, distributor, admin)
- Protected routes for admin and checkout
- Session persistence across requests
- Automatic logout on session expiration

### B2B Pricing System

- **Role-Based Pricing**:

  - Customers see standard B2C prices
  - Distributors see custom B2B prices with automatic discounts
  - Admin can configure pricing per distributor per product

- **Tiered Volume Discounts**:

  - Configure multiple quantity-based price tiers
  - Example: 1-10 units @ $54, 11-50 units @ $49, 51+ units @ $44
  - Automatic tier application based on total quantity (cart + selected)
  - Real-time visual indication of active tier on product pages

- **Price Transparency**:
  - Original price shown with strikethrough when discount applies
  - Applies to product cards, detail pages, cart, checkout, and order history
  - Historical pricing preserved in order records (basePrice field)

### Stock Management

- **Stock Status Display**:

  - `Stock = 0` → **"Out of Stock"** (Red) - Purchase button disabled
  - `Stock 1-5` → **"Low Stock"** (Orange) - Warning displayed
  - `Stock 6+` → **"In Stock"** (Green) - Available for purchase

- **Inventory Features**:
  - Automatic decrement on order completion
  - Real-time stock validation at checkout
  - Quantity limits enforced based on available stock
  - Visual stock indicators on product pages and cards
  - Purchase controls disabled for out-of-stock items
  - Real-time inventory updates across all users

## Review System

- **Submit Reviews** - Authenticated users can rate (1-5 stars) and review products
- **View Reviews** - Display average rating with star visualization and review list
- **Manage Reviews** - Users can delete their own reviews
- **Admin Control** - Future: Review management in admin dashboard

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for payments)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ecommerce-store
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Set up the database:

```bash
npx prisma migrate dev
npx prisma db seed
```

6. Run the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Application Access

### End User Access (Customer)

1. **Browse Products**

   - Visit [http://localhost:3000](http://localhost:3000)
   - Click "Products" in the navigation
   - Browse all products or filter by category

2. **User Registration**

   - Click "Register" in the top navigation
   - Fill in email and password
   - Account created and ready to use

3. **User Login**

   - Click "Login" in the top navigation
   - Enter email and password
   - Redirected to homepage after successful login

4. **Shopping**

   - Add products to cart
   - View cart: Click cart icon in header
   - Proceed to checkout
   - Complete payment via Stripe

5. **Order History**

   - After login, click "Orders" in navigation
   - View all past orders with status
   - Click order to see details

6. **User Profile**

   - Click "Profile" in navigation
   - View account information
   - Change password if needed

7. **Product Reviews**
   - Go to any product detail page
   - Scroll to "Customer Reviews" section
   - Click "Write Review" button (requires login)
   - Submit rating and review

### Admin Access (Administrator)

1. **Admin Login**

   - Visit [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
   - Use admin credentials (created during seeding or via NextAuth)
   - Admin user typically needs to be marked in database

2. **Admin Dashboard**

   - After login, click "Admin" in header (appears only for admin)
   - Or navigate to [http://localhost:3000/admin](http://localhost:3000/admin)

3. **Product Management**

   - Go to `Admin > Products`
   - **View Products**: See all products with search functionality
   - **Add Product**: Click "Add Product" button
     - Fill in name, description, price, stock
     - Upload product image
     - Select category
     - Click "Create Product"
   - **Edit Product**: Click edit icon next to product
     - Update any field
     - Change or update image
     - Click "Update Product"
   - **Delete Product**: Click delete icon, confirm deletion

4. **B2B Pricing Management**

   - Go to `Admin > B2B Pricing`
   - **Select Distributor**: Choose a distributor from the dropdown
   - **View Pricing**: See all products with current B2B pricing
   - **Set Custom Price**: Click "Set Price" next to product
     - Enter custom base price for distributor
     - Add quantity-based discount tiers:
       - Min Qty, Max Qty (leave empty for unlimited), Price
       - Example: 1-10 → $54, 11-50 → $49, 51+ → $44
     - Click "Save Pricing"
   - **Delete Pricing**: Remove custom pricing to revert to standard price

5. **Order Management**

   - Go to `Admin > Orders`
   - **View Orders**: See all orders with customer info
   - **Filter by Status**: Use status dropdown to filter
   - **Update Status**: Click status dropdown on order
     - Options: pending, processing, shipped, delivered, cancelled
     - Changes update in real-time

6. **User Management**

   - Go to `Admin > Users`
   - View all users with their roles (customer/distributor/admin)
   - See registration dates and account details

7. **Statistics & Analytics**
   - Go to `Admin > Statistics`
   - View key metrics:
     - Total Revenue
     - Total Orders
     - Total Products
     - Active Users
   - View recent orders and top products

### Database Management (Prisma Studio)

**Prisma Studio** provides a web UI to view and manage your database directly.

1. **Open Prisma Studio**

   ```bash
   npx prisma studio
   ```

   - Automatically opens [http://localhost:5555](http://localhost:5555) in your browser

2. **View Data**

   - Left sidebar shows all database models
   - Click any model to view records
   - See all fields and relationships

3. **Edit Records**

   - Click on any record to edit
   - Update fields directly in the UI
   - Click "Save" to persist changes

4. **Create Records**

   - Click "Add record" button
   - Fill in required fields
   - Click "Save"

5. **Delete Records**

   - Click on a record
   - Click "Delete" button
   - Confirm deletion

6. **Useful Tables**
   - **User** - Manage user accounts and credentials
   - **Product** - View/edit products and inventory
   - **Order** - See all orders with payment details
   - **Review** - View/manage product reviews
   - **Cart** - Check active user carts

### Quick Reference URLs

| Page               | URL                                     | Access        |
| ------------------ | --------------------------------------- | ------------- |
| Homepage           | http://localhost:3000                   | Public        |
| Products           | http://localhost:3000/products          | Public        |
| Product Detail     | http://localhost:3000/products/[id]     | Public        |
| Register           | http://localhost:3000/auth/register     | Public        |
| Login              | http://localhost:3000/auth/login        | Public        |
| Shopping Cart      | http://localhost:3000/cart              | Authenticated |
| Checkout           | http://localhost:3000/checkout          | Authenticated |
| Order History      | http://localhost:3000/orders            | Authenticated |
| User Profile       | http://localhost:3000/profile           | Authenticated |
| Admin Dashboard    | http://localhost:3000/admin             | Admin Only    |
| Product Management | http://localhost:3000/admin/products    | Admin Only    |
| B2B Pricing        | http://localhost:3000/admin/b2b-pricing | Admin Only    |
| Order Management   | http://localhost:3000/admin/orders      | Admin Only    |
| User Management    | http://localhost:3000/admin/users       | Admin Only    |
| Statistics         | http://localhost:3000/admin/statistics  | Admin Only    |
| Prisma Studio      | http://localhost:5555                   | Development   |

## Project Structure

```
├── app/
│   ├── (admin)/                 # Admin routes
│   │   └── admin/
│   ├── (store)/                 # Customer-facing routes
│   ├── api/                     # API endpoints
│   ├── auth/                    # Authentication pages
│   ├── products/                # Product pages
│   └── layout.tsx
├── components/                  # Reusable components
│   ├── admin/                   # Admin components
│   ├── ReviewForm.tsx           # Review submission form
│   ├── ReviewsList.tsx          # Review display
│   └── ...
├── lib/                         # Utilities and helpers
│   ├── auth.ts                  # NextAuth config
│   ├── cart-context.tsx         # Cart state management
│   ├── pricing.ts               # B2B pricing logic
│   ├── prisma.ts                # Prisma client
│   └── products-server.ts       # Server-side product queries
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
└── public/
    └── uploads/products/        # Product image storage
```

## API Endpoints

### Products

- `GET /api/products` - List all products (with role-based pricing)
- `GET /api/products/[id]` - Get product details (with tiered pricing info for distributors)
- `POST /api/products` - Create product (admin)
- `PUT /api/products/[id]` - Update product (admin)
- `DELETE /api/products/[id]` - Delete product (admin)

### Reviews

- `GET /api/reviews?productId=[id]` - Get product reviews
- `POST /api/reviews` - Submit review (authenticated)
- `PUT /api/reviews/[id]` - Update review (owner)
- `DELETE /api/reviews/[id]` - Delete review (owner)

### Orders

- `GET /api/orders` - Get user orders
- `GET /api/orders/[id]` - Get order details
- `POST /api/orders` - Create order
- `PATCH /api/orders/[id]` - Update order status (admin)

### Cart

- `GET /api/cart` - Get user cart (with B2B pricing applied)
- `POST /api/cart` - Add to cart
- `PUT /api/cart/[productId]` - Update cart item
- `DELETE /api/cart/[productId]` - Remove from cart

### B2B Pricing

- `GET /api/admin/b2b-pricing/[distributorId]` - Get pricing rules for distributor (admin)
- `GET /api/admin/b2b-pricing/[distributorId]/[productId]` - Get specific product pricing (admin)
- `POST /api/admin/b2b-pricing/[distributorId]/[productId]` - Create/update pricing (admin)
- `DELETE /api/admin/b2b-pricing/[distributorId]/[productId]` - Delete custom pricing (admin)

### Payments

- `POST /api/payments` - Create payment intent
- `POST /api/webhooks/payment-success` - Stripe webhook handler

## Admin Dashboard Features

### Dashboard

- **Statistics** - Total revenue, orders, products, active users
- **Recent Orders** - Latest 10 orders with status
- **Top Products** - Best-selling products

### Product Management

- **List Products** - Search and filter products
- **Create Product** - Form with image upload
- **Edit Product** - Update product details and images
- **Delete Product** - Remove products with confirmation

### B2B Pricing Management

- **Distributor Selection** - Dropdown to select distributor
- **Product Pricing List** - View all products with current B2B pricing
- **Discount Tier Summary** - Visual overview of quantity-based pricing
- **Set Custom Pricing** - Configure base price and multiple discount tiers
- **Delete Pricing** - Remove custom pricing to revert to standard

### Order Management

- **View Orders** - Filter by status (pending, processing, shipped, delivered, cancelled)
- **Update Status** - Change order status in real-time
- **Order Details** - View items, customer info, payment details, and price history

### User Management

- **View Users** - List all users with role information
- **User Details** - Registration dates and account information

## Future Enhancements

- [ ] Email notifications for order status updates
- [ ] Advanced product filtering (price range, ratings)
- [ ] Coupon/discount system for B2C customers
- [ ] Manual related products configuration
- [ ] Analytics dashboard with charts and graphs
- [ ] Multi-language support
- [ ] Product recommendations AI
- [ ] Inventory alerts and reorder notifications
- [ ] Product variants (size, color, etc.)
- [ ] Wishlist management UI
- [ ] Export pricing rules and orders to CSV/Excel
- [ ] Bulk pricing updates for distributors

## Troubleshooting

### Prisma Client Issues

If you encounter errors like "Unknown argument `basePrice`" after schema changes:

```bash
npx prisma generate
```

Then restart the development server.

### Database Migration

After pulling new code with schema changes:

```bash
npx prisma migrate dev
npx prisma generate
```

## License

MIT

## Author

Created with Next.js and modern web technologies.
