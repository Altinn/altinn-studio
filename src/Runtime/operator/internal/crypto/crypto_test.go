package crypto

import (
	"encoding/json"
	"testing"
	"time"

	"altinn.studio/operator/test/utils"
	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
)

const subject string = "subject"
const appId string = "app1"

func TestCreateJwks(t *testing.T) {
	g := NewWithT(t)

	// We use fixed inputs and make JWKS generation deterministic
	// to enable snapshot testing. It's important that we have control
	// over the outputs of this package and notice any changes across Go versions and library updates.

	jwks, _, _, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jwks).NotTo(BeNil())

	jsonData, err := json.Marshal(jwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jsonData).NotTo(BeNil())
	snaps.MatchJSON(t, jsonData)
}

func TestRotateJwks(t *testing.T) {
	g := NewWithT(t)

	jwks, service, clock, err := createTestJwks()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(jwks).NotTo(BeNil())

	// Rotate once
	clock.Advance(time.Hour * 24 * 25)
	newJwks, err := service.RotateJwks(subject, appId, getNotAfter(clock), jwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJwks).NotTo(BeNil())
	g.Expect(newJwks.Keys).To(HaveLen(2))
	oldCert := newJwks.Keys[1].Certificates()[0]
	newCert := newJwks.Keys[0].Certificates()[0]
	g.Expect(newCert.NotAfter.After(oldCert.NotAfter)).To(BeTrue())

	// Rotate again - previous active key becomes the second key
	clock.Advance(time.Hour * 24 * 25)
	newerJwks, err := service.RotateJwks(subject, appId, getNotAfter(clock), newJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newerJwks).NotTo(BeNil())
	g.Expect(newerJwks.Keys).To(HaveLen(2))
	newerCert := newerJwks.Keys[0].Certificates()[0]
	g.Expect(newerJwks.Keys[1].Certificates()[0]).To(BeIdenticalTo(newCert))
	g.Expect(newerCert.NotAfter.After(newCert.NotAfter)).To(BeTrue())

	// Serialize the JWKS for snapshot testing
	newJson, err := json.Marshal(newJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJson).NotTo(BeNil())
	snaps.MatchJSON(t, newJson)

	newerJson, err := json.Marshal(newerJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newerJson).NotTo(BeNil())
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
	rotatedJwks, err := service.RotateJwks(subject, appId, getNotAfter(clock), jwks)
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
	_, err := service.RotateJwks(subject, appId, getNotAfter(clock), nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("nil"))
}

func TestGenerateCertSerialNumber(t *testing.T) {
	g := NewWithT(t)

	service, _ := createService()

	serial, err := service.generateCertSerialNumber()
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(serial.Sign()).ToNot(BeIdenticalTo(-1))
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
	// Certificates is marshalled as "x5c", which Maskinporten doens't want
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

	// TODO: assert that private key fields are not present in JWK
}

func createService() (*CryptoService, *clockwork.FakeClock) {
	clock := clockwork.NewFakeClockAt(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	service := NewDefaultService(clock, random)
	return service, clock
}

func getNotAfter(clock clockwork.Clock) time.Time {
	return clock.Now().UTC().Add(time.Hour * 24 * 30)
}

func createTestJwks() (*Jwks, *CryptoService, *clockwork.FakeClock, error) {
	service, clock := createService()

	jwks, err := service.CreateJwks(subject, appId, getNotAfter(clock))
	if err != nil {
		return nil, nil, nil, err
	}

	return jwks, service, clock, nil
}
