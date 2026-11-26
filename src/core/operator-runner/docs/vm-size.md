# VM size

A run's VM has 1 CPU and 2 GiB. The VM is a process of the pod's container, so the
[PodTemplate](../infra/kustomize/base/podtemplate.yaml) requests 1 CPU and 512 MiB more for the operator runner, the
VM's runtime and the archive. Change the VM, the pod, both quotas and the microVM job in
[`core-operator-runner-build-test.yaml`](../../../../.github/workflows/core-operator-runner-build-test.yaml) together.

## Measurements

On 18 November 2026, we ran `upgrade-v9` (studioctl v0.1.0-preview.33) three times at each size in a microVM:

| App                                                | VM            | Peak memory of the VM | Time of a run |
| -------------------------------------------------- | ------------- | --------------------- | ------------- |
| The [v8 template](../../../App/template/v8/src)    | 2 CPUs, 4 GiB | 1.25–1.30 GiB         | 20–32 s       |
| The v8 template                                    | 1 CPU, 2 GiB  | 1.11–1.14 GiB         | 29–39 s       |
| A v8 app with 14 C# files and 7 package references | 2 CPUs, 4 GiB | 1.57–1.60 GiB         | 54–59 s       |
| The same app                                       | 1 CPU, 2 GiB  | 1.39–1.42 GiB         | 74–85 s       |

Both sizes gave the same patch and report. The peak includes the guest's file cache, so the upgrade needed less. A
second CPU saved 10 to 25 seconds, and we chose 1 CPU to leave more of the sandbox nodes to CI. The times leave out
three slow runs that waited for NuGet packages. The test machine was ARM with nested virtualization, so x86 times
differ. A larger app can need more memory. To measure one, run the microVM job's steps and read `VmHWM` of the VM.
