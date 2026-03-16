package internal

import "fmt"

func confirmMutatingAction(prompter ConfirmationPrompter, action string, details ...string) error {
	if prompter == nil {
		return nil
	}

	confirmed, err := prompter.Confirm(action, details)
	if err != nil {
		return fmt.Errorf("confirm %q: %w", action, err)
	}
	if !confirmed {
		return fmt.Errorf("%w: %s", ErrActionNotConfirmed, action)
	}
	return nil
}

func confirmNonMainBranch(
	prompter ConfirmationPrompter,
	currentBranch, operation string,
	details ...string,
) error {
	if currentBranch == "" || currentBranch == mainBranch {
		return nil
	}

	promptDetails := make([]string, 0, 1+len(details))
	promptDetails = append(promptDetails, "Current branch: "+currentBranch)
	promptDetails = append(promptDetails, details...)
	return confirmMutatingAction(prompter, "run "+operation+" from non-main branch", promptDetails...)
}
