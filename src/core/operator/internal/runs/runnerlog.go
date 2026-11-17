package runs

import (
	"bytes"
	"context"
	"encoding/json"
	"maps"
	"slices"

	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/sandbox"
)

// maxRelayed is how many warnings and errors of one operator runner the operator logs. One more record counts the rest.
const maxRelayed = 20

// deleteJob deletes a run's Job, which takes the operator runner's log with its pod. The pipeline collects no container
// logs, so the operator first logs the operator runner's warnings and errors, in the trace of ctx.
func deleteJob(ctx context.Context, box sandbox.Sandbox, namespace, runID string) error {
	logger := logging.FromContext(ctx).WithName("operator-runner").WithValues("ctx", ctx, "runId", runID)
	log, err := box.Log(ctx, namespace, runID)
	if err != nil {
		logger.Info("Could not read the operator runner's log", "error", err.Error())
	}
	relayed := 0
	for line := range bytes.Lines(log) {
		level, message, keysAndValues := parseRunnerLine(bytes.TrimSpace(line))
		if level != "WARN" && level != "ERROR" {
			continue
		}
		if relayed++; relayed > maxRelayed {
			continue
		}
		if level == "ERROR" {
			logger.Error(nil, message, keysAndValues...)
		} else {
			logging.Warn(logger, message, keysAndValues...)
		}
	}
	if relayed > maxRelayed {
		logging.Warn(logger, "The operator runner logged more warnings and errors", "count", relayed-maxRelayed)
	}
	return box.DeleteJob(ctx, namespace, runID) //nolint:wrapcheck // The sandbox says which Job.
}

// parseRunnerLine reads a line of the operator runner's log, a record in tracing-subscriber's JSON format. A line that
// is not one, such as a panic, is a warning. An empty line has no level.
func parseRunnerLine(line []byte) (level, message string, keysAndValues []any) {
	if len(line) == 0 {
		return "", "", nil
	}
	var record struct {
		Fields map[string]any `json:"fields"`
		Level  string         `json:"level"`
	}
	if json.Unmarshal(line, &record) != nil {
		return "WARN", "A line that is not a record", []any{"line", string(line)}
	}
	message, ok := record.Fields["message"].(string)
	if !ok {
		message = "A record without a message"
	}
	for _, key := range slices.Sorted(maps.Keys(record.Fields)) {
		if key != "message" {
			keysAndValues = append(keysAndValues, key, record.Fields[key])
		}
	}
	return record.Level, message, keysAndValues
}
