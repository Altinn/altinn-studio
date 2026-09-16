package localtest

// ContainerStatus describes one localtest container.
type ContainerStatus struct {
	Name string `json:"name"`
	// Image is the reference the container runs, empty for a container whose image
	// is built locally rather than pulled.
	Image string `json:"image,omitempty"`
	// ImageDigest identifies the build the container is actually running, which a
	// reference whose tag moves does not. It is empty when the container is not running
	// and for locally built images.
	ImageDigest string `json:"imageDigest,omitempty"`
	Status      string `json:"status"`
}

// Status is the localtest-specific runtime status payload.
type Status struct {
	Containers []ContainerStatus `json:"containers"`
	Running    bool              `json:"running"`
	AnyRunning bool              `json:"anyRunning"`
}
