// Package attr names the shared Altinn vocabulary: the attributes for concepts that more than one
// service reports, with one name on every service and every signal
// (https://github.com/Altinn/altinn-studio/issues/21073, Domain attributes). A service's own
// attributes are named altinn.<service>.… in the service.
//
// The values are the identifiers Altinn already uses, lowercase as in URLs and
// applicationmetadata.json. The package imports nothing, so any package, including a service's
// logging, can use it.
package attr

// Concepts that may go on spans, logs and metrics. On metrics they are bounded: a shared service
// that puts both ServiceOwner and App on a metric raises the SDK's cardinality limit.
const (
	// ServiceOwner is the service owner the work is done for, by its short name (org), e.g. ttd.
	// In a service owner's own cluster the router sets it on the resource.
	ServiceOwner = "altinn.service_owner"
	// App is the app's name without the service owner, so always used with ServiceOwner.
	App = "altinn.app"
	// Environment is the runtime environment an operation targets (prod, tt02, at22, ...), set by
	// services outside the runtime. Runtime services report their own environment as
	// deployment.environment.name instead.
	Environment = "altinn.environment"
	// RepoType is the kind of Studio repository the work concerns: app, datamodels, content or
	// resources.
	RepoType = "altinn.repo_type"
	// ProcessTaskType is the kind of process task, from a fixed set such as data, signing or payment.
	ProcessTaskType = "altinn.process.task.type"
)

// Concepts that go on spans and logs, never on metrics.
const (
	// InstanceGUID is an app instance's GUID, without the party ID that the full instance ID holds.
	InstanceGUID = "altinn.instance.guid"
	// ProcessTaskID is the BPMN ID of a process task, e.g. Task_1. Bounded within one app only.
	ProcessTaskID = "altinn.process.task.id"
)
