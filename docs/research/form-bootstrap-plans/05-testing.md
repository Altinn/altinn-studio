# Phase 5: Testing

## Objective

Verify the refactor works correctly through E2E tests. No unit tests - we rely on existing E2E coverage.

---

## Strategy

The codebase already has good E2E test coverage. Our approach:

1. **Run existing E2E tests** - They should catch most regressions
2. **Fix any failures** - Debug and fix issues found
3. **Manual smoke testing** - Verify key scenarios manually

We specifically avoid:

- Writing new Jest unit tests for implementation details
- Testing that "an adapter populates cache correctly"
- Testing internal provider structure

Instead we test: **Does the form work?**

---

## E2E Test Scenarios to Verify

### Basic Form Loading

- [ ] Form loads and displays correctly
- [ ] All form fields render
- [ ] Initial data is populated
- [ ] Validation messages appear

### Form Submission

- [ ] User can fill in fields
- [ ] Form data saves correctly
- [ ] Validation runs on submit
- [ ] Successful submission works

### Navigation

- [ ] Page navigation works
- [ ] Multi-page forms work
- [ ] Summary page shows correct data

### Options/Code Lists

- [ ] Dropdowns load their options
- [ ] Radio buttons have correct choices
- [ ] Options with static queryParameters work

### Subforms

- [ ] Subform entries can be added
- [ ] Subform data loads correctly
- [ ] Subform navigation works
- [ ] Returning from subform works

### PDF Mode

- [ ] PDF generation works
- [ ] PDF shows correct data
- [ ] No validation in PDF mode

### Stateless Forms

- [ ] Stateless form loads
- [ ] No instance needed
- [ ] Anonymous access works (if configured)

### Error Handling

- [ ] 403 shows missing roles page
- [ ] 404 shows appropriate error
- [ ] Network errors handled gracefully

---

## Running E2E Tests

```bash
# Run all Cypress tests
yarn cy:run

# Open Cypress for interactive testing
yarn cy:open
```

Focus on tests that exercise:

- Form rendering
- Data loading
- Form submission
- Multi-page navigation
- Subforms

---

## Manual Smoke Test Checklist

Run through these manually in a browser:

1. **Simple form**
   - Open a simple form
   - Verify fields display
   - Fill in data
   - Submit successfully

2. **Multi-page form**
   - Navigate between pages
   - Verify data persists
   - Complete submission

3. **Form with dropdowns**
   - Verify options load
   - Select options
   - Submit with selections

4. **Subform**
   - Open a form with subforms
   - Add a subform entry
   - Fill in subform data
   - Return to main form
   - Verify subform entry saved

5. **PDF generation**
   - Generate PDF of a form
   - Verify data appears correctly

---

## Common Issues to Watch For

### Data Not Loading

- Check network tab for bootstrap request
- Verify response contains expected data
- Check for console errors

### Options Not Showing

- Verify options are in bootstrap response
- Check `staticOptions` field
- Confirm no `mapping` on the component

### Validation Not Working

- Verify `validationIssues` in response
- Check `isPdf` is not accidentally true
- Verify validation provider consumes initial issues

### Subform Issues

- Check query parameters in request
- Verify `layoutSetId` and `dataElementId` match
- Check for data type mismatch errors

---

## Debugging

### Backend

```csharp
// Add logging in FormBootstrapService
_logger.LogInformation("Bootstrap request for {LayoutSetId}", layoutSetId);
_logger.LogInformation("Found {Count} data types", referencedDataTypes.Count);
_logger.LogInformation("Found {Count} static options", staticOptionIds.Count);
```

### Frontend

```typescript
// Add logging in FormBootstrapProvider
console.log('Bootstrap response:', data);
console.log('Data models:', data?.dataModels);
console.log('Static options:', data?.staticOptions);
```

---

## After Testing

Once all tests pass:

1. **Remove debug logging** - Clean up any temporary logs
2. **Final code review** - Check for dead code
3. **Document any quirks** - Note anything unusual found
4. **Done!**

---

## Acceptance Criteria

- [ ] All existing E2E tests pass
- [ ] Manual smoke tests pass
- [ ] No console errors during normal usage
- [ ] Form functionality is preserved
- [ ] Performance is not degraded (ideally improved)

---

## Notes

- E2E tests are the source of truth for "does it work"
- Don't write tests for implementation details
- If a scenario isn't covered by E2E, consider if it needs coverage
- The goal is confidence that the refactor didn't break anything
