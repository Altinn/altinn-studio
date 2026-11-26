// Package runs controls the runs of app code in sandbox Jobs. The engine keeps the workflow of each run, and the Job of
// the run keeps the archive and the result.
package runs

import (
	"crypto/sha256"
	"encoding/hex"
	"maps"
	"slices"
	"strings"

	"github.com/google/uuid"
)

// runIDNamespace is the UUIDv5 namespace of run ids. A change to it gives each idempotency key a new run id.
var runIDNamespace = uuid.MustParse("b996c10c-96d8-44e0-9b56-4aee8e5ec1e6")

// RunID derives the run id from the caller and the key of its create. The same key gives the same run, and two callers
// cannot collide.
func RunID(caller, key string) string {
	return uuid.NewSHA1(runIDNamespace, []byte(caller+":"+key)).String()
}

// createKey is the key of a create of a run of the kind with the labels. after is the id of the newest ended run of the
// same kind and labels, or empty. So a create after that run makes a new run, and two creates at the same time make
// one.
func createKey(kind string, labels map[string]string, after string) string {
	if after == "" {
		after = "first"
	}
	var key strings.Builder
	key.WriteString(kind + "\x00")
	for _, name := range slices.Sorted(maps.Keys(labels)) {
		key.WriteString(name + "\x00" + labels[name] + "\x00")
	}
	key.WriteString(after)
	sum := sha256.Sum256([]byte(key.String()))
	return hex.EncodeToString(sum[:])
}

// ValidRunID reports whether id is a run id. Run ids name Jobs and are part of URLs, so no other value is allowed.
func ValidRunID(id string) bool {
	parsed, err := uuid.Parse(id)
	return err == nil && parsed.String() == id
}

// EngineNamespace is the engine namespace of a caller's runs, which separates them from the runs of other callers.
func EngineNamespace(caller string) string {
	return "runs-" + caller
}

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
