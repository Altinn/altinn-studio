package localtest

// ContainerImage is the image a container was created from: its build, and the reference it
// came from when that reference still resolves to the same build.
type ContainerImage struct {
	Ref     string
	ImageID string
}

// ContainerStatus describes one localtest container.
type ContainerStatus struct {
	Name string `json:"name"`
	// Image is the reference the container came from, empty when studioctl cannot name it:
	// an image built from the local checkout, or a component the running environment
	// configured differently from this command.
	Image string `json:"image,omitempty"`
	// ImageID identifies the build the container was created from, which a moving tag does
	// not. Empty when there is no container to read it from.
	ImageID string `json:"imageId,omitempty"`
	Status  string `json:"status"`
}

// Status is the localtest-specific runtime status payload.
type Status struct {
	Containers []ContainerStatus `json:"containers"`
	Running    bool              `json:"running"`
	AnyRunning bool              `json:"anyRunning"`
}
