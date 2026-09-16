package cmd

import (
	"encoding/base64"
	"errors"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
)

const promptTestJwk = `{"kty":"RSA","use":"sig","kid":"k","alg":"RS256","n":"n","e":"AQAB","d":"d","p":"p","q":"q","qi":"qi","dp":"dp","dq":"dq"}`

// scriptedPrompter answers prompts from queues and records what it was warned about.
type scriptedPrompter struct {
	lines    []string
	secrets  []string
	warnings []string
}

func (s *scriptedPrompter) prompter(t *testing.T) maskinportenPrompter {
	t.Helper()
	pop := func(queue *[]string) string {
		if len(*queue) == 0 {
			t.Fatal("the prompter asked for more answers than scripted")
		}
		answer := (*queue)[0]
		*queue = (*queue)[1:]
		return answer
	}
	return maskinportenPrompter{
		line:   func(string) (string, error) { return pop(&s.lines), nil },
		secret: func(string) (string, error) { return pop(&s.secrets), nil },
		warn:   func(message string) { s.warnings = append(s.warnings, message) },
	}
}

func TestMaskinportenPrompter_DefaultsToTestAndStoresTheKeyAsGiven(t *testing.T) {
	t.Parallel()

	encoded := base64.StdEncoding.EncodeToString([]byte(promptTestJwk))
	script := &scriptedPrompter{lines: []string{"", "  client-1 "}, secrets: []string{encoded}}

	data, err := script.prompter(t).client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	client, err := appsecrets.ParseMaskinportenClient(data)
	if err != nil {
		t.Fatalf("the answers did not parse as a client: %v", err)
	}
	if client.Authority != "https://test.maskinporten.no/" || client.ClientID != "client-1" ||
		client.JwkBase64 != encoded {
		t.Fatalf("client = %+v, want the test authority, client-1 and the key", client)
	}
	if len(script.warnings) != 0 {
		t.Fatalf("warnings = %v, want none", script.warnings)
	}
}

func TestMaskinportenPrompter_AcceptsProdAndAJwkObject(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"PROD", "client-2"}, secrets: []string{promptTestJwk}}

	data, err := script.prompter(t).client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	client, err := appsecrets.ParseMaskinportenClient(data)
	if err != nil {
		t.Fatalf("the answers did not parse as a client: %v", err)
	}
	if client.Authority != "https://maskinporten.no/" || len(client.Jwk) == 0 || client.JwkBase64 != "" {
		t.Fatalf("client = %+v, want the prod authority and the key kept as a JWK object", client)
	}
}

func TestMaskinportenPrompter_AcceptsAnAuthorityURL(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"https://ver2.maskinporten.no/", "client-3"}, secrets: []string{"a2V5"}}

	data, err := script.prompter(t).client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if !strings.Contains(string(data), `"authority":"https://ver2.maskinporten.no/"`) {
		t.Fatalf("data = %s, want the URL passed through", data)
	}
}

func TestMaskinportenPrompter_AsksAgainAfterAnUnusableAnswer(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{
		lines:   []string{"staging", "test", "", "client-4"},
		secrets: []string{"", "a2V5"},
	}

	data, err := script.prompter(t).client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if !strings.Contains(string(data), `"clientId":"client-4"`) {
		t.Fatalf("data = %s, want client-4", data)
	}
	if len(script.warnings) != 3 {
		t.Fatalf(
			"warnings = %v, want one for the environment, one for the client id and one for the key",
			script.warnings,
		)
	}
}

func TestMaskinportenPrompter_GivesUpAfterThreeUnusableAnswers(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"a", "b", "c"}}

	_, err := script.prompter(t).client()
	if !errors.Is(err, errNoUsableAnswer) {
		t.Fatalf("error = %v, want errNoUsableAnswer", err)
	}
}

func TestMaskinportenPrompter_RejectsAKeyThatIsNotJSON(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"test", "client-5"}, secrets: []string{"{not json"}}

	_, err := script.prompter(t).client()
	if !errors.Is(err, appsecrets.ErrInvalidMaskinportenClient) {
		t.Fatalf("error = %v, want ErrInvalidMaskinportenClient", err)
	}
}
