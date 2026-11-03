package harness

import (
	"archive/tar"
	"bytes"
	"testing"
)

func TestApplyLayer(t *testing.T) {
	const target = "etc/ssl/certs/ca-certificates.crt"
	lower := imageFile{data: []byte("lower"), present: true, regular: true}
	tests := []struct {
		name  string
		layer []tar.Header
		want  imageFile
	}{
		{"untouched", []tar.Header{{Name: "etc/passwd"}}, lower},
		{"replaced", []tar.Header{{Name: "./" + target, Size: 5}}, imageFile{[]byte("upper"), true, true}},
		{"not regular", []tar.Header{{Name: target, Typeflag: tar.TypeSymlink}}, imageFile{present: true}},
		{"whiteout", []tar.Header{{Name: "etc/ssl/certs/.wh.ca-certificates.crt"}}, imageFile{}},
		{"directory whiteout", []tar.Header{{Name: "etc/.wh.ssl"}}, imageFile{}},
		{"sibling whiteout", []tar.Header{{Name: "etc/.wh.ss"}}, lower},
		{"opaque directory", []tar.Header{{Name: "etc/ssl/.wh..wh..opq"}}, imageFile{}},
		{
			"recreated in opaque directory",
			[]tar.Header{{Name: "etc/.wh..wh..opq"}, {Name: target, Size: 5}},
			imageFile{[]byte("upper"), true, true},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			files := tar.NewWriter(&buf)
			for _, header := range tt.layer {
				if header.Typeflag == 0 {
					header.Typeflag = tar.TypeReg
				}
				if err := files.WriteHeader(&header); err != nil {
					t.Fatalf("WriteHeader() error = %v", err)
				}
				if _, err := files.Write([]byte("upper")[:header.Size]); err != nil {
					t.Fatalf("Write() error = %v", err)
				}
			}
			if err := files.Close(); err != nil {
				t.Fatalf("Close() error = %v", err)
			}

			got, err := applyLayer(lower, tar.NewReader(&buf), target)
			if err != nil {
				t.Fatalf("applyLayer() error = %v", err)
			}
			if !bytes.Equal(got.data, tt.want.data) || got.present != tt.want.present ||
				got.regular != tt.want.regular {
				t.Errorf("applyLayer() = %+v, want %+v", got, tt.want)
			}
		})
	}
}
