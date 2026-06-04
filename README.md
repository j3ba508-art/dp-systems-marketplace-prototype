# Multi-Seller Marketplace Prototype

A working multi-seller marketplace prototype built with vanilla HTML, CSS, JavaScript, and Supabase.

This project was created as a portfolio case study to demonstrate backend-oriented marketplace development using Supabase Auth, relational database tables, Row Level Security, Storage, and PostgreSQL RPC transactions.

## Project Status

Working prototype / portfolio case study.

The core marketplace flow is functional:

- Buyer product browsing
- Add to cart
- Cart quantity updates
- Guest checkout
- Buyer code lookup
- Multi-seller order splitting
- Stock validation
- Seller dashboard
- Product CRUD
- Order status management
- Order tracking
- Buyer reviews
- Seller review moderation

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Supabase Auth
- Supabase Database
- Supabase Storage
- PostgreSQL RPC
- Row Level Security policies
- Vite for local development
- GitHub and Vercel for deployment

## Main Features

### Buyer Marketplace

Buyers can browse products, add items to cart, and proceed through checkout without creating a full account.

The buyer flow includes:

- Product listing
- Cart persistence
- Quantity controls
- Stock-aware cart behavior
- Guest buyer information form
- Buyer code lookup
- Checkout validation
- Order tracking by order number

### Multi-Seller Checkout

The cart supports products from multiple sellers.

During checkout, the system automatically groups cart items by seller and creates separate seller-specific orders.

Example:

- One cart may contain products from Seller A and Seller B.
- Checkout creates one order for Seller A and another order for Seller B.
- Each seller only sees their own orders in the dashboard.

### Inventory Safety

The project includes multiple stock safety layers:

1. Add-to-cart stock checking
2. Cart revalidation before checkout
3. Final database-side order transaction

The final checkout step uses a PostgreSQL RPC transaction to help prevent overselling when stock is limited.

### Seller Dashboard

Sellers can log in and manage their store through a dedicated dashboard.

Seller dashboard features include:

- Revenue summary
- Pending orders
- Total active products
- Pending reviews indicator
- Product add/edit/delete
- Product stock management
- Order status updates
- Review approval/hiding

### Order Tracking

Buyers can track orders using an order number.

The tracking page displays:

- Order status
- Ordered items
- Order total
- Seller contact options
- Review form for completed orders

### Reviews and Moderation

Buyers can leave product reviews after an order is completed.

Reviews are submitted as pending and can be approved or hidden by the seller before being displayed publicly.

## Backend Design

The backend uses Supabase with relational tables for:

- profiles
- sellers
- products
- buyers
- orders
- order_items
- reviews

The seller identity model uses the `sellers` table as the true seller record.

Products and orders are linked to `sellers.id`.

Supabase Auth is used for seller login, while guest buyers use buyer information and buyer codes.

## Key Backend Lessons

This project focused heavily on backend correctness, including:

- Seller identity consistency
- Multi-seller order grouping
- Stock validation
- Database transaction design
- RLS policy debugging
- Review moderation security
- Auth-to-profile-to-seller mapping

## Screenshots

### Marketplace Home

![Marketplace Home](assets/marketplace-home.png)

### Cart and Checkout

![Cart and Checkout](assets/cart-checkout.png)

### Order Tracking

![Order Tracking](assets/order-tracking.png)

### Seller Dashboard

![Seller Dashboard](assets/seller-dashboard.png)

### Product Management

![Product CRUD Overlay](assets/product-crud-overlay.png)

### Supabase Backend

![Supabase Backend](assets/supabase-backend.png)

## What This Project Demonstrates

This project demonstrates practical skills in:

- Supabase backend development
- PostgreSQL table design
- RPC transaction design
- Row Level Security policies
- Authenticated seller workflows
- Guest buyer checkout
- Vanilla JavaScript app structure
- Real-world debugging
- Marketplace business logic
- Portfolio-ready full-stack implementation

## Role

Built as a Supabase Backend & DevOps Developer portfolio project with full-stack implementation using basic UI, vanilla JavaScript, and a real Supabase backend.

## Notes

This is a working prototype intended for portfolio demonstration and further refinement. Future improvements may include payment integration, delivery tracking, Google Maps seller meetup locations, and production-grade admin tools.