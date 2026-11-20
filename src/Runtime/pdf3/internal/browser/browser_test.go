package browser

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"

	"altinn.studio/pdf3/internal/telemetry/attr"
)

// The browser's output arrives in arbitrary chunks. Each line must be logged once, cut off at
// maxLoggedLine, however the chunks split it.
func TestCmdToLoggerLogsCappedLines(t *testing.T) {
	var out bytes.Buffer
	l := &cmdToLogger{logger: slog.New(slog.NewJSONHandler(&out, nil))}
	long := strings.Repeat("y", 3*maxLoggedLine)
	for _, chunk := range []string{"first\nsec", "ond\n", long[:maxLoggedLine+10], long[maxLoggedLine+10:] + "\nlast\n"} {
		if n, err := l.Write([]byte(chunk)); err != nil || n != len(chunk) {
			t.Fatalf("Write(%d bytes) = %d, %v", len(chunk), n, err)
		}
	}

	type record struct {
		Message   string
		Truncated int
	}
	var got []record
	for line := range strings.Lines(out.String()) {
		var fields map[string]any
		if err := json.Unmarshal([]byte(line), &fields); err != nil {
			t.Fatal(err)
		}
		message, _ := fields[attr.BrowserOutput].(string)                  //nolint:errcheck // Checked against want below.
		truncated, _ := fields[attr.BrowserOutputTruncatedBytes].(float64) //nolint:errcheck // Absent means nothing was cut.
		got = append(got, record{message, int(truncated)})
	}
	want := []record{{"first", 0}, {"second", 0}, {long[:maxLoggedLine], 2 * maxLoggedLine}, {"last", 0}}
	if len(got) != len(want) {
		t.Fatalf("logged %d lines, want %d: %+v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("line %d = %.40q (truncated %d), want %.40q (truncated %d)", i, got[i].Message, got[i].Truncated,
				want[i].Message, want[i].Truncated)
		}
	}
}

func TestCmdToLoggerRedactsURLs(t *testing.T) {
	var out bytes.Buffer
	l := &cmdToLogger{logger: slog.New(slog.NewTextHandler(&out, nil))}
	line := `[ERROR:console] "Failed", source: https://ttd.apps.tt02.altinn.no/ttd/app/api/data?token=secret#frag (1)` + "\n"
	if _, err := l.Write([]byte(line)); err != nil {
		t.Fatal(err)
	}

	got := out.String()
	if strings.Contains(got, "secret") || strings.Contains(got, "frag") {
		t.Errorf("logged query or fragment: %s", got)
	}
	if !strings.Contains(got, "https://ttd.apps.tt02.altinn.no/ttd/app/api/data") {
		t.Errorf("logged line lost the URL's path: %s", got)
	}
}
