package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/ui"
)

// errPromptCancelled is returned when the developer answers a required prompt with nothing: the designed
// way out, for someone who does not have the value at hand right now.
var errPromptCancelled = errors.New("cancelled")

// errNoUsableAnswer marks an answer the prompt cannot use; it is explained and asked for again.
var errNoUsableAnswer = errors.New("no usable answer")

const (
	cancelHint = "Press Enter with nothing to cancel."
	// Measured on a generated 2048-bit RSA key with kty, use, kid and alg: the JSON is about 1,700
	// characters and its base64 about 2,250. Short of that, a paste has most likely failed.
	keySizeHint = "a base64-encoded 2048-bit RSA JWK is about 2,200 characters, the JWK JSON itself about 1,700"
)

// maskinportenPrompter asks for the three values a Maskinporten client consists of, for a developer who has
// them at hand but not as JSON. line reads an echoed answer, secret one without echo, and warn tells the
// developer why an answer was not accepted before it is asked for again. Nothing is asked a fixed number of
// times: an unusable answer is explained, and an empty answer cancels.
type maskinportenPrompter struct {
	line   func(prompt string) (string, error)
	secret func(prompt string) (string, error)
	warn   func(message string)
}

// client returns the answers as the JSON set accepts, so the same parsing, validation and storage apply.
func (p maskinportenPrompter) client() ([]byte, error) {
	authority, err := p.ask(p.line, "Maskinporten environment, test or prod [test]: ", authorityAnswer)
	if err != nil {
		return nil, err
	}
	clientID, err := p.ask(p.line, "Client id: ", requiredAnswer)
	if err != nil {
		return nil, err
	}
	key, err := p.askKey()
	if err != nil {
		return nil, err
	}

	fields := map[string]any{"authority": authority, "clientId": clientID}
	if strings.HasPrefix(key, "{") {
		fields["jwk"] = json.RawMessage(key)
	} else {
		fields["jwkBase64"] = key
	}
	data, err := json.Marshal(fields)
	if err != nil {
		return nil, fmt.Errorf("encode the answers: %w", err)
	}
	return data, nil
}

// ask repeats a prompt until accept returns a value, or until the developer cancels.
func (p maskinportenPrompter) ask(
	read func(prompt string) (string, error),
	prompt string,
	accept func(answer string) (string, error),
) (string, error) {
	for {
		answer, err := read(prompt)
		if err != nil {
			return "", err
		}
		value, acceptErr := accept(strings.TrimSpace(answer))
		if acceptErr == nil {
			return value, nil
		}
		if errors.Is(acceptErr, errPromptCancelled) {
			return "", acceptErr
		}
		p.warn(reason(acceptErr) + ". " + cancelHint)
	}
}

// askKey asks for the key until it is one the app libraries would accept. Every miss says what was received
// - its length, which is the one thing safe to show and which tells a failed paste from a wrong key - and
// from the second miss on, the other ways to supply the key.
func (p maskinportenPrompter) askKey() (string, error) {
	misses := 0
	for {
		answer, err := p.readKey()
		if err != nil {
			return "", err
		}
		if answer == "" {
			return "", errPromptCancelled
		}
		checkErr := appsecrets.CheckPrivateKey(answer)
		if checkErr == nil {
			return answer, nil
		}
		misses++
		p.warn(keyMissMessage(checkErr, len(answer), misses))
	}
}

// readKey reads the key without echo. A JWK pasted as Maskinporten shows it arrives pretty-printed, one line
// at a time, so when the first line opens an object that is not yet complete JSON, the rest is read until it
// is - or until an empty line, which ends the attempt.
func (p maskinportenPrompter) readKey() (string, error) {
	answer, err := p.secret("Private key - the base64-encoded JWK, or the JWK JSON (not shown as you type): ")
	if err != nil {
		return "", err
	}
	answer = strings.TrimSpace(answer)
	if !strings.HasPrefix(answer, "{") || json.Valid([]byte(answer)) {
		return answer, nil
	}

	var text strings.Builder
	text.WriteString(answer)
	for !json.Valid([]byte(text.String())) {
		more, readErr := p.secret("")
		if readErr != nil {
			return "", readErr
		}
		more = strings.TrimSpace(more)
		if more == "" {
			break
		}
		text.WriteString(more)
	}
	return text.String(), nil
}

func keyMissMessage(err error, received, misses int) string {
	var message strings.Builder
	message.WriteString(reason(err))
	fmt.Fprintf(&message, " (received %d characters; %s).", received, keySizeHint)
	if misses >= 2 {
		message.WriteString(
			" You can also paste the JWK JSON as Maskinporten shows it, or save the key to a file and run set --file <file>.",
		)
	}
	message.WriteString(" " + cancelHint)
	return message.String()
}

// reason is an error's text without the sentinel prefix, for a prompt that already has the context.
func reason(err error) string {
	text := err.Error()
	for _, sentinel := range []error{appsecrets.ErrInvalidMaskinportenClient, errNoUsableAnswer} {
		text = strings.TrimPrefix(text, sentinel.Error()+": ")
	}
	return text
}

// authorityAnswer accepts test (the default), prod, or an https authority URL.
func authorityAnswer(answer string) (string, error) {
	if answer == "" {
		answer = appsecrets.EnvironmentTest
	}
	if authority, ok := appsecrets.AuthorityForEnvironment(answer); ok {
		return authority, nil
	}
	if strings.HasPrefix(strings.ToLower(answer), "https://") {
		return answer, nil
	}
	return "", fmt.Errorf("%w: answer test, prod, or an https authority URL", errNoUsableAnswer)
}

// requiredAnswer takes any non-empty answer; an empty one cancels.
func requiredAnswer(answer string) (string, error) {
	if answer == "" {
		return "", errPromptCancelled
	}
	return answer, nil
}

// promptMaskinportenClient runs the guided prompts against the terminal.
func (c *AppCommand) promptMaskinportenClient(ctx context.Context) ([]byte, error) {
	input, cleanup, err := ui.InteractiveInput()
	if err != nil {
		return nil, fmt.Errorf(
			"%w: pass --file FILE, or pipe the client JSON on standard input",
			errMaskinportenInputRequired,
		)
	}
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			c.out.Verbosef("failed to close terminal input: %v", cleanupErr)
		}
	}()

	c.out.Println(
		"No client given; enter its values instead. Press Enter with nothing to cancel. " +
			"(--file FILE or piped JSON skips this.)",
	)
	prompter := maskinportenPrompter{
		line: func(prompt string) (string, error) {
			c.out.Print(prompt)
			answer, readErr := ui.ReadLine(ctx, input)
			if readErr != nil {
				return "", fmt.Errorf("read answer: %w", readErr)
			}
			return string(answer), nil
		},
		secret: func(prompt string) (string, error) {
			c.out.Print(prompt)
			answer, readErr := ui.ReadPassword(ctx, c.out)
			c.out.Println("")
			if readErr != nil {
				return "", fmt.Errorf("read the key: %w", readErr)
			}
			return string(answer), nil
		},
		warn: func(message string) { c.out.Warninglnf("%s", message) },
	}
	return prompter.client()
}
