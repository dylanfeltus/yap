# Quick Start - X OAuth & Analytics

## What Was Built

### ✅ Feature 1: X OAuth 2.0 Flow
- **Confidential client** implementation (NOT PKCE)
- OAuth routes: authorize, callback, status, disconnect
- Token refresh automatically handled
- UI in sidebar shows connection status
- Single X account support

### ✅ Feature 2: Real Analytics from X API
- Fetches real tweet metrics from X API v2
- Metrics: impressions, likes, retweets, bookmarks, replies
- Refresh button in analytics page
- Auto token refresh when expired
- Updates existing Analytics records

## How to Use

### 1. Connect X Account
1. Open http://localhost:3333
2. Look at sidebar (left side)
3. Click "Connect X Account" button
4. Authorize on X OAuth page
5. You'll be redirected back → sidebar shows @username

### 2. Refresh Analytics
1. Go to Analytics page (sidebar menu)
2. Click "Refresh from X" button (top right)
3. Wait for data to fetch from X API
4. Analytics update with real engagement numbers

## Environment Variables (Already Set)
```
X_CLIENT_ID=TklBMjZQVGx2emNhcDlXT0c2Wk46MTpjaQ
X_CLIENT_SECRET=ATZvBwRoDA28Enh0T15hYpV0fEPN3WInhtH-1rldE6byi6d6rc
```

## Database Changes
- Added `XAccount` table
- Migration applied: `20260225142833_add_x_account`
- Prisma client regenerated

## Build Status
✅ **Build successful** - no errors
✅ **TypeScript** - all types correct
✅ **Prisma** - schema synced

## Start Dev Server
```bash
cd /path/to/yap
npm run dev
```

App runs on: **http://localhost:3333**

## API Endpoints Created
- `GET /api/auth/x/authorize` - Start OAuth
- `GET /api/auth/callback/twitter` - OAuth callback
- `GET /api/auth/x/status` - Check connection
- `POST /api/auth/x/disconnect` - Disconnect
- `POST /api/analytics/refresh` - Fetch from X

## Files Created/Modified
### New Files:
- `src/lib/x-auth.ts` - OAuth helpers
- `src/lib/x-api.ts` - X API calls
- `src/app/api/auth/x/authorize/route.ts`
- `src/app/api/auth/x/status/route.ts`
- `src/app/api/auth/x/disconnect/route.ts`
- `src/app/api/auth/callback/twitter/route.ts`
- `src/app/api/analytics/refresh/route.ts`

### Modified Files:
- `prisma/schema.prisma` - Added XAccount model
- `src/components/sidebar.tsx` - Added X connection UI
- `src/app/analytics/page.tsx` - Added refresh button

## Testing
1. **OAuth Flow:**
   - Connect account → check sidebar shows @username
   - Disconnect → check sidebar shows connect button

2. **Analytics:**
   - Post a tweet manually on X
   - Add to ScheduledPost table with externalId = tweet ID
   - Click "Refresh from X" → verify real data loads

## Next Steps
- Test OAuth flow end-to-end
- Post test tweet and fetch analytics
- Verify token auto-refresh works after expiry

---

**Implementation complete and ready to use!** 🚀
