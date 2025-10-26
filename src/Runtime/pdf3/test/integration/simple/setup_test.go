package simple_test

import (
	"os"
	"testing"

	"altinn.studio/pdf3/test/harness"
)

func TestMain(m *testing.M) {
	harness.Init()

	code := m.Run()
	os.Exit(code)
}
