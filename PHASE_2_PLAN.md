# 🚀 Phase 2 Performance Optimization Plan

## 📊 Current State (After Phase 1)

### Performance Achieved:
- ✅ Dashboard load time: **5-30 seconds** (down from 5-10 minutes)
- ✅ Database queries: **50-500ms** (down from 30-60 seconds)
- ✅ API polling: **5 seconds** (standardized across all components)
- ✅ Visibility API: **Active** (stops polling when tab hidden)
- ✅ Database: **TimescaleDB** with 35 indexes

### **Phase 2 Goal**: Reduce dashboard load time from **5-30 seconds** to **2-5 seconds** (another 60-80% improvement)

---

## 🎯 Phase 2 Objectives

### Primary Goals:
1. **Intelligent Caching**: Reduce redundant API requests
2. **Request Optimization**: Batch requests, debounce user actions
3. **Data Retention**: Prevent database bloat
4. **Frontend Optimization**: Lazy loading, code splitting, memoization
5. **Backend Optimization**: Connection pooling, query optimization

### Expected Results:
- Dashboard load time: **2-5 seconds** (60-80% faster than Phase 1)
- API requests: **50-70% reduction** (with intelligent caching)
- Database size: **Controlled growth** (retention policies)
- User experience: **Near-instant** navigation

---

## 📋 Phase 2 Tasks (Prioritized)

### **Task 1: React Query Integration (HIGH PRIORITY)**

**Goal**: Replace manual fetching with React Query for intelligent caching and automatic background updates.

**Why**: React Query provides:
- Automatic caching with stale-while-revalidate
- Background refetching
- Request deduplication
- Optimistic updates
- Automatic retries

**Files to Modify**:
1. `vite-project/package.json` - Add @tanstack/react-query
2. `vite-project/src/App.jsx` - Add QueryClientProvider
3. `vite-project/src/hooks/useHostMetrics.js` (NEW) - Replace manual fetch in AdminPage
4. `vite-project/src/hooks/useProcessData.js` (NEW) - Replace manual fetch in ProcessDetailsPage
5. `vite-project/src/hooks/useVMMetrics.js` (NEW) - Replace manual fetch in VMProcessMetrics

**Implementation**:
```javascript
// Example: useHostMetrics.js
import { useQuery } from '@tanstack/react-query';

export const useHostMetrics = (filters = {}) => {
  return useQuery({
    queryKey: ['hostMetrics', filters],
    queryFn: async () => {
      const response = await fetch('/api/host-process-metrics?' + new URLSearchParams(filters));
      return response.json();
    },
    staleTime: 4000, // Consider data fresh for 4 seconds
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when tab regains focus
  });
};
```

**Benefits**:
- 80% reduction in redundant requests (shared cache)
- Automatic background updates (no manual intervals)
- Better error handling and loading states
- Request deduplication (if 3 components need same data, only 1 request)

**Effort**: 2-3 hours
**Impact**: HIGH (50-70% fewer API requests)

---

### **Task 2: Request Batching (MEDIUM PRIORITY)**

**Goal**: Batch multiple API requests into a single request to reduce network overhead.

**Why**: Currently, AdminDashboard makes 4+ separate API calls on load:
- `/api/host-process-metrics`
- `/api/host-overall-metrics`
- `/api/dashboard/top-processes`
- `/api/vm-metrics`

**Implementation**:
```python
# backend/views/model_api_routes.py
@app.post("/api/dashboard/batch")
async def get_dashboard_batch(request: DashboardBatchRequest, db: Session = Depends(get_timescaledb)):
    """
    Get all dashboard data in a single request
    """
    return {
        "host_process_metrics": get_host_process_metrics(db, request.limit),
        "host_overall_metrics": get_host_overall_metrics(db, request.limit),
        "top_processes": get_top_processes(db, request.metric, request.limit),
        "vm_metrics": get_vm_metrics(db)
    }
```

**Frontend**:
```javascript
// Use React Query with batch endpoint
const { data } = useQuery({
  queryKey: ['dashboardBatch'],
  queryFn: async () => {
    const response = await fetch('/api/dashboard/batch', {
      method: 'POST',
      body: JSON.stringify({ limit: 100, metric: 'cpu' })
    });
    return response.json();
  },
  staleTime: 4000,
  refetchInterval: 5000
});
```

**Benefits**:
- 4 requests → 1 request (75% reduction in HTTP overhead)
- Faster page load (parallel queries at DB level)
- Reduced server load

**Effort**: 1-2 hours
**Impact**: MEDIUM (20-30% faster dashboard load)

---

### **Task 3: Data Retention Policies (MEDIUM PRIORITY)**

**Goal**: Prevent database from growing indefinitely by automatically cleaning up old data.

**Why**: TimescaleDB has 15.6M+ rows, will continue growing. Need to:
- Compress old data (7+ days)
- Retain aggregated data only (30+ days)
- Delete very old data (90+ days)

**Implementation**:
```sql
-- backend/migrations/003_add_retention_policies.sql

-- Automatic compression after 7 days (saves 90% space)
SELECT add_compression_policy('host_process_metrics', INTERVAL '7 days');
SELECT add_compression_policy('host_overall_metrics', INTERVAL '7 days');
SELECT add_compression_policy('vm_process_metrics', INTERVAL '7 days');

-- Retention policy: keep only 90 days of data
SELECT add_retention_policy('host_process_metrics', INTERVAL '90 days');
SELECT add_retention_policy('host_overall_metrics', INTERVAL '90 days');
SELECT add_retention_policy('vm_process_metrics', INTERVAL '90 days');

-- Create continuous aggregates for long-term analysis (1-hour buckets)
CREATE MATERIALIZED VIEW host_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  process_name,
  AVG(cpu_usage_percent) AS avg_cpu,
  AVG(memory_usage_mb) AS avg_memory,
  MAX(cpu_usage_percent) AS max_cpu,
  MAX(memory_usage_mb) AS max_memory
FROM host_process_metrics
GROUP BY hour, process_name;

-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('host_metrics_hourly', INTERVAL '1 year');
```

**Benefits**:
- Database size reduced by 90% (compression)
- Faster queries (less data to scan)
- Automatic cleanup (no manual intervention)
- Long-term trends preserved (continuous aggregates)

**Effort**: 1 hour
**Impact**: MEDIUM (prevents future slowdown, saves 90% disk space)

---

### **Task 4: Frontend Memoization (LOW-MEDIUM PRIORITY)**

**Goal**: Prevent unnecessary re-renders by memoizing expensive computations and components.

**Why**: Components like AdminDashboardNew re-render frequently, causing:
- Re-calculation of chart data
- Re-rendering of child components
- Unnecessary API calls

**Implementation**:
```javascript
// AdminDashboardNew.jsx
import { useMemo, memo } from 'react';

// Memoize expensive calculations
const processedData = useMemo(() => {
  return processData.map(proc => ({
    ...proc,
    efficiency: calculateEfficiency(proc)
  }));
}, [processData]);

// Memoize chart data
const chartData = useMemo(() => {
  return {
    labels: timestamps,
    datasets: [
      {
        label: 'CPU',
        data: cpuData,
        borderColor: '#3b82f6'
      }
    ]
  };
}, [timestamps, cpuData]);

// Memoize chart options (don't recreate on every render)
const chartOptions = useMemo(() => ({
  responsive: true,
  maintainAspectRatio: false,
  // ... options
}), []);

// Memoize child components
const StatCard = memo(({ title, value, color }) => {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <div style={{ color }}>{value}</div>
    </div>
  );
});
```

**Files to Optimize**:
1. `AdminDashboardNew.jsx` - Memoize chart data and options
2. `PerformanceTab.jsx` - Memoize chart configurations
3. `ProcessDetailsPage.jsx` - Memoize filtered/sorted data
4. `VMProcessMetrics.jsx` - Memoize aggregated process data

**Benefits**:
- 40-60% fewer re-renders
- Smoother UI interactions
- Lower CPU usage in browser

**Effort**: 2-3 hours
**Impact**: LOW-MEDIUM (better UX, smoother animations)

---

### **Task 5: Lazy Loading & Code Splitting (LOW PRIORITY)**

**Goal**: Load only the code needed for the current page, reducing initial bundle size.

**Why**: Current bundle loads all components upfront (~2-3MB), even if user only views dashboard.

**Implementation**:
```javascript
// App.jsx
import { lazy, Suspense } from 'react';

// Lazy load route components
const AdminPage = lazy(() => import('./components/AdminPage'));
const AIWorkloadOptimizer = lazy(() => import('./components/AIWorkloadOptimizer'));
const ProcessDetailsPage = lazy(() => import('./components/ProcessDetailsPage'));

function App() {
  return (
    <DarkModeProvider>
      <ModelConfigProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<AdminPage />} />
              <Route path="/workload" element={<AIWorkloadOptimizer />} />
              <Route path="/processes" element={<ProcessDetailsPage />} />
            </Routes>
          </Suspense>
        </Router>
      </ModelConfigProvider>
    </DarkModeProvider>
  );
}
```

**Benefits**:
- Initial load time: 30-50% faster
- Bundle split into chunks (only load what's needed)
- Better caching (unchanged chunks don't re-download)

**Effort**: 1 hour
**Impact**: LOW (only affects first page load)

---

### **Task 6: Database Connection Pooling (LOW PRIORITY)**

**Goal**: Reuse database connections instead of creating new ones for each request.

**Why**: Current implementation may be creating new connections per request, causing overhead.

**Implementation**:
```python
# backend/app/database.py
from sqlalchemy.pool import QueuePool

# Add connection pooling to engine
engine_timescaledb = create_engine(
    TIMESCALE_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,        # Keep 20 connections open
    max_overflow=10,     # Allow 10 additional connections if needed
    pool_pre_ping=True,  # Test connection before using
    pool_recycle=3600    # Recycle connections after 1 hour
)
```

**Benefits**:
- 20-30% faster query execution
- Lower database CPU usage
- More stable under load

**Effort**: 30 minutes
**Impact**: LOW (only noticeable under heavy load)

---

### **Task 7: Debounce User Actions (LOW PRIORITY)**

**Goal**: Prevent excessive API calls when user types in search boxes or changes filters rapidly.

**Why**: Search boxes in ProcessDetailsPage trigger API calls on every keystroke.

**Implementation**:
```javascript
// ProcessDetailsPage.jsx
import { useDebouncedValue } from '@mantine/hooks'; // or implement custom hook

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 500); // 500ms delay

// Use debouncedSearchTerm for filtering
const filteredProcesses = processData.filter(process =>
  process['Process Name'].toLowerCase().includes(debouncedSearchTerm.toLowerCase())
);
```

**Benefits**:
- 80-90% fewer API calls while typing
- Better UX (no lag while typing)
- Lower server load

**Effort**: 30 minutes
**Impact**: LOW (only affects search UX)

---

## 📊 Expected Phase 2 Results

| Metric | Phase 1 (Current) | Phase 2 (Target) | Improvement |
|--------|-------------------|------------------|-------------|
| Dashboard load time | 5-30 seconds | 2-5 seconds | 60-80% faster |
| API requests (per minute) | ~60 requests | ~20 requests | 67% fewer |
| Redundant requests | 50-70% | 5-10% | 60% reduction |
| Database size (90 days) | 50GB+ | 5GB | 90% smaller |
| Initial bundle size | 2-3MB | 500KB-1MB | 60-75% smaller |
| Re-renders (per minute) | 50-100 | 10-20 | 70-80% fewer |

---

## 🗓️ Recommended Implementation Order

### Week 1: Caching & Request Optimization (High Impact)
1. **Day 1-2**: React Query Integration (Task 1) - 50-70% fewer requests
2. **Day 3**: Request Batching (Task 2) - 20-30% faster load
3. **Day 4**: Testing & Verification

### Week 2: Database & Frontend Optimization (Medium Impact)
1. **Day 5**: Data Retention Policies (Task 3) - Prevent future slowdown
2. **Day 6-7**: Frontend Memoization (Task 4) - Smoother UX
3. **Day 8**: Connection Pooling (Task 6) - Better scalability

### Week 3: Polish & Edge Cases (Low Impact, Nice-to-Have)
1. **Day 9**: Lazy Loading (Task 5) - Faster initial load
2. **Day 10**: Debouncing (Task 7) - Better search UX
3. **Day 11**: Final testing, documentation, deployment

---

## 🚀 Quick Wins (Can Do Immediately)

### Quick Win 1: Add Connection Pooling (30 minutes)
- Minimal code change
- Immediate performance benefit
- No risk to existing functionality

### Quick Win 2: Add Debouncing to Search (30 minutes)
- Simple hook addition
- Better UX
- Fewer API calls

### Quick Win 3: Memoize Chart Options (1 hour)
- Add `useMemo` to existing charts
- Prevent re-creation on every render
- Smoother chart animations

---

## 📂 Files to Create/Modify in Phase 2

### New Files:
1. `backend/migrations/003_add_retention_policies.sql`
2. `vite-project/src/hooks/useHostMetrics.js`
3. `vite-project/src/hooks/useProcessData.js`
4. `vite-project/src/hooks/useVMMetrics.js`
5. `vite-project/src/components/LoadingSpinner.jsx`

### Modified Files:
1. `vite-project/package.json` - Add React Query
2. `vite-project/src/App.jsx` - QueryClientProvider, Lazy loading
3. `backend/app/database.py` - Connection pooling
4. `backend/views/model_api_routes.py` - Batch endpoint
5. `vite-project/src/components/AdminDashboardNew.jsx` - React Query, memoization
6. `vite-project/src/components/ProcessDetailsPage.jsx` - React Query, debouncing
7. `vite-project/src/components/PerformanceTab.jsx` - Memoization
8. `vite-project/src/components/VMProcessMetrics.jsx` - React Query

**Total**: 5 new files, 8 modified files

---

## ✅ Success Criteria for Phase 2

### Performance Metrics:
- [ ] Dashboard loads in 2-5 seconds (consistent)
- [ ] API requests reduced to ~20/minute (from 60/minute)
- [ ] Database size under control (<5GB for 90 days)
- [ ] No duplicate/redundant requests (React Query deduplication)
- [ ] Chart animations at 60 FPS (smooth)

### User Experience:
- [ ] Near-instant page navigation (lazy loading)
- [ ] No lag while typing in search (debouncing)
- [ ] Charts update smoothly without flicker (memoization)
- [ ] Background data updates seamlessly (React Query)

### Code Quality:
- [ ] All console warnings resolved
- [ ] No memory leaks (proper cleanup)
- [ ] 90%+ test coverage for new hooks
- [ ] Documentation updated

---

## 🔄 Rollback Plan

### If React Query Causes Issues:
```bash
# Remove React Query
npm uninstall @tanstack/react-query
# Revert to Phase 1 manual fetching
git checkout phase1-branch -- vite-project/src/components/
```

### If Retention Policies Delete Too Much:
```sql
-- Disable retention policies
SELECT remove_retention_policy('host_process_metrics');
SELECT remove_retention_policy('host_overall_metrics');
SELECT remove_retention_policy('vm_process_metrics');
```

### If Batching Breaks Functionality:
```python
# Keep batch endpoint but also keep individual endpoints
# Frontend can fall back to individual endpoints if batch fails
```

---

## 📞 Next Steps

1. ✅ Review this Phase 2 plan
2. ⏳ Decide which tasks to prioritize
3. ⏳ Set up development branch for Phase 2
4. ⏳ Start with Quick Wins (connection pooling, debouncing)
5. ⏳ Implement React Query (biggest impact)
6. ⏳ Add retention policies (prevent future issues)
7. ⏳ Test thoroughly before deploying
8. ⏳ Deploy incrementally (one task at a time)

---

**Phase 2 Status**: ⏳ **READY TO START**
**Estimated Timeline**: 2-3 weeks
**Expected Improvement**: Dashboard load time from **5-30s** to **2-5s** (60-80% faster)
