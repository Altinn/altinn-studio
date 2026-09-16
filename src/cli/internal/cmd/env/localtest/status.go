package localtest

// RunningImage is the image a container is running: its build, and the reference it was
// started from when that reference still resolves to the same build.
type RunningImage struct {
	Ref     string
	ImageID string
}

// ContainerStatus describes one localtest container.
type ContainerStatus struct {
	Name string `json:"name"`
	// Image is the reference the container was started from, empty when studioctl cannot
	// name it: an image built from the local checkout, or a component the running
	// environment configured differently from this command.
	Image string `json:"image,omitempty"`
	// ImageID identifies the build the container is running, which a moving tag does not.
	// Empty when the container is not running.
	ImageID string `json:"imageId,omitempty"`
	Status  string `json:"status"`
}

// Status is the localtest-specific runtime status payload.
type Status struct {
	Containers []ContainerStatus `json:"containers"`
	Running    bool              `json:"running"`
	AnyRunning bool              `json:"anyRunning"`
}
