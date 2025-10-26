package smoke_test

import (
	"fmt"
	"os"
	"strings"
	"testing"

	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/test/harness"
)

func TestMain(m *testing.M) {
	harness.Init()

	code := m.Run()
	os.Exit(code)
}

type testCase struct {
	name  string
	input *ptesting.PdfInternalsTestInput
}

type requestResult struct {
	errors []error
}

func Test_Smoke(t *testing.T) {
	tests := []testCase{
		{name: "base"},
		{name: "cleanup delay", input: ptesting.NewTestInput(3)},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			runSmokeTest(t, &tc)
		})
	}
}

func runSmokeTest(t *testing.T, testCase *testCase) {
	// This test verifies that the proxy retries when the worker queue is full
	// We send multiple concurrent requests to fill the queue

	t.Logf("Running testcase: %s", testCase.name)

	const concurrentRequests = 50

	results := make(chan requestResult, concurrentRequests)

	// Send concurrent requests
	for index := range concurrentRequests {
		go func(index int) {
			req := harness.GetDefaultPdfRequest(t)
			req.URL = fmt.Sprintf("%s?render=light&i=%d", req.URL, index)

			result := requestResult{
				errors: make([]error, 0),
			}
			defer func() {
				results <- result
			}()

			var resp *harness.PdfResponse
			var err error
			testInput := testCase.input
			if testCase.input != nil {
				testInput = ptesting.NewTestInputFrom(testCase.input)
				resp, err = harness.RequestNewPDFWithTestInput(t, req, testInput)
			} else {
				resp, err = harness.RequestNewPDF(t, req)
			}
			if err != nil {
				result.errors = append(result.errors, fmt.Errorf("request %d: failed: %w", index, err))
				return
			}

			if !harness.IsPDF(resp.Data) {
				result.errors = append(result.errors, fmt.Errorf("request %d: response is not a valid PDF", index))
			}

			if testInput != nil {
				if output, outputErr := resp.LoadOutput(t); outputErr != nil {
					result.errors = append(
						result.errors,
						fmt.Errorf("request %d: failed to load test output: %w", index, outputErr),
					)
				} else if output != nil && output.HadErrors() {
					result.errors = append(result.errors, fmt.Errorf("request %d: response had errors reported in browsers", index))
				}
			}
		}(index)
	}

	// Collect results
	var failures []error
	errorsDueTo429 := 0
	successes := 0
	for range concurrentRequests {
		t := true
		f := false
		result := <-results
		var onlyHad429 *bool = nil
		if len(result.errors) > 0 {
			for _, err := range result.errors {
				if strings.Contains(err.Error(), "429") {
					if onlyHad429 == nil {
						onlyHad429 = &t
					}
				} else {
					onlyHad429 = &f
					failures = append(failures, err)
				}
			}
			if onlyHad429 != nil && *onlyHad429 {
				errorsDueTo429++
			}
		} else {
			successes++
		}
	}

	t.Logf("%d requests succeeded", successes)

	if errorsDueTo429 == 0 {
		t.Error("No failures with 429 occurred")
	} else {
		t.Logf("%d requests failed with 429", errorsDueTo429)
	}

	// Report unexpected failures
	if len(failures) > 0 {
		for _, err := range failures {
			t.Errorf("Unexpected failure: %v", err)
		}
	}

	// At least some requests should have succeeded due to retries
	if successes == 0 {
		t.Error("All requests failed")
	}

	if successes+errorsDueTo429+len(failures) != concurrentRequests {
		t.Error("Not all requests completed?")
	}

	t.Logf(
		"Completed testcase %s with %d concurrent requests with %d unexpected failures",
		testCase.name,
		concurrentRequests,
		len(failures),
	)
}
