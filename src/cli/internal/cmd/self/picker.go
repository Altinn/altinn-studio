package self

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// PickerOption represents a selectable option in the picker.
type PickerOption struct {
	Label string
	Value string
}

// Picker handles interactive selection of install location.
type Picker struct {
	out               *ui.Output
	candidates        []Candidate
	recommendedOption int // Index in filtered options, -1 if none
}

// NewPicker creates a new picker with the given candidates.
func NewPicker(out *ui.Output, candidates []Candidate) *Picker {
	return &Picker{
		out:               out,
		candidates:        candidates,
		recommendedOption: -1,
	}
}

// Run displays the picker and returns the selected directory path.
// Returns ErrSkipped if the user chooses to skip.
func (p *Picker) Run(ctx context.Context) (string, error) {
	if len(p.candidates) == 0 {
		return "", ErrNoWritableLocation
	}

	p.out.Printf("Where would you like to install %s?\n", osutil.CurrentBin())
	p.out.Println("")

	options := p.buildOptions()

	for i, opt := range options {
		p.out.Printf("  [%d] %s\n", i+1, opt.Label)
	}
	p.out.Println("")

	for _, c := range p.candidates {
		if c.Recommended && c.Writable {
			p.out.Printf("Press Enter for recommended option, or enter a number [1-%d]: ", len(options))
			break
		}
	}
	if !p.hasRecommended() {
		p.out.Printf("Enter a number [1-%d]: ", len(options))
	}

	selection, err := p.readSelection(ctx, len(options))
	if err != nil {
		return "", err
	}

	if selection == len(options)-1 {
		return "", ErrSkipped
	}

	return options[selection].Value, nil
}

func (p *Picker) buildOptions() []PickerOption {
	options := make([]PickerOption, 0, len(p.candidates)+1)
	p.recommendedOption = -1

	for _, c := range p.candidates {
		if c.Writable || c.NeedsSudo {
			if c.Recommended && c.Writable && p.recommendedOption == -1 {
				p.recommendedOption = len(options)
			}
			options = append(options, PickerOption{
				Label: c.Label(),
				Value: c.Path,
			})
		}
	}

	options = append(options, PickerOption{
		Label: "Skip - I'll handle it manually",
		Value: "",
	})

	return options
}

func (p *Picker) hasRecommended() bool {
	for _, c := range p.candidates {
		if c.Recommended && c.Writable {
			return true
		}
	}
	return false
}

func (p *Picker) readSelection(ctx context.Context, numOptions int) (int, error) {
	for {
		line, err := ui.ReadLine(ctx, os.Stdin)
		if err != nil {
			p.out.Println("") // newline after interrupt
			return 0, fmt.Errorf("read selection: %w", err)
		}

		input := strings.TrimSpace(string(line))

		if input == "" {
			if p.recommendedOption >= 0 {
				return p.recommendedOption, nil
			}
			p.out.Error("Please enter a number")
			p.out.Printf("Enter a number [1-%d]: ", numOptions)
			continue
		}

		num, err := strconv.Atoi(input)
		if err != nil || num < 1 || num > numOptions {
			p.out.Errorf("Invalid selection. Please enter a number between 1 and %d", numOptions)
			p.out.Printf("Enter a number [1-%d]: ", numOptions)
			continue
		}

		return num - 1, nil // Convert to 0-indexed
	}
}
