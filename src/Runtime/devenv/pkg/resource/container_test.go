package resource

import (
	"testing"

	"altinn.studio/devenv/pkg/container/types"
)

func TestContainer_ID(t *testing.T) {
	c := &Container{Name: "test-container"}
	if got := c.ID(); got != "container:test-container" {
		t.Errorf("ID() = %q, want %q", got, "container:test-container")
	}
}

func TestContainer_Dependencies(t *testing.T) {
	image := &RemoteImage{Ref: "nginx:latest"}
	network := &Network{Name: "testnet"}

	c := &Container{
		Name:     "test-container",
		Image:    Ref(image),
		Networks: []ResourceRef{Ref(network)},
	}

	deps := c.Dependencies()
	if len(deps) != 2 {
		t.Fatalf("Dependencies() returned %d deps, want 2", len(deps))
	}

	if deps[0].ID() != image.ID() {
		t.Errorf("Dependencies()[0].ID() = %q, want %q", deps[0].ID(), image.ID())
	}
	if deps[1].ID() != network.ID() {
		t.Errorf("Dependencies()[1].ID() = %q, want %q", deps[1].ID(), network.ID())
	}
}

func TestContainer_Dependencies_NoNetworks(t *testing.T) {
	image := &RemoteImage{Ref: "nginx:latest"}

	c := &Container{
		Name:  "test-container",
		Image: Ref(image),
	}

	deps := c.Dependencies()
	if len(deps) != 1 {
		t.Fatalf("Dependencies() returned %d deps, want 1", len(deps))
	}

	if deps[0].ID() != image.ID() {
		t.Errorf("Dependencies()[0].ID() = %q, want %q", deps[0].ID(), image.ID())
	}
}

func TestContainer_Dependencies_MultipleNetworks(t *testing.T) {
	image := &RemoteImage{Ref: "nginx:latest"}
	net1 := &Network{Name: "frontend"}
	net2 := &Network{Name: "backend"}

	c := &Container{
		Name:     "test-container",
		Image:    Ref(image),
		Networks: []ResourceRef{Ref(net1), Ref(net2)},
	}

	deps := c.Dependencies()
	if len(deps) != 3 {
		t.Fatalf("Dependencies() returned %d deps, want 3", len(deps))
	}

	if deps[0].ID() != image.ID() {
		t.Errorf("Dependencies()[0].ID() = %q, want %q", deps[0].ID(), image.ID())
	}
	if deps[1].ID() != net1.ID() {
		t.Errorf("Dependencies()[1].ID() = %q, want %q", deps[1].ID(), net1.ID())
	}
	if deps[2].ID() != net2.ID() {
		t.Errorf("Dependencies()[2].ID() = %q, want %q", deps[2].ID(), net2.ID())
	}
}

func TestContainer_Validate(t *testing.T) {
	tests := []struct {
		name      string
		container *Container
		wantErr   bool
	}{
		{
			name: "valid container",
			container: &Container{
				Name:  "test",
				Image: RefID("image:nginx"),
			},
		},
		{
			name: "empty name",
			container: &Container{
				Image: RefID("image:nginx"),
			},
			wantErr: true,
		},
		{
			name: "empty image",
			container: &Container{
				Name: "test",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.container.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestContainer_Fields(t *testing.T) {
	c := &Container{
		Name:          "mycontainer",
		Image:         RefID("image:nginx"),
		Networks:      []ResourceRef{RefID("network:mynet")},
		Ports:         []types.PortMapping{{HostPort: "8080", ContainerPort: "80"}},
		Volumes:       []types.VolumeMount{{HostPath: "/data", ContainerPath: "/app/data"}},
		Env:           []string{"FOO=bar"},
		Labels:        map[string]string{"app": "test"},
		Command:       []string{"nginx", "-g", "daemon off;"},
		ExtraHosts:    []string{"host.docker.internal:172.17.0.1"},
		RestartPolicy: "always",
	}

	// Verify all fields are accessible
	if c.Name != "mycontainer" {
		t.Errorf("Name = %q, want %q", c.Name, "mycontainer")
	}
	if len(c.Ports) != 1 {
		t.Errorf("Ports length = %d, want 1", len(c.Ports))
	}
	if len(c.Env) != 1 || c.Env[0] != "FOO=bar" {
		t.Errorf("Env = %v, want [FOO=bar]", c.Env)
	}
	if c.RestartPolicy != "always" {
		t.Errorf("RestartPolicy = %q, want %q", c.RestartPolicy, "always")
	}
}

// Test that Container implements Resource interface
func TestContainer_ImplementsResource(t *testing.T) {
	var _ Resource = (*Container)(nil)
}

// Test that Container implements Validator interface
func TestContainer_ImplementsValidator(t *testing.T) {
	var _ Validator = (*Container)(nil)
}
