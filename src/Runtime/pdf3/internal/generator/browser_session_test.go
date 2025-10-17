package generator

import "testing"

func TestHtmlIDPattern(t *testing.T) {
	tests := []struct {
		selector string
		want     bool
		reason   string
	}{
		// Valid simple ID selectors (should match and use optimized path)
		{"#myId", true, "simple ID with letters"},
		{"#my-id", true, "ID with hyphens"},
		{"#my_id", true, "ID with underscores"},
		{"#ID123", true, "ID with numbers"},
		{"#_underscore", true, "ID starting with underscore"},
		{"#id-with-many-hyphens", true, "ID with multiple hyphens"},
		{"#CamelCaseId", true, "camelCase ID"},
		{"#UPPERCASE", true, "uppercase ID"},
		{"#a", true, "single character ID"},
		{"#id123", true, "ID with numbers at end"},

		// HTML5 allows these, so if we're being permissive they should match
		{"#123", true, "ID starting with number (HTML5 allows)"},
		{"#-dash", true, "ID starting with dash (HTML5 allows)"},

		// Complex selectors (should NOT match - need querySelector)
		{"#id.class", false, "ID with class selector"},
		{"#id .child", false, "ID with descendant selector"},
		{"#id>.child", false, "ID with child combinator"},
		{"#id+sibling", false, "ID with adjacent sibling combinator"},
		{"#id~sibling", false, "ID with general sibling combinator"},
		{"#id[attr]", false, "ID with attribute selector"},
		{"#id:hover", false, "ID with pseudo-class"},
		{"#id::before", false, "ID with pseudo-element"},
		{"#id1,#id2", false, "multiple selectors"},

		// Not ID selectors at all (should NOT match)
		{".class", false, "class selector"},
		{"div", false, "element selector"},
		{"[attr]", false, "attribute selector"},
		{"*", false, "universal selector"},
		{"", false, "empty string"},
		{" #id", false, "ID with leading space"},
		{"#id ", false, "ID with trailing space"},
	}

	for _, tt := range tests {
		t.Run(tt.selector, func(t *testing.T) {
			got := htmlIDSelectorPattern.MatchString(tt.selector)
			if got != tt.want {
				t.Errorf("htmlIDPattern.MatchString(%q) = %v, want %v (%s)",
					tt.selector, got, tt.want, tt.reason)
			}
		})
	}
}
