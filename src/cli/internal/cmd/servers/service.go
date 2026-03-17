// Package servers contains command-specific servers application logic.
package servers

// DownResult contains result text for stopping managed servers.
type DownResult struct {
	MessageLines []string
}

// Service contains servers command logic.
type Service struct{}

// NewService creates a new servers command service.
func NewService() *Service {
	return &Service{}
}

// Down executes the current servers-down behavior.
func (s *Service) Down() DownResult {
	return DownResult{
		MessageLines: []string{
			"No servers running.",
			"",
			"The app-manager server will be implemented in Phase 5.",
		},
	}
}
