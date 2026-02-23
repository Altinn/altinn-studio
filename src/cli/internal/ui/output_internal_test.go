package ui

import (
	"os"
	"testing"
)

func TestColors_DefaultEnabledWhenNoColorUnset(t *testing.T) {
	if _, hasNoColor := os.LookupEnv("NO_COLOR"); hasNoColor {
		t.Skip("NO_COLOR is set in the test environment")
	}

	if !Colors() {
		t.Fatal("Colors() = false, want true when NO_COLOR is unset")
	}
}

func TestColors_DisabledWhenNoColorIsEmpty(t *testing.T) {
	t.Setenv("NO_COLOR", "")

	if Colors() {
		t.Fatal("Colors() = true, want false when NO_COLOR is present with empty value")
	}
}

func TestColors_DisabledWhenNoColorIsSet(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	if Colors() {
		t.Fatal("Colors() = true, want false when NO_COLOR is present")
	}
}
