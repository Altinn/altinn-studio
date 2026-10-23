package cmd

import (
	"bytes"
	"encoding/json"
	"io"
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
			{ID: doctorsvc.DiskUsageServer, Bytes: nil, Error: "read directory: permission denied"},
			{ID: doctorsvc.DiskUsageTotal, Bytes: nil, Error: "read directory: permission denied"},
		},
		HasIssues: false,
	}
}

func renderDoctorDiskUsage(t *testing.T, disk *doctorsvc.Disk) []string {
	t.Helper()

	var out bytes.Buffer
	command := &DoctorCommand{cfg: nil, out: ui.NewOutput(&out, io.Discard, false)}
	table := newDoctorTable(doctorKeyWidth)
	command.renderDoctorDiskUsageSection(table, disk)
	command.out.RenderTable(table)

	return strings.Split(strings.TrimRight(out.String(), "\n"), "\n")
}

func findLine(lines []string, label string) string {
	for _, line := range lines {
		if strings.Contains(line, label) {
			return line
		}
	}
	return ""
}

func TestRenderDoctorDiskUsageSection_StatesSizesAndTheResetCommand(t *testing.T) {
	t.Parallel()

	lines := renderDoctorDiskUsage(t, testDiskWithUsage())

	if !strings.Contains(lines[0], "Disk usage") {
		t.Fatalf("first line = %q, want the section title", lines[0])
	}
	want := map[string]string{
		"Logs":           "12.3 MB",
		"Localtest data": "1.2 GB (cleared by '" + osutil.CurrentBin() + " env reset')",
		"Server":         unknownValue,
		"Total":          unknownValue,
	}
	for label, value := range want {
		if line := findLine(lines, label); !strings.HasSuffix(line, "  "+value) {
			t.Errorf("%s line = %q, want value %q", label, line, value)
		}
	}
	for _, line := range lines {
		if strings.Contains(line, "permission denied") {
			t.Errorf("line %q shows the walk error; text output states only that the size is unknown", line)
		}
	}
}

func TestRenderDoctorDiskUsageSection_OmitsTheResetCommandWhenThereIsNoData(t *testing.T) {
	t.Parallel()

	disk := &doctorsvc.Disk{
		Checks: []doctorsvc.DiskCheck{},
		Usage: []doctorsvc.DiskUsage{
			{ID: doctorsvc.DiskUsageLocaltestData, Bytes: new(int64(0)), Error: ""},
		},
		HasIssues: false,
	}

	line := findLine(renderDoctorDiskUsage(t, disk), "Localtest data")

	if !strings.HasSuffix(line, " 0 B") {
		t.Errorf("Localtest data line = %q, want just 0 B", line)
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
	if !strings.Contains(string(payload), `{"id":"server","bytes":null,"error":"read directory: permission denied"}`) {
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
