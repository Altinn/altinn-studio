# Implementation Plan: Hardcode Fatal Error Check in PDF Generation

## Goal

Immediately fail PDF generation with a 500 Internal Server Error if an element with the attribute `data-fatal-error` is detected in the DOM. This prevents the service from waiting for the full 30-second timeout on pages that have encountered an unrecoverable error.

## Phase 1: Core Logic Implementation

1.  **Define New Error Type:**
    - **File:** `internal/types/pdf.go`
    - **Action:** Add a new exported error variable `ErrFatalApplicationError`.
    - **Example:**
      ```go
      var (
          // ... existing errors
          ErrFatalApplicationError = errors.New("a fatal application error was detected on the page")
      )
      ```

2.  **Modify JavaScript Wait Logic:**
    - **File:** `internal/generator/browser_session.go`
    - **Action:** Update the `buildSimpleWaitExpression` and `buildVisibilityWaitExpression` functions to modify the generated JavaScript.
    - **Details:** The JavaScript promise chain will be updated to race between three conditions:
      1. The successful resolution of the primary `waitFor` condition (e.g., `#readyForPrint` is visible).
      2. The detection of an element matching `[data-fatal-error]`.
      3. The timeout.
    - If the fatal error element is detected, the promise will resolve with a specific status indicating failure, which will be handled in the Go code. I'll make the javascript return a string like "fatal" instead of a boolean.

3.  **Handle Fatal Error in Go:**
    - **File:** `internal/generator/browser_session.go`
    - **Action:** Modify the `processWaitResult` function.
    - **Details:** This function will be updated to check the result from the JavaScript evaluation. If the result indicates a fatal error was found, it will call `req.tryRespondError` with the new `types.ErrFatalApplicationError`.

## Phase 2: Testing

1.  **Create New Integration Test:**
    - **File:** `test/integration/simple/waitfor_test.go` (or a new file like `fatal_error_test.go` in the same directory).
    - **Action:** Add a new test function, `Test_FatalError_FailsImmediately`.

2.  **Configure Test Case:**
    - Inside the new test, use the test harness to make a PDF request.
    - **URL:** The request URL will point to a new test page on the test server (e.g., `/app/?fatalerror=true`).
    - **Test Server Handler:** Add a handler in `setup_test.go` that serves an HTML page containing an element like `<div data-fatal-error>An unrecoverable error has occurred.</div>`.
    - **`waitFor`:** The request's `waitFor` option will be set to a selector that will never appear (e.g., `#readyForPrint`), simulating the real-world scenario where the application is stuck.

3.  **Add Assertions:**
    - Assert that the `harness.RequestNewPDF` call returns an error.
    - Assert that the error is of the correct type (`types.ErrFatalApplicationError`).
    - Assert that the request failed quickly and did not wait for the full timeout.

## Phase 3: Verification

1.  **Run All Tests:**
    - **Command:** `make test`
    - **Action:** Execute the complete integration test suite from the root of the repository to ensure that the changes have not introduced any regressions in existing functionality.
