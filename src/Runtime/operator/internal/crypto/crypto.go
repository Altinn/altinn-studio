package crypto

import (
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"io"
	"math/big"
	"strconv"
	"strings"
	"time"

	"altinn.studio/operator/internal/assert"
	"github.com/go-jose/go-jose/v4"
	"github.com/google/uuid"
	"github.com/jonboulle/clockwork"
)

const DefaultX509SignatureAlgo x509.SignatureAlgorithm = x509.SHA512WithRSA
const DefaultKeySizeBits int = 4096

type CryptoService struct {
	clock             clockwork.Clock
	random            io.Reader
	signatureAlgo     jose.SignatureAlgorithm
	x509SignatureAlgo x509.SignatureAlgorithm
	keySizeBits       int
}

func NewService(
	clock clockwork.Clock,
	random io.Reader,
	x509SignatureAlgo x509.SignatureAlgorithm,
	keySizeBits int,
) *CryptoService {
	assert.That(x509SignatureAlgo != x509.UnknownSignatureAlgorithm, "x509 signature algorithm must be provided")
	assert.That(keySizeBits > 0, "key size in bits must be positive")

	signatureAlgo, ok := signatureAlgorithmFromX509(x509SignatureAlgo)
	assert.That(ok, "unsupported x509 signature algorithm", "algorithm", x509SignatureAlgo)

	return &CryptoService{
		clock:             clock,
		random:            random,
		signatureAlgo:     signatureAlgo,
		x509SignatureAlgo: x509SignatureAlgo,
		keySizeBits:       keySizeBits,
	}
}

func NewDefaultService(
	clock clockwork.Clock,
	random io.Reader,
) *CryptoService {
	return NewService(clock, random, DefaultX509SignatureAlgo, DefaultKeySizeBits)
}

// CertSubject contains the fields for the certificate subject
type CertSubject struct {
	Organization       string // e.g., "Testdepartementet"
	OrganizationalUnit string // e.g., "ttd"
	CommonName         string // e.g., "my-app"
}

// Creates a JWKS
// Constructs the JWKS from the whole RSA private/public key pair
// Uses SHA512 with RSA, 4096 bits for RSA
func (s *CryptoService) CreateJwks(subject CertSubject, notAfter time.Time) (*Jwks, error) {
	cert, rsaKey, err := s.createCert(subject, notAfter)
	if err != nil {
		return nil, fmt.Errorf("error creating JWKS cert: %w", err)
	}

	return s.createJWKS(cert, rsaKey, 0)
}

func (s *CryptoService) createJWKS(
	cert *x509.Certificate,
	rsaKey *rsa.PrivateKey,
	index int,
) (*Jwks, error) {
	// NOTE: ID being constructed from UUID is being relied upon
	// in logic elsewhere (for example in client_state.go, where we check for JWKS equality based on KeyID)
	id, err := uuid.NewRandomFromReader(s.random)
	if err != nil {
		return nil, err
	}
	keyId := fmt.Sprintf("%s.%d", id.String(), index)
	return NewJwks(NewJwk([]*x509.Certificate{cert}, rsaKey, keyId, "sig", string(s.signatureAlgo))), nil
}

func (s *CryptoService) generateCertSerialNumber() (*big.Int, error) {
	// x509 serial number is a 20 bytes unsigned integer
	// source: https://www.rfc-editor.org/rfc/rfc3280#section-4.1.2.2
	// 16 bytes (128 bits) should be enough to be unique - UUID v4 (random) uses 122 bits
	serial := new(big.Int)
	serialBytes := [16]byte{}
	n, err := io.ReadFull(s.random, serialBytes[:])
	if err != nil {
		return nil, err
	}
	assert.That(n == len(serialBytes), "Read should always fill slice when err is nil")
	serial.SetBytes(serialBytes[:])
	assert.That(serial.Sign() != -1, "SetBytes should treat bytes as an unsigned integer")
	return serial, nil
}

func (s *CryptoService) createCert(
	subject CertSubject,
	notAfter time.Time,
) (*x509.Certificate, *rsa.PrivateKey, error) {
	rsaKey, err := rsa.GenerateKey(s.random, s.keySizeBits)
	if err != nil {
		return nil, nil, fmt.Errorf("error generating RSA key for jwks: %w", err)
	}

	serial, err := s.generateCertSerialNumber()
	if err != nil {
		return nil, nil, fmt.Errorf("error generating serial number for jwks: %w", err)
	}

	now := s.clock.Now().UTC()
	if now.Equal(notAfter) || now.After(notAfter) {
		return nil, nil, fmt.Errorf("notAfter (%s) must be after current time (%s)", notAfter, now)
	}

	pkixName := pkix.Name{
		CommonName: subject.CommonName,
	}
	if subject.Organization != "" {
		pkixName.Organization = []string{subject.Organization}
	}
	if subject.OrganizationalUnit != "" {
		pkixName.OrganizationalUnit = []string{subject.OrganizationalUnit}
	}

	certTemplate := x509.Certificate{
		SerialNumber:          serial,
		Subject:               pkixName,
		NotBefore:             now,
		NotAfter:              notAfter,
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		SignatureAlgorithm:    s.x509SignatureAlgo,
	}

	derBytes, err := x509.CreateCertificate(s.random, &certTemplate, &certTemplate, &rsaKey.PublicKey, rsaKey)
	if err != nil {
		return nil, nil, fmt.Errorf("error generating cert for jwks: %w", err)
	}
	cert, err := x509.ParseCertificate(derBytes)
	if err != nil {
		return nil, nil, fmt.Errorf("error parsing generated cert for jwks: %w", err)
	}

	return cert, rsaKey, nil
}

// RotateJwks creates a new JWKS with a fresh key, retaining the previous active key.
// The caller is responsible for deciding when rotation is needed.
// Returns the new JWKS with at most 2 keys (newest + previous).
func (s *CryptoService) RotateJwks(
	subject CertSubject,
	notAfter time.Time,
	currentJwks *Jwks,
) (*Jwks, error) {
	if currentJwks == nil {
		return nil, fmt.Errorf("cant rotate JWKS: currentJwks was nil")
	}

	activeKey, err := FindActiveKey(currentJwks)
	if err != nil {
		return nil, err
	}

	keyParts := strings.Split(activeKey.KeyID(), ".")
	currentIndexStr := keyParts[len(keyParts)-1]
	currentIndex, err := strconv.Atoi(currentIndexStr)
	if err != nil {
		return nil, fmt.Errorf("invalid key format: %s", activeKey.KeyID())
	}

	cert, rsaKey, err := s.createCert(subject, notAfter)
	if err != nil {
		return nil, fmt.Errorf("error creating JWKS cert: %w", err)
	}

	newJwks, err := s.createJWKS(cert, rsaKey, currentIndex+1)
	if err != nil {
		return nil, err
	}
	newJwks.Keys = append(newJwks.Keys, activeKey)
	// Keep max 2 keys (newest + previous) to avoid unbounded growth
	if len(newJwks.Keys) > 2 {
		newJwks.Keys = newJwks.Keys[:2]
	}
	return newJwks, nil
}

// FindActiveKey returns the key with the latest NotAfter certificate from the JWKS.
// Each key must have exactly one certificate.
func FindActiveKey(jwks *Jwks) (*Jwk, error) {
	if jwks == nil || len(jwks.Keys) == 0 {
		return nil, fmt.Errorf("JWKS has no keys")
	}

	var activeKey *Jwk
	for i := 0; i < len(jwks.Keys); i++ {
		key := jwks.Keys[i]
		certificates := key.Certificates()
		if len(certificates) != 1 {
			return nil, fmt.Errorf("unexpected number of certificates for key '%s': %d", key.KeyID(), len(certificates))
		}

		if activeKey == nil {
			activeKey = key
		} else if certificates[0].NotAfter.After(activeKey.Certificates()[0].NotAfter) {
			activeKey = key
		}
	}
	return activeKey, nil
}

func SignatureAlgorithmNameFromX509(algo x509.SignatureAlgorithm) (string, bool) {
	name, ok := signatureAlgorithmFromX509(algo)
	if !ok {
		return "", false
	}
	return string(name), true
}

func DefaultSignatureAlgorithmName() string {
	name, ok := SignatureAlgorithmNameFromX509(DefaultX509SignatureAlgo)
	assert.That(ok, "default x509 signature algorithm must map to a JOSE signature algorithm")
	return name
}

func signatureAlgorithmFromX509(algo x509.SignatureAlgorithm) (jose.SignatureAlgorithm, bool) {
	switch algo {
	case x509.SHA256WithRSA:
		return jose.RS256, true
	case x509.SHA384WithRSA:
		return jose.RS384, true
	case x509.SHA512WithRSA:
		return jose.RS512, true
	case x509.SHA256WithRSAPSS:
		return jose.PS256, true
	case x509.SHA384WithRSAPSS:
		return jose.PS384, true
	case x509.SHA512WithRSAPSS:
		return jose.PS512, true
	default:
		return "", false
	}
}
