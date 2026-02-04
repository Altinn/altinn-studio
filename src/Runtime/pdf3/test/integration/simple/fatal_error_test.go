package simple

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

func Test_FatalError_FailsImmediately(t *testing.T) {
	// Test
	t.Run("FailsImmediatelyOnFatalError", func(t *testing.T) {
		// Prepare a request that would normally time out, but points to a page with a fatal error.
		req := &types.PdfRequest{
			URL: harness.TestServerURL + "/app/?fatalerror=true",
			WaitFor: types.NewWaitForOptions(types.WaitForOptions{
				Selector: "#this-will-never-be-ready",
			}),
		}

		// Since the request should fail very quickly, we can wrap it in a timeout
		// to ensure the test doesn't hang if the logic is broken.
		resultChan := make(chan *harness.PdfResponse, 1)
		errChan := make(chan error, 1)

		go func() {
			res, err := harness.RequestNewPDF(t, req)
			if err != nil {
				errChan <- err
				return
			}
			resultChan <- res
		}()

		select {
		case err := <-errChan:
			// This is the expected outcome.
			require.Error(t, err, "Expected an error for fatal error case")
			assert.Contains(t, err.Error(), types.ErrFatalApplicationError.Error(), "Error message should contain fatal application error text")
		case <-resultChan:
			t.Fatal("Expected an error, but got a successful PDF result instead")
		case <-time.After(10 * time.Second):
			// The default timeout is 30s. If we hit 10s, the fast-fail logic is not working.
			t.Fatal("Test timed out: the fatal error was not detected quickly")
		}
	})
}