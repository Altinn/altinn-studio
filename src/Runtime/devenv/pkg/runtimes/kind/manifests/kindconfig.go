package manifests

import (
	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
)

const (
	nodeImage = "kindest/node:v1.33.4@sha256:25a6018e48dfcaee478f4a59af81157a437f15e6e140bf103f85a2e7cd0cbbf2"

	// containerdConfigPatch configures containerd to use the local registry
	containerdConfigPatch = `[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"`

	// kubeadmConfigPatch adds the ingress-ready label to control-plane nodes
	kubeadmConfigPatch = `kind: InitConfiguration
nodeRegistration:
  kubeletExtraArgs:
    node-labels: "ingress-ready=true"`
)

// BuildStandardConfig creates a Kind cluster config with 1 control-plane and 3 workers.
func BuildStandardConfig(clusterName string) *v1alpha4.Cluster {
	cluster := buildBaseConfig(clusterName)

	// Add 3 worker nodes with zone labels
	zones := []string{"zone-1", "zone-2", "zone-3"}
	for _, zone := range zones {
		cluster.Nodes = append(cluster.Nodes, v1alpha4.Node{
			Role:  v1alpha4.WorkerRole,
			Image: nodeImage,
			Labels: map[string]string{
				"topology.kubernetes.io/zone": zone,
			},
		})
	}

	return cluster
}

// BuildMinimalConfig creates a Kind cluster config with 1 control-plane and 1 worker.
func BuildMinimalConfig(clusterName string) *v1alpha4.Cluster {
	cluster := buildBaseConfig(clusterName)

	// Add 1 worker node
	cluster.Nodes = append(cluster.Nodes, v1alpha4.Node{
		Role:  v1alpha4.WorkerRole,
		Image: nodeImage,
		Labels: map[string]string{
			"topology.kubernetes.io/zone": "zone-1",
		},
	})

	return cluster
}

// buildBaseConfig creates the common base config for both variants.
func buildBaseConfig(clusterName string) *v1alpha4.Cluster {
	return &v1alpha4.Cluster{
		TypeMeta: v1alpha4.TypeMeta{
			Kind:       "Cluster",
			APIVersion: "kind.x-k8s.io/v1alpha4",
		},
		Name:                    clusterName,
		ContainerdConfigPatches: []string{containerdConfigPatch},
		Nodes: []v1alpha4.Node{
			{
				Role:                 v1alpha4.ControlPlaneRole,
				Image:                nodeImage,
				KubeadmConfigPatches: []string{kubeadmConfigPatch},
				ExtraPortMappings: []v1alpha4.PortMapping{
					{ContainerPort: 30000, HostPort: 80},
					{ContainerPort: 30001, HostPort: 443},
					{ContainerPort: 30002, HostPort: 8020},
				},
			},
		},
	}
}
