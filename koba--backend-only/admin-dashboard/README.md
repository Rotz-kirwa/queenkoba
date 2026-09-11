# Queen Koba Admin Dashboard

A premium, luxury admin dashboard for managing Queen Koba's global beauty e-commerce operations.

## ✅ What's Been Implemented

### Core System
- ✅ Authentication system with JWT
- ✅ Role-based access control (RBAC)
- ✅ Responsive sidebar navigation (15 sections)
- ✅ Top header with search and user menu
- ✅ Dashboard with KPIs and alerts
- ✅ Luxury beauty design system (ivory/cocoa/gold colors)

### Pages Created
1. **Dashboard** - KPIs, revenue, orders, alerts
2. **Products** - Product management (placeholder)
3. **Orders** - Order management (placeholder)
4. **Customers** - Customer CRM (placeholder)
5. **Inventory** - Stock & batch tracking (placeholder)
6. **Login** - Admin authentication

### Design System
- Custom color palette (ivory, nude, cocoa, gold, emerald)
- Playfair Display (headings) + Inter (body)
- Tailwind CSS with custom components
- Responsive layout

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /home/user/Public/koba/admin
npm install
```

### 2. Start Backend (Required)
In a separate terminal:
```bash
cd /home/user/Public/koba/backend/queen-koba-backend
source venv/bin/activate
python queenkoba_mongodb.py
```

### 3. Start Admin Frontend
```bash
cd /home/user/Public/koba/admin
npm run dev
```

### 4. Access Admin Dashboard
- URL: **http://localhost:5174**
- Login: `admin@queenkoba.com` / `admin123`

## 📁 Project Structure

```
admin/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx    ✅ Complete
│   │   │   ├── AdminHeader.tsx     ✅ Complete
│   │   │   └── AdminLayout.tsx     ✅ Complete
│   │   ├── dashboard/              ⏳ Partial
│   │   ├── products/               📝 To Do
│   │   ├── orders/                 📝 To Do
│   │   └── customers/              📝 To Do
│   ├── pages/
│   │   ├── Login.tsx               ✅ Complete
│   │   ├── Dashboard.tsx           ✅ Complete
│   │   ├── Products.tsx            ⏳ Placeholder
│   │   ├── Orders.tsx              ⏳ Placeholder
│   │   ├── Customers.tsx           ⏳ Placeholder
│   │   └── Inventory.tsx           ⏳ Placeholder
│   ├── lib/
│   │   └── api.ts                  ✅ Complete
│   ├── context/
│   │   └── AdminAuthContext.tsx    ✅ Complete
│   ├── App.tsx                     ✅ Complete
│   ├── main.tsx                    ✅ Complete
│   └── index.css                   ✅ Complete
├── .env                            ✅ Complete
├── tailwind.config.js              ✅ Complete
├── vite.config.ts                  ✅ Complete
└── package.json                    ✅ Complete
```

## 🎨 Design System

### Colors
```css
--ivory: #FAF8F5        /* Background */
--nude: #F5F1ED         /* Secondary background */
--cocoa: #8B6F47        /* Primary brand color */
--gold: #D4AF37         /* Accent/highlights */
--emerald: #50C878      /* Success states */
```

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)

### Components
- `.admin-card` - White card with border and shadow
- `.admin-btn-primary` - Cocoa button
- `.admin-btn-secondary` - White button with cocoa border
- `.admin-input` - Form input with cocoa focus ring

## 🔐 Authentication

### Login Flow
1. User enters email/password
2. Frontend calls `/admin/auth/login`
3. Backend validates credentials
4. Returns JWT token + user data
5. Token stored in localStorage
6. User redirected to dashboard

### Protected Routes
All `/admin/*` routes require authentication. Unauthenticated users are redirected to `/login`.

### Roles Supported
- `super_admin` - Full access
- `product_manager` - Products, reviews
- `inventory_manager` - Stock, batches
- `support_agent` - Tickets, customers
- `finance_admin` - Payments, reports
- `marketing_admin` - Promotions, campaigns

## 📊 Dashboard Features

### KPI Cards
- Total Revenue (last 30 days)
- Total Orders
- Total Customers
- Conversion Rate

### Alerts
- Low Stock Items
- Expiring Soon (batches within 90 days)

## 🔧 Backend API Endpoints

The admin system connects to these backend endpoints:

### Authentication
```
POST /admin/auth/login
```

### Dashboard
```
GET /admin/dashboard/kpis
```

### Products
```
GET    /admin/products
POST   /admin/products
PUT    /admin/products/:id
DELETE /admin/products/:id
```

### Orders
```
GET /admin/orders
PUT /admin/orders/:id/status
```

### Customers
```
GET /admin/customers
```

## 📝 Next Steps to Complete

### High Priority
1. **Products Page** - Full CRUD with:
   - Product list with filters
   - Create/edit product form
   - Ingredient management
   - Batch tracking
   - Image upload

2. **Orders Page** - Order management with:
   - Order list with status filters
   - Order details view
   - Status update workflow
   - Fulfillment tracking

3. **Customers Page** - CRM with:
   - Customer list
   - Customer profile
   - Order history
   - Tags and segments

### Medium Priority
4. **Inventory Page** - Stock management
5. **Promotions Page** - Discount codes
6. **Reviews Page** - Review moderation
7. **Support Page** - Ticket system

### Low Priority
8. **Analytics Page** - Advanced reports
9. **Compliance Page** - Batch recalls
10. **Team Page** - User management
11. **Settings Page** - System configuration

## 🛠️ Development Guide

### Adding a New Page

1. Create page component in `src/pages/`:
```typescript
// src/pages/NewPage.tsx
export default function NewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif text-gray-900">New Page</h1>
      <div className="admin-card p-6">
        {/* Content */}
      </div>
    </div>
  );
}
```

2. Add route in `src/App.tsx`:
```typescript
<Route path="newpage" element={<NewPage />} />
```

3. Navigation is already set up in `AdminSidebar.tsx`

### Adding API Endpoint

1. Add to `src/lib/api.ts`:
```typescript
export const api = {
  // ... existing methods
  getNewData: async () => {
    const res = await fetch(`${API_URL}/admin/newdata`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },
};
```

2. Use in component with React Query:
```typescript
const { data } = useQuery({
  queryKey: ['newdata'],
  queryFn: api.getNewData,
});
```

## 📚 Documentation

- **Architecture**: See `ADMIN_ARCHITECTURE.md`
- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`
- **Complete Code**: See `COMPLETE_CODE.md`

## 🎯 Features Roadmap

### Phase 1 (Current)
- [x] Authentication & RBAC
- [x] Dashboard with KPIs
- [x] Navigation structure
- [ ] Product management
- [ ] Order management
- [ ] Customer management

### Phase 2
- [ ] Inventory & batch tracking
- [ ] Promotions & discounts
- [ ] Review moderation
- [ ] Support tickets
- [ ] Analytics & reports

### Phase 3
- [ ] Compliance & safety
- [ ] Team management
- [ ] Audit logs
- [ ] Export tools
- [ ] Advanced search

## 🐛 Troubleshooting

### Backend Not Running
```bash
# Check if backend is running
curl http://localhost:5000/health

# If not, start it
cd /home/user/Public/koba/backend/queen-koba-backend
source venv/bin/activate
python queenkoba_mongodb.py
```

### Login Fails
1. Ensure backend is running
2. Check MongoDB is running: `docker ps | grep mongo`
3. Verify admin user exists in database
4. Check browser console for errors

### Port Already in Use
```bash
# Kill process on port 5174
lsof -ti:5174 | xargs kill -9

# Or change port in vite.config.ts
```

## 📞 Support

For issues or questions:
1. Check documentation in `/admin/` directory
2. Review backend logs
3. Check browser console for errors

---

**Built with**: React + TypeScript + Vite + Tailwind CSS + React Query

**Status**: MVP Complete ✅ | Full Implementation In Progress ⏳
