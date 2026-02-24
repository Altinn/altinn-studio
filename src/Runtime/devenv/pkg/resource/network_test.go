package resource

import (
	"testing"
)

func TestNetwork_ID(t *testing.T) {
	n := &Network{Name: "test-network"}
	if got := n.ID(); got != "network:test-network" {
		t.Errorf("ID() = %q, want %q", got, "network:test-network")
	}
}

func TestNetwork_Dependencies(t *testing.T) {
	n := &Network{Name: "test-network"}
	deps := n.Dependencies()
	if len(deps) != 0 {
		t.Errorf("Dependencies() = %v, want empty", deps)
	}
}

func TestNetwork_NetworkName(t *testing.T) {
	n := &Network{Name: "mynetwork"}
	if got := n.NetworkName(); got != "mynetwork" {
		t.Errorf("NetworkName() = %q, want %q", got, "mynetwork")
	}
}

func TestNetwork_Validate(t *testing.T) {
	tests := []struct {
		name    string
		network *Network
		wantErr bool
	}{
		{
			name:    "valid network",
			network: &Network{Name: "test-net"},
		},
		{
			name:    "empty name",
			network: &Network{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.network.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNetwork_Fields(t *testing.T) {
	n := &Network{
		Name:   "mynet",
		Driver: "bridge",
		Labels: map[string]string{"env": "test"},
	}

	if n.Name != "mynet" {
		t.Errorf("Name = %q, want %q", n.Name, "mynet")
	}
	if n.Driver != "bridge" {
		t.Errorf("Driver = %q, want %q", n.Driver, "bridge")
	}
	if n.Labels["env"] != "test" {
		t.Errorf("Labels[env] = %q, want %q", n.Labels["env"], "test")
	}
}

// Test that Network implements required interfaces
func TestNetwork_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*Network)(nil)
	var _ NetworkResource = (*Network)(nil)
	var _ Validator = (*Network)(nil)
}
