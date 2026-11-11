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
	table := newDoctorTable()
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
	table := newDoctorTable()
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

// renderDoctorDotnet renders the .NET SDK rows without colors and with the ASCII status marks, and returns them.
func renderDoctorDotnet(t *testing.T, prerequisites *doctorsvc.Prerequisites) []string {
	t.Helper()
	t.Setenv("NO_COLOR", "1")
	t.Setenv(osutil.DisableTerminalDecorationsEnv, "1")

	var out bytes.Buffer
	command := &DoctorCommand{cfg: nil, out: ui.NewOutput(&out, io.Discard, false)}
	table := newDoctorTable()
	command.renderDoctorDotnetPrerequisite(table, prerequisites)
	command.out.RenderTable(table)

	return strings.Split(strings.TrimSuffix(out.String(), osutil.LineBreak), osutil.LineBreak)
}

func v9AppRequirement() *doctorsvc.DotnetRequirement {
	return &doctorsvc.DotnetRequirement{
		Project:         "/apps/ttd/app/App/App.csproj",
		TargetFramework: "net11.0",
		MinimumSDK:      "11.0",
	}
}

func TestRenderDoctorDotnet_OutsideAnApp_NamesTheSDKEachAppVersionNeeds(t *testing.T) {
	got := renderDoctorDotnet(t, &doctorsvc.Prerequisites{
		DotnetValue: "10.0.401",
		Dotnet:      doctorsvc.Check{OK: true},
	})

	want := []string{
		"  [ok] .NET SDK        10.0.401",
		"                       v8 apps need 8.0+, v9 apps need 11.0+",
	}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
}

func TestRenderDoctorDotnet_OutsideAnApp_FailsAnSDKOlderThanAnyAppNeeds(t *testing.T) {
	got := renderDoctorDotnet(t, &doctorsvc.Prerequisites{
		DotnetValue: "7.0.410",
		Dotnet:      doctorsvc.Check{Error: "dotnet version too old", OK: false},
	})

	if len(got) != 2 || got[0] != "  [error] .NET SDK        7.0.410 (8.0+ required)" {
		t.Errorf("rendered lines = %q, want 7.0.410 failing with 8.0+ required", got)
	}
}

func TestRenderDoctorDotnet_InsideAnApp_StatesTheAppsTargetFramework(t *testing.T) {
	got := renderDoctorDotnet(t, &doctorsvc.Prerequisites{
		DotnetValue:       "11.0.100",
		DotnetRequirement: v9AppRequirement(),
		Dotnet:            doctorsvc.Check{OK: true},
	})

	want := []string{"  [ok] .NET SDK        11.0.100 (app targets net11.0)"}
	if !slices.Equal(got, want) {
		t.Errorf("rendered lines =\n%q\nwant\n%q", got, want)
	}
}

func TestRenderDoctorDotnet_InsideAnApp_NamesTheSDKTheAppNeeds(t *testing.T) {
	tests := []struct {
		name          string
		value         string
		globalVersion string
		want          string
	}{
		{
			name:  "selected SDK too old",
			value: "10.0.401",
			want:  "  [error] .NET SDK        10.0.401 (app targets net11.0, needs 11.0+)",
		},
		{
			name:          "global.json selects an SDK too old",
			value:         "10.0.401",
			globalVersion: "10.0.401",
			want:          "  [error] .NET SDK        10.0.401 from global.json (app targets net11.0, needs 11.0+)",
		},
		{
			name: "dotnet not found",
			want: "  [error] .NET SDK        not found (app targets net11.0, needs 11.0+)",
		},
		{
			name:          "no SDK matches global.json",
			globalVersion: "11.0.100",
			want:          "  [error] .NET SDK        none matches global.json (11.0.100, rollForward latestFeature)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requirement := v9AppRequirement()
			if tt.globalVersion != "" {
				requirement.GlobalJSON = "/apps/ttd/app/global.json"
				requirement.SDKVersion = tt.globalVersion
				requirement.RollForward = "latestFeature"
			}
			got := renderDoctorDotnet(t, &doctorsvc.Prerequisites{
				DotnetValue:       tt.value,
				DotnetRequirement: requirement,
				Dotnet:            doctorsvc.Check{Error: "failed", OK: false},
			})

			if !slices.Equal(got, []string{tt.want}) {
				t.Errorf("rendered lines =\n%q\nwant\n%q", got, []string{tt.want})
			}
		})
	}
}

// doctor --json keeps the dotnet check's shape and adds the requirement only inside an app.
func TestDoctorPrerequisitesJSON_AddsTheDotnetRequirementOnlyInsideAnApp(t *testing.T) {
	t.Parallel()

	outside, err := json.Marshal(doctorsvc.Prerequisites{Dotnet: doctorsvc.Check{OK: true}})
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	if strings.Contains(string(outside), "dotnetRequirement") ||
		!strings.Contains(string(outside), `"dotnet":{"ok":true}`) {
		t.Errorf("payload outside an app = %s", outside)
	}

	inside, err := json.Marshal(doctorsvc.Prerequisites{
		DotnetRequirement: v9AppRequirement(),
		Dotnet:            doctorsvc.Check{OK: true},
	})
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	want := `"dotnetRequirement":{"project":"/apps/ttd/app/App/App.csproj","targetFramework":"net11.0","minimumSdk":"11.0"}`
	if !strings.Contains(string(inside), want) {
		t.Errorf("payload inside an app = %s, want it to contain %s", inside, want)
	}
}
