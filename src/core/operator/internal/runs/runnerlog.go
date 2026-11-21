package runs

import (
	"bytes"
	"context"
	"encoding/json"
	"maps"
	"slices"
	"time"

	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/telemetry"
)

const (
	// maxRelayed is how many warnings and errors of one operator runner the operator logs. One more record counts the
	// rest.
	maxRelayed = 20
	// logReadTimeout keeps a log read that stalls from taking the time to delete the Job.
	logReadTimeout = 5 * time.Second
)

// deleteJob deletes the Job of a run. The log of the operator runner goes away with the pod. The log pipeline collects
// no container logs, so the operator first logs the warnings and errors of the operator runner.
func deleteJob(ctx context.Context, box sandbox.Sandbox, namespace, runID string) error {
	logger := logging.FromContext(ctx).WithName("operator-runner").WithValues(string(telemetry.AttrSubjectID), runID)
	logCtx, cancel := context.WithTimeout(ctx, logReadTimeout)
	defer cancel()
	log, err := box.Log(logCtx, namespace, runID)
	if err != nil {
		logger.Info("Could not read the operator runner's log", "error", err.Error())
	}
	relayed := 0
	for line := range bytes.Lines(log) {
		level, keysAndValues := parseRunnerLine(bytes.TrimSpace(line))
		if level != "WARN" && level != "ERROR" {
			continue
		}
		if relayed++; relayed > maxRelayed {
			continue
		}
		if level == "ERROR" {
			logger.Error(nil, "The operator runner logged an error", keysAndValues...)
		} else {
			logging.Warn(logger, "The operator runner logged a warning", keysAndValues...)
		}
	}
	if relayed > maxRelayed {
		logging.Warn(logger, "The operator runner logged more warnings and errors", "count", relayed-maxRelayed)
	}
	return box.DeleteJob(ctx, namespace, runID) //nolint:wrapcheck // The sandbox says which Job.
}

// parseRunnerLine reads a line of the operator runner's log, a record in tracing-subscriber's JSON format, as its level
// and its fields. The message is in AttrRunnerMessage. A line that is not a record, for example a panic, is a warning
// with the line as its message. An empty line has no level.
func parseRunnerLine(line []byte) (level string, keysAndValues []any) {
	if len(line) == 0 {
		return "", nil
	}
	var record struct {
		Fields map[string]any `json:"fields"`
		Level  string         `json:"level"`
	}
	if json.Unmarshal(line, &record) != nil {
		return "WARN", []any{string(telemetry.AttrRunnerMessage), string(line)}
	}
	for _, key := range slices.Sorted(maps.Keys(record.Fields)) {
		name := key
		if key == "message" {
			name = string(telemetry.AttrRunnerMessage)
		}
		keysAndValues = append(keysAndValues, name, record.Fields[key])
	}
	return record.Level, keysAndValues
}
