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

// errNoUsableAnswer is returned when a guided prompt gets nothing it can use.
var errNoUsableAnswer = errors.New("no usable answer")

const promptAttempts = 3

// maskinportenPrompter asks for the three values a Maskinporten client consists of, for a developer who has
// them at hand but not as JSON. line reads an echoed answer, secret one without echo, and warn tells the
// developer why an answer was not accepted before it is asked for again.
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
	clientID, err := p.ask(p.line, "Client id: ", requiredAnswer("a client id"))
	if err != nil {
		return nil, err
	}
	key, err := p.ask(
		p.secret,
		"Private key, the base64-encoded JWK (not shown as you type): ",
		requiredAnswer("the key"),
	)
	if err != nil {
		return nil, err
	}

	fields := map[string]any{"authority": authority, "clientId": clientID}
	if strings.HasPrefix(key, "{") {
		if !json.Valid([]byte(key)) {
			return nil, fmt.Errorf("%w: the JWK is not valid JSON", appsecrets.ErrInvalidMaskinportenClient)
		}
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

// ask repeats a prompt until accept returns a value, for a few attempts.
func (p maskinportenPrompter) ask(
	read func(prompt string) (string, error),
	prompt string,
	accept func(answer string) (string, error),
) (string, error) {
	for range promptAttempts {
		answer, err := read(prompt)
		if err != nil {
			return "", err
		}
		value, acceptErr := accept(strings.TrimSpace(answer))
		if acceptErr == nil {
			return value, nil
		}
		p.warn(acceptErr.Error())
	}
	return "", fmt.Errorf("%w after %d attempts", errNoUsableAnswer, promptAttempts)
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

func requiredAnswer(what string) func(answer string) (string, error) {
	return func(answer string) (string, error) {
		if answer == "" {
			return "", fmt.Errorf("%w: %s is required", errNoUsableAnswer, what)
		}
		return answer, nil
	}
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

	c.out.Println("No client given; enter its values instead. (--file FILE or piped JSON skips this.)")
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
