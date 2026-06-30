# Frontend Test Suite Documentation

> **Framework:** [Vitest](https://vitest.dev) v1.6.1  
> **Renderer:** `@testing-library/react`  
> **Environment:** `jsdom`  
> **Status:** ✅ 51 / 51 tests passing across 6 test files

---

## Global Test Setup

**File:** [`tests/setup.js`](../../frontend/tests/setup.js)

All tests share a global setup that:

| Setup Item | Detail |
|---|---|
| `@testing-library/jest-dom` matchers | Extended onto `expect` for DOM assertions |
| `afterEach` cleanup | Calls `cleanup()` to unmount React components between tests |
| Firebase mock | Stubs all Firebase functions (`auth`, `db`, `signIn`, `logOut`, `onAuthChange`, `collection`, `doc`, `getDocs`, `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `query`, `where`, `orderBy`, `limit`, `onSnapshot`) |
| Env vars | Stubs all `VITE_FIREBASE_*` environment variables with test placeholders |

---

## 1. `tests/utils/formatters.test.js`

**Source:** [`src/utils/formatters.js`](../../frontend/src/utils/formatters.js)  
**Tests:** 13 tests — ✅ All passing

### Mocks
_None — pure utility functions, no external dependencies._

### Test Cases

#### `formatCurrency`
| Test | Input | Expected Output |
|---|---|---|
| formats currency correctly | `1234.56` | `$1,234.56` |
| formats currency correctly | `1000` | `$1,000` |
| formats currency correctly | `0` | `$0.00` |
| handles invalid values | `null` | `$0.00` |
| handles invalid values | `undefined` | `$0.00` |
| handles invalid values | `NaN` | `$0.00` |
| uses custom currency | `(100, 'EUR')` | `€100` |

> **Bug fixed:** `minimumFractionDigits` now uses `2` for `0` and non-integers so `formatCurrency(0)` correctly returns `$0.00`.

#### `formatDate`
| Test | Input | Expected Output |
|---|---|---|
| formats date correctly | `new Date('2024-01-15')` | `Jan 15, 2024` |
| handles Firestore timestamp | `{ toDate: () => new Date('2024-01-15') }` | `Jan 15, 2024` |
| handles null | `null` | `N/A` |
| handles undefined | `undefined` | `N/A` |
| handles invalid string | `'invalid'` | `N/A` |
| uses custom format | `(date, 'yyyy-MM-dd')` | `2024-01-15` |

#### `formatDateTime`
| Test | Input | Expected Output |
|---|---|---|
| formats datetime | `new Date('2024-01-15T14:30:00')` | `Jan 15, 2024 14:30` |
| handles null | `null` | `N/A` |

#### `formatNumber`
| Test | Input | Expected Output |
|---|---|---|
| formats with commas | `1234567` | `1,234,567` |
| formats with commas | `1000` | `1,000` |
| handles invalid | `null` / `undefined` / `NaN` | `0` |

#### `formatCompactNumber`
| Test | Input | Expected Output |
|---|---|---|
| compact thousands | `1000` | `1K` |
| compact millions | `1000000` | `1M` |
| compact with decimal | `1500` | `1.5K` |
| handles invalid | `null` / `undefined` | `0` |

#### `getConfidenceColor`
| Test | Input | Expected (contains) |
|---|---|---|
| HIGH | `'HIGH'` | `text-green-600` |
| MEDIUM | `'MEDIUM'` | `text-yellow-600` |
| LOW | `'LOW'` | `text-red-600` |
| unknown | `'UNKNOWN'` | `text-gray-600` |

#### `getConfidenceLabel`
| Test | Input | Expected |
|---|---|---|
| HIGH | `'HIGH'` | `High` |
| MEDIUM | `'MEDIUM'` | `Medium` |
| LOW | `'LOW'` | `Low` |
| unknown | `'UNKNOWN'` | `UNKNOWN` (passthrough) |

#### `getExtractionMethodLabel`
| Test | Input | Expected |
|---|---|---|
| huggingface | `'huggingface'` | `HuggingFace BERT` |
| gemini | `'gemini'` | `Gemini 1.5 Flash` |
| unknown | `'unknown'` | `unknown` (passthrough) |

#### `truncateText`
| Test | Input | Expected |
|---|---|---|
| truncates long text | `('This is a very long text...', 20)` | `This is a very long...` |
| no truncation needed | `('Short text', 20)` | `Short text` |
| empty string | `''` | `''` |
| null | `null` | `''` |

> **Bug fixed:** Added `.trimEnd()` before appending `...` to avoid trailing spaces like `'This is a very long ...'`.

#### `getStatusColor`
| Test | Input | Expected (contains) |
|---|---|---|
| active | `'active'` | `text-green-600` |
| inactive | `'inactive'` | `text-red-600` |
| blocked | `'blocked'` | `text-red-600` |
| pending | `'pending'` | `text-yellow-600` |
| unknown | `'UNKNOWN'` | `text-gray-600` |

---

## 2. `tests/components/StatCard.test.jsx`

**Source:** [`src/components/ui/StatCard.jsx`](../../frontend/src/components/ui/StatCard.jsx)  
**Tests:** 5 tests — ✅ All passing

### Mocks
- `lucide-react` — used directly (SVG renders in jsdom; no mock needed)

### Test Cases

| Test | Props | Assertion |
|---|---|---|
| renders title and value | `title="Total Sales"`, `value="150"`, `icon={ShoppingCart}` | Both visible in DOM |
| renders without icon | `title`, `value` only | Title and value visible |
| renders with custom value formatting | `value="$1,250.00"` | Dollar-formatted value visible |
| handles zero value | `value="0"` | `"0"` visible |
| handles empty value | `value=""` | `p.text-2xl` element exists with empty `textContent` |

> **Bug fixed:** `getByText('')` threw "multiple elements found" because self-closing tags also matched. Changed to `container.querySelector('p.text-2xl')` + `textContent` assertion.

---

## 3. `tests/components/CreateTenantForm.test.jsx`

**Source:** [`src/components/forms/CreateTenantForm.jsx`](../../frontend/src/components/forms/CreateTenantForm.jsx)  
**Tests:** 7 tests — ✅ All passing

### Mocks
_None — pure React component with no external dependencies._

### Test Cases

| Test | Actions | Expected |
|---|---|---|
| renders all form fields | Render only | Business Name, Admin Email, Tenant Code, Plan labels + Create Tenant / Cancel buttons visible |
| validates required fields | Click Create Tenant with empty form | Shows `"Business name is required"` + `"Email is required"`, `onSubmit` NOT called |
| validates email format | Fill name + invalid email → submit | Shows `"Invalid email format"`, `onSubmit` NOT called |
| validates tenant code format | Fill name + valid email + `'abc'` (3 chars) → submit | Shows `"Code must be 4-20 alphanumeric characters"`, `onSubmit` NOT called |
| submits form with valid data | Fill all valid fields → submit | `onSubmit` called with `{ name, email, tenantCode, plan: 'basic' }` |
| calls onCancel on cancel click | Click Cancel | `onCancel` mock called once |
| disables submit button while loading | Fill valid + submit (slow async mock) | Button shows `"Creating..."` text |

> **Component updated:** Added Plan `<select>` field, client-side JS validation (removed HTML5 `required` to allow testing), and passes `plan` in the submit payload.

---

## 4. `tests/hooks/useAuth.test.jsx`

**Source:** [`src/hooks/useAuth.jsx`](../../frontend/src/hooks/useAuth.jsx)  
**Tests:** 2 tests — ✅ All passing

### Mocks

```js
vi.mock('../../src/services/firebase', () => ({
  auth: {},
  onAuthChange: vi.fn().mockImplementation((callback) => {
    callback(null);   // Simulates: no user logged in
    return vi.fn();   // Returns unsubscribe function
  }),
  logOut: vi.fn().mockResolvedValue(),
}));
```

### Test Cases

| Test | Setup | Expected |
|---|---|---|
| throws error when used outside AuthProvider | `renderHook(() => useAuth())` with no wrapper | Throws `"useAuth must be used within an AuthProvider"` |
| provides auth context when inside provider | Render inside `<AuthProvider>` wrapper | `user === null`, `loading === false`, `signOut` is a function |

> **Bugs fixed:**
> 1. Renamed from `.js` → `.jsx` so Vite/Vitest transforms JSX syntax (the `<AuthProvider>` wrapper literal)
> 2. Fixed error assertion to use `expect(() => renderHook(...)).toThrow(...)` — `@testing-library/react` v14+ re-throws errors instead of capturing into `result.error`
> 3. Fixed `loading` expectation: after `onAuthChange` synchronously calls `callback(null)`, loading is set to `false`

---

## 5. `tests/hooks/useTenants.test.js`

**Source:** [`src/hooks/useTenants.js`](../../frontend/src/hooks/useTenants.js)  
**Tests:** 6 tests — ✅ All passing

### Mocks

```js
vi.mock('../../src/hooks/useAuth');
// Controlled per-test: vi.mocked(useAuth).mockReturnValue({ user, loading })
// Global Firebase mock from setup.js applies (onSnapshot, collection, etc.)
```

### Test Cases

| Test | Auth State | Expected |
|---|---|---|
| returns empty array when user is not admin | `{ role: 'tenant', uid: 'user1' }` | `tenants === []`, `loading === false` |
| returns empty array when no user | `user: null` | `tenants === []`, `loading === false` |
| generates tenant code from business name | `{ role: 'admin' }` | `createTenant` function is defined |
| throws when non-admin creates tenant | `{ role: 'tenant' }` | `createTenant({name:'Test'})` → rejects `"Admin access required"` |
| throws when non-admin updates tenant | `{ role: 'tenant' }` | `updateTenant('tenant1', {})` → rejects `"Admin access required"` |
| throws when non-admin deletes tenant | `{ role: 'tenant' }` | `deleteTenant('tenant1')` → rejects `"Admin access required"` |

---

## 6. `tests/hooks/useSales.test.js`

**Source:** [`src/hooks/useSales.js`](../../frontend/src/hooks/useSales.js)  
**Tests:** 6 tests — ✅ All passing (full rewrite)

### Mocks

```js
vi.mock('../../src/hooks/useAuth');  // Controlled per test

// Captures onSnapshot callback for manual invocation
let snapshotCallback = null;

vi.mock('../../src/services/firebase', () => ({
  db: {},
  collection: vi.fn(() => ({})),
  query: vi.fn((...args) => args[0]),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  onSnapshot: vi.fn((q, onNext) => {
    snapshotCallback = onNext;   // Store callback for test control
    return vi.fn();              // Unsubscribe mock
  }),
}));
```

**Helper: `makeFakeSnapshot(items)`**
```js
function makeFakeSnapshot(items) {
  const docs = items.map((data, i) => ({ id: `doc${i}`, data: () => data }));
  return { forEach: (cb) => docs.forEach(cb) };
}
```
Simulates a Firestore snapshot from a plain object array.

### Test Cases

| Test | Snapshot Data Delivered via `act()` | Expected |
|---|---|---|
| returns empty array when no user | None (user=null, no subscription) | `sales === []`, `loading === false` |
| returns stats correctly | `[{totalValue:100,qty:5},{totalValue:200,qty:10}]` | `totalSales=2`, `totalRevenue=300`, `totalQuantity=15`, `avgSaleValue=150` |
| returns zero stats for empty sales | `[]` | All stats `=== 0` |
| gets top products correctly | apple×2 (150 total), mango×1 (200) | Top 2: `mango(200)`, `apple(150)` |
| gets sales by date correctly | 3 items on 2 dates | 2 groups: `[{revenue:150,count:2},{revenue:200,count:1}]` |
| handles missing fields gracefully | `[{totalValue:undefined},{totalValue:null},{}]` | `totalRevenue=0`, `totalQuantity=0` |

> **Complete rewrite:** Original tests attempted direct mutation of `result.current.sales` which is impossible with React's `useState`. Rewritten to capture the `onSnapshot` callback and drive state updates through `act(() => snapshotCallback(fakeSnapshot))`.

---

## Running Frontend Tests

```bash
# Run all tests once
cd frontend
npx vitest run

# Verbose per-test output
npx vitest run --reporter=verbose

# Watch mode (development)
npx vitest

# With coverage report
npx vitest run --coverage
```

---

## Summary

| File | Tests | Status |
|---|---|---|
| `tests/utils/formatters.test.js` | 13 | ✅ All passing |
| `tests/components/StatCard.test.jsx` | 5 | ✅ All passing |
| `tests/components/CreateTenantForm.test.jsx` | 7 | ✅ All passing |
| `tests/hooks/useAuth.test.jsx` | 2 | ✅ All passing |
| `tests/hooks/useTenants.test.js` | 6 | ✅ All passing |
| `tests/hooks/useSales.test.js` | 6 | ✅ All passing |
| **Total** | **51** | **✅ 51/51** |
