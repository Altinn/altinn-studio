package localtest

// ContainerStatus describes one localtest container.
type ContainerStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

// Status is the localtest-specific runtime status payload.
type Status struct {
	Containers []ContainerStatus `json:"containers"`
	Running    bool              `json:"running"`
	AnyRunning bool              `json:"anyRunning"`
}
