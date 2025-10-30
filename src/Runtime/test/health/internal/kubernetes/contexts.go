package kubernetes

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

// ContextInfo represents a kubectl context with its associated user
type ContextInfo struct {
	Name    string // Context name (e.g., "ttd-tt02-aks")
	User    string // User/authinfo name (e.g., "clusterUser_altinnapps-ttd-tt02-rg_ttd-tt02-aks")
	Cluster string // Cluster name
}

// KubeConfig represents the structure of kubectl config output
type KubeConfig struct {
	Contexts []struct {
		Name    string `json:"name"`
		Context struct {
			Cluster string `json:"cluster"`
			User    string `json:"user"`
		} `json:"context"`
	} `json:"contexts"`
}

// GetAllContextDetails retrieves all kubectl contexts with their associated user/authinfo
func GetAllContextDetails() ([]ContextInfo, error) {
	cmd := exec.Command("kubectl", "config", "view", "-o", "json")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubectl contexts: %w", err)
	}

	var config KubeConfig
	if err := json.Unmarshal(output, &config); err != nil {
		return nil, fmt.Errorf("failed to parse kubectl config: %w", err)
	}

	contexts := make([]ContextInfo, 0, len(config.Contexts))
	for _, ctx := range config.Contexts {
		contexts = append(contexts, ContextInfo{
			Name:    ctx.Name,
			User:    ctx.Context.User,
			Cluster: ctx.Context.Cluster,
		})
	}

	return contexts, nil
}

// FilterContextsByEnvironment filters contexts based on environments and optional serviceowner
// Contexts must match pattern: <serviceowner>-<environment>-aks
// Users must have prefix: clusterUser_altinnapps
func FilterContextsByEnvironment(contexts []ContextInfo, environments []string, serviceowner string) []string {
	// Build regex patterns for all environments
	var patterns []string
	for _, environment := range environments {
		if serviceowner != "" {
			// Specific serviceowner: ttd-tt02-aks
			patterns = append(patterns, fmt.Sprintf("^%s-%s-aks$", regexp.QuoteMeta(serviceowner), regexp.QuoteMeta(environment)))
		} else {
			// Any serviceowner: *-tt02-aks (serviceowner is 2-8 lowercase letters)
			patterns = append(patterns, fmt.Sprintf("^[a-z]{2,8}-%s-aks$", regexp.QuoteMeta(environment)))
		}
	}

	// Compile all regex patterns
	var nameRegexes []*regexp.Regexp
	for _, pattern := range patterns {
		nameRegexes = append(nameRegexes, regexp.MustCompile(pattern))
	}

	userPrefix := "clusterUser_altinnapps"

	var filtered []string
	for _, ctx := range contexts {
		// Check if context name matches any of the patterns
		matched := false
		for _, nameRegex := range nameRegexes {
			if nameRegex.MatchString(ctx.Name) {
				matched = true
				break
			}
		}

		if !matched {
			continue
		}

		// Check user/authinfo has correct prefix
		if !strings.HasPrefix(ctx.User, userPrefix) {
			continue
		}

		filtered = append(filtered, ctx.Name)
	}

	return filtered
}
