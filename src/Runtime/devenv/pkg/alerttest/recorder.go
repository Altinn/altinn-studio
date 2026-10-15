package alerttest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

// Recorder is the in-cluster webhook recorder the full profile's contact points notify.
type Recorder struct {
	kube *kubernetes.KubernetesClient
}

// Message is one notification as the recorder received it: the raw Slack payload, and the path
// that names the webhook's Secret and key.
type Message struct {
	ReceivedAt string `json:"receivedAt"`
	Path       string `json:"path"`
	Body       struct {
		Attachments []struct {
			Title     string `json:"title"`
			TitleLink string `json:"title_link"`
			Text      string `json:"text"`
		} `json:"attachments"`
	} `json:"body"`
}

// Text is the message's titles and texts, for matching and the timeline.
func (m Message) Text() string {
	parts := make([]string, 0, 2*len(m.Body.Attachments))
	for _, attachment := range m.Body.Attachments {
		parts = append(parts, attachment.Title, attachment.Text)
	}
	return strings.Join(parts, "\n")
}

// slackLink is Slack's link markup, <url|label> or <url>.
var slackLink = regexp.MustCompile(`<(https?://[^>|]+)(?:\|([^>]+))?>`)

// Links returns the message's links: the attachments' title links and those in their text.
func (m Message) Links() []string {
	var links []string
	for _, attachment := range m.Body.Attachments {
		if attachment.TitleLink != "" {
			links = append(links, attachment.TitleLink)
		}
		for _, match := range slackLink.FindAllStringSubmatch(attachment.Text, -1) {
			links = append(links, match[1])
		}
	}
	return links
}

// Messages returns every notification the recorder has, oldest first, and the raw JSON.
func (r *Recorder) Messages(ctx context.Context) ([]Message, json.RawMessage, error) {
	body, err := r.request(ctx, http.MethodGet, "/api/messages")
	if err != nil {
		return nil, nil, err
	}
	var messages []Message
	if err := json.Unmarshal(body, &messages); err != nil {
		return nil, nil, fmt.Errorf("decode recorder messages: %w", err)
	}
	return messages, body, nil
}

// Reset forgets the recorded notifications, so a test sees only its own.
func (r *Recorder) Reset(ctx context.Context) error {
	_, err := r.request(ctx, http.MethodDelete, "/api/messages")
	return err
}

// Preview returns the recorder's page of the notifications as Slack messages.
func (r *Recorder) Preview(ctx context.Context) ([]byte, error) {
	return r.request(ctx, http.MethodGet, "/")
}

func (r *Recorder) request(ctx context.Context, method, path string) ([]byte, error) {
	return serviceRequest(ctx, r.kube, kubernetes.ServiceProxyRequest{
		Namespace: manifests.GrafanaNamespace,
		Service:   manifests.AlertRecorderName,
		Port:      "80",
		Method:    method,
		Path:      path,
	})
}
