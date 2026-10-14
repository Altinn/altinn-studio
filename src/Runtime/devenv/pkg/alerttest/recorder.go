package alerttest

import (
	"context"
	"encoding/json"
	"errors"
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

// NewRecorder returns a client for the fixture's webhook recorder.
func NewRecorder(kube *kubernetes.KubernetesClient) *Recorder {
	return &Recorder{kube: kube}
}

// Message is one notification as the recorder received it: the raw Slack payload.
type Message struct {
	ReceivedAt string          `json:"receivedAt"`
	Path       string          `json:"path"`
	Body       json.RawMessage `json:"body"`
}

// SlackAttachment is the part of a Slack payload Grafana's notifier fills in.
type SlackAttachment struct {
	Title     string `json:"title"`
	TitleLink string `json:"title_link"`
	Text      string `json:"text"`
	Color     string `json:"color"`
	Footer    string `json:"footer"`
}

// Attachments decodes the message's Slack attachments.
func (m Message) Attachments() []SlackAttachment {
	var payload struct {
		Attachments []SlackAttachment `json:"attachments"`
	}
	if err := json.Unmarshal(m.Body, &payload); err != nil {
		return nil
	}
	return payload.Attachments
}

// Text is the message's title and text, for matching.
func (m Message) Text() string {
	attachments := m.Attachments()
	parts := make([]string, 0, 2*len(attachments))
	for _, attachment := range attachments {
		parts = append(parts, attachment.Title, attachment.Text)
	}
	return strings.Join(parts, "\n")
}

var (
	embeddedMessages = regexp.MustCompile(`<script id="embedded-messages" type="application/json">\s*null\s*</script>`)
	errNoPlaceholder = errors.New("the recorder's preview page has no place for the messages")
)

var slackLink = regexp.MustCompile(`<(https?://[^>|]+)(?:\|([^>]+))?>`)

// Links returns the message's links, by label, from Slack's <url|label> markup and the
// attachments' title links.
func (m Message) Links() map[string]string {
	links := map[string]string{}
	for _, attachment := range m.Attachments() {
		if attachment.TitleLink != "" {
			links["title"] = attachment.TitleLink
		}
		for _, match := range slackLink.FindAllStringSubmatch(attachment.Text, -1) {
			label := match[2]
			if label == "" {
				label = match[1]
			}
			links[label] = match[1]
		}
	}
	return links
}

// Messages returns every notification the recorder has, oldest first.
func (r *Recorder) Messages(ctx context.Context) ([]Message, error) {
	body, err := r.request(ctx, http.MethodGet, "/api/messages")
	if err != nil {
		return nil, err
	}
	var messages []Message
	if err := json.Unmarshal(body, &messages); err != nil {
		return nil, fmt.Errorf("decode recorder messages: %w", err)
	}
	return messages, nil
}

// Reset forgets the recorded notifications, so a scenario sees only its own.
func (r *Recorder) Reset(ctx context.Context) error {
	_, err := r.request(ctx, http.MethodDelete, "/api/messages")
	return err
}

// Preview returns the recorder's preview page with the messages embedded, so the page shows
// them when opened from a file.
func (r *Recorder) Preview(ctx context.Context, messages []Message) (string, error) {
	page, err := r.request(ctx, http.MethodGet, "/")
	if err != nil {
		return "", err
	}
	data, err := json.Marshal(messages)
	if err != nil {
		return "", fmt.Errorf("encode messages: %w", err)
	}
	// Inside a <script> element, "</" would end it early.
	embedded := strings.ReplaceAll(string(data), "</", `<\/`)
	replaced := embeddedMessages.ReplaceAllLiteralString(string(page),
		`<script id="embedded-messages" type="application/json">`+embedded+`</script>`)
	if replaced == string(page) {
		return "", errNoPlaceholder
	}
	return replaced, nil
}

func (r *Recorder) request(ctx context.Context, method, path string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	status, body, err := r.kube.ServiceProxy(ctx, kubernetes.ServiceProxyRequest{
		Namespace: manifests.GrafanaNamespace,
		Service:   manifests.AlertRecorderName,
		Port:      "80",
		Method:    method,
		Path:      path,
	})
	if err != nil {
		return nil, fmt.Errorf("recorder %s %s: %w", method, path, err)
	}
	if status < 200 || status > 299 {
		return nil, fmt.Errorf("recorder %s %s: %w %d", method, path, errHTTPStatus, status)
	}
	return body, nil
}
