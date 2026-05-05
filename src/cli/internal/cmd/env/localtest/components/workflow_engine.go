package components

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	devImageTagWorkflowEngine = "localtest-workflow-engine:dev"
	workflowEngineInfraDir    = "workflow-engine"
	workflowEngineDbDataDir   = "workflow-engine-db"

	// WorkflowEngineDbVolume is the named volume used for workflow-engine PostgreSQL data.
	WorkflowEngineDbVolume = "localtest-workflow-engine-db-data"

	postgresHealthInterval    = 10 * time.Second
	postgresHealthTimeout     = 5 * time.Second
	postgresHealthRetries     = 5
	postgresHealthStartPeriod = 5 * time.Second

	postgresUser     = "postgres"
	postgresPassword = "postgres"
	postgresDB       = "postgres"
	postgresPort     = "5432"
	workflowEngineDB = "workflow_engine"
)

func registerWorkflowEngineComponents(manifest *Manifest, opts *Options) {
	manifest.addContainer(opts, workflowEngineDbImage(opts), workflowEngineDbContainer(opts), true)
	manifest.addContainer(opts, workflowEngineImage(opts), workflowEngineContainer(opts), true)
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentWorkflowEngine,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationEnv,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      "http://" + ContainerWorkflowEngine + ":8080",
		},
		Enabled: true,
	})
}

func workflowEngineDbImage(ctx *Options) resource.ImageResource {
	return &resource.RemoteImage{
		Enabled:    nil,
		Ref:        ctx.Images.Core.WorkflowEngineDb.Ref(),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func workflowEngineImage(ctx *Options) resource.ImageResource {
	if ctx.ImageMode == DevMode && ctx.DevConfig != nil {
		return &resource.LocalImage{
			Enabled:     nil,
			ContextPath: filepath.ToSlash(filepath.Join(ctx.DevConfig.RepoRoot, "src")),
			Dockerfile: filepath.ToSlash(
				filepath.Join(ctx.DevConfig.RepoRoot, "src/Runtime/workflow-engine-app/Dockerfile"),
			),
			Build: types.BuildOptions{
				CacheFrom: nil,
				CacheTo:   nil,
			},
			Tag: devImageTagWorkflowEngine,
		}
	}
	return &resource.RemoteImage{
		Enabled:    nil,
		Ref:        ctx.Images.Core.WorkflowEngine.Ref(),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func workflowEngineDbContainer(ctx *Options) *ContainerSpec {
	spec := newContainerSpec(
		ContainerWorkflowEngineDb,
		nil,
		map[string]string{
			"POSTGRES_DB":       postgresDB,
			"POSTGRES_USER":     postgresUser,
			"POSTGRES_PASSWORD": postgresPassword,
			"TZ":                "Europe/Oslo",
		},
		[]types.VolumeMount{
			newNamedVolume(
				WorkflowEngineDbVolume,
				"/var/lib/postgresql",
			),
			newReadOnlyVolume(
				WorkflowEngineInfraFilePath(ctx.Paths.InfraDir, "postgres-init.sql"),
				"/docker-entrypoint-initdb.d/01-tuning.sql",
			),
		},
		nil,
		nil,
		[]string{"postgres", "-c", "shared_preload_libraries=pg_stat_statements"},
	)
	spec.HealthCheck = &types.HealthCheck{
		Test:        []string{"CMD-SHELL", "pg_isready -h 127.0.0.1 -p " + postgresPort + " -U " + postgresUser},
		Interval:    postgresHealthInterval,
		Timeout:     postgresHealthTimeout,
		Retries:     postgresHealthRetries,
		StartPeriod: postgresHealthStartPeriod,
	}
	spec.UseDefaultUser = true
	return spec
}

func workflowEngineContainer(ctx *Options) *ContainerSpec {
	return newContainerSpec(
		ContainerWorkflowEngine,
		nil,
		workflowEngineEnv(ctx.Topology),
		nil,
		nil,
		[]string{ContainerWorkflowEngineDb, ContainerLocaltest},
		nil,
	)
}

func workflowEngineEnv(topology envtopology.Local) map[string]string {
	return map[string]string{
		"ASPNETCORE_ENVIRONMENT":              "Docker",
		"ConnectionStrings__WorkflowEngine":   "Host=" + ContainerWorkflowEngineDb + ";Port=" + postgresPort + ";Database=" + workflowEngineDB + ";Username=" + postgresUser + ";Password=" + postgresPassword,
		"AppCommandSettings__CommandEndpoint": topology.LocaltestBaseURL() + "/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/",
	}
}

// ensurePgpass writes the pgAdmin passfile used to connect to workflow-engine PostgreSQL.
func ensurePgpass(paths Paths) error {
	content := fmt.Sprintf(
		"%s:%s:*:%s:%s\n",
		ContainerWorkflowEngineDb,
		postgresPort,
		postgresUser,
		postgresPassword,
	)
	if err := os.MkdirAll(WorkflowEngineInfraPath(paths.InfraDir), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create workflow-engine infra directory: %w", err)
	}

	path := WorkflowEngineInfraFilePath(paths.InfraDir, "pgpass")
	// PgAdmin's entrypoint runs as the image user and must read this bind mount before it copies it to a private 0600 file.
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write pgpass: %w", err)
	}
	if err := os.Chmod(path, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("chmod pgpass: %w", err)
	}
	return nil
}

// WorkflowEngineInfraFilePath returns a workflow-engine infra file path.
func WorkflowEngineInfraFilePath(infraDir, name string) string {
	return filepath.Join(WorkflowEngineInfraPath(infraDir), name)
}

// WorkflowEngineInfraPath returns the workflow-engine infra directory path.
func WorkflowEngineInfraPath(infraDir string) string {
	return filepath.Join(infraDir, workflowEngineInfraDir)
}

// WorkflowEngineDbDataPath returns the legacy workflow-engine database data path.
func WorkflowEngineDbDataPath(dataDir string) string {
	return filepath.Join(dataDir, workflowEngineDbDataDir)
}
