package checksum

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// setupTestDir creates a temporary directory with test files
func setupTestDir(t *testing.T) string {
	t.Helper()

	tmpDir := t.TempDir()

	// Create directory structure:
	// tmpDir/
	//   ├── file1.go
	//   ├── file2.txt
	//   ├── go.mod
	//   ├── cmd/
	//   │   ├── app1/
	//   │   │   └── main.go
	//   │   └── app2/
	//   │       └── main.go
	//   └── internal/
	//       ├── pkg1/
	//       │   ├── code.go
	//       │   └── code_test.go
	//       └── pkg2/
	//           └── utils.go

	files := map[string]string{
		"file1.go":                   "package main",
		"file2.txt":                  "some text",
		"go.mod":                     "module test",
		"cmd/app1/main.go":           "package main\nfunc main() {}",
		"cmd/app2/main.go":           "package main\nfunc main() { println(\"app2\") }",
		"internal/pkg1/code.go":      "package pkg1",
		"internal/pkg1/code_test.go": "package pkg1",
		"internal/pkg2/utils.go":     "package pkg2",
	}

	for path, content := range files {
		fullPath := filepath.Join(tmpDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			t.Fatalf("Failed to create directory: %v", err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			t.Fatalf("Failed to write file %s: %v", path, err)
		}
	}

	return tmpDir
}

func TestComputeFilesChecksum_SimpleGlob(t *testing.T) {
	dir := setupTestDir(t)

	// Test simple glob pattern
	hash, err := ComputeFilesChecksum(dir, []string{"*.go"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	// Should match file1.go only (not recursive)
	if hash == "" {
		t.Error("Expected non-empty hash")
	}

	// Verify it's deterministic
	hash2, err := ComputeFilesChecksum(dir, []string{"*.go"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}
	if hash != hash2 {
		t.Error("Hash should be deterministic")
	}
}

func TestComputeFilesChecksum_ExactFile(t *testing.T) {
	dir := setupTestDir(t)

	// Test exact filename
	hash, err := ComputeFilesChecksum(dir, []string{"go.mod"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash == "" {
		t.Error("Expected non-empty hash")
	}
}

func TestComputeFilesChecksum_RecursivePattern(t *testing.T) {
	dir := setupTestDir(t)

	// Test recursive pattern
	hash, err := ComputeFilesChecksum(dir, []string{"cmd/**/*.go"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash == "" {
		t.Error("Expected non-empty hash for cmd/**/*.go")
	}

	// Change one of the matched files and verify hash changes
	mainPath := filepath.Join(dir, "cmd/app1/main.go")
	if err := os.WriteFile(mainPath, []byte("package main\n// modified"), 0644); err != nil {
		t.Fatalf("Failed to modify file: %v", err)
	}

	hash2, err := ComputeFilesChecksum(dir, []string{"cmd/**/*.go"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash == hash2 {
		t.Error("Hash should change when file content changes")
	}
}

func TestComputeFilesChecksum_MultiplePatterns(t *testing.T) {
	dir := setupTestDir(t)

	// Test multiple patterns
	patterns := []string{
		"cmd/**/*.go",
		"internal/**/*.go",
		"go.mod",
	}

	hash, err := ComputeFilesChecksum(dir, patterns)
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash == "" {
		t.Error("Expected non-empty hash")
	}

	// Verify all relevant files are included by modifying one from each pattern
	testCases := []struct {
		file string
		desc string
	}{
		{"cmd/app1/main.go", "cmd pattern"},
		{"internal/pkg1/code.go", "internal pattern"},
		{"go.mod", "exact file pattern"},
	}

	for _, tc := range testCases {
		// Modify the file
		path := filepath.Join(dir, tc.file)
		if err := os.WriteFile(path, []byte("modified content"), 0644); err != nil {
			t.Fatalf("Failed to modify %s: %v", tc.file, err)
		}

		// Recompute hash
		newHash, err := ComputeFilesChecksum(dir, patterns)
		if err != nil {
			t.Fatalf("ComputeFilesChecksum failed: %v", err)
		}

		if hash == newHash {
			t.Errorf("Hash should change when %s is modified (%s)", tc.file, tc.desc)
		}

		// Restore original for next iteration
		dir = setupTestDir(t)
		hash, err = ComputeFilesChecksum(dir, patterns)
		if err != nil {
			t.Fatalf("ComputeFilesChecksum failed: %v", err)
		}
	}
}

func TestComputeFilesChecksum_Deduplication(t *testing.T) {
	dir := setupTestDir(t)

	// Overlapping patterns should not affect hash (deduplication)
	patterns1 := []string{"cmd/**/*.go"}
	patterns2 := []string{"cmd/**/*.go", "cmd/**/*.go"} // Duplicate pattern

	hash1, err := ComputeFilesChecksum(dir, patterns1)
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	hash2, err := ComputeFilesChecksum(dir, patterns2)
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash1 != hash2 {
		t.Error("Duplicate patterns should produce same hash due to deduplication")
	}
}

func TestComputeFilesChecksum_NonExistentDirectory(t *testing.T) {
	dir := setupTestDir(t)

	// Pattern matching non-existent directory should not error
	hash, err := ComputeFilesChecksum(dir, []string{"nonexistent/**/*.go"})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum should not error on non-existent directory: %v", err)
	}

	// Should return empty hash (no files matched)
	if hash == "" {
		t.Error("Expected hash even when no files match (hash of empty set)")
	}
}

func TestComputeFilesChecksum_EmptyPatterns(t *testing.T) {
	dir := setupTestDir(t)

	// Empty pattern list should return hash of empty set
	hash, err := ComputeFilesChecksum(dir, []string{})
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash == "" {
		t.Error("Expected hash even for empty pattern list")
	}
}

func TestComputeFilesChecksum_OrderIndependent(t *testing.T) {
	dir := setupTestDir(t)

	// Different pattern order should produce same hash (files are sorted)
	patterns1 := []string{"cmd/**/*.go", "internal/**/*.go", "go.mod"}
	patterns2 := []string{"go.mod", "internal/**/*.go", "cmd/**/*.go"}

	hash1, err := ComputeFilesChecksum(dir, patterns1)
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	hash2, err := ComputeFilesChecksum(dir, patterns2)
	if err != nil {
		t.Fatalf("ComputeFilesChecksum failed: %v", err)
	}

	if hash1 != hash2 {
		t.Error("Pattern order should not affect hash (files should be sorted)")
	}
}

func TestMatchRecursivePattern_InvalidPattern(t *testing.T) {
	dir := setupTestDir(t)

	// Pattern with no "**" should error
	_, err := matchRecursivePattern(dir, "cmd/*.go")
	if err == nil {
		t.Error("Expected error for pattern without **")
	}

	// Pattern with multiple "**" should error
	_, err = matchRecursivePattern(dir, "cmd/**/**/main.go")
	if err == nil {
		t.Error("Expected error for pattern with multiple **")
	}
}

func TestMatchRecursivePattern_VariousPatterns(t *testing.T) {
	dir := setupTestDir(t)

	testCases := []struct {
		pattern       string
		expectedCount int
		description   string
	}{
		{"cmd/**/*.go", 2, "all .go files in cmd"},
		{"internal/**/*.go", 3, "all .go files in internal"},
		{"internal/**/*_test.go", 1, "test files only"},
		{"**/*.go", 6, "all .go files recursively"},
		{"**/*.txt", 1, "all .txt files recursively"},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			matches, err := matchRecursivePattern(dir, tc.pattern)
			if err != nil {
				t.Fatalf("matchRecursivePattern failed for %s: %v", tc.pattern, err)
			}

			if len(matches) != tc.expectedCount {
				t.Errorf("Pattern %s: expected %d matches, got %d. Matches: %v",
					tc.pattern, tc.expectedCount, len(matches), matches)
			}

			// Verify all matches have correct extension
			if strings.Contains(tc.pattern, "*.") {
				ext := strings.TrimPrefix(strings.Split(tc.pattern, "**")[1], "/")
				ext = strings.TrimPrefix(ext, "*")
				for _, match := range matches {
					if !strings.HasSuffix(match, ext) {
						t.Errorf("Match %s does not have expected extension %s", match, ext)
					}
				}
			}
		})
	}
}
