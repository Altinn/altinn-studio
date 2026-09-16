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

	encoded := base64.StdEncoding.EncodeToString([]byte(promptTestJwk))
	script := &scriptedPrompter{
		lines:   []string{"https://ver2.maskinporten.no/", "client-3"},
		secrets: []string{encoded},
	}

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

	// "abcd" is what a slip of the fingers looks like: it decodes as base64 but is no JWK. It must be asked
	// about here, not fail the whole command after the last question.
	script := &scriptedPrompter{
		lines:   []string{"staging", "test", "", "client-4"},
		secrets: []string{"", "abcd", base64.StdEncoding.EncodeToString([]byte(promptTestJwk))},
	}

	data, err := script.prompter(t).client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if !strings.Contains(string(data), `"clientId":"client-4"`) {
		t.Fatalf("data = %s, want client-4", data)
	}
	if len(script.warnings) != 4 {
		t.Fatalf(
			"warnings = %v, want the environment, the client id, the empty key and the garbage key",
			script.warnings,
		)
	}
	if !strings.Contains(script.warnings[3], "not a JWK object") {
		t.Fatalf("warning for the garbage key = %q, want it to say what a key looks like", script.warnings[3])
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

func TestMaskinportenPrompter_GivesUpOnAKeyThatNeverBecomesAJwk(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"test", "client-5"}, secrets: []string{"{not json", "abcd", "zzzz"}}

	_, err := script.prompter(t).client()
	if !errors.Is(err, errNoUsableAnswer) {
		t.Fatalf("error = %v, want errNoUsableAnswer after three unusable keys", err)
	}
}
