package resource

import (
	"testing"
)

func TestPulledImage_ID(t *testing.T) {
	r := &PulledImage{Ref: "nginx:latest"}
	if got := r.ID(); got != "image:pulled:nginx:latest" {
		t.Errorf("ID() = %q, want %q", got, "image:pulled:nginx:latest")
	}
}

func TestPulledImage_Dependencies(t *testing.T) {
	r := &PulledImage{Ref: "nginx:latest"}
	deps := r.Dependencies()
	if len(deps) != 0 {
		t.Errorf("Dependencies() = %v, want empty", deps)
	}
}

func TestPulledImage_ImageRef(t *testing.T) {
	r := &PulledImage{Ref: "nginx:1.21"}
	if got := r.ImageRef(); got != "nginx:1.21" {
		t.Errorf("ImageRef() = %q, want %q", got, "nginx:1.21")
	}
}

func TestPulledImage_Validate(t *testing.T) {
	tests := []struct {
		image   *PulledImage
		name    string
		wantErr bool
	}{
		{
			name:  "valid image",
			image: &PulledImage{Ref: "nginx:latest"},
		},
		{
			name:    "empty ref",
			image:   &PulledImage{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.image.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestBuiltImage_ID(t *testing.T) {
	l := &BuiltImage{ContextPath: "/path", Tag: "myapp:latest"}
	if got := l.ID(); got != "image:built:myapp:latest" {
		t.Errorf("ID() = %q, want %q", got, "image:built:myapp:latest")
	}
}

func TestBuiltImage_Dependencies(t *testing.T) {
	l := &BuiltImage{ContextPath: "/path", Tag: "myapp:latest"}
	deps := l.Dependencies()
	if len(deps) != 0 {
		t.Errorf("Dependencies() = %v, want empty", deps)
	}
}

func TestBuiltImage_ImageRef(t *testing.T) {
	l := &BuiltImage{ContextPath: "/path", Tag: "myapp:v1.0"}
	if got := l.ImageRef(); got != "myapp:v1.0" {
		t.Errorf("ImageRef() = %q, want %q", got, "myapp:v1.0")
	}
}

func TestBuiltImage_Validate(t *testing.T) {
	tests := []struct {
		image   *BuiltImage
		name    string
		wantErr bool
	}{
		{
			name:  "valid image",
			image: &BuiltImage{ContextPath: "/path", Tag: "myapp:latest"},
		},
		{
			name:    "empty context path",
			image:   &BuiltImage{Tag: "myapp:latest"},
			wantErr: true,
		},
		{
			name:    "empty tag",
			image:   &BuiltImage{ContextPath: "/path"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.image.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestBuiltImage_Dockerfile(t *testing.T) {
	l := &BuiltImage{
		Dockerfile: "custom.Dockerfile",
	}
	if l.Dockerfile != "custom.Dockerfile" {
		t.Errorf("Dockerfile = %q, want %q", l.Dockerfile, "custom.Dockerfile")
	}
}

func TestPublishedImage_ID(t *testing.T) {
	p := &PublishedImage{Ref: "localhost:5001/myapp:latest", Source: RefID("image:built:myapp:latest")}
	if got := p.ID(); got != "image:published:localhost:5001/myapp:latest" {
		t.Errorf("ID() = %q, want %q", got, "image:published:localhost:5001/myapp:latest")
	}
}

func TestPublishedImage_Dependencies(t *testing.T) {
	source := &BuiltImage{ContextPath: "/path", Tag: "myapp:latest"}
	p := &PublishedImage{Ref: "localhost:5001/myapp:latest", Source: Ref(source)}
	deps := p.Dependencies()
	if len(deps) != 1 || deps[0].ID() != source.ID() {
		t.Errorf("Dependencies() = %v, want source dependency", deps)
	}
}

func TestPublishedImage_ImageRef(t *testing.T) {
	p := &PublishedImage{Ref: "localhost:5001/myapp:latest", Source: RefID("image:built:myapp:latest")}
	if got := p.ImageRef(); got != "localhost:5001/myapp:latest" {
		t.Errorf("ImageRef() = %q, want %q", got, "localhost:5001/myapp:latest")
	}
}

func TestPublishedImage_Validate(t *testing.T) {
	tests := []struct {
		image   *PublishedImage
		name    string
		wantErr bool
	}{
		{
			name:  "valid image",
			image: &PublishedImage{Ref: "localhost:5001/myapp:latest", Source: RefID("image:built:myapp:latest")},
		},
		{
			name:    "empty ref",
			image:   &PublishedImage{Source: RefID("image:built:myapp:latest")},
			wantErr: true,
		},
		{
			name:    "empty source",
			image:   &PublishedImage{Ref: "localhost:5001/myapp:latest"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.image.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test that PulledImage implements required interfaces.
func TestPulledImage_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*PulledImage)(nil)
	var _ ImageResource = (*PulledImage)(nil)
	var _ Validator = (*PulledImage)(nil)
}

// Test that BuiltImage implements required interfaces.
func TestBuiltImage_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*BuiltImage)(nil)
	var _ ImageResource = (*BuiltImage)(nil)
	var _ Validator = (*BuiltImage)(nil)
}

// Test that PublishedImage implements required interfaces.
func TestPublishedImage_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*PublishedImage)(nil)
	var _ ImageResource = (*PublishedImage)(nil)
	var _ Validator = (*PublishedImage)(nil)
}
