package types_test

import (
	"testing"

	"altinn.studio/pdf3/internal/types"
)

func TestPdfRequest_Validate_Valid(t *testing.T) {
	tests := []struct {
		name string
		req  types.PdfRequest
	}{
		{
			name: "minimal valid request",
			req: types.PdfRequest{
				URL: "http://example.com",
			},
		},
		{
			name: "valid request with all fields",
			req: types.PdfRequest{
				URL: "http://example.com",
				Options: types.PdfOptions{
					Format:              "A4",
					HeaderTemplate:      "<div/>",
					FooterTemplate:      "<div/>",
					DisplayHeaderFooter: true,
					PrintBackground:     true,
					Margin: types.PdfMargin{
						Top:    "1in",
						Right:  "1in",
						Bottom: "1in",
						Left:   "1in",
					},
				},
				SetJavaScriptEnabled: true,
				WaitFor:              types.NewWaitForString("#ready"),
				Cookies: []types.Cookie{
					{
						Name:     "test",
						Value:    "value",
						Domain:   "example.com",
						SameSite: "Lax",
					},
				},
			},
		},
		{
			name: "valid format Letter",
			req: types.PdfRequest{
				URL: "http://example.com",
				Options: types.PdfOptions{
					Format: "Letter",
				},
			},
		},
		{
			name: "valid waitFor timeout",
			req: types.PdfRequest{
				URL:     "http://example.com",
				WaitFor: types.NewWaitForTimeout(5000),
			},
		},
		{
			name: "valid waitFor selector options",
			req: types.PdfRequest{
				URL: "http://example.com",
				WaitFor: types.NewWaitForOptions(types.WaitForOptions{
					Selector: "#element",
				}),
			},
		},
		{
			name: "cookie with Strict sameSite",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:     "cookie",
						Value:    "value",
						SameSite: "Strict",
					},
				},
			},
		},
		{
			name: "cookie without sameSite",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:  "cookie",
						Value: "value",
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if err != nil {
				t.Errorf("Validate() should pass for valid request, got error: %v", err)
			}
		})
	}
}

func TestPdfRequest_Validate_Invalid(t *testing.T) {
	tests := []struct {
		name        string
		req         types.PdfRequest
		expectedErr string
	}{
		{
			name: "missing URL",
			req: types.PdfRequest{
				URL: "",
			},
			expectedErr: "url is required",
		},
		{
			name: "invalid format",
			req: types.PdfRequest{
				URL: "http://example.com",
				Options: types.PdfOptions{
					Format: "InvalidFormat",
				},
			},
			expectedErr: "invalid format: InvalidFormat",
		},
		{
			name: "waitFor empty string",
			req: types.PdfRequest{
				URL:     "http://example.com",
				WaitFor: types.NewWaitForString(""),
			},
			expectedErr: "waitFor string must not be empty",
		},
		{
			name: "waitFor negative timeout",
			req: types.PdfRequest{
				URL:     "http://example.com",
				WaitFor: types.NewWaitForTimeout(-100),
			},
			expectedErr: "waitFor timeout must be >= 0",
		},
		{
			name: "waitFor options with empty selector",
			req: types.PdfRequest{
				URL: "http://example.com",
				WaitFor: types.NewWaitForOptions(types.WaitForOptions{
					Selector: "",
				}),
			},
			expectedErr: "waitFor selector must not be empty",
		},
		{
			name: "waitFor options with negative timeout",
			req: types.PdfRequest{
				URL: "http://example.com",
				WaitFor: func() *types.WaitFor {
					timeout := int32(-100)
					return types.NewWaitForOptions(types.WaitForOptions{
						Selector: "#element",
						Timeout:  &timeout,
					})
				}(),
			},
			expectedErr: "waitFor timeout must be >= 0",
		},
		{
			name: "cookie missing name",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:  "",
						Value: "value",
					},
				},
			},
			expectedErr: "cookie[0]: name is required",
		},
		{
			name: "cookie missing value",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:  "test",
						Value: "",
					},
				},
			},
			expectedErr: "cookie[0]: value is required",
		},
		{
			name: "cookie invalid sameSite",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:     "test",
						Value:    "value",
						SameSite: "Invalid",
					},
				},
			},
			expectedErr: "cookie[0]: sameSite must be 'Strict' or 'Lax'",
		},
		{
			name: "multiple cookies, second one invalid",
			req: types.PdfRequest{
				URL: "http://example.com",
				Cookies: []types.Cookie{
					{
						Name:  "valid",
						Value: "value",
					},
					{
						Name:  "",
						Value: "value",
					},
				},
			},
			expectedErr: "cookie[1]: name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if err == nil {
				t.Errorf("Validate() should fail for invalid request, but got no error")
				return
			}
			if err.Error() != tt.expectedErr {
				t.Errorf("Validate() error message = %q, want %q", err.Error(), tt.expectedErr)
			}
		})
	}
}

func TestPdfRequest_Validate_AllFormats(t *testing.T) {
	for _, format := range types.ValidFormats {
		t.Run("format_"+format, func(t *testing.T) {
			req := types.PdfRequest{
				URL: "http://example.com",
				Options: types.PdfOptions{
					Format: format,
				},
			}
			err := req.Validate()
			if err != nil {
				t.Errorf("Validate() should pass for format %s, got error: %v", format, err)
			}
		})
	}
}
