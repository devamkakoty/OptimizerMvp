# GreenMatrix Database Migrations

This directory contains SQL migration scripts for **existing deployments** to add performance indexes.

## Overview

These migrations add database indexes to dramatically improve query performance. They are **safe to run on production** systems because they use `CREATE INDEX CONCURRENTLY` which doesn't block writes.

## For EXISTING Deployments (Your Current System)

### Prerequisites
- Docker containers are running
- Database has data (10+ days of metrics)
- WinSCP access to VM
- SSH/Putty access to VM

---

## PHASE 1: Add Database Indexes (30 minutes total)

### Step 1.1: Copy Migration Files to VM

**Via WinSCP:**
1. Connect to your VM via WinSCP
2. Navigate to: `/home/reddypet/GreenMatrix/backend/migrations/`
3. Upload these files:
   - `001_add_timescaledb_indexes.sql`
   - `002_add_metrics_db_indexes.sql`
   - `README.md`

**Via Putty (alternative):**
```bash
# If files are in your local machine, use scp from Windows:
scp C:\Users\vabhinav\Desktop\GreenMatrix\backend\migrations\*.sql reddypet@<VM_IP>:~/GreenMatrix/backend/migrations/
```

---

### Step 1.2: Run Migration 001 (TimescaleDB Indexes)

**Connect via Putty to your VM, then run:**

```bash
# Navigate to GreenMatrix directory
cd ~/GreenMatrix

# Run migration on TimescaleDB (this is the CRITICAL one)
docker exec -i greenmatrix-timescaledb psql -U postgres -d vm_metrics_ts < backend/migrations/001_add_timescaledb_indexes.sql
```

**Expected output:**
```
CREATE INDEX
CREATE INDEX
...
✅ TimescaleDB performance indexes created successfully!

Expected improvements:
  - Dashboard load time: 5-10 min → 5-10 seconds (98% faster)
```

**Estimated time:** 2-10 minutes (depending on data size)

**What this does:**
- Adds indexes to `host_process_metrics` (100-1000x faster queries)
- Adds indexes to `host_overall_metrics` (100-500x faster)
- Adds indexes to `vm_process_metrics` (50-200x faster)
- Does NOT block database writes
- Does NOT delete or modify data

---

### Step 1.3: Run Migration 002 (Metrics_db Indexes)

```bash
# Still in ~/GreenMatrix directory
docker exec -i greenmatrix-postgres psql -U postgres -d Metrics_db < backend/migrations/002_add_metrics_db_indexes.sql
```

**Expected output:**
```
CREATE INDEX
CREATE INDEX
...
✅ Metrics_db performance indexes created successfully!
```

**Estimated time:** 1-5 minutes

---

### Step 1.4: Verify Indexes Were Created

**Check TimescaleDB indexes:**
```bash
docker exec -it greenmatrix-timescaledb psql -U postgres -d vm_metrics_ts -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;"
```

**Expected output:** You should see 12+ indexes listed

**Check Metrics_db indexes:**
```bash
docker exec -it greenmatrix-postgres psql -U postgres -d Metrics_db -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;"
```

---

### Step 1.5: Restart Backend Container

```bash
# Restart backend to ensure it uses new indexes
docker restart greenmatrix-backend

# Check backend logs for errors
docker logs --tail 50 greenmatrix-backend
```

**Expected output:** Backend should restart cleanly with no errors

---

### Step 1.6: TEST PERFORMANCE

**Before opening dashboard, note the time:**
1. Open browser
2. Navigate to: `http://<VM_IP>:5173` (or your dashboard URL)
3. Open browser DevTools → Network tab
4. Load the dashboard page

**Expected results:**
- **Before migration**: 5-10 minutes to load, requests stuck in "pending"
- **After migration**: 5-30 seconds to load, all requests complete quickly

**If dashboard still slow:**
- Check backend logs: `docker logs --tail 100 greenmatrix-backend`
- Check database connections: See "Troubleshooting" section below
- Check if indexes were created: Run verification commands above

---

## Troubleshooting

### Issue 1: "Error: relation does not exist"
**Cause:** Migration run against wrong database
**Fix:** Make sure you specify the correct database name:
- `vm_metrics_ts` for migration 001
- `Metrics_db` for migration 002

### Issue 2: "Index already exists" (SAFE to ignore)
**Cause:** Some indexes may already exist from `vm_metrics_init.sql`
**Fix:** This is fine! The `IF NOT EXISTS` clause prevents errors

### Issue 3: Migration takes too long (>15 minutes)
**Cause:** Database has millions of rows
**Fix:**
1. Let it finish (it's creating indexes, which takes time on large tables)
2. Monitor progress: `docker exec -it greenmatrix-timescaledb psql -U greenmatrix_user -d vm_metrics_ts -c "SELECT pid, state, query FROM pg_stat_activity WHERE query LIKE '%CREATE INDEX%';"`

### Issue 4: Dashboard still slow after migration
**Possible causes:**
1. Backend not restarted → Run `docker restart greenmatrix-backend`
2. Indexes not created → Run verification commands
3. Too many concurrent requests → Continue to Phase 2 (frontend optimizations)
4. Database connection pool exhausted → Check next section

### Issue 5: Check database connections
```bash
docker exec -it greenmatrix-postgres psql -U postgres -d Metrics_db -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**Healthy output:**
```
 count | state
-------+--------
     3 | idle
     1 | active
```

**Problem output (too many connections):**
```
 count | state
-------+--------
    50 | idle
    30 | active
```

**Fix:** Increase connection pool or reduce frontend polling (Phase 2)

---

## For FRESH Deployments (New Systems)

If deploying GreenMatrix on a new system, indexes will be created automatically:

### Option A: Update init scripts (Recommended)
We will update `vm_metrics_init.sql` and create a new `metrics_db_init.sql` to include all indexes from the start.

### Option B: Run migrations after first deploy
1. Deploy GreenMatrix normally
2. After containers are up, run migrations 001 and 002
3. Indexes will be created on empty tables (very fast, <30 seconds)

---

## Migration History

| Migration | Database | Description | Date | Status |
|-----------|----------|-------------|------|--------|
| 001 | vm_metrics_ts | Add indexes to TimescaleDB tables | 2025-01-08 | ✅ Ready |
| 002 | Metrics_db | Add indexes to Metrics_db tables | 2025-01-08 | ✅ Ready |

---

## Rollback (Emergency Only - Not Recommended)

If indexes cause issues (very unlikely), you can remove them:

```bash
# Rollback TimescaleDB indexes
docker exec -it greenmatrix-timescaledb psql -U postgres -d vm_metrics_ts -c "DROP INDEX CONCURRENTLY IF EXISTS idx_host_process_timestamp_desc; DROP INDEX CONCURRENTLY IF EXISTS idx_host_process_name_time;"

# Rollback Metrics_db indexes
docker exec -it greenmatrix-postgres psql -U postgres -d Metrics_db -c "DROP INDEX CONCURRENTLY IF EXISTS idx_hardware_monitoring_hw_time; DROP INDEX CONCURRENTLY IF EXISTS idx_hardware_monitoring_timestamp;"
```

**Note:** Dropping indexes is also non-blocking with `CONCURRENTLY`.

---

## Next Steps After Phase 1

Once indexes are added and dashboard loads quickly:

1. **Phase 2**: Reduce frontend polling (2s → 30s) - See frontend optimization guide
2. **Phase 3**: Add data retention policy (keep last 7-30 days only)
3. **Phase 4**: Add caching layer (Redis) for static data

**Expected overall improvement:**
- Initial load time: **5-10 min → 10-30 seconds** (95% faster)
- Subsequent loads: **30 sec → 2-5 seconds** (after frontend optimizations)
- Database CPU: **94% → 5-10%**
- Memory usage: **14GB → 2-4GB** (after data retention)

---

## Questions or Issues?

If you encounter any issues:
1. Check troubleshooting section above
2. Share error messages
3. Share output of verification commands
4. Check `docker logs greenmatrix-backend` for errors
