package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// MaskinportenClientSpec defines the desired state of MaskinportenClient
type MaskinportenClientSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Scopes is a list of Maskinporten scopes that the client should have access to
	Scopes []string `json:"scopes,omitempty"`
}

// MaskinportenClientStatus defines the observed state of MaskinportenClient
type MaskinportenClientStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// ClientId is the client id of the client posted to Maskinporten API
	ClientId  string   `json:"clientId,omitempty"`
	Authority string   `json:"authority,omitempty"`
	KeyIds    []string `json:"keyIds,omitempty"`
	// LastSynced is the timestamp of the last successful sync towards Maskinporten API
	//
	// +kubebuilder:validation:Format: date-time
	LastSynced         *metav1.Time `json:"lastSynced,omitempty"`
	State              string       `json:"state,omitempty"`
	Reason             string       `json:"reason,omitempty"`
	ObservedGeneration int64        `json:"observedGeneration,omitempty"`
	LastActions        []string     `json:"lastActions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// MaskinportenClient is the Schema for the maskinportenclients API
type MaskinportenClient struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MaskinportenClientSpec   `json:"spec,omitempty"`
	Status MaskinportenClientStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// MaskinportenClientList contains a list of MaskinportenClient
type MaskinportenClientList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MaskinportenClient `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MaskinportenClient{}, &MaskinportenClientList{})
}
