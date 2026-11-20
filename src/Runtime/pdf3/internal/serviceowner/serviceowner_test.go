package serviceowner

import (
	"context"
	"strings"
	"testing"
)

func TestValid(t *testing.T) {
	for value, want := range map[string]bool{
		"ttd":                      true,
		"ikta":                     true,
		"a":                        true,
		"digdir-test2":             true,
		strings.Repeat("a", 63):    true,
		"":                         false,
		strings.Repeat("a", 64):    false,
		"TTD":                      false,
		"-ttd":                     false,
		"ttd-":                     false,
		"t_d":                      false,
		"ttd.apps":                 false,
		" ttd":                     false,
		"ttd\n":                    false,
		"ttå":                      false,
		"ttd,ikta":                 false,
		"ttd; DROP TABLE apps; --": false,
	} {
		if got := Valid(value); got != want {
			t.Errorf("Valid(%q) = %v, want %v", value, got, want)
		}
	}
}

func TestResolve(t *testing.T) {
	tests := []struct {
		name       string
		configured string
		header     string
		want       string
	}{
		{name: "config wins over header", configured: "ttd", header: "ikta", want: "ttd"},
		{name: "config without header", configured: "ikta", want: "ikta"},
		{name: "config is used as is", configured: "IKTA", header: "ttd", want: "IKTA"},
		{name: "header without config", header: "ikta", want: "ikta"},
		{name: "invalid header is unknown", header: "IKTA", want: ""},
		{name: "header with spaces is unknown", header: " ikta", want: ""},
		{name: "neither", want: ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := Resolve(tc.configured, tc.header); got != tc.want {
				t.Fatalf("Resolve(%q, %q) = %q, want %q", tc.configured, tc.header, got, tc.want)
			}
		})
	}
}

func TestContext(t *testing.T) {
	if got := FromContext(context.Background()); got != "" {
		t.Fatalf("FromContext() without a service owner = %q, want empty", got)
	}
	if got := FromContext(WithContext(context.Background(), "ikta")); got != "ikta" {
		t.Fatalf("FromContext() = %q, want ikta", got)
	}
}
