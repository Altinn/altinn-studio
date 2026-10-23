// Package localtestv2 runs the localtest-v2 environment from the manifest (internal/localtestv2/manifest): the
// production platform components built by the localtest-research repository, the localtest app, a shared Postgres, the
// PDF generator and the workflow engine, and the optional groups (Dialogporten, Receipt, Correspondence, Arbeidsflate).
//
// The localtest container is the front door: the runtime publishes its port as the public origin's
// (http://local.altinn.cloud:8000), and it routes by host and path prefix to the other containers through the
// services__<name>__http__0 variables the runtime gives every container, and to the apps registered with it.
// studioctl-server registers the apps it discovers there; the containers reach the public origin and the apps through
// the container runtime's host gateway.
package localtestv2
