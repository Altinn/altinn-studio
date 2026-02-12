package crypto

import (
	"encoding/json"
	"testing"
	"time"

	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/test/utils"
	"github.com/gkampitakis/go-snaps/snaps"
	. "github.com/onsi/gomega"
)

var testSubject = CertSubject{
	Organization:       "Testdepartementet",
	OrganizationalUnit: "ttd",
	CommonName:         "test-app",
}

type certInfo struct {
	CommonName         string `json:"commonName"`
	Organization       string `json:"organization,omitempty"`
	OrganizationalUnit string `json:"organizationalUnit,omitempty"`
	SerialNumber       string `json:"serialNumber"`
	NotBefore          string `json:"notBefore"`
	NotAfter           string `json:"notAfter"`
}

// jwksToSnapshotJSON marshals JWKS to JSON, augmenting each key with decoded cert info.
// Preserves all original JWK fields while adding human-readable x5c_decoded.
func jwksToSnapshotJSON(jwks *Jwks) ([]byte, error) {
	original, err := json.Marshal(jwks)
	if err != nil {
		return nil, err
	}

	var data map[string][]map[string]any
	if err := json.Unmarshal(original, &data); err != nil {
		return nil, err
	}

	for i, key := range jwks.Keys {
		certs := key.Certificates()
		if len(certs) == 0 {
			continue
		}

		decoded := make([]certInfo, 0, len(certs))
		for _, cert := range certs {
			var org, ou string
			if len(cert.Subject.Organization) > 0 {
				org = cert.Subject.Organization[0]
			}
			if len(cert.Subject.OrganizationalUnit) > 0 {
				ou = cert.Subject.OrganizationalUnit[0]
			}
			decoded = append(decoded, certInfo{
				CommonName:         cert.Subject.CommonName,
				Organization:       org,
				OrganizationalUnit: ou,
				SerialNumber:       cert.SerialNumber.String(),
				NotBefore:          cert.NotBefore.Format(time.RFC3339),
				NotAfter:           cert.NotAfter.Format(time.RFC3339),
			})
		}
		data["keys"][i]["x5c_decoded"] = decoded
	}

	return json.Marshal(data)
}

func TestCreateJwks(t *testing.T) {
	g := NewWithT(t)

	// We use fixed inputs and make JWKS generation deterministic
	// to enable snapshot testing. It's important that we have control
	// over the outputs of this package and notice any changes across Go versions and library updates.

	jwks, _, _, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jwks).NotTo(BeNil())

	jsonData, err := jwksToSnapshotJSON(jwks)
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, jsonData)
}

func TestRotateJwks(t *testing.T) {
	g := NewWithT(t)

	jwks, service, clock, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jwks).NotTo(BeNil())

	// Rotate once
	clock.Advance(time.Hour * 24 * 25)
	newJwks, err := service.RotateJwks(testSubject, getNotAfter(clock), jwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJwks).NotTo(BeNil())
	g.Expect(newJwks.Keys).To(HaveLen(2))
	oldCert := newJwks.Keys[1].Certificates()[0]
	newCert := newJwks.Keys[0].Certificates()[0]
	g.Expect(newCert.NotAfter.After(oldCert.NotAfter)).To(BeTrue())

	// Rotate again - previous active key becomes the second key
	clock.Advance(time.Hour * 24 * 25)
	newerJwks, err := service.RotateJwks(testSubject, getNotAfter(clock), newJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newerJwks).NotTo(BeNil())
	g.Expect(newerJwks.Keys).To(HaveLen(2))
	newerCert := newerJwks.Keys[0].Certificates()[0]
	g.Expect(newerJwks.Keys[1].Certificates()[0]).To(BeIdenticalTo(newCert))
	g.Expect(newerCert.NotAfter.After(newCert.NotAfter)).To(BeTrue())

	// Serialize the JWKS for snapshot testing
	newJson, err := jwksToSnapshotJSON(newJwks)
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, newJson)

	newerJson, err := jwksToSnapshotJSON(newerJwks)
	g.Expect(err).NotTo(HaveOccurred())
	snaps.MatchJSON(t, newerJson)
}

func TestFindActiveKey(t *testing.T) {
	g := NewWithT(t)

	jwks, service, clock, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())

	// Single key - should be active
	activeKey, err := FindActiveKey(jwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(activeKey.KeyID()).To(Equal(jwks.Keys[0].KeyID()))

	// After rotation, newest key should be active
	clock.Advance(time.Hour * 24 * 25)
	rotatedJwks, err := service.RotateJwks(testSubject, getNotAfter(clock), jwks)
	g.Expect(err).NotTo(HaveOccurred())

	activeKey, err = FindActiveKey(rotatedJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(activeKey.KeyID()).To(Equal(rotatedJwks.Keys[0].KeyID()))
	g.Expect(activeKey.Certificates()[0].NotAfter.After(rotatedJwks.Keys[1].Certificates()[0].NotAfter)).To(BeTrue())
}

func TestFindActiveKey_NilJwks(t *testing.T) {
	g := NewWithT(t)

	_, err := FindActiveKey(nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("no keys"))
}

func TestFindActiveKey_EmptyJwks(t *testing.T) {
	g := NewWithT(t)

	_, err := FindActiveKey(&Jwks{Keys: []*Jwk{}})
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("no keys"))
}

func TestRotateJwks_NilCurrentJwks(t *testing.T) {
	g := NewWithT(t)

	service, clock := createService()
	_, err := service.RotateJwks(testSubject, getNotAfter(clock), nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("nil"))
}

func TestGenerateCertSerialNumber(t *testing.T) {
	g := NewWithT(t)

	service, _ := createService()

	serial, err := service.generateCertSerialNumber()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(serial.Sign()).ToNot(Equal(-1))
	g.Expect(serial.Bytes()).To(HaveLen(16))

	snaps.MatchSnapshot(t, serial.String())
}

func TestPublicJwksConversion(t *testing.T) {
	g := NewWithT(t)

	jwks, _, _, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jwks).NotTo(BeNil())
	g.Expect(jwks.Keys[0].Certificates()).NotTo(BeNil())

	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(publicJwks).NotTo(BeNil())
	// Certificates is marshalled as "x5c", which Maskinporten doesn't want
	g.Expect(publicJwks.Keys[0].Certificates()).To(BeNil())
	g.Expect(jwks.Keys[0].Certificates()).NotTo(BeNil())

	jsonPayload, err := json.Marshal(publicJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jsonPayload).NotTo(BeNil())
	snaps.MatchJSON(t, jsonPayload)

	jwk := jwks.Keys[0]
	publicJwk := jwk.Public()
	g.Expect(publicJwk.Certificates()).To(BeNil())
	g.Expect(jwk.Certificates()).NotTo(BeNil())

	jsonPayload, err = json.Marshal(publicJwk)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jsonPayload).NotTo(BeNil())
	snaps.MatchJSON(t, jsonPayload)
}

func createService() (*CryptoService, *opclock.FakeClock) {
	clock := opclock.NewFakeClockAt(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	service := NewDefaultService(clock, random)
	return service, clock
}

func getNotAfter(clock opclock.Clock) time.Time {
	return clock.Now().UTC().Add(time.Hour * 24 * 30)
}

func createTestJwks() (*Jwks, *CryptoService, *opclock.FakeClock, error) {
	service, clock := createService()

	jwks, err := service.CreateJwks(testSubject, getNotAfter(clock))
	if err != nil {
		return nil, nil, nil, err
	}

	return jwks, service, clock, nil
}
