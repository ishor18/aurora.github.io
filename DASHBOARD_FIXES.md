# Dashboard Issues & Fixes

## Issues Identified:

1. ✅ **Income/Expense Layout** - Should be stacked vertically (Income above, Expense below)
2. ❌ **Budget Manager Button** - Not opening the modal
3. ✅ **Tab Buttons** - Already working in code, might be CSS issue
4. ❌ **Dashboard Cards Alignment** - Balance and Monthly Spending cards misaligned

## Quick Fixes Needed:

### 1. Add Missing CSS for Balance Stats (Vertical Stack)

The `.balance-stats` class needs to be added to `style.css`:

```css
.balance-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition: 0.2s;
}

.stat-item:hover {
    background: rgba(255, 255, 255, 0.08);
}

.stat-item i {
    font-size: 20px;
}

.stat-item.income i {
    color: var(--success-color);
}

.stat-item.expense i {
    color: var(--danger-color);
}

.stat-item div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-item span:first-child {
    font-size: 12px;
    color: var(--text-secondary);
}

.stat-item span:last-child {
    font-size: 16px;
    font-weight: 600;
}
```

### 2. Fix Budget Manager Modal Opening

The issue is likely that the modal backdrop click listener is trying to access an element before it exists. The fix is already in the code, but we need to add a null check:

In `script.js`, the `setupBudgetManager()` function line:
```javascript
document.querySelector('.budget-modal-backdrop').addEventListener('click', closeModal);
```

Should be:
```javascript
const backdrop = document.querySelector('.budget-modal-backdrop');
if (backdrop) {
    backdrop.addEventListener('click', closeModal);
}
```

### 3. Ensure Tab Buttons Work

The tab button logic exists in `setupEventListeners()` function. Make sure the CSS classes are correct.

## Testing Checklist:

- [ ] Income shows above Expense in balance card
- [ ] Budget Manager button opens modal
- [ ] Expense/Income tabs switch correctly
- [ ] Balance and Monthly Spending cards are side-by-side
- [ ] All buttons have proper hover effects
- [ ] Modal closes on backdrop click
- [ ] Budget settings save correctly

## Files to Check:

1. `style.css` - Add balance-stats and stat-item styles
2. `script.js` - Fix budget modal backdrop listener
3. `dashboard.html` - Verify structure is correct
