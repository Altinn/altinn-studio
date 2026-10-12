package telemetry

import "testing"

func TestRedactURL(t *testing.T) {
	tests := map[string]string{
		"http://app.local/ttd/app/":                             "http://app.local/ttd/app/",
		"https://user:pass@app.local/ttd/app/api?token=x#/frag": "https://app.local/ttd/app/api",
		"https://app.local:8443/ttd/app?pdf=1&lang=nb":          "https://app.local:8443/ttd/app",
		"about:blank": "",
		"not a url":   "",
		"":            "",
	}
	for raw, want := range tests {
		if got := RedactURL(raw); got != want {
			t.Errorf("RedactURL(%q) = %q, want %q", raw, got, want)
		}
	}
}
