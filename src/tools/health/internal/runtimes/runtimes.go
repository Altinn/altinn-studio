package runtimes

type ContainerRuntime interface {
	GetName() string
	GetServiceOwner() string
	GetEnvironment() string
}
