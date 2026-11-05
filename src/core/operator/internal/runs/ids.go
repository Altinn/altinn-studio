// Package runs carries out runs of app code in sandbox Jobs: the run catalog, the queue, the run workflow and its
// steps, and the garbage collector. The operator keeps nothing of a run itself: the engine keeps the run's workflow,
// and the run's Job keeps the archive and the result.
package runs

import (
	"crypto/sha256"
	"encoding/hex"

	"github.com/google/uuid"
)

// runIDNamespace is the UUIDv5 namespace of run ids. Changing it gives every idempotency key a new run id.
var runIDNamespace = uuid.MustParse("b996c10c-96d8-44e0-9b56-4aee8e5ec1e6")

// RunID derives the run id from the caller and the key of its create, so two creates with the same key map to the same
// run and the same workflow, and two callers cannot collide.
func RunID(caller, key string) string {
	return uuid.NewSHA1(runIDNamespace, []byte(caller+":"+key)).String()
}

// createKey is the key of a create of a run of the kind for the source. after is the id of the newest run of the same
// kind and source that has ended, or empty when there is none, so a create after that run makes a new run, and two
// creates at the same time make one.
func createKey(kind string, source Source, after string) string {
	if after == "" {
		after = "first"
	}
	sum := sha256.Sum256(
		[]byte(kind + "\x00" + source.RepoOwner + "\x00" + source.Repo + "\x00" + source.Commit + "\x00" +
			source.Org + "\x00" + source.App + "\x00" + after),
	)
	return hex.EncodeToString(sum[:])
}

// ValidRunID reports whether id is a run id. Run ids name Jobs and are part of URLs, so nothing else may.
func ValidRunID(id string) bool {
	parsed, err := uuid.Parse(id)
	return err == nil && parsed.String() == id
}

// EngineNamespace is the engine namespace of a caller's runs. The engine throttles each namespace on its own, so one
// caller's failures do not hold back another's runs.
func EngineNamespace(caller string) string {
	return "runs-" + caller
}

// JobName is the name of a run's Job.
func JobName(runID string) string {
	return "run-" + runID
}

// The labels of run Jobs and their pods. The garbage collector and the queue find Jobs by them.
const (
	LabelName      = "app.kubernetes.io/name"
	LabelManagedBy = "app.kubernetes.io/managed-by"
	LabelRunID     = "altinn.studio/run-id"
	LabelRunKind   = "altinn.studio/run-kind"
	LabelRunCaller = "altinn.studio/run-caller"
	// LabelJobName is the label that the Job controller puts on the pods of a Job.
	LabelJobName = "batch.kubernetes.io/job-name"

	jobHostName = "job-host"
	ManagedBy   = "core-operator"
)

// The labels of run workflows in the engine. The source labels let a caller find its runs again, and a dashboard count
// runs by org.
const (
	workflowLabelRunID     = "runId"
	workflowLabelKind      = "kind"
	workflowLabelCaller    = "caller"
	workflowLabelOrg       = "org"
	workflowLabelApp       = "app"
	workflowLabelRepoOwner = "repoOwner"
	workflowLabelRepo      = "repo"
	workflowLabelCommit    = "commit"
)

// Domain is the domain of run workflows in the workflow context.
const Domain = "runs"

// The steps of a run workflow. The engine's step operationId is the command key.
const (
	StepAdmit        = "run.admit"
	StepCreateJob    = "run.create-job"
	StepAwaitPod     = "run.await-pod"
	StepAwaitArchive = "run.await-archive"
	StepAwaitResult  = "run.await-result"
	StepCleanup      = "run.cleanup"
)
