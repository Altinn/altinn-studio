package manifests

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

const (
	testserverImage = "nginx:1.29-alpine"
)

// BuildTestserver creates all testserver resources.
// replicas controls the jumpbox replica count (3 for standard, 1 for minimal).
func BuildTestserver(nginxConf, indexHtml, eur1Html, jumpboxNginxConf []byte, replicas int32) []runtime.Object {
	return []runtime.Object{
		buildTestserverConfigMap(nginxConf, indexHtml, eur1Html),
		buildTestserverService(),
		buildTestserverDeployment(),
		buildJumpboxConfigMap(jumpboxNginxConf),
		buildJumpboxService(),
		buildJumpboxDeployment(replicas),
		buildJumpboxIngressRoute(),
	}
}

func buildTestserverConfigMap(nginxConf, indexHtml, eur1Html []byte) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "testserver-content",
			Namespace: "default",
		},
		Data: map[string]string{
			"nginx.conf": string(nginxConf),
			"index.html": string(indexHtml),
			"eur1.html":  string(eur1Html),
		},
	}
}

func buildTestserverService() *corev1.Service {
	return &corev1.Service{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Service",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "testserver",
			Namespace: "default",
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
			Ports: []corev1.ServicePort{
				{
					Name:     "http",
					Port:     80,
					Protocol: corev1.ProtocolTCP,
				},
			},
			Selector: map[string]string{
				"app": "testserver",
			},
		},
	}
}

func buildTestserverDeployment() *appsv1.Deployment {
	replicas := int32(1)
	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "testserver",
			Namespace: "default",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": "testserver",
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": "testserver",
					},
					Annotations: map[string]string{
						"linkerd.io/inject": "enabled",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:            "nginx",
							Image:           testserverImage,
							ImagePullPolicy: corev1.PullIfNotPresent,
							Ports: []corev1.ContainerPort{
								{
									Name:          "http",
									ContainerPort: 80,
									Protocol:      corev1.ProtocolTCP,
								},
							},
							Command: []string{"/bin/sh", "-c"},
							Args:    []string{"rm -f /etc/nginx/conf.d/default.conf\nnginx -g 'daemon off;'"},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "content",
									MountPath: "/usr/share/nginx/html",
									ReadOnly:  true,
								},
								{
									Name:      "nginx-config",
									MountPath: "/etc/nginx/nginx.conf",
									SubPath:   "nginx.conf",
									ReadOnly:  true,
								},
							},
							Resources: defaultResourceRequirements(),
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "content",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: "testserver-content",
									},
								},
							},
						},
						{
							Name: "nginx-config",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: "testserver-content",
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

func buildJumpboxConfigMap(nginxConf []byte) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ConfigMap",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "jumpbox-nginx-config",
			Namespace: "default",
		},
		Data: map[string]string{
			"nginx.conf": string(nginxConf),
		},
	}
}

func buildJumpboxService() *corev1.Service {
	return &corev1.Service{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Service",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "jumpbox",
			Namespace: "default",
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
			Ports: []corev1.ServicePort{
				{
					Name:     "http",
					Port:     80,
					Protocol: corev1.ProtocolTCP,
				},
			},
			Selector: map[string]string{
				"app": "jumpbox",
			},
		},
	}
}

func buildJumpboxDeployment(replicas int32) *appsv1.Deployment {
	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "jumpbox",
			Namespace: "default",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": "jumpbox",
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": "jumpbox",
					},
					Annotations: map[string]string{
						"linkerd.io/inject": "enabled",
					},
				},
				Spec: corev1.PodSpec{
					Affinity: &corev1.Affinity{
						PodAntiAffinity: &corev1.PodAntiAffinity{
							RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{
								{
									TopologyKey: "kubernetes.io/hostname",
									LabelSelector: &metav1.LabelSelector{
										MatchLabels: map[string]string{
											"app": "jumpbox",
										},
									},
								},
							},
						},
					},
					Containers: []corev1.Container{
						{
							Name:            "nginx",
							Image:           testserverImage,
							ImagePullPolicy: corev1.PullIfNotPresent,
							Ports: []corev1.ContainerPort{
								{
									Name:          "http",
									ContainerPort: 80,
									Protocol:      corev1.ProtocolTCP,
								},
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "nginx-config",
									MountPath: "/etc/nginx/nginx.conf",
									SubPath:   "nginx.conf",
									ReadOnly:  true,
								},
							},
							Resources: defaultResourceRequirements(),
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "nginx-config",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: "jumpbox-nginx-config",
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

func defaultResourceRequirements() corev1.ResourceRequirements {
	return corev1.ResourceRequirements{
		Requests: corev1.ResourceList{
			corev1.ResourceCPU:    mustParseQuantity("50m"),
			corev1.ResourceMemory: mustParseQuantity("64Mi"),
		},
		Limits: corev1.ResourceList{
			corev1.ResourceCPU:    mustParseQuantity("100m"),
			corev1.ResourceMemory: mustParseQuantity("128Mi"),
		},
	}
}

func mustParseQuantity(s string) resource.Quantity {
	q, err := resource.ParseQuantity(s)
	if err != nil {
		panic(err)
	}
	return q
}

func buildJumpboxIngressRoute() *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "traefik.io/v1alpha1",
			"kind":       "IngressRoute",
			"metadata": map[string]interface{}{
				"name":      "jumpbox",
				"namespace": "default",
			},
			"spec": map[string]interface{}{
				"entryPoints": []interface{}{"traefik"},
				"routes": []interface{}{
					map[string]interface{}{
						"match": "PathPrefix(`/`)",
						"kind":  "Rule",
						"services": []interface{}{
							map[string]interface{}{
								"name":   "jumpbox",
								"port":   80,
								"scheme": "http",
							},
						},
					},
				},
			},
		},
	}
}
