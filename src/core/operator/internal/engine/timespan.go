package engine

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var errTimeSpan = errors.New("not a .NET TimeSpan")

// Duration is a .NET TimeSpan in JSON: the constant format [-][d.]hh:mm:ss[.fffffff], which System.Text.Json reads
// and writes.
type Duration time.Duration

// FormatTimeSpan formats d in the .NET constant format, to a precision of 100 nanoseconds, a .NET tick.
func FormatTimeSpan(d time.Duration) string {
	var b strings.Builder
	if d < 0 {
		b.WriteByte('-')
		d = -d
	}
	ticks := int64(d / 100)
	const ticksPerSecond = int64(time.Second / 100)
	fraction := ticks % ticksPerSecond
	seconds := ticks / ticksPerSecond
	days := seconds / 86400
	seconds %= 86400
	if days > 0 {
		fmt.Fprintf(&b, "%d.", days)
	}
	fmt.Fprintf(&b, "%02d:%02d:%02d", seconds/3600, seconds/60%60, seconds%60)
	if fraction > 0 {
		fmt.Fprintf(&b, ".%07d", fraction)
	}
	return b.String()
}

// ParseTimeSpan reads the .NET constant format.
func ParseTimeSpan(value string) (time.Duration, error) {
	text := value
	negative := strings.HasPrefix(text, "-")
	text = strings.TrimPrefix(text, "-")

	var days int64
	clockPart := text
	if dot, colon := strings.IndexByte(text, '.'), strings.IndexByte(text, ':'); dot >= 0 && dot < colon {
		var err error
		if days, err = strconv.ParseInt(text[:dot], 10, 64); err != nil {
			return 0, fmt.Errorf("%w: %q", errTimeSpan, value)
		}
		clockPart = text[dot+1:]
	}

	var fraction time.Duration
	if dot := strings.IndexByte(clockPart, '.'); dot >= 0 {
		digits := clockPart[dot+1:]
		if digits == "" || len(digits) > 7 {
			return 0, fmt.Errorf("%w: %q", errTimeSpan, value)
		}
		ticks, err := strconv.ParseInt(digits+strings.Repeat("0", 7-len(digits)), 10, 64)
		if err != nil {
			return 0, fmt.Errorf("%w: %q", errTimeSpan, value)
		}
		fraction = time.Duration(ticks) * 100
		clockPart = clockPart[:dot]
	}

	parts := strings.Split(clockPart, ":")
	if len(parts) != 3 {
		return 0, fmt.Errorf("%w: %q", errTimeSpan, value)
	}
	var units [3]int64
	for i, part := range parts {
		n, err := strconv.ParseInt(part, 10, 64)
		if err != nil || n < 0 {
			return 0, fmt.Errorf("%w: %q", errTimeSpan, value)
		}
		units[i] = n
	}

	d := time.Duration(days)*24*time.Hour +
		time.Duration(units[0])*time.Hour +
		time.Duration(units[1])*time.Minute +
		time.Duration(units[2])*time.Second +
		fraction
	if negative {
		d = -d
	}
	return d, nil
}

func (d Duration) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(FormatTimeSpan(time.Duration(d)))
	if err != nil {
		return nil, fmt.Errorf("marshal TimeSpan: %w", err)
	}
	return data, nil
}

func (d *Duration) UnmarshalJSON(data []byte) error {
	var text string
	if err := json.Unmarshal(data, &text); err != nil {
		return fmt.Errorf("%w: %w", errTimeSpan, err)
	}
	parsed, err := ParseTimeSpan(text)
	if err != nil {
		return err
	}
	*d = Duration(parsed)
	return nil
}

// DurationOf returns a pointer to d as a Duration, for the optional fields of the engine's models.
func DurationOf(d time.Duration) *Duration {
	value := Duration(d)
	return &value
}
