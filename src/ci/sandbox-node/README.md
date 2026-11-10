# Sandbox node

`sandbox-node` prepares the nodes that run Sandbox workloads, so that Sandbox coordinators can share a large node
without running as privileged containers. It mounts the node's local NVMe disks as one reflink-enabled XFS array at
`/var/lib/altinn/sandbox`, and offers `/dev/kvm` to Pods as the Kubernetes extended resource
`devices.altinn.studio/kvm`. It registers with kubelet only when both succeed.

The resource's eight slots are scheduler capacity, not separate devices. Every slot gives a Pod the same shared
`/dev/kvm`. Each coordinator requests one slot and creates one Sandbox. On the `Standard_D32ds_v6` Sandbox pool, CPU
and memory requests usually limit how many fit on a node before the slots do.

Kubernetes does not give `sandbox-node` the device itself, so it cannot check that KVM works. Before the runner
workload is enabled on a pool, a smoke-test Pod that requests a slot must run `KVM_GET_API_VERSION` and
`KVM_CREATE_VM`.
