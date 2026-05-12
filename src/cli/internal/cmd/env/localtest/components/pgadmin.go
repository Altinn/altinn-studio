package components

import (
	"context"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

const (
	pgAdminEmail    = "admin@altinn.no"
	pgAdminPassword = "admin123"

	// PgAdminConnectionSource is the pgpass mount path read by pgAdmin at startup.
	PgAdminConnectionSource = "/pgadmin4/connection-source.conf"
)

func registerPgAdminComponents(manifest *Manifest, opts *Options) {
	manifest.addContainer(opts, pgAdminImage(opts), pgAdminContainer(opts), opts.IncludePgAdmin)
	if opts.IncludePgAdmin {
		manifest.addPreparation("pgAdmin passfile", func(context.Context) error {
			return ensurePgpass(opts.Paths)
		})
	}
	manifest.addBinding(envtopology.RuntimeBinding{
		ComponentID: envtopology.ComponentPgAdmin,
		Destination: envtopology.BoundTopologyDestination{
			Location: envtopology.DestinationLocationEnv,
			Kind:     envtopology.DestinationKindHTTP,
			URL:      "http://" + ContainerPgAdmin + ":80",
		},
		Enabled: opts.IncludePgAdmin,
	})
}

func pgAdminImage(ctx *Options) resource.ImageResource {
	enabled := ctx.IncludePgAdmin
	return &resource.RemoteImage{
		Enabled:    resourceEnabledRef(enabled),
		Ref:        imageRef(ctx.Images.Core.PgAdmin.Ref(), ContainerPgAdmin, enabled),
		PullPolicy: resource.PullIfNotPresent,
	}
}

func pgAdminContainer(ctx *Options) *ContainerSpec {
	spec := newContainerSpec(
		ContainerPgAdmin,
		nil,
		map[string]string{
			"PGADMIN_DEFAULT_EMAIL":                   pgAdminEmail,
			"PGADMIN_DEFAULT_PASSWORD":                pgAdminPassword,
			"PGADMIN_CONFIG_SERVER_MODE":              "False",
			"PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED": "False",
			"PGPASS_FILE":                             PgAdminConnectionSource,
			"GUNICORN_ACCESS_LOGFILE":                 "/dev/null",
		},
		[]types.VolumeMount{
			newReadOnlyVolume(
				WorkflowEngineInfraFilePath(ctx.Paths.InfraDir, "pgadmin-servers.json"),
				"/pgadmin4/servers.json",
			),
			newReadOnlyVolume(
				WorkflowEngineInfraFilePath(ctx.Paths.InfraDir, "pgpass"),
				PgAdminConnectionSource,
			),
		},
		nil,
		[]string{ContainerWorkflowEngineDb},
		nil,
	)
	spec.UseDefaultUser = true
	return spec
}
