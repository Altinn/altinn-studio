package localtestv2

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// envUpdateGolden regenerates the golden file: STUDIOCTL_UPDATE_GOLDEN=1 go test ./internal/cmd/env/localtestv2/.
const envUpdateGolden = "STUDIOCTL_UPDATE_GOLDEN"

var goldenPath = filepath.Join("testdata", "environment.golden.json") //nolint:gochecknoglobals // A test fixture path.

// goldenEnvironment is what the runtime builds from the manifest. Each container's env is the manifest's envs plus the
// services__ variables.
type goldenEnvironment struct {
	// Groups are the containers each group selects with the default group, in start order.
	Groups map[string][]string `json:"groups"`
	// Default is `env up` with no flags: pulled images at the pin, no optional group.
	Default goldenOptions `json:"default"`
	// Everything is `env up --with everything --latest --dev-storage --dev-dialogporten-webapi=Dockerfile.webapi` on
	// a runtime with SELinux relabelling.
	Everything goldenOptions `json:"everything"`
	// VolumePrefix is this runtime's volume prefix; a mount's HostPath and each of Volumes is it plus a volume id.
	VolumePrefix string `json:"volumePrefix"`
	// Volumes are the volumes env reset removes.
	Volumes []string `json:"volumes"`
}

type goldenOptions struct {
	FrontDoorHealth string           `json:"frontDoorHealth"`
	Resources       []goldenResource `json:"resources"`
	HealthTargets   []string         `json:"healthTargets"`
}

func TestTheEnvironmentMatchesTheGoldenFile(t *testing.T) {
	t.Parallel()
	everything := defaultOptions("/home/dev/.altinn-studio/certs")
	everything.Groups = OptionalGroups()
	everything.LatestImages = true
	everything.RelabelBinds = true
	everything.Dev = map[string]DevBuild{
		"storage": {
			Context:    "/src/localtest/components/storage",
			Dockerfile: "/src/localtest/components/storage/Dockerfile",
		},
		"dialogporten-webapi": {
			Context:    "/src/localtest/components/dialogporten",
			Dockerfile: "/src/localtest/components/dialogporten/Dockerfile.webapi",
		},
	}

	got := goldenEnvironment{
		Groups:       map[string][]string{},
		Volumes:      volumeNames(),
		VolumePrefix: volumePrefix,
		Default:      goldenOf(t, defaultOptions("/home/dev/.altinn-studio/certs")),
		Everything:   goldenOf(t, everything),
	}
	for _, name := range stack().GroupNames() {
		got.Groups[name] = stack().Select([]string{manifest.DefaultGroup, name})
	}
	data, err := json.MarshalIndent(got, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	data = append(data, '\n')

	if os.Getenv(envUpdateGolden) != "" {
		if mkdirErr := os.MkdirAll(filepath.Dir(goldenPath), 0o755); mkdirErr != nil {
			t.Fatal(mkdirErr)
		}
		if writeErr := os.WriteFile(goldenPath, data, 0o600); writeErr != nil {
			t.Fatal(writeErr)
		}
		t.Logf("wrote %s", goldenPath)
		return
	}
	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("%v (regenerate with %s=1)", err, envUpdateGolden)
	}
	if !bytes.Equal(data, want) {
		t.Errorf(
			"the environment differs from %s; when the change is intended, regenerate it with %s=1 and review the diff",
			goldenPath,
			envUpdateGolden,
		)
	}
}

func goldenOf(t *testing.T, opts *Options) goldenOptions {
	t.Helper()
	names := selected(opts)
	described := make([]string, 0, len(names))
	for _, name := range names {
		described = append(described, name+" "+healthTargetOf(name).String())
	}
	probes := func(healthTarget) func(context.Context) error {
		return func(context.Context) error { return nil }
	}
	return goldenOptions{
		Resources:       describeResources(t, resources(opts, probes)),
		HealthTargets:   described,
		FrontDoorHealth: frontDoorHealthURL(opts),
	}
}

// goldenResource is one resource of the graph in a form JSON can hold: references become the referenced IDs, and the
// destroy-error handler only says whether there is one.
type goldenResource struct {
	Enabled             *bool                 `json:"enabled,omitempty"`
	HealthCheck         *types.HealthCheck    `json:"healthCheck,omitempty"`
	Labels              map[string]string     `json:"labels,omitempty"`
	ID                  resource.ResourceID   `json:"id"`
	Image               resource.ResourceID   `json:"image,omitempty"`
	Ref                 string                `json:"ref,omitempty"`
	PullPolicy          string                `json:"pullPolicy,omitempty"`
	ContextPath         string                `json:"contextPath,omitempty"`
	Dockerfile          string                `json:"dockerfile,omitempty"`
	Tag                 string                `json:"tag,omitempty"`
	Driver              string                `json:"driver,omitempty"`
	User                string                `json:"user,omitempty"`
	UsernsMode          string                `json:"usernsMode,omitempty"`
	RestartPolicy       string                `json:"restartPolicy,omitempty"`
	Build               *types.BuildOptions   `json:"build,omitempty"`
	Networks            []resource.ResourceID `json:"networks,omitempty"`
	DependsOn           []resource.ResourceID `json:"dependsOn,omitempty"`
	Ports               []types.PortMapping   `json:"ports,omitempty"`
	Volumes             []types.VolumeMount   `json:"volumes,omitempty"`
	Env                 []string              `json:"env,omitempty"`
	Command             []string              `json:"command,omitempty"`
	ExtraHosts          []string              `json:"extraHosts,omitempty"`
	NetworkAliases      []string              `json:"networkAliases,omitempty"`
	HandlesDestroyError bool                  `json:"handlesDestroyError,omitempty"`
	RetainOnDestroy     bool                  `json:"retainOnDestroy,omitempty"`
	WaitForReady        bool                  `json:"waitForReady,omitempty"`
	ReadinessProbe      bool                  `json:"readinessProbe,omitempty"`
}

func describeResources(t *testing.T, resources []resource.Resource) []goldenResource {
	t.Helper()
	out := make([]goldenResource, 0, len(resources))
	for _, r := range resources {
		var g goldenResource
		g.ID = r.ID()
		switch v := r.(type) {
		case *resource.Network:
			g.Enabled, g.Labels, g.Driver = v.Enabled, v.Labels, v.Driver
			g.HandlesDestroyError = v.Lifecycle.HandleDestroyError != nil
			g.RetainOnDestroy = v.Lifecycle.RetainOnDestroy
		case *resource.PulledImage:
			g.Enabled, g.Ref, g.PullPolicy = v.Enabled, v.Ref, pullPolicyName(t, v.PullPolicy)
		case *resource.BuiltImage:
			build := v.Build
			g.Enabled, g.ContextPath, g.Dockerfile, g.Tag, g.Build = v.Enabled, v.ContextPath, v.Dockerfile, v.Tag, &build
		case *resource.Container:
			g.Enabled, g.HealthCheck, g.Labels = v.Enabled, v.HealthCheck, v.Labels
			g.Image, g.Networks, g.DependsOn = v.Image.ID(), refIDs(v.Networks), refIDs(v.DependsOn)
			g.User, g.UsernsMode, g.RestartPolicy = v.User, v.UsernsMode, v.RestartPolicy
			g.Ports, g.Volumes, g.Env, g.Command = v.Ports, v.Volumes, v.Env, v.Command
			g.ExtraHosts, g.NetworkAliases = v.ExtraHosts, v.NetworkAliases
			g.HandlesDestroyError = v.Lifecycle.HandleDestroyError != nil
			g.RetainOnDestroy, g.WaitForReady = v.Lifecycle.RetainOnDestroy, v.Lifecycle.WaitForReady
			g.ReadinessProbe = v.Lifecycle.ReadinessProbe != nil
		default:
			t.Fatalf("resource %s of type %T has no golden form", r.ID(), r)
		}
		out = append(out, g)
	}
	return out
}

func pullPolicyName(t *testing.T, policy resource.PullPolicy) string {
	t.Helper()
	switch policy {
	case resource.PullAlways:
		return "always"
	case resource.PullIfNotPresent:
		return "ifNotPresent"
	case resource.PullNever:
		return "never"
	case resource.PullAlwaysAllowStale:
		return "alwaysAllowStale"
	}
	t.Fatalf("unknown pull policy %d", policy)
	return ""
}

func refIDs(refs []resource.ResourceRef) []resource.ResourceID {
	ids := make([]resource.ResourceID, 0, len(refs))
	for _, ref := range refs {
		ids = append(ids, ref.ID())
	}
	return ids
}
