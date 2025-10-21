package cache

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	cacheDir = ".cache"
	// Cache duration: 3 days
	cacheDuration = 72 * time.Hour
)

// CacheEntry represents a cached value with timestamp
type CacheEntry struct {
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// ensureCacheDir ensures the cache directory exists
func ensureCacheDir() error {
	return os.MkdirAll(cacheDir, 0755)
}

// getCachePath returns the full path to a cache file
func getCachePath(name string) string {
	return filepath.Join(cacheDir, name+".json")
}

// Get retrieves a cached value if it exists and is not expired
func Get(name string, target interface{}) (bool, error) {
	path := getCachePath(name)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to read cache: %w", err)
	}

	var entry CacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return false, fmt.Errorf("failed to parse cache: %w", err)
	}

	if time.Since(entry.Timestamp) > cacheDuration {
		return false, nil
	}

	dataBytes, err := json.Marshal(entry.Data)
	if err != nil {
		return false, fmt.Errorf("failed to marshal cached data: %w", err)
	}

	if err := json.Unmarshal(dataBytes, target); err != nil {
		return false, fmt.Errorf("failed to unmarshal cached data: %w", err)
	}

	return true, nil
}

// Set stores a value in the cache
func Set(name string, value interface{}) error {
	if err := ensureCacheDir(); err != nil {
		return fmt.Errorf("failed to create cache directory: %w", err)
	}

	entry := CacheEntry{
		Timestamp: time.Now(),
		Data:      value,
	}

	data, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal cache entry: %w", err)
	}

	path := getCachePath(name)
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write cache: %w", err)
	}

	return nil
}

// GetStale retrieves a cached value regardless of expiration
// Useful for fallback scenarios like rate limiting
func GetStale(name string, target interface{}) (bool, error) {
	path := getCachePath(name)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to read cache: %w", err)
	}

	var entry CacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return false, fmt.Errorf("failed to parse cache: %w", err)
	}

	dataBytes, err := json.Marshal(entry.Data)
	if err != nil {
		return false, fmt.Errorf("failed to marshal cached data: %w", err)
	}

	if err := json.Unmarshal(dataBytes, target); err != nil {
		return false, fmt.Errorf("failed to unmarshal cached data: %w", err)
	}

	return true, nil
}
