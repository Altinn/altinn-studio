package cnpgapi

import (
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	RoleStatusReconciled = "reconciled"
	ReclaimDelete        = "delete"
)

var (
	GroupVersion         = schema.GroupVersion{Group: "postgresql.cnpg.io", Version: "v1"}
	ClusterKind          = GroupVersion.WithKind("Cluster")
	DatabaseKind         = GroupVersion.WithKind("Database")
	DatabaseListKind     = GroupVersion.WithKind("DatabaseList")
	ImageCatalogKind     = GroupVersion.WithKind("ImageCatalog")
	ImageCatalogListKind = GroupVersion.WithKind("ImageCatalogList")
)

func AddToScheme(scheme *runtime.Scheme) error {
	scheme.AddKnownTypeWithName(ClusterKind, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(GroupVersion.WithKind("ClusterList"), &unstructured.UnstructuredList{})
	scheme.AddKnownTypeWithName(DatabaseKind, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(DatabaseListKind, &unstructured.UnstructuredList{})
	scheme.AddKnownTypeWithName(ImageCatalogKind, &unstructured.Unstructured{})
	scheme.AddKnownTypeWithName(ImageCatalogListKind, &unstructured.UnstructuredList{})
	metav1.AddToGroupVersion(scheme, GroupVersion)
	return nil
}

func NewCluster(namespace, name string) *unstructured.Unstructured {
	return newObject(ClusterKind, namespace, name)
}

func NewDatabase(namespace, name string) *unstructured.Unstructured {
	return newObject(DatabaseKind, namespace, name)
}

func NewDatabaseList() *unstructured.UnstructuredList {
	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(DatabaseListKind)
	return list
}

func NewImageCatalog(namespace, name string) *unstructured.Unstructured {
	return newObject(ImageCatalogKind, namespace, name)
}

func SetSpec(obj *unstructured.Unstructured, spec map[string]any) error {
	if err := unstructured.SetNestedMap(obj.Object, spec, "spec"); err != nil {
		return fmt.Errorf("set spec: %w", err)
	}
	return nil
}

func Spec(obj *unstructured.Unstructured) (map[string]any, error) {
	spec, found, err := unstructured.NestedMap(obj.Object, "spec")
	if err != nil {
		return nil, fmt.Errorf("read spec: %w", err)
	}
	if !found {
		return map[string]any{}, nil
	}
	return spec, nil
}

func Managed(obj *unstructured.Unstructured) (map[string]any, bool, error) {
	managed, found, err := unstructured.NestedMap(obj.Object, "spec", "managed")
	if err != nil {
		return nil, false, fmt.Errorf("read spec.managed: %w", err)
	}
	return managed, found, nil
}

func SetManaged(obj *unstructured.Unstructured, managed map[string]any, found bool) error {
	if !found {
		unstructured.RemoveNestedField(obj.Object, "spec", "managed")
		return nil
	}
	if err := unstructured.SetNestedMap(obj.Object, managed, "spec", "managed"); err != nil {
		return fmt.Errorf("set spec.managed: %w", err)
	}
	return nil
}

func RoleExists(obj *unstructured.Unstructured, name string) (bool, error) {
	roles, err := roles(obj)
	if err != nil {
		return false, err
	}
	for _, role := range roles {
		roleMap, ok := role.(map[string]any)
		if !ok {
			continue
		}
		if roleName, ok := roleMap["name"].(string); ok && roleName == name {
			return true, nil
		}
	}
	return false, nil
}

func AddRole(obj *unstructured.Unstructured, role map[string]any) error {
	roles, err := roles(obj)
	if err != nil {
		return err
	}
	roles = append(roles, role)
	return setRoles(obj, roles)
}

func RemoveRole(obj *unstructured.Unstructured, name string) (found bool, err error) {
	currentRoles, err := roles(obj)
	if err != nil {
		return false, err
	}
	newRoles := make([]any, 0, len(currentRoles))
	for _, role := range currentRoles {
		roleMap, ok := role.(map[string]any)
		if !ok {
			newRoles = append(newRoles, role)
			continue
		}
		if roleName, ok := roleMap["name"].(string); ok && roleName == name {
			found = true
			continue
		}
		newRoles = append(newRoles, role)
	}
	if !found {
		return false, nil
	}
	return true, setRoles(obj, newRoles)
}

func HasManaged(obj *unstructured.Unstructured) (bool, error) {
	managed, found, err := Managed(obj)
	if err != nil || !found {
		return false, err
	}
	roles, ok := managed["roles"].([]any)
	return ok && len(roles) > 0, nil
}

func RolePasswordSecretName(obj *unstructured.Unstructured, roleName string) (string, bool, error) {
	currentRoles, err := roles(obj)
	if err != nil {
		return "", false, err
	}
	for _, role := range currentRoles {
		roleMap, ok := role.(map[string]any)
		if !ok {
			continue
		}
		name, ok := roleMap["name"].(string)
		if !ok || name != roleName {
			continue
		}
		passwordSecret, ok := roleMap["passwordSecret"].(map[string]any)
		if !ok {
			return "", true, nil
		}
		secretName, ok := passwordSecret["name"].(string)
		if !ok {
			return "", true, nil
		}
		return secretName, true, nil
	}
	return "", false, nil
}

func ReconciledRoleNames(obj *unstructured.Unstructured) ([]string, error) {
	values, found, err := unstructured.NestedStringSlice(
		obj.Object,
		"status",
		"managedRolesStatus",
		"byStatus",
		RoleStatusReconciled,
	)
	if err != nil {
		return nil, fmt.Errorf("read status.managedRolesStatus.byStatus.%s: %w", RoleStatusReconciled, err)
	}
	if !found {
		return nil, nil
	}
	return values, nil
}

func DatabaseApplied(obj *unstructured.Unstructured) (bool, error) {
	applied, found, err := unstructured.NestedBool(obj.Object, "status", "applied")
	if err != nil {
		return false, fmt.Errorf("read status.applied: %w", err)
	}
	return found && applied, nil
}

func newObject(gvk schema.GroupVersionKind, namespace, name string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(gvk)
	obj.SetNamespace(namespace)
	obj.SetName(name)
	return obj
}

func roles(obj *unstructured.Unstructured) ([]any, error) {
	roles, found, err := unstructured.NestedSlice(obj.Object, "spec", "managed", "roles")
	if err != nil {
		return nil, fmt.Errorf("read spec.managed.roles: %w", err)
	}
	if !found {
		return nil, nil
	}
	return roles, nil
}

func setRoles(obj *unstructured.Unstructured, roles []any) error {
	if err := unstructured.SetNestedSlice(obj.Object, roles, "spec", "managed", "roles"); err != nil {
		return fmt.Errorf("set spec.managed.roles: %w", err)
	}
	return nil
}
