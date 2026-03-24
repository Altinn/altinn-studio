package pdfa

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/pdf3/test/harness"
)

func TestConvertFixturePDFToPDFA(t *testing.T) {
	inputPath := filepath.Join("testdata", "pdfa-conversion-input.pdf")
	input, err := os.ReadFile(inputPath)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}

	converter := NewConverter()
	output, err := converter.Convert(input)
	if err != nil {
		t.Fatalf("Convert() error = %v", err)
	}

	result := harness.ValidatePDFWithVeraPDF(t, output)
	report := harness.NormalizeVeraPDFXML(result.Stdout)
	harness.Snapshot(t, []byte(report), "verapdf", "xml")
}
