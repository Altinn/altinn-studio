package pdfa

import "testing"

func TestContainsPDFName(t *testing.T) {
	tests := []struct {
		name    string
		data    string
		pdfName string
		want    bool
	}{
		{
			name:    "space delimiter",
			data:    "<< /Metadata 12 0 R >>",
			pdfName: "Metadata",
			want:    true,
		},
		{
			name:    "newline delimiter",
			data:    "<< /Metadata\n12 0 R >>",
			pdfName: "Metadata",
			want:    true,
		},
		{
			name:    "tab delimiter",
			data:    "<< /OutputIntents\t[12 0 R] >>",
			pdfName: "OutputIntents",
			want:    true,
		},
		{
			name:    "closing bracket delimiter",
			data:    "<< /OutputIntents] >>",
			pdfName: "OutputIntents",
			want:    true,
		},
		{
			name:    "prefix match rejected",
			data:    "<< /MetadataExtra 12 0 R >>",
			pdfName: "Metadata",
			want:    false,
		},
		{
			name:    "missing name",
			data:    "<< /Type /Catalog >>",
			pdfName: "Metadata",
			want:    false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := containsPDFName([]byte(tc.data), tc.pdfName)
			if got != tc.want {
				t.Fatalf("containsPDFName() = %v, want %v", got, tc.want)
			}
		})
	}
}
