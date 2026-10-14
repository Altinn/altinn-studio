package alerttest

import (
	"errors"
	"net/url"
	"os"
	"testing"
	"time"
)

var errTest = errors.New("test")

func TestMessageLinks(t *testing.T) {
	message := Message{Body: []byte(`{"attachments":[{"title":"t","title_link":"http://g/alerting/list",
		"text":"a\n<http://g/d/uid?viewPanel=10|Open panel>\n<http://g/alerting/grafana/rule/view>"}]}`)}
	links := message.Links()
	want := map[string]string{
		"title":                               "http://g/alerting/list",
		"Open panel":                          "http://g/d/uid?viewPanel=10",
		"http://g/alerting/grafana/rule/view": "http://g/alerting/grafana/rule/view",
	}
	for label, link := range want {
		if links[label] != link {
			t.Errorf("links[%q] = %q, want %q (all: %v)", label, links[label], link, links)
		}
	}
	panel, ok := findLink(links, func(u *url.URL) bool { return u.Query().Get("viewPanel") == "10" })
	if !ok || panel != want["Open panel"] {
		t.Errorf("findLink() = %q, %v", panel, ok)
	}
}

func TestMatches(t *testing.T) {
	labels := map[string]string{"job": "vmagent", "copy": "b", "alertname": "x"}
	if !matches(labels, map[string]string{"job": "vmagent", "copy": "b"}) {
		t.Error("matches() = false for a subset")
	}
	if matches(labels, map[string]string{"copy": "a"}) {
		t.Error("matches() = true for another value")
	}
}

func TestPollStopsOnPermanentError(t *testing.T) {
	calls := 0
	err := poll(t.Context(), time.Minute, time.Millisecond, func() (bool, error) {
		calls++
		return false, permanent(errTest)
	})
	if !errors.Is(err, errTest) || calls != 1 {
		t.Errorf("poll() = %v after %d calls, want the permanent error at once", err, calls)
	}
}

func TestPollRetriesUntilTimeout(t *testing.T) {
	calls := 0
	err := poll(t.Context(), 20*time.Millisecond, time.Millisecond, func() (bool, error) {
		calls++
		return false, errTest
	})
	if !errors.Is(err, errTimeout) || !errors.Is(err, errTest) || calls < 2 {
		t.Errorf("poll() = %v after %d calls, want a timeout carrying the last error", err, calls)
	}
}

func TestLabelReferenceExpansion(t *testing.T) {
	text := "Queue {{ $labels.job }} for {{- $labels.copy -}} and {{ $value }}"
	got := labelReference.ReplaceAllStringFunc(text, func(ref string) string {
		return "<" + labelReference.FindStringSubmatch(ref)[1] + ">"
	})
	if got != "Queue <job> for<copy>and {{ $value }}" && got != "Queue <job> for <copy> and {{ $value }}" {
		t.Errorf("expanded = %q", got)
	}
}

func TestPreviewPlaceholderMatchesThePage(t *testing.T) {
	page, err := os.ReadFile("../runtimes/kind/manifests/alertrecorder/preview.html")
	if err != nil {
		t.Fatal(err)
	}
	if !embeddedMessages.Match(page) {
		t.Error("the recorder's preview page has no placeholder for embedded messages")
	}
}
