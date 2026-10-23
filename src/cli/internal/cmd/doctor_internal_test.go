package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"slices"
	"strings"
	"testing"

	doctorsvc "altinn.studio/studioctl/internal/cmd/doctor"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func testDiskWithUsage() *doctorsvc.Disk {
	return &doctorsvc.Disk{
		Checks: []doctorsvc.DiskCheck{},
		Usage: []doctorsvc.DiskUsage{
			{ID: doctorsvc.DiskUsageLogs, Bytes: new(int64(12_345_678)), Error: ""},
			{ID: doctorsvc.DiskUsageLocaltestData, Bytes: new(int64(1_234_567_890)), Error: ""},
			{ID: doctorsvc.DiskUsageServer, Bytes: nil, Error: "permission denied"},
			{ID: doctorsvc.DiskUsageTotal, Bytes: nil, Error: "permission denied"},
		},
		HasIssues: false,
	}
}

// renderDoctorDiskUsage renders the section without colors and returns its lines, split on the
// platform line break.
func renderDoctorDiskUsage(t *testing.T, disk *doctorsvc.Disk) []string {
	t.Helper()
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	command := &DoctorCommand{cfg: nil, out: ui.NewOutput(&out, io.Discard, false)}
	table := newDoctorTable(doctorKeyWidth)
	command.renderDoctorDiskUsageSection(table, disk)
	command.out.RenderTable(table)

	return strings.Split(strings.TrimSuffix(out.String(), osutil.LineBreak), osutil.LineBreak)
}

func resetHintLine() string {
	return "                    cleared by '" + osutil.CurrentBin() + " env reset'"
}

func TestRenderDoctorDiskUsageSection_StatesSizesAndTheResetCommand(t *testing.T) {
	got := renderDoctorDiskUsage(t, testDiskWithUsage())

	want := []string{
		"Disk usage",
		"    Logs            12.3 MB",
		"    Localtest data  1.2 GB",
		resetHintLine(),
		"    Server          " + unknownValue,
		"    Total           " + unknownValue,
		"",
	}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
}

func localtestDataOnly(size *int64) *doctorsvc.Disk {
	return &doctorsvc.Disk{
		Checks:    []doctorsvc.DiskCheck{},
		Usage:     []doctorsvc.DiskUsage{{ID: doctorsvc.DiskUsageLocaltestData, Bytes: size, Error: ""}},
		HasIssues: false,
	}
}

func TestRenderDoctorDiskUsageSection_OmitsTheResetCommandWhenThereIsNoData(t *testing.T) {
	got := renderDoctorDiskUsage(t, localtestDataOnly(new(int64(0))))

	want := []string{"Disk usage", "    Localtest data  0 B", ""}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
}

// Data a container wrote can be unreadable to the developer, which makes the size unknown; `env reset`
// still clears it, so the command is named.
func TestRenderDoctorDiskUsageSection_NamesTheResetCommandWhenTheSizeIsUnknown(t *testing.T) {
	got := renderDoctorDiskUsage(t, localtestDataOnly(nil))

	want := []string{"Disk usage", "    Localtest data  " + unknownValue, resetHintLine(), ""}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
}

func TestDoctorDiskJSON_ReportsUsageInBytesAndNullWhenUnknown(t *testing.T) {
	t.Parallel()

	payload, err := json.Marshal(testDiskWithUsage())
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	var decoded struct {
		Checks []json.RawMessage `json:"checks"`
		Usage  []struct {
			ID    string `json:"id"`
			Bytes *int64 `json:"bytes"`
			Error string `json:"error"`
		} `json:"usage"`
		HasIssues bool `json:"hasIssues"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}
	if len(decoded.Usage) != 4 {
		t.Fatalf("usage = %s, want four entries", payload)
	}
	if decoded.Usage[1].ID != "localtest_data" || decoded.Usage[1].Bytes == nil ||
		*decoded.Usage[1].Bytes != 1_234_567_890 {
		t.Errorf("usage[1] = %+v, want localtest_data with its size in bytes", decoded.Usage[1])
	}
	if !strings.Contains(string(payload), `{"id":"server","bytes":null,"error":"permission denied"}`) {
		t.Errorf("payload = %s, want an unknown size as null with its error", payload)
	}
	if !strings.Contains(string(payload), `"checks":[]`) || !strings.Contains(string(payload), `"hasIssues":false`) {
		t.Errorf("payload = %s, want the existing disk fields unchanged", payload)
	}
}

func TestFormatBytes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		want string
		in   int64
	}{
		{in: 0, want: "0 B"},
		{in: 999, want: "999 B"},
		{in: 1000, want: "1.0 kB"},
		{in: 1_234, want: "1.2 kB"},
		{in: 999_949, want: "999.9 kB"},
		{in: 999_960, want: "1.0 MB"},
		{in: 12_345_678, want: "12.3 MB"},
		{in: 1_234_567_890, want: "1.2 GB"},
		{in: 2_500_000_000_000, want: "2.5 TB"},
	}
	for _, tt := range tests {
		if got := formatBytes(tt.in); got != tt.want {
			t.Errorf("formatBytes(%d) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
