package cmd

import (
	"encoding/json"
	"fmt"

	"altinn.studio/studioctl/internal/ui"
)

func printJSONOutput(out *ui.Output, operation string, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal %s json: %w", operation, err)
	}
	out.Println(string(payload))
	return nil
}
