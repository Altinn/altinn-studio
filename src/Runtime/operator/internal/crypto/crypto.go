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
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/go-errors/errors"
	"github.com/go-jose/go-jose/v4"
	"github.com/google/uuid"
	"github.com/jonboulle/clockwork"
)

const DefaultX509SignatureAlgo x509.SignatureAlgorithm = x509.SHA512WithRSA
const DefaultKeySizeBits int = 4096

type CryptoService struct {
	ctx               *operatorcontext.Context
	clock             clockwork.Clock
	random            io.Reader
	signatureAlgo     jose.SignatureAlgorithm
	x509SignatureAlgo x509.SignatureAlgorithm
	keySizeBits       int
}

func NewService(
	ctx *operatorcontext.Context,
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
		ctx:               ctx,
		clock:             clock,
		random:            random,
		signatureAlgo:     signatureAlgo,
		x509SignatureAlgo: x509SignatureAlgo,
		keySizeBits:       keySizeBits,
	}
}

func NewDefaultService(
	ctx *operatorcontext.Context,
	clock clockwork.Clock,
	random io.Reader,
) *CryptoService {
	return NewService(ctx, clock, random, DefaultX509SignatureAlgo, DefaultKeySizeBits)
}

// Creates a JWKS
// Constructs the JWKS from the whole RSA private/public key pair
// Uses SHA512 with RSA, 4096 bits for RSA
func (s *CryptoService) CreateJwks(certCommonName string, notAfter time.Time) (*Jwks, error) {
	cert, rsaKey, err := s.createCert(certCommonName, notAfter)
	if err != nil {
		return nil, errors.WrapPrefix(err, "error creating JWKS cert", 0)
	}

	return s.createJWKS(cert, rsaKey, 0)
}

func (s *CryptoService) createJWKS(
	cert *x509.Certificate,
	rsaKey *rsa.PrivateKey,
	index int,
) (*Jwks, error) {
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
	certCommonName string,
	notAfter time.Time,
) (*x509.Certificate, *rsa.PrivateKey, error) {
	rsaKey, err := rsa.GenerateKey(s.random, s.keySizeBits)
	if err != nil {
		return nil, nil, errors.WrapPrefix(err, "error generating RSA key for jwks", 0)
	}

	serial, err := s.generateCertSerialNumber()
	if err != nil {
		return nil, nil, errors.WrapPrefix(err, "error generating serial number for jwks", 0)
	}

	now := s.clock.Now().UTC()
	if now.Equal(notAfter) || now.After(notAfter) {
		return nil, nil, errors.Errorf("notAfter (%s) must be after current time (%s)", notAfter, now)
	}

	certTemplate := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			Organization: []string{s.ctx.ServiceOwnerId},
			CommonName:   certCommonName,
		},
		Issuer:                s.getIssuer(),
		NotBefore:             now,
		NotAfter:              notAfter,
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		SignatureAlgorithm:    s.x509SignatureAlgo,
	}

	derBytes, err := x509.CreateCertificate(s.random, &certTemplate, &certTemplate, &rsaKey.PublicKey, rsaKey)
	if err != nil {
		return nil, nil, errors.WrapPrefix(err, "error generating cert for jwks", 0)
	}
	cert, err := x509.ParseCertificate(derBytes)
	if err != nil {
		return nil, nil, errors.WrapPrefix(err, "error parsing generated cert for jwks", 0)
	}

	return cert, rsaKey, nil
}

func (s *CryptoService) RotateIfNeeded(
	certCommonName string,
	notAfter time.Time,
	currentJwks *Jwks,
) (*Jwks, error) {
	if currentJwks == nil {
		return nil, errors.New("cant rotate cert for JWKS, JWKS was null")
	}

	var activeKey *Jwk

	for i := 0; i < len(currentJwks.Keys); i++ {
		if activeKey == nil {
			activeKey = currentJwks.Keys[i]
			certificateCount := len(activeKey.Certificates())
			if certificateCount != 1 {
				return nil, errors.Errorf(
					"unexpected number of certificates for key '%s': '%d'",
					activeKey.KeyID(),
					certificateCount,
				)
			}

		} else {
			key := currentJwks.Keys[i]

			certificates := key.Certificates()
			certificateCount := len(certificates)
			if certificateCount != 1 {
				return nil, errors.Errorf("unexpected number of certificates for key '%s': '%d'", key.KeyID(), certificateCount)
			}

			cert := certificates[0]
			activeCert := activeKey.Certificates()[0]

			if cert.NotAfter.After(activeCert.NotAfter) {
				activeKey = key
			}
		}
	}

	rotationThreshold := s.clock.Now().UTC().Add(time.Hour * 24 * 7)
	if activeKey.Certificates()[0].NotAfter.After(rotationThreshold) {
		return nil, nil
	} else {
		keyParts := strings.Split(activeKey.KeyID(), ".")
		currentIndexStr := keyParts[len(keyParts)-1]
		currentIndex, err := strconv.Atoi(currentIndexStr)
		if err != nil {
			return nil, errors.Errorf("invalid key format: %s", activeKey.KeyID())
		}
		cert, rsaKey, err := s.createCert(certCommonName, notAfter)
		if err != nil {
			return nil, errors.WrapPrefix(err, "error creating JWKS cert", 0)
		}

		newJwks, err := s.createJWKS(cert, rsaKey, currentIndex+1)
		if err != nil {
			return nil, err
		}
		newJwks.Keys = append(newJwks.Keys, activeKey) // TODO: verify that app-lib reads latest key
		return newJwks, nil
	}
}

func (s *CryptoService) getIssuer() pkix.Name {
	return pkix.Name{
		Organization: []string{"Digdir"},
		CommonName:   "Altinn Operator",
	}
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
