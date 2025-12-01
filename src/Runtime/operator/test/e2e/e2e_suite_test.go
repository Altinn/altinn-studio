package e2e

import (
	"fmt"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

// Run e2e tests using the Ginkgo runner.
func TestE2E(t *testing.T) {
	RegisterFailHandler(Fail)
	_, err := fmt.Fprintf(GinkgoWriter, "Starting altinn-studio-operator suite\n")
	if err != nil {
		t.Fatalf("Failed to write to GinkgoWriter: %v", err)
	}
	RunSpecs(t, "e2e suite")
}
