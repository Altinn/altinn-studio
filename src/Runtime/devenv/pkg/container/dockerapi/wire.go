package dockerapi

import (
	"strings"
	"time"
)

const dockerHubDomain = "docker.io"

// Request and response bodies of the Docker Engine API, with only the fields this package uses.

type createContainerRequest struct {
	Healthcheck      *healthConfig       `json:"Healthcheck,omitempty"`
	ExposedPorts     map[string]struct{} `json:"ExposedPorts,omitempty"`
	Labels           map[string]string   `json:"Labels,omitempty"`
	NetworkingConfig *networkingConfig   `json:"NetworkingConfig,omitempty"`
	Image            string              `json:"Image"`
	User             string              `json:"User,omitempty"`
	Cmd              []string            `json:"Cmd,omitempty"`
	Env              []string            `json:"Env,omitempty"`
	HostConfig       hostConfig          `json:"HostConfig"`
}

type healthConfig struct {
	Test        []string      `json:"Test,omitempty"`
	Interval    time.Duration `json:"Interval,omitempty"`
	Timeout     time.Duration `json:"Timeout,omitempty"`
	StartPeriod time.Duration `json:"StartPeriod,omitempty"`
	Retries     int           `json:"Retries,omitempty"`
}

type hostConfig struct {
	PortBindings  map[string][]portBinding `json:"PortBindings,omitempty"`
	RestartPolicy restartPolicy            `json:"RestartPolicy"`
	NetworkMode   string                   `json:"NetworkMode,omitempty"`
	UsernsMode    string                   `json:"UsernsMode,omitempty"`
	Binds         []string                 `json:"Binds,omitempty"`
	Mounts        []mount                  `json:"Mounts,omitempty"`
	Tmpfs         map[string]string        `json:"Tmpfs,omitempty"`
	ExtraHosts    []string                 `json:"ExtraHosts,omitempty"`
	CapAdd        []string                 `json:"CapAdd,omitempty"`
}

type portBinding struct {
	HostIP   string `json:"HostIp"`
	HostPort string `json:"HostPort"`
}

type restartPolicy struct {
	Name string `json:"Name"`
}

type mount struct {
	Type     string `json:"Type"`
	Source   string `json:"Source,omitempty"`
	Target   string `json:"Target"`
	ReadOnly bool   `json:"ReadOnly,omitempty"`
}

type networkingConfig struct {
	EndpointsConfig map[string]endpointSettings `json:"EndpointsConfig"`
}

type endpointSettings struct {
	Aliases []string `json:"Aliases,omitempty"`
}

type idResponse struct {
	ID string `json:"Id"`
}

type containerInspect struct {
	Config struct {
		Labels map[string]string `json:"Labels"`
		Image  string            `json:"Image"`
	} `json:"Config"`
	NetworkSettings struct {
		Ports    map[string][]portBinding `json:"Ports"`
		Networks map[string]struct{}      `json:"Networks"`
	} `json:"NetworkSettings"`
	ID    string         `json:"Id"`
	Name  string         `json:"Name"`
	Image string         `json:"Image"`
	State containerState `json:"State"`
}

type containerState struct {
	Health *struct {
		Status string `json:"Status"`
	} `json:"Health"`
	Status   string `json:"Status"`
	ExitCode int    `json:"ExitCode"`
	Running  bool   `json:"Running"`
	Paused   bool   `json:"Paused"`
}

type containerSummary struct {
	Labels  map[string]string `json:"Labels"`
	ID      string            `json:"Id"`
	Image   string            `json:"Image"`
	ImageID string            `json:"ImageID"`
	State   string            `json:"State"`
	Names   []string          `json:"Names"`
	Ports   []portSummary     `json:"Ports"`
}

type portSummary struct {
	IP          string `json:"IP"`
	Type        string `json:"Type"`
	PrivatePort uint16 `json:"PrivatePort"`
	PublicPort  uint16 `json:"PublicPort"`
}

type execCreateRequest struct {
	Cmd          []string `json:"Cmd"`
	AttachStdin  bool     `json:"AttachStdin"`
	AttachStdout bool     `json:"AttachStdout"`
	AttachStderr bool     `json:"AttachStderr"`
	Tty          bool     `json:"Tty"`
}

type execStartRequest struct {
	Detach bool `json:"Detach"`
	Tty    bool `json:"Tty"`
}

type execInspect struct {
	ExitCode int `json:"ExitCode"`
}

type imageInspect struct {
	ID   string `json:"Id"`
	Size int64  `json:"Size"`
}

type networkResource struct {
	Labels map[string]string `json:"Labels"`
	ID     string            `json:"Id"`
	Name   string            `json:"Name"`
	Driver string            `json:"Driver"`
}

type networkCreateRequest struct {
	Labels map[string]string `json:"Labels,omitempty"`
	Name   string            `json:"Name"`
	Driver string            `json:"Driver"`
}

type networkConnectRequest struct {
	EndpointConfig *endpointSettings `json:"EndpointConfig,omitempty"`
	Container      string            `json:"Container"`
}

type waitResponse struct {
	StatusCode int64 `json:"StatusCode"`
}

// pullMessage is one line of the JSON progress stream from POST /images/create.
type pullMessage struct {
	Error *struct {
		Message string `json:"message"`
	} `json:"errorDetail"`
	Progress *pullProgress `json:"progressDetail"`
	ID       string        `json:"id"`
	Status   string        `json:"status"`
}

type pullProgress struct {
	Current int64 `json:"current"`
	Total   int64 `json:"total"`
}

type versionResponse struct {
	Platform   versionPlatform    `json:"Platform"`
	Version    string             `json:"Version"`
	Components []versionComponent `json:"Components"`
}

type versionPlatform struct {
	Name string `json:"Name"`
}

type versionComponent struct {
	Details map[string]string `json:"Details"`
	Name    string            `json:"Name"`
	Version string            `json:"Version"`
}

type infoResponse struct {
	OperatingSystem string   `json:"OperatingSystem"`
	Name            string   `json:"Name"`
	ServerVersion   string   `json:"ServerVersion"`
	Driver          string   `json:"Driver"`
	InitBinary      string   `json:"InitBinary"`
	SecurityOptions []string `json:"SecurityOptions"`
}

// splitImageRef splits a reference into the repository and the tag or digest that POST /images/create and
// /images/{name}/tag take. A missing tag means latest, since the daemon pulls every tag when it is empty.
func splitImageRef(ref string) (repository, tag string) {
	name, digest, digested := strings.Cut(ref, "@")
	tag = "latest"
	if slash, colon := strings.LastIndex(name, "/"), strings.LastIndex(name, ":"); colon > slash {
		name, tag = name[:colon], name[colon+1:]
	}
	if digested {
		tag = digest
	}
	return normalizeRepository(name), tag
}

// normalizeRepository names a repository in full, as moby's client does with github.com/distribution/reference:
// alpine is docker.io/library/alpine. The first component is a registry when it has a dot or a colon, is
// localhost, or has upper-case letters.
func normalizeRepository(name string) string {
	domain, path, found := strings.Cut(name, "/")
	if !found || !strings.ContainsAny(domain, ".:") && domain != "localhost" && strings.ToLower(domain) == domain {
		domain, path = dockerHubDomain, name
	}
	if domain == "index.docker.io" {
		domain = dockerHubDomain
	}
	if domain == dockerHubDomain && !strings.Contains(path, "/") {
		path = "library/" + path
	}
	return domain + "/" + path
}
