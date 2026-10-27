package localtestv2

const (
	// GraphID labels the runtime's containers and network (devenv's ownership label): a container of the stack runs
	// when one with this label runs, whatever configuration the stack was started with.
	GraphID = "studioctl-localtest-v2"

	// Network is the stack's network. Container-mode apps (studioctl run --mode container) join it too, under the
	// alias <org>-<app>, where the front door reaches them. They call the platform through the public origin on the
	// host gateway, as the components do. A separate network for the apps does not work today: see the studioctl
	// README, "Why not a separate apps network".
	Network = "localtest-v2_network"

	// Label marks the app containers on the network (value LabelAppContainer), which every teardown removes before the
	// network: they are not in the runtime's resource graph.
	Label = "altinn.studio/localtest-v2"
	// LabelAppContainer is Label's value on an app container.
	LabelAppContainer = "app"
)
