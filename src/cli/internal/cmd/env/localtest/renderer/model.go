package renderer

import (
	"strings"
	"time"

	"altinn.studio/devenv/pkg/resource"
)

func newRenderModel(resources []resource.Resource, operation Operation) *renderModel {
	rowMap := make(map[string]*progressRow)
	order := make([]string, 0)
	resourceToRows := make(map[resource.ResourceID][]string)
	imageToContainers := make(map[resource.ResourceID][]string)

	for _, res := range resources {
		switch res := res.(type) {
		case *resource.Network:
			if _, exists := rowMap[res.Name]; !exists {
				rowMap[res.Name] = newProgressRow(res.Name)
				order = append(order, res.Name)
			}
			resourceToRows[res.ID()] = append(resourceToRows[res.ID()], res.Name)
		case *resource.Container:
			if _, exists := rowMap[res.Name]; !exists {
				rowMap[res.Name] = newProgressRow(res.Name)
				order = append(order, res.Name)
			}

			resourceToRows[res.ID()] = append(
				resourceToRows[res.ID()],
				res.Name,
			)
			imageToContainers[res.Image.ID()] = append(
				imageToContainers[res.Image.ID()],
				res.Name,
			)
		}
	}

	if operation == OperationApply {
		for imageID, containerNames := range imageToContainers {
			resourceToRows[imageID] = append(resourceToRows[imageID], containerNames...)
		}
	}

	return &renderModel{
		order:            order,
		rows:             rowMap,
		resourceToRows:   resourceToRows,
		operation:        operation,
		operationFailed:  false,
		operationFailure: "",
		startedAt:        time.Time{},
		frame:            0,
	}
}

func newProgressRow(name string) *progressRow {
	return &progressRow{
		name:          name,
		state:         statePending,
		message:       "",
		startedAt:     time.Time{},
		finishedAt:    time.Time{},
		current:       rowProgressEmpty,
		total:         rowProgressEmpty,
		indeterminate: false,
	}
}

func (m *renderModel) applyEvent(event resource.Event, now time.Time) []string {
	rowNames, ok := m.resourceToRows[event.Resource]
	if !ok {
		return nil
	}

	changed := make([]string, 0, len(rowNames))
	for _, rowName := range rowNames {
		row := m.rows[rowName]
		if row == nil {
			continue
		}
		if applyEventToRow(row, event, now) {
			changed = append(changed, rowName)
		}
	}
	return changed
}

func (m *renderModel) failAll(message string, now time.Time) []string {
	fallbackMessage := sanitizeMessage(message)
	hasSpecificFailure := false
	for _, name := range m.order {
		row := m.rows[name]
		if row != nil && row.state == stateFailed {
			hasSpecificFailure = true
			break
		}
	}

	changed := make([]string, 0, len(m.order))
	for _, name := range m.order {
		row := m.rows[name]
		if row == nil || isTerminalState(row.state) {
			continue
		}
		if row.startedAt.IsZero() {
			row.startedAt = now
		}
		row.finishedAt = now
		row.state = stateCanceled
		row.message = fallbackMessage
		if hasSpecificFailure {
			row.message = "canceled after another resource failed"
		}
		row.indeterminate = false
		row.current = rowProgressEmpty
		row.total = rowProgressComplete
		changed = append(changed, name)
	}

	m.operationFailed = true
	if !hasSpecificFailure {
		m.operationFailure = fallbackMessage
	}

	return changed
}

func (m *renderModel) hasLiveRows() bool {
	for _, name := range m.order {
		row := m.rows[name]
		if row == nil {
			continue
		}
		if isActiveState(row.state) {
			return true
		}
	}
	return false
}

func applyEventToRow(row *progressRow, event resource.Event, now time.Time) bool {
	switch event.Type {
	case resource.EventApplyStart:
		applyStartEvent(row, event.Resource, now)
		return true
	case resource.EventApplyProgress:
		return applyProgressEvent(row, event.Progress, now)
	case resource.EventApplyDone:
		applyDoneEvent(row, event.Resource, now)
		return true
	case resource.EventApplyFailed:
		applyFailedEvent(row, event.Error, now)
		return true
	case resource.EventDestroyStart:
		destroyStartEvent(row, event.Resource, now)
		return true
	case resource.EventDestroyDone:
		destroyDoneEvent(row, now)
		return true
	case resource.EventDestroyFailed:
		applyFailedEvent(row, event.Error, now)
		return true
	default:
		return false
	}
}

func applyStartEvent(row *progressRow, resourceID resource.ResourceID, now time.Time) {
	ensureRowStarted(row, now)
	row.finishedAt = time.Time{}
	row.indeterminate = true
	row.current = rowProgressEmpty
	row.total = rowProgressEmpty
	row.message = ""
	row.state = stateForApplyStart(resourceID)
}

func applyProgressEvent(row *progressRow, progress *resource.Progress, now time.Time) bool {
	if progress == nil {
		return false
	}

	ensureRowStarted(row, now)
	row.message = sanitizeMessage(progress.Message)
	row.current = progress.Current
	row.total = progress.Total
	row.indeterminate = progress.Indeterminate || progress.Total <= 0
	return true
}

func applyDoneEvent(row *progressRow, resourceID resource.ResourceID, now time.Time) {
	ensureRowStarted(row, now)
	row.finishedAt = now
	row.message = ""
	row.indeterminate = false
	row.current = rowProgressComplete
	row.total = rowProgressComplete

	switch {
	case strings.HasPrefix(string(resourceID), "image:"):
		row.state = stateImageReady
	case strings.HasPrefix(string(resourceID), "container:"),
		strings.HasPrefix(string(resourceID), "network:"):
		row.state = stateReady
	default:
		row.state = stateReady
	}
}

func destroyStartEvent(row *progressRow, resourceID resource.ResourceID, now time.Time) {
	ensureRowStarted(row, now)
	row.finishedAt = time.Time{}
	row.indeterminate = true
	row.current = rowProgressEmpty
	row.total = rowProgressEmpty
	row.message = ""
	if strings.HasPrefix(string(resourceID), "network:") {
		row.state = stateRemoving
		return
	}
	row.state = stateStopping
}

func destroyDoneEvent(row *progressRow, now time.Time) {
	ensureRowStarted(row, now)
	row.finishedAt = now
	row.message = ""
	row.indeterminate = false
	row.current = rowProgressComplete
	row.total = rowProgressComplete
	row.state = stateRemoved
}

func applyFailedEvent(row *progressRow, err error, now time.Time) {
	ensureRowStarted(row, now)
	row.finishedAt = now
	row.state = stateFailed
	row.indeterminate = false
	row.current = rowProgressEmpty
	row.total = rowProgressComplete
	row.message = ""
	if err != nil {
		row.message = sanitizeMessage(err.Error())
	}
}

func ensureRowStarted(row *progressRow, now time.Time) {
	if row.startedAt.IsZero() {
		row.startedAt = now
	}
}

func isActiveState(state string) bool {
	return !isTerminalState(state)
}

func isTerminalState(state string) bool {
	return state == stateReady || state == stateRemoved || isTerminalUnsuccessfulState(state)
}

func isTerminalUnsuccessfulState(state string) bool {
	return state == stateFailed || state == stateCanceled
}

func (o Operation) successState() string {
	if o == OperationDestroy {
		return stateRemoved
	}
	return stateReady
}

func (o Operation) successLabel() string {
	if o == OperationDestroy {
		return stateRemoved
	}
	return stateReady
}

func (o Operation) name() string {
	if o == OperationDestroy {
		return "destroy"
	}
	return "apply"
}

func stateForApplyStart(resourceID resource.ResourceID) string {
	id := string(resourceID)
	// TODO: devenv should expose typed resource metadata for observers instead of forcing
	// consumers to infer semantics from resource ID string prefixes.
	switch {
	case strings.HasPrefix(id, "network:"):
		return stateCreating
	case strings.HasPrefix(id, "image:local:"):
		return stateBuilding
	case strings.HasPrefix(id, "image:remote:"):
		return statePulling
	case strings.HasPrefix(id, "container:"):
		return stateStarting
	default:
		return stateWorking
	}
}

func sanitizeMessage(s string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
}
