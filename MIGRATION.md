# Step 2: Migration to Self-Hosted Architecture

This document outlines the plan to migrate from Turso Cloud (managed) to self-hosted libSQL with namespace-per-user architecture.

## Current Architecture (Turso Cloud)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Expo RN    │────▶│  Supabase    │────▶│  Turso Cloud │
│    App      │     │    Auth      │     │  (Managed)   │
└─────────────┘     └──────────────┘     └──────────────┘
```

## Target Architecture (Self-Hosted)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Expo RN    │────▶│  Cloudflare  │────▶│  libSQL Server   │
│    App      │     │   Workers    │     │   (Fly.io)       │
│             │     │  (Namespace  │     │                  │
│             │     │   Manager)   │     │  ┌─────────────┐ │
└─────────────┘     └──────┬───────┘     │  │ Namespace 1 │ │
                           │             │  │  (user_001) │ │
                           │             │  └─────────────┘ │
                           │             │  ┌─────────────┐ │
                           │             │  │ Namespace 2 │ │
                           ▼             │  │  (user_002) │ │
                    ┌──────────────┐     │  └─────────────┘ │
                    │  Supabase    │     │  ┌─────────────┐ │
                    │    Auth      │     │  │ Namespace 3 │ │
                    │  (Webhook)   │     │  │  (user_003) │ │
                    └──────────────┘     │  └─────────────┘ │
                                         └──────────────────┘
```

## Cost Comparison

### Turso Cloud (Current)
- **Database**: $2/month per database (scales poorly with many users)
- **Sync**: $0.15/GB egress
- **1000 users**: ~$2000/month + sync costs

### Self-Hosted (Target)
- **Fly.io VM**: ~$5-20/month (depending on size)
- **Storage**: ~$0.15/GB/month
- **Cloudflare Workers**: Free tier (100k requests/day)
- **1000 users**: ~$20-50/month total

**Savings**: ~95% cost reduction at scale

## Migration Plan

### Phase 1: Backend API (Cloudflare Workers)

Create a Cloudflare Worker that:
1. Receives Supabase Auth webhooks (user.created)
2. Creates libSQL namespace via Admin API
3. Mints custom JWT with namespace claim
4. Serves connection config to mobile app

**Files to create:**
- `workers/namespace-manager/index.ts` - Main worker
- `workers/namespace-manager/wrangler.toml` - Config
- `workers/namespace-manager/package.json`

**API Endpoints:**
```
POST /webhooks/supabase   - User creation webhook
POST /auth/token          - Exchange Supabase token
GET  /health             - Health check
```

### Phase 2: libSQL Server (Fly.io)

Deploy libSQL server with:
- Namespaces enabled
- JWT authentication
- Admin API (internal only)
- Persistent volumes

**Files to create:**
- `infra/fly.toml` - Fly.io app config
- `infra/Dockerfile` - Custom libSQL image
- `infra/start.sh` - Startup script

### Phase 3: Expo App Updates

Modify the app to:
1. Get namespace config from Cloudflare Worker
2. Connect to specific namespace URL
3. Use custom JWT for authentication

**Files to modify:**
- `src/lib/database.ts` - Update connection logic
- `src/contexts/AuthContext.tsx` - Add namespace fetch

### Phase 4: Data Migration

Script to migrate existing Turso Cloud data to self-hosted:
- Export user data from Turso Cloud
- Import to new namespace
- Update user records

**Files to create:**
- `scripts/migrate-data.ts`

## Detailed Implementation

### 1. Cloudflare Worker Setup

```typescript
// workers/namespace-manager/src/index.ts
export interface Env {
  LIBSQL_ADMIN_URL: string;
  LIBSQL_ADMIN_TOKEN: string;
  JWT_PRIVATE_KEY: string;
  SUPABASE_WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/webhooks/supabase':
        return handleSupabaseWebhook(request, env);
      case '/auth/token':
        return handleAuthToken(request, env);
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleSupabaseWebhook(request: Request, env: Env) {
  // Verify Supabase webhook signature
  // Create namespace if doesn't exist
  // Return success
}

async function handleAuthToken(request: Request, env: Env) {
  // Validate Supabase JWT
  // Mint new JWT with namespace claim
  // Return connection config
}
```

### 2. libSQL Server Configuration

```bash
# fly.toml
app = "libsql-tasks-server"
primary_region = "bom"  # Mumbai for India

[build]
  image = "ghcr.io/tursodatabase/libsql-server:latest"

[env]
  SQLD_HTTP_LISTEN_ADDR = "0.0.0.0:8080"
  SQLD_ADMIN_LISTEN_ADDR = "0.0.0.0:8081"
  SQLD_ENABLE_NAMESPACES = "true"
  SQLD_DB_PATH = "/data"

[mounts]
  source = "data"
  destination = "/data"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
```

### 3. Security Model

**Namespace Isolation:**
- Each user gets `user_{uuid}` namespace
- JWT contains namespace claim
- libSQL validates JWT but doesn't auto-route
- App must use correct namespace in URL

**Authentication Flow:**
1. User authenticates with Supabase
2. App calls Worker to get namespace config
3. Worker verifies Supabase JWT
4. Worker creates namespace if needed
5. Worker mints new JWT with namespace claim
6. App connects to namespace URL with new JWT

**JWT Claims:**
```json
{
  "sub": "user_uuid",
  "namespace": "user_user_uuid",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Migration Strategy

### Option A: Big Bang (Not Recommended)
- Migrate all users at once
- High risk, downtime required

### Option B: Gradual (Recommended)
- New users → Self-hosted
- Existing users → Stay on Turso Cloud temporarily
- Gradual migration with user opt-in

### Implementation:

Add feature flag in app:
```typescript
const USE_SELF_HOSTED = true; // Toggle for gradual migration

async function getDatabaseConfig(userId: string) {
  if (USE_SELF_HOSTED) {
    // Get config from Cloudflare Worker
    return fetchNamespaceConfig(userId);
  } else {
    // Use Turso Cloud directly
    return { url: TURSO_URL, token: TURSO_TOKEN };
  }
}
```

## Testing Plan

1. **Local Testing:**
   - Run libSQL locally with Docker
   - Test Worker locally with wrangler dev
   - Verify full flow

2. **Staging:**
   - Deploy to Fly.io staging
   - Deploy Worker to staging
   - Test with test users

3. **Production:**
   - Monitor error rates
   - Check sync performance
   - Verify data integrity

## Rollback Plan

If issues occur:
1. Toggle feature flag back to Turso Cloud
2. Users reconnect to old database
3. Fix issues and retry

## Timeline Estimate

- **Backend API**: 1-2 days
- **libSQL Server**: 1 day
- **App Updates**: 1 day
- **Testing**: 2-3 days
- **Migration**: 1 day

**Total**: 1-2 weeks for complete migration

## Next Steps

1. ✅ **Step 1 Complete**: Turso Cloud working
2. 🔄 **Step 2 Ready**: Implement Cloudflare Worker
3. 🔄 **Step 3 Ready**: Deploy libSQL to Fly.io
4. 🔄 **Step 4 Ready**: Update Expo app
5. 🔄 **Step 5 Ready**: Migrate and test

Ready to proceed with Step 2 implementation?
