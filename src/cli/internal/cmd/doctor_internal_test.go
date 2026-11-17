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

func testDiskWithChecks() *doctorsvc.Disk {
	return &doctorsvc.Disk{
		Checks: []doctorsvc.DiskCheck{
			{ID: doctorsvc.DiskCheckHome, Level: "ok", Path: "/studioctl/home", Message: "ready"},
			{ID: doctorsvc.DiskCheckSockets, Level: "ok", Path: "/studioctl/sockets", Message: "ready"},
			{ID: doctorsvc.DiskCheckLogs, Level: "warn", Path: "/studioctl/logs", Message: "directory is not writable"},
			{ID: doctorsvc.DiskCheckData, Level: "error", Path: "/studioctl/data", Message: "directory missing"},
			{ID: doctorsvc.DiskCheckBin, Level: "ok", Path: "/studioctl/bin", Message: "ready"},
			{
				ID:      doctorsvc.DiskCheckCredentials,
				Level:   "info",
				Path:    "/studioctl/credentials.yaml",
				Message: "missing (not logged in)",
			},
			{ID: doctorsvc.DiskCheckServerBinary, Level: "ok", Path: "/studioctl/bin/server", Message: "present"},
			{
				ID:      doctorsvc.DiskCheckServerState,
				Level:   "info",
				Path:    "/studioctl/home",
				Message: "pid and socket files absent (not running)",
			},
			{
				ID:      doctorsvc.DiskCheckMaskinportenClient,
				Level:   "info",
				Path:    "/studioctl/apps/ttd/my-app/secrets",
				Message: "no local Maskinporten client configured",
			},
		},
		Usage:     []doctorsvc.DiskUsage{},
		HasIssues: true,
	}
}

// renderDoctorDisk renders the Disk section without colors and returns its lines, split on the platform
// line break, and what verbose output wrote to stderr. Status marks are the ASCII ones, the same on
// every terminal.
func renderDoctorDisk(t *testing.T, disk *doctorsvc.Disk, verbose bool) ([]string, string) {
	t.Helper()
	t.Setenv("NO_COLOR", "1")
	t.Setenv(osutil.DisableTerminalDecorationsEnv, "1")

	var out, errOut bytes.Buffer
	command := &DoctorCommand{cfg: nil, out: ui.NewOutput(&out, &errOut, verbose)}
	table := newDoctorTable(doctorKeyWidth)
	command.renderDoctorDiskSection(table, disk)
	command.out.RenderTable(table)

	return strings.Split(strings.TrimSuffix(out.String(), osutil.LineBreak), osutil.LineBreak), errOut.String()
}

func TestRenderDoctorDiskSection_LabelsTheChecksAndLeavesOutPaths(t *testing.T) {
	got, stderr := renderDoctorDisk(t, testDiskWithChecks(), false)

	want := []string{
		"Disk",
		"  [ok]    Home            ready",
		"  [ok]    Sockets         ready",
		"  [error] Logs            WARN: directory is not writable",
		"  [error] Data            ERROR: directory missing",
		"  [ok]    Binaries        ready",
		"          Credentials     missing (not logged in)",
		"  [ok]    Server binary   present",
		"          Server state    pid and socket files absent (not running)",
		"          Maskinporten    no local Maskinporten client configured",
		"",
	}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want nothing without -v", stderr)
	}
}

// With -v, the paths of the failing checks go to stderr, so the developer can find the file to fix.
func TestRenderDoctorDiskSection_Verbose_NamesThePathsOfFailingChecks(t *testing.T) {
	got, stderr := renderDoctorDisk(t, testDiskWithChecks(), true)

	for _, line := range got {
		if strings.Contains(line, "/studioctl/") {
			t.Errorf("rendered line %q contains a path", line)
		}
	}
	want := "Disk Logs: /studioctl/logs" + osutil.LineBreak + "Disk Data: /studioctl/data" + osutil.LineBreak
	if stderr != want {
		t.Errorf("stderr = %q, want %q", stderr, want)
	}
}

func TestDoctorDiskJSON_KeepsCheckIDsAndPaths(t *testing.T) {
	t.Parallel()

	payload, err := json.Marshal(testDiskWithChecks())
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	for _, want := range []string{
		`{"id":"server_binary","level":"ok","path":"/studioctl/bin/server","message":"present"}`,
		`"id":"server_state","level":"info","path":"/studioctl/home"`,
	} {
		if !strings.Contains(string(payload), want) {
			t.Errorf("payload = %s, want it to contain %s", payload, want)
		}
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
