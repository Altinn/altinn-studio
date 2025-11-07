package types

import (
	"testing"
)

func TestPdfRequest_Validate_Valid(t *testing.T) {
	tests := []struct {
		name string
		req  PdfRequest
	}{
		{
			name: "minimal valid request",
			req: PdfRequest{
				URL: "http://example.com",
			},
		},
		{
			name: "valid request with all fields",
			req: PdfRequest{
				URL: "http://example.com",
				Options: PdfOptions{
					Format:              "A4",
					HeaderTemplate:      "<div/>",
					FooterTemplate:      "<div/>",
					DisplayHeaderFooter: true,
					PrintBackground:     true,
					Margin: PdfMargin{
						Top:    "1in",
						Right:  "1in",
						Bottom: "1in",
						Left:   "1in",
					},
				},
				SetJavaScriptEnabled: true,
				WaitFor:              NewWaitForString("#ready"),
				Cookies: []Cookie{
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
			req: PdfRequest{
				URL: "http://example.com",
				Options: PdfOptions{
					Format: "Letter",
				},
			},
		},
		{
			name: "valid waitFor timeout",
			req: PdfRequest{
				URL:     "http://example.com",
				WaitFor: NewWaitForTimeout(5000),
			},
		},
		{
			name: "valid waitFor selector options",
			req: PdfRequest{
				URL: "http://example.com",
				WaitFor: NewWaitForOptions(WaitForOptions{
					Selector: "#element",
				}),
			},
		},
		{
			name: "cookie with Strict sameSite",
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
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
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
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
		req         PdfRequest
		expectedErr string
	}{
		{
			name: "missing URL",
			req: PdfRequest{
				URL: "",
			},
			expectedErr: "url is required",
		},
		{
			name: "invalid format",
			req: PdfRequest{
				URL: "http://example.com",
				Options: PdfOptions{
					Format: "InvalidFormat",
				},
			},
			expectedErr: "invalid format: InvalidFormat (must be one of: [letter legal tabloid ledger a0 a1 a2 a3 a4 a5 a6])",
		},
		{
			name: "waitFor empty string",
			req: PdfRequest{
				URL:     "http://example.com",
				WaitFor: NewWaitForString(""),
			},
			expectedErr: "waitFor string must not be empty",
		},
		{
			name: "waitFor negative timeout",
			req: PdfRequest{
				URL:     "http://example.com",
				WaitFor: NewWaitForTimeout(-100),
			},
			expectedErr: "waitFor timeout must be >= 0",
		},
		{
			name: "waitFor options with empty selector",
			req: PdfRequest{
				URL: "http://example.com",
				WaitFor: NewWaitForOptions(WaitForOptions{
					Selector: "",
				}),
			},
			expectedErr: "waitFor selector must not be empty",
		},
		{
			name: "waitFor options with negative timeout",
			req: PdfRequest{
				URL: "http://example.com",
				WaitFor: func() *WaitFor {
					timeout := int32(-100)
					return NewWaitForOptions(WaitForOptions{
						Selector: "#element",
						Timeout:  &timeout,
					})
				}(),
			},
			expectedErr: "waitFor timeout must be >= 0",
		},
		{
			name: "cookie missing name",
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
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
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
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
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
					{
						Name:     "test",
						Value:    "value",
						SameSite: "Invalid",
					},
				},
			},
			expectedErr: "cookie[0]: sameSite must be 'Strict', 'Lax', or 'None', got 'Invalid'",
		},
		{
			name: "multiple cookies, second one invalid",
			req: PdfRequest{
				URL: "http://example.com",
				Cookies: []Cookie{
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
	for _, format := range ValidFormats {
		t.Run("format_"+format, func(t *testing.T) {
			req := PdfRequest{
				URL: "http://example.com",
				Options: PdfOptions{
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
