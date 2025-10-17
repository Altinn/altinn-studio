package harness

import (
	"bytes"
	"testing"
)

// IsPDF checks if the given bytes represent a valid PDF file
func IsPDF(data []byte) bool {
	// PDF files start with %PDF-
	if len(data) < 5 {
		return false
	}
	return bytes.HasPrefix(data, []byte("%PDF-"))
}

func MakePdfDeterministic(t *testing.T, pdf []byte) []byte {
	// These are the non-deterministic parts of a PDF:
	//
	// /CreationDate (D:20251010054937+00'00')
	// /ModDate (D:20251010054937+00'00')>>
	//
	date := []byte("D:20251010054937+00'00'")

	result := bytes.Clone(pdf)

	makeDateDeterministic := func(t *testing.T, dest []byte, src []byte, prefix []byte, date []byte) {
		index := bytes.Index(src, prefix)
		if index != -1 {
			sliced := src[index:]
			startParens := index + bytes.Index(sliced, []byte{'('})
			if startParens == -1 {
				t.Errorf("Couldn't parse creation date value")
				return
			}
			endParens := index + bytes.Index(sliced, []byte{')'})
			if endParens == -1 {
				t.Errorf("Couldn't parse creation date value")
				return
			}
			if endParens-(startParens+1) != len(date) {
				t.Errorf("Couldn't fit deterministic date in /CreationDate field")
				return
			}

			copy(dest[startParens:], date)
		}
	}

	makeDateDeterministic(t, result, pdf, []byte("/CreationDate"), date)
	makeDateDeterministic(t, result, pdf, []byte("/ModDate"), date)

	return result
}
