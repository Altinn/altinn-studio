package self

import (
	"context"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

type pickerOption struct {
	Label string
	Value string
}

// Picker handles interactive selection of an install location.
type Picker struct {
	out               *ui.Output
	input             io.Reader
	candidates        []Candidate
	recommendedOption int
}

// NewPicker creates a picker for install location candidates.
func NewPicker(
	out *ui.Output,
	input io.Reader,
	candidates []Candidate,
) *Picker {
	if input == nil {
		input = os.Stdin
	}

	return &Picker{
		out:               out,
		input:             input,
		candidates:        candidates,
		recommendedOption: -1,
	}
}

// Run prompts for and returns the selected install directory.
func (p *Picker) Run(ctx context.Context) (string, error) {
	if len(p.candidates) == 0 {
		return "", ErrNoWritableInstallLocation
	}

	p.out.Printlnf("Where would you like to install %s?", osutil.CurrentBin())
	p.out.Println("")

	options := p.buildOptions()

	for i, opt := range options {
		p.out.Printlnf("  [%d] %s", i+1, opt.Label)
	}
	p.out.Println("")

	if p.hasRecommended() {
		p.out.Printf("Press Enter for recommended option, or enter a number [1-%d]: ", len(options))
	} else {
		p.out.Printf("Enter a number [1-%d]: ", len(options))
	}

	selection, err := p.readSelection(ctx, len(options))
	if err != nil {
		return "", err
	}

	return options[selection].Value, nil
}

func (p *Picker) buildOptions() []pickerOption {
	options := make([]pickerOption, 0, len(p.candidates))
	p.recommendedOption = -1

	for _, candidate := range p.candidates {
		if candidate.Writable || candidate.NeedsSudo {
			if candidate.Recommended && candidate.Writable && p.recommendedOption == -1 {
				p.recommendedOption = len(options)
			}
			options = append(options, pickerOption{
				Label: installCandidateLabel(candidate),
				Value: candidate.Path,
			})
		}
	}

	return options
}

func (p *Picker) hasRecommended() bool {
	for _, candidate := range p.candidates {
		if candidate.Recommended && candidate.Writable {
			return true
		}
	}
	return false
}

func (p *Picker) readSelection(ctx context.Context, numOptions int) (int, error) {
	for {
		line, err := ui.ReadLine(ctx, p.input)
		if err != nil {
			p.out.Println("")
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

		return num - 1, nil
	}
}

func installCandidateLabel(candidate Candidate) string {
	parts := []string{candidate.Path}

	if candidate.Recommended {
		parts = append(parts, "(recommended)")
	}
	if candidate.InPath && !candidate.Recommended {
		parts = append(parts, "(in PATH)")
	}
	if candidate.NeedsSudo {
		parts = append(parts, "(requires sudo)")
	}
	if !candidate.Writable && !candidate.NeedsSudo {
		parts = append(parts, "(not writable)")
	}

	return strings.Join(parts, " ")
}
