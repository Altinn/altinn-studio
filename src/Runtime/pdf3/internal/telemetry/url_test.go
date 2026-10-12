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

func TestRedactURLsInText(t *testing.T) {
	tests := map[string]string{
		"no URL in this message": "no URL in this message",
		"Failed to fetch https://app.local/ttd/app/api/data?token=secret: 401":                                "Failed to fetch https://app.local/ttd/app/api/data 401",
		"Navigated to http://app.local/ttd/app/#/instance/1/abc":                                              "Navigated to http://app.local/ttd/app/",
		"WebSocket wss://user:pass@app.local/ws?ticket=x closed":                                              "WebSocket wss://app.local/ws closed",
		"TypeError: x\n    at f (https://app.local/app.js?v=1:10:5)\n    at g (https://cdn.local/lib.js:2:3)": "TypeError: x\n    at f (https://app.local/app.js)\n    at g (https://cdn.local/lib.js:2:3)",
		`"HTTPS://APP.LOCAL/A?b=c" and 'http://other.local/d#e'`:                                              `"https://APP.LOCAL/A" and 'http://other.local/d'`,
		"broken http://exa mple and http://%zz/x?y":                                                           "broken http://exa mple and [url]",
	}
	for text, want := range tests {
		if got := RedactURLsInText(text); got != want {
			t.Errorf("RedactURLsInText(%q) = %q, want %q", text, got, want)
		}
	}
}
