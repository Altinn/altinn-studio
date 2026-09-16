package app_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
)

const promptTestJwk = `{"kty":"RSA","use":"sig","kid":"k","alg":"RS256","n":"n","e":"AQAB","d":"d","p":"p","q":"q","qi":"qi","dp":"dp","dq":"dq"}`

func promptTestJwkBase64() string { return base64.StdEncoding.EncodeToString([]byte(promptTestJwk)) }

// scriptedPrompter answers prompts from queues and records what it was warned about.
type scriptedPrompter struct {
	lines    []string
	secrets  []string
	warnings []string
}

func (s *scriptedPrompter) prompter(t *testing.T) appsvc.MaskinportenPrompter {
	t.Helper()
	pop := func(queue *[]string) string {
		if len(*queue) == 0 {
			t.Fatal("the prompter asked for more answers than scripted")
		}
		answer := (*queue)[0]
		*queue = (*queue)[1:]
		return answer
	}
	return appsvc.MaskinportenPrompter{
		Line:   func(string) (string, error) { return pop(&s.lines), nil },
		Secret: func(string) (string, error) { return pop(&s.secrets), nil },
		Warn:   func(message string) { s.warnings = append(s.warnings, message) },
	}
}

func parseAnswers(t *testing.T, data []byte) appsecrets.MaskinportenClient {
	t.Helper()
	client, err := appsecrets.ParseMaskinportenClient(data)
	if err != nil {
		t.Fatalf("the answers did not parse as a client: %v", err)
	}
	return client
}

func TestMaskinportenPrompter_DefaultsToTestAndStoresTheKeyAsGiven(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"", "  client-1 "}, secrets: []string{promptTestJwkBase64()}}

	data, err := script.prompter(t).Client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	client := parseAnswers(t, data)
	if client.Authority != "https://test.maskinporten.no/" || client.ClientID != "client-1" ||
		client.JwkBase64 != promptTestJwkBase64() {
		t.Fatalf("client = %+v, want the test authority, client-1 and the key", client)
	}
	if len(script.warnings) != 0 {
		t.Fatalf("warnings = %v, want none", script.warnings)
	}
}

func TestMaskinportenPrompter_AcceptsProdAndAJwkObject(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"PROD", "client-2"}, secrets: []string{promptTestJwk}}

	data, err := script.prompter(t).Client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	client := parseAnswers(t, data)
	if client.Authority != "https://maskinporten.no/" || len(client.Jwk) == 0 || client.JwkBase64 != "" {
		t.Fatalf("client = %+v, want the prod authority and the key kept as a JWK object", client)
	}
}

func TestMaskinportenPrompter_AcceptsAnAuthorityURL(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{
		lines:   []string{"https://ver2.maskinporten.no/", "client-3"},
		secrets: []string{promptTestJwkBase64()},
	}

	data, err := script.prompter(t).Client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if !strings.Contains(string(data), `"authority":"https://ver2.maskinporten.no/"`) {
		t.Fatalf("data = %s, want the URL passed through", data)
	}
}

func TestMaskinportenPrompter_AcceptsAPrettyPrintedJwk(t *testing.T) {
	t.Parallel()

	// Maskinporten shows the JWK pretty-printed; pasted, it arrives one line at a time.
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, []byte(promptTestJwk), "", "  "); err != nil {
		t.Fatal(err)
	}
	script := &scriptedPrompter{lines: []string{"test", "client-4"}, secrets: strings.Split(pretty.String(), "\n")}

	data, err := script.prompter(t).Client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	client := parseAnswers(t, data)
	if len(client.Jwk) == 0 || len(script.warnings) != 0 {
		t.Fatalf("client = %+v, warnings = %v; want the multi-line JWK accepted in one go", client, script.warnings)
	}
}

func TestMaskinportenPrompter_ExplainsAMissAndSaysWhatWasReceived(t *testing.T) {
	t.Parallel()

	// "abcd" is what a slip of the fingers looks like: it decodes as base64 but is no JWK. It is asked about
	// here, with the length received, not failed after the last question.
	script := &scriptedPrompter{
		lines:   []string{"staging", "test", "client-5"},
		secrets: []string{"abcd", promptTestJwkBase64()},
	}

	data, err := script.prompter(t).Client()
	if err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if !strings.Contains(string(data), `"clientId":"client-5"`) {
		t.Fatalf("data = %s, want client-5", data)
	}
	if len(script.warnings) != 2 {
		t.Fatalf("warnings = %v, want one for the environment and one for the key", script.warnings)
	}
	env, key := script.warnings[0], script.warnings[1]
	if !strings.HasPrefix(env, "answer test, prod") || !strings.Contains(env, "Enter with nothing to cancel") {
		t.Fatalf("environment warning = %q, want the reason without a sentinel prefix and the way out", env)
	}
	for _, want := range []string{"not a JWK object", "received 4 characters", "about 2,200", "Enter with nothing to cancel"} {
		if !strings.Contains(key, want) {
			t.Fatalf("key warning = %q, want it to contain %q", key, want)
		}
	}
	if strings.Contains(key, "--file") {
		t.Fatalf("key warning = %q, want the extra help only from the second miss", key)
	}
}

func TestMaskinportenPrompter_OffersTheOtherWaysAfterTheSecondMiss(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{
		lines:   []string{"test", "client-6"},
		secrets: []string{"abcd", "zzzz", promptTestJwkBase64()},
	}

	if _, err := script.prompter(t).Client(); err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if len(script.warnings) != 2 || !strings.Contains(script.warnings[1], "set --file <file>") {
		t.Fatalf("warnings = %v, want the second miss to offer --file", script.warnings)
	}
}

func TestMaskinportenPrompter_AnUnfinishedJwkPasteEndsAtAnEmptyLineAndIsAskedAgain(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{
		lines:   []string{"test", "client-7"},
		secrets: []string{"{", `"kty": "RSA",`, "", promptTestJwkBase64()},
	}

	if _, err := script.prompter(t).Client(); err != nil {
		t.Fatalf("client() error = %v", err)
	}
	if len(script.warnings) != 1 || !strings.Contains(script.warnings[0], "received") {
		t.Fatalf("warnings = %v, want the unfinished paste explained once", script.warnings)
	}
}

func TestMaskinportenPrompter_CancelsOnAnEmptyKey(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"test", "client-8"}, secrets: []string{"abcd", ""}}

	_, err := script.prompter(t).Client()
	if !errors.Is(err, appsvc.ErrPromptCancelled) {
		t.Fatalf("error = %v, want appsvc.ErrPromptCancelled", err)
	}
}

func TestMaskinportenPrompter_CancelsOnAnEmptyClientId(t *testing.T) {
	t.Parallel()

	script := &scriptedPrompter{lines: []string{"test", ""}}

	_, err := script.prompter(t).Client()
	if !errors.Is(err, appsvc.ErrPromptCancelled) {
		t.Fatalf("error = %v, want appsvc.ErrPromptCancelled", err)
	}
}
