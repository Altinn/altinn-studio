package cmd

import "testing"

func TestDoctorContainerHostLabelIncludesHint(t *testing.T) {
	host := "unix:///run/user/1234/podman/podman.sock"
	hint := "socket not found; run 'systemctl --user enable --now podman.socket'"

	got := doctorContainerHostLabel(host, hint)
	want := host + " (" + hint + ")"
	if got != want {
		t.Fatalf("doctorContainerHostLabel() = %q, want %q", got, want)
	}
}
