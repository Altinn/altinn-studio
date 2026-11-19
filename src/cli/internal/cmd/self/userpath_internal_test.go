package self

import (
	"strings"
	"testing"
)

const testInstallDir = `C:\Users\me\AppData\Local\Programs\studioctl`

func expandTestVariables(value string) string {
	return strings.ReplaceAll(value, "%LOCALAPPDATA%", `C:\Users\me\AppData\Local`)
}

func TestAppendPathListEntry(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		value       string
		want        string
		wantChanged bool
	}{
		{
			name:        "empty",
			value:       "",
			want:        testInstallDir,
			wantChanged: true,
		},
		{
			name:        "appends after existing entries",
			value:       `%USERPROFILE%\bin;C:\Tools`,
			want:        `%USERPROFILE%\bin;C:\Tools;` + testInstallDir,
			wantChanged: true,
		},
		{
			name:        "reuses a trailing separator",
			value:       `C:\Tools;`,
			want:        `C:\Tools;` + testInstallDir,
			wantChanged: true,
		},
		{
			name:        "already present in other case with trailing separator",
			value:       `C:\Tools;c:\users\me\appdata\local\programs\STUDIOCTL\`,
			want:        `C:\Tools;c:\users\me\appdata\local\programs\STUDIOCTL\`,
			wantChanged: false,
		},
		{
			name:        "already present through a variable",
			value:       `%LOCALAPPDATA%\Programs\studioctl;C:\Tools`,
			want:        `%LOCALAPPDATA%\Programs\studioctl;C:\Tools`,
			wantChanged: false,
		},
		{
			name:        "already present in quotes",
			value:       `"` + testInstallDir + `"`,
			want:        `"` + testInstallDir + `"`,
			wantChanged: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, changed := appendPathListEntry(tt.value, testInstallDir, expandTestVariables)
			if got != tt.want || changed != tt.wantChanged {
				t.Fatalf("appendPathListEntry() = (%q, %v), want (%q, %v)", got, changed, tt.want, tt.wantChanged)
			}
		})
	}
}

func TestRemovePathListEntry(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		value       string
		want        string
		wantChanged bool
	}{
		{
			name:        "keeps other entries as written",
			value:       `%USERPROFILE%\bin;` + testInstallDir + `;;C:\Tools`,
			want:        `%USERPROFILE%\bin;;C:\Tools`,
			wantChanged: true,
		},
		{
			name:        "removes every spelling of the directory",
			value:       `%LOCALAPPDATA%\Programs\studioctl;C:\Tools;C:\USERS\ME\APPDATA\LOCAL\PROGRAMS\STUDIOCTL\`,
			want:        `C:\Tools`,
			wantChanged: true,
		},
		{
			name:        "absent",
			value:       `C:\Tools;C:\Users\me\AppData\Local\Programs\studioctl-other`,
			want:        `C:\Tools;C:\Users\me\AppData\Local\Programs\studioctl-other`,
			wantChanged: false,
		},
		{
			name:        "empty",
			value:       "",
			want:        "",
			wantChanged: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, changed := removePathListEntry(tt.value, testInstallDir, expandTestVariables)
			if got != tt.want || changed != tt.wantChanged {
				t.Fatalf("removePathListEntry() = (%q, %v), want (%q, %v)", got, changed, tt.want, tt.wantChanged)
			}
		})
	}
}
