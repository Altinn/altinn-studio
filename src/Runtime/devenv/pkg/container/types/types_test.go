package types

import (
	"reflect"
	"testing"
)

func TestMergeCapabilities(t *testing.T) {
	tests := []struct {
		name     string
		defaults []string
		explicit []string
		want     []string
	}{
		{
			name:     "empty inputs",
			defaults: []string{},
			explicit: []string{},
			want:     nil,
		},
		{
			name:     "nil inputs",
			defaults: nil,
			explicit: nil,
			want:     nil,
		},
		{
			name:     "only defaults",
			defaults: []string{"NET_RAW", "MKNOD"},
			explicit: []string{},
			want:     []string{"NET_RAW", "MKNOD"},
		},
		{
			name:     "only explicit",
			defaults: []string{},
			explicit: []string{"SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "no duplicates",
			defaults: []string{"NET_RAW", "MKNOD"},
			explicit: []string{"SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"NET_RAW", "MKNOD", "SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "with duplicates preserves order",
			defaults: []string{"NET_RAW", "MKNOD", "AUDIT_WRITE"},
			explicit: []string{"MKNOD", "SYS_PTRACE", "NET_RAW"},
			want:     []string{"NET_RAW", "MKNOD", "AUDIT_WRITE", "SYS_PTRACE"},
		},
		{
			name:     "real world DefaultPodmanCapabilities with user caps",
			defaults: DefaultPodmanCapabilities(),
			explicit: []string{"SYS_PTRACE", "NET_ADMIN", "NET_RAW"},
			want:     []string{"NET_RAW", "MKNOD", "AUDIT_WRITE", "SYS_PTRACE", "NET_ADMIN"},
		},
		{
			name:     "duplicates within defaults",
			defaults: []string{"NET_RAW", "NET_RAW", "MKNOD"},
			explicit: []string{},
			want:     []string{"NET_RAW", "MKNOD"},
		},
		{
			name:     "duplicates within explicit",
			defaults: []string{},
			explicit: []string{"SYS_PTRACE", "SYS_PTRACE", "NET_ADMIN"},
			want:     []string{"SYS_PTRACE", "NET_ADMIN"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MergeCapabilities(tt.defaults, tt.explicit)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("MergeCapabilities() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDefaultPodmanCapabilities(t *testing.T) {
	// Verify the default capabilities match the expected values
	expected := []string{"NET_RAW", "MKNOD", "AUDIT_WRITE"}
	got := DefaultPodmanCapabilities()
	if !reflect.DeepEqual(got, expected) {
		t.Errorf("DefaultPodmanCapabilities() = %v, want %v", got, expected)
	}

	// Verify callers cannot mutate package defaults.
	got[0] = "MUTATED"
	if reflect.DeepEqual(DefaultPodmanCapabilities(), got) {
		t.Error("DefaultPodmanCapabilities() returned shared backing storage")
	}
}
