package shell

import "testing"

func TestGetReloadCommand_QuotesConfigPath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		shell      string
		configPath string
		want       string
	}{
		{
			name:       "powershell spaces and dollar",
			shell:      shellPowerShell,
			configPath: `C:\Users\$user\OneDrive - Org\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`,
			want:       `. 'C:\Users\$user\OneDrive - Org\Documents\PowerShell\Microsoft.PowerShell_profile.ps1'`,
		},
		{
			name:       "powershell single quote",
			shell:      shellPowerShell,
			configPath: `C:\Users\O'Brien\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`,
			want:       `. 'C:\Users\O''Brien\Documents\PowerShell\Microsoft.PowerShell_profile.ps1'`,
		},
		{
			name:       "bash spaces and dollar",
			shell:      shellBash,
			configPath: `/Users/$user/my profile/.bashrc`,
			want:       `source '/Users/$user/my profile/.bashrc'`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := getReloadCommand(tt.shell, tt.configPath)
			if got != tt.want {
				t.Fatalf("getReloadCommand() = %q, want %q", got, tt.want)
			}
		})
	}
}
