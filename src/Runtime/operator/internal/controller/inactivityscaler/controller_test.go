package inactivityscaler

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"testing"
	"time"

	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
)

func newFakeClient(initObjs ...client.Object) client.Client {
	return newFakeClientWithInterceptors(interceptor.Funcs{}, initObjs...)
}

func newFakeClientWithInterceptors(interceptorFuncs interceptor.Funcs, initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = appsv1.AddToScheme(scheme)
	_ = autoscalingv2.AddToScheme(scheme)
	_ = corev1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithInterceptorFuncs(interceptorFuncs).
		WithObjects(initObjs...).
		Build()
}

type testHarness struct {
	reconciler *InactivityScalerReconciler
	k8sClient  client.Client
	ctx        context.Context
	clock      *clockwork.FakeClock
}

func newHarness(t *testing.T, serviceOwner, environment string, now time.Time, initObjs ...client.Object) *testHarness {
	t.Helper()
	return newHarnessWithClient(t, serviceOwner, environment, now, newFakeClient(initObjs...))
}

func newHarnessWithClient(t *testing.T, serviceOwner, environment string, now time.Time, k8sClient client.Client) *testHarness {
	t.Helper()

	clock := clockwork.NewFakeClockAt(now)

	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			ServiceOwner: operatorcontext.ServiceOwner{Id: serviceOwner},
			Environment:  environment,
		}),
	)
	if err != nil {
		t.Fatalf("failed to create runtime: %v", err)
	}

	return &testHarness{
		reconciler: NewReconcilerForTesting(rt, k8sClient, time.Minute, osloLocation),
		k8sClient:  k8sClient,
		ctx:        context.Background(),
		clock:      clock,
	}
}

type stateCase struct {
	Name         string `json:"name"`
	ServiceOwner string `json:"serviceOwner"`
	Environment  string `json:"environment"`
	Time         string `json:"time"`
	AppCount     int    `json:"appCount"`
	State        string `json:"state"`
}

const (
	testKindDeployment = "Deployment"
	testKindHPA        = "HorizontalPodAutoscaler"
)

func TestResolveClusterState(t *testing.T) {
	cases := []stateCase{}
	input := []struct {
		name         string
		serviceOwner string
		environment  string
		time         time.Time
		appCount     int
	}{
		{
			name:         "ttd-weekday-workhours-with-apps",
			serviceOwner: "ttd",
			environment:  "at22",
			time:         time.Date(2026, 2, 23, 10, 0, 0, 0, osloLocation),
			appCount:     2,
		},
		{
			name:         "ttd-weekday-offhours-with-apps",
			serviceOwner: "ttd",
			environment:  "at22",
			time:         time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation),
			appCount:     2,
		},
		{
			name:         "ttd-weekend-with-apps",
			serviceOwner: "ttd",
			environment:  "at22",
			time:         time.Date(2026, 2, 22, 12, 0, 0, 0, osloLocation),
			appCount:     1,
		},
		{
			name:         "ttd-no-apps",
			serviceOwner: "ttd",
			environment:  "at22",
			time:         time.Date(2026, 2, 23, 11, 0, 0, 0, osloLocation),
			appCount:     0,
		},
		{
			name:         "ttd-offhours-no-apps",
			serviceOwner: "ttd",
			environment:  "at22",
			time:         time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation),
			appCount:     0,
		},
		{
			name:         "non-ttd-offhours-with-apps",
			serviceOwner: "nav",
			environment:  "tt02",
			time:         time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation),
			appCount:     3,
		},
		{
			name:         "non-ttd-no-apps",
			serviceOwner: "nav",
			environment:  "tt02",
			time:         time.Date(2026, 2, 23, 12, 0, 0, 0, osloLocation),
			appCount:     0,
		},
	}

	for _, tt := range input {
		state := resolveClusterState(tt.serviceOwner, tt.environment, tt.time, tt.appCount)
		cases = append(cases, stateCase{
			Name:         tt.name,
			ServiceOwner: tt.serviceOwner,
			Environment:  tt.environment,
			Time:         tt.time.Format(time.RFC3339),
			AppCount:     tt.appCount,
			State:        string(state),
		})
	}

	payload, err := json.Marshal(cases)
	if err != nil {
		t.Fatalf("marshal snapshot: %v", err)
	}
	snaps.MatchJSON(t, payload)
}

func TestSyncAll_ForcedStateOverride(t *testing.T) {
	g := NewWithT(t)

	h := newHarness(t, "ttd", "at22", time.Date(2026, 2, 23, 12, 0, 0, 0, osloLocation),
		newOverrideConfigMap(string(stateTTDOffhours)),
		newAppDeployment("app-a", 2),
		newAppHpa("ttd", "app-a", 2),
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	objects := collectSnapshots(t, h.k8sClient, "ttd")
	g.Expect(objects).To(HaveLen(5))
	for i := range objects {
		obj := objects[i]
		g.Expect(obj.Managed).To(Equal("true"))
		if obj.Kind == testKindDeployment {
			g.Expect(obj.Reconcile).To(BeEmpty())
			g.Expect(obj.Replicas).NotTo(BeNil())
			g.Expect(*obj.Replicas).To(Equal(scaleDownReplicaOne))
		} else {
			g.Expect(obj.Reconcile).To(Equal(reconcileDisabledValue))
			g.Expect(obj.MinReplicas).NotTo(BeNil())
			g.Expect(*obj.MinReplicas).To(Equal(scaleDownReplicaOne))
		}
	}
}

func TestSyncAll_InvalidForcedStateOverrideFallsBackToComputedState(t *testing.T) {
	g := NewWithT(t)

	h := newHarness(t, "nav", "tt02", time.Date(2026, 2, 23, 12, 0, 0, 0, osloLocation),
		newOverrideConfigMap("not-a-state"),
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)
	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	assertNoAppsComputedStateApplied(g, h)
}

func TestSyncAll_ForcedStateReadFailureFallsBackToComputedState(t *testing.T) {
	g := NewWithT(t)

	k8sClient := newFakeClientWithInterceptors(
		interceptor.Funcs{
			Get: func(ctx context.Context, c client.WithWatch, key client.ObjectKey, obj client.Object, opts ...client.GetOption) error {
				if key.Namespace == forceStateConfigMapNamespace && key.Name == forceStateConfigMapName {
					return errors.New("simulated configmap read failure")
				}
				return c.Get(ctx, key, obj, opts...)
			},
		},
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)
	h := newHarnessWithClient(t, "nav", "tt02", time.Date(2026, 2, 23, 12, 0, 0, 0, osloLocation), k8sClient)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	assertNoAppsComputedStateApplied(g, h)
}

func assertNoAppsComputedStateApplied(g *WithT, h *testHarness) {
	gateway := &appsv1.Deployment{}
	err := h.k8sClient.Get(h.ctx, client.ObjectKey{Name: gatewayDeploymentName, Namespace: runtimeGatewayNamespace}, gateway)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(gateway.Spec.Replicas).NotTo(BeNil())
	g.Expect(*gateway.Spec.Replicas).To(Equal(scaleDownReplicaOne))

	for _, name := range []string{pdf3ProxyHpaName, pdf3WorkerHpaName} {
		hpa := &autoscalingv2.HorizontalPodAutoscaler{}
		err = h.k8sClient.Get(h.ctx, client.ObjectKey{Name: name, Namespace: runtimePdf3Namespace}, hpa)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(hpa.Spec.MinReplicas).NotTo(BeNil())
		g.Expect(*hpa.Spec.MinReplicas).To(Equal(scaleDownReplicaZero))
	}
}

type resourceSnapshot struct {
	Kind        string         `json:"kind"`
	Namespace   string         `json:"namespace"`
	Name        string         `json:"name"`
	Replicas    *int32         `json:"replicas,omitempty"`
	MinReplicas *int32         `json:"minReplicas,omitempty"`
	Reconcile   string         `json:"reconcile,omitempty"`
	Managed     string         `json:"managed,omitempty"`
	Baseline    *scaleBaseline `json:"baseline,omitempty"`
}

func TestSyncAll_TtdOffhoursAndRestore(t *testing.T) {
	g := NewWithT(t)

	initialTime := time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation)
	h := newHarness(t, "ttd", "at22", initialTime,
		newAppDeployment("app-a", 2),
		newAppDeployment("app-b", 3),
		newNonAppDeployment("ttd-ignored-deployment-v2", 5),
		newAppHpa("ttd", "app-a", 2),
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	offhoursSnapshot := collectSnapshots(t, h.k8sClient, "ttd")

	h.clock.Advance(7 * time.Hour)
	err = h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	workhoursSnapshot := collectSnapshots(t, h.k8sClient, "ttd")

	payload, err := json.Marshal(map[string]any{
		"offhours":  offhoursSnapshot,
		"workhours": workhoursSnapshot,
	})
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, payload)
}

func TestSyncAll_NonTtdNoApps(t *testing.T) {
	g := NewWithT(t)

	h := newHarness(t, "nav", "tt02", time.Date(2026, 2, 23, 12, 0, 0, 0, osloLocation),
		newAppDeployment("other-owner-app", 3),
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	payload, err := json.Marshal(collectSnapshots(t, h.k8sClient, "nav"))
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, payload)
}

func TestSyncAll_TtdOffhoursNoApps(t *testing.T) {
	g := NewWithT(t)

	h := newHarness(t, "ttd", "at22", time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation),
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())

	payload, err := json.Marshal(collectSnapshots(t, h.k8sClient, "ttd"))
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, payload)
}

func TestSyncAll_RetriesOnConflict(t *testing.T) {
	g := NewWithT(t)

	app := newAppDeployment("conflict-app", 2)
	conflictInjected := false
	k8sClient := newFakeClientWithInterceptors(
		interceptor.Funcs{
			Update: func(ctx context.Context, c client.WithWatch, obj client.Object, opts ...client.UpdateOption) error {
				if !conflictInjected && obj.GetNamespace() == defaultNamespace && obj.GetName() == app.GetName() {
					conflictInjected = true
					return apierrors.NewConflict(
						schema.GroupResource{Group: "apps", Resource: "deployments"},
						obj.GetName(),
						errors.New("simulated conflict"),
					)
				}
				return c.Update(ctx, obj, opts...)
			},
		},
		app,
		newGatewayDeployment(),
		newPdf3Hpa(pdf3ProxyHpaName),
		newPdf3Hpa(pdf3WorkerHpaName),
	)
	h := newHarnessWithClient(t, "ttd", "at22", time.Date(2026, 2, 23, 3, 0, 0, 0, osloLocation), k8sClient)

	err := h.reconciler.SyncAll(h.ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(conflictInjected).To(BeTrue())

	payload, err := json.Marshal(collectSnapshots(t, h.k8sClient, "ttd"))
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, payload)
}

func collectSnapshots(t *testing.T, k8sClient client.Client, serviceOwner string) []resourceSnapshot {
	t.Helper()
	result := []resourceSnapshot{}
	ctx := context.Background()

	deployments := &appsv1.DeploymentList{}
	if err := k8sClient.List(ctx, deployments, client.InNamespace(defaultNamespace)); err != nil {
		t.Fatalf("list deployments: %v", err)
	}
	appDeploymentNames := map[string]struct{}{}
	for i := range deployments.Items {
		if !isAppDeployment(serviceOwner, &deployments.Items[i]) {
			continue
		}
		d := &deployments.Items[i]
		appDeploymentNames[d.Name] = struct{}{}
		result = append(result, resourceSnapshot{
			Kind:      testKindDeployment,
			Namespace: d.Namespace,
			Name:      d.Name,
			Replicas:  d.Spec.Replicas,
			Reconcile: annotation(d, reconcileAnnotationKey),
			Managed:   annotation(d, scalerManagedAnnotationKey),
			Baseline:  decodeBaseline(t, d),
		})
	}

	appHpas := &autoscalingv2.HorizontalPodAutoscalerList{}
	if err := k8sClient.List(ctx, appHpas, client.InNamespace(defaultNamespace)); err != nil {
		t.Fatalf("list app HPAs: %v", err)
	}
	for i := range appHpas.Items {
		hpa := &appHpas.Items[i]
		if hpa.Spec.ScaleTargetRef.Kind != testKindDeployment {
			continue
		}
		if _, ok := appDeploymentNames[hpa.Spec.ScaleTargetRef.Name]; !ok {
			continue
		}
		result = append(result, resourceSnapshot{
			Kind:        testKindHPA,
			Namespace:   hpa.Namespace,
			Name:        hpa.Name,
			MinReplicas: hpa.Spec.MinReplicas,
			Reconcile:   annotation(hpa, reconcileAnnotationKey),
			Managed:     annotation(hpa, scalerManagedAnnotationKey),
			Baseline:    decodeBaseline(t, hpa),
		})
	}

	gateway := &appsv1.Deployment{}
	if err := k8sClient.Get(ctx, client.ObjectKey{Name: gatewayDeploymentName, Namespace: runtimeGatewayNamespace}, gateway); err == nil {
		result = append(result, resourceSnapshot{
			Kind:      testKindDeployment,
			Namespace: gateway.Namespace,
			Name:      gateway.Name,
			Replicas:  gateway.Spec.Replicas,
			Reconcile: annotation(gateway, reconcileAnnotationKey),
			Managed:   annotation(gateway, scalerManagedAnnotationKey),
			Baseline:  decodeBaseline(t, gateway),
		})
	}

	for _, hpaName := range []string{pdf3ProxyHpaName, pdf3WorkerHpaName} {
		hpa := &autoscalingv2.HorizontalPodAutoscaler{}
		if err := k8sClient.Get(ctx, client.ObjectKey{Name: hpaName, Namespace: runtimePdf3Namespace}, hpa); err == nil {
			result = append(result, resourceSnapshot{
				Kind:        testKindHPA,
				Namespace:   hpa.Namespace,
				Name:        hpa.Name,
				MinReplicas: hpa.Spec.MinReplicas,
				Reconcile:   annotation(hpa, reconcileAnnotationKey),
				Managed:     annotation(hpa, scalerManagedAnnotationKey),
				Baseline:    decodeBaseline(t, hpa),
			})
		}
	}

	sort.SliceStable(result, func(i, j int) bool {
		if result[i].Kind != result[j].Kind {
			return result[i].Kind < result[j].Kind
		}
		if result[i].Namespace != result[j].Namespace {
			return result[i].Namespace < result[j].Namespace
		}
		return result[i].Name < result[j].Name
	})
	return result
}

func annotation(obj client.Object, key string) string {
	if obj.GetAnnotations() == nil {
		return ""
	}
	return obj.GetAnnotations()[key]
}

func decodeBaseline(t *testing.T, obj client.Object) *scaleBaseline {
	t.Helper()
	value := annotation(obj, scalerBaselineAnnotationKey)
	if value == "" {
		return nil
	}
	baseline := scaleBaseline{}
	if err := json.Unmarshal([]byte(value), &baseline); err != nil {
		t.Fatalf("decode baseline for %s/%s: %v", obj.GetNamespace(), obj.GetName(), err)
	}
	return &baseline
}

func newAppDeployment(appName string, replicas int32) *appsv1.Deployment {
	release := "ttd-" + appName
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      release + "-deployment-v2",
			Namespace: defaultNamespace,
			Labels: map[string]string{
				appReleaseLabelKey: release,
			},
		},
		Spec: appsv1.DeploymentSpec{Replicas: ptr.To(replicas)},
	}
}

func newNonAppDeployment(name string, replicas int32) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: defaultNamespace,
		},
		Spec: appsv1.DeploymentSpec{Replicas: ptr.To(replicas)},
	}
}

func newAppHpa(serviceOwner, appName string, minReplicas int32) *autoscalingv2.HorizontalPodAutoscaler {
	release := serviceOwner + "-" + appName
	return &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:      release + "-deployment",
			Namespace: defaultNamespace,
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				Kind: testKindDeployment,
				Name: release + "-deployment-v2",
			},
			MinReplicas: ptr.To(minReplicas),
		},
	}
}

func newGatewayDeployment() *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      gatewayDeploymentName,
			Namespace: runtimeGatewayNamespace,
		},
		Spec: appsv1.DeploymentSpec{Replicas: ptr.To(int32(2))},
	}
}

func newPdf3Hpa(name string) *autoscalingv2.HorizontalPodAutoscaler {
	return &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: runtimePdf3Namespace,
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{MinReplicas: ptr.To(int32(3))},
	}
}

func newOverrideConfigMap(state string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      forceStateConfigMapName,
			Namespace: forceStateConfigMapNamespace,
		},
		Data: map[string]string{
			forceStateConfigMapStateKey: state,
		},
	}
}
