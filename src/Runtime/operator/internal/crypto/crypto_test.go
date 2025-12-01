package crypto

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/test/utils"
	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
)

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

	// We have only just created the cert
	clock.Advance(time.Hour * 1)
	newJwks, err := service.RotateIfNeeded(appId, getNotAfter(clock), jwks, false)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJwks).To(BeNil())

	// This should be before the rotation threshold
	clock.Advance(time.Hour * 24 * 18)
	newJwks, err = service.RotateIfNeeded(appId, getNotAfter(clock), jwks, false)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJwks).To(BeNil())

	// Now we've advanced past the treshold and should have rotated
	clock.Advance(time.Hour * 24 * 7)
	newJwks, err = service.RotateIfNeeded(appId, getNotAfter(clock), jwks, false)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJwks).NotTo(BeNil())
	g.Expect(newJwks.Keys).To(HaveLen(2))
	oldCert := newJwks.Keys[1].Certificates()[0]
	newCert := newJwks.Keys[0].Certificates()[0]
	g.Expect(newCert.NotAfter.After(oldCert.NotAfter)).To(BeTrue())

	// We should rotate again
	clock.Advance(time.Hour * 24 * 25)
	newerJwks, err := service.RotateIfNeeded(appId, getNotAfter(clock), newJwks, false)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newerJwks).NotTo(BeNil())
	g.Expect(newerJwks.Keys).To(HaveLen(2))
	newerCert := newerJwks.Keys[0].Certificates()[0]
	g.Expect(newerJwks.Keys[1].Certificates()[0]).To(BeIdenticalTo(newCert))
	g.Expect(newerCert.NotAfter.After(newCert.NotAfter)).To(BeTrue())

	// Serialize the new JWKS
	newJson, err := json.Marshal(newJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newJson).NotTo(BeNil())
	snaps.MatchJSON(t, newJson)

	newerJson, err := json.Marshal(newerJwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(newerJson).NotTo(BeNil())
	snaps.MatchJSON(t, newerJson)
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
	opCtx := operatorcontext.DiscoverOrDie(context.Background(), operatorcontext.EnvironmentLocal, nil)
	clock := clockwork.NewFakeClockAt(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	service := NewDefaultService(opCtx, clock, random)
	return service, clock
}

func getNotAfter(clock clockwork.Clock) time.Time {
	return clock.Now().UTC().Add(time.Hour * 24 * 30)
}

func createTestJwks() (*Jwks, *CryptoService, *clockwork.FakeClock, error) {
	service, clock := createService()

	jwks, err := service.CreateJwks(appId, getNotAfter(clock))
	if err != nil {
		return nil, nil, nil, err
	}

	return jwks, service, clock, nil
}
