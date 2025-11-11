package kubernetes

import (
	"testing"
	"time"
)

func createTestLogLine(timestamp time.Time, message string) LogLine {
	return LogLine{
		Timestamp:    timestamp,
		ClusterName:  "test-cluster",
		ServiceOwner: "test-owner",
		Environment:  "test-env",
		PodName:      "test-pod",
		Message:      message,
	}
}

func TestReSequencer(t *testing.T) {
	r := newResequencer(5 * time.Second)

	now := time.Now().UTC()

	timestamps := []time.Time{
		now.Add(-15 * time.Second),
		now.Add(-12 * time.Second),
		now.Add(-18 * time.Second),
		now.Add(-10 * time.Second),
		now.Add(-20 * time.Second),
	}

	for _, ts := range timestamps {
		line := createTestLogLine(ts, "message")
		r.append(&line)
	}

	r.resequenceIgnoreDuration()

	result := r.next()

	if len(result) != len(timestamps) {
		t.Errorf("Unexpected read result len: %d, expected %d", len(result), len(timestamps))
	}
	if len(r.buffer) != len(result) {
		t.Errorf("Unexpected buffer len: %d", len(r.buffer))
	}

	// Verify entries are sorted by timestamp
	for i := 1; i < len(result); i++ {
		if result[i].Timestamp.Before(result[i-1].Timestamp) {
			t.Errorf("Entries not sorted: entry %d timestamp %v is before entry %d timestamp %v",
				i, result[i].Timestamp, i-1, result[i-1].Timestamp)
		}
	}

	{
		// Add a single line
		line := createTestLogLine(now.Add(-14*time.Second), "message")
		r.append(&line)

		r.resequenceIgnoreDuration()

		result = r.next()
		if len(r.buffer) != 1 {
			t.Errorf("Unexpected buffer len: %d", len(r.buffer))
		}
		if len(result) != 1 {
			t.Errorf("Unexpected result len: %d", len(result))
		}
		if result[0].Timestamp != line.Timestamp {
			t.Errorf("Unexpected timestamp in result: %v, expected %v", result[0].Timestamp, line.Timestamp)
		}
	}

	{
		// Add a couple more
		line := createTestLogLine(now.Add(-13*time.Second), "message")
		r.append(&line)
		line = createTestLogLine(now.Add(-12*time.Second), "message")
		r.append(&line)

		r.resequenceIgnoreDuration()

		result = r.next()
		if len(r.buffer) != 2 {
			t.Errorf("Unexpected buffer len: %d", len(r.buffer))
		}
		if len(result) != 2 {
			t.Errorf("Unexpected result len: %d", len(result))
		}
		if result[1].Timestamp != line.Timestamp {
			t.Errorf("Unexpected timestamp in result: %v, expected %v", result[1].Timestamp, line.Timestamp)
		}
	}

	{
		// Read empty result
		result = r.next()
		if len(result) != 0 {
			t.Errorf("Unexpected result len: %d", len(result))
		}
	}

	{
		// Normal resequencing
		line := createTestLogLine(now.Add(-11*time.Second), "message")
		r.append(&line)
		line = createTestLogLine(now.Add(-10*time.Second), "message")
		r.append(&line)
		line = createTestLogLine(now, "message")
		r.append(&line)

		r.resequence()

		result = r.next()
		// Last line should be too new, so the buffer should have all 3
		// while the result should have the oldest 2
		if len(r.buffer) != 3 {
			t.Errorf("Unexpected buffer len: %d", len(r.buffer))
		}
		if len(result) != 2 {
			t.Errorf("Unexpected result len: %d", len(result))
		}
		if result[1].Timestamp != now.Add(-10*time.Second) {
			t.Errorf("Unexpected timestamp in result: %v, expected %v", result[1].Timestamp, now.Add(-10*time.Second))
		}
	}

	{
		// Final read/flush
		r.resequenceIgnoreDuration()

		result = r.next()
		if len(r.buffer) != 1 {
			t.Errorf("Unexpected buffer len: %d", len(r.buffer))
		}
		if len(result) != 1 {
			t.Errorf("Unexpected result len: %d", len(result))
		}
		if result[0].Timestamp != now {
			t.Errorf("Unexpected timestamp in result: %v, expected %v", result[0].Timestamp, now)
		}
	}
}
