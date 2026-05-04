package fakes

import (
	"encoding/json"
	"log"
	"sync"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
)

type State struct {
	db   *Db
	cfg  *config.Config
	lock sync.Mutex
}

func (s *State) GetAll() []ClientRecord {
	s.lock.Lock()
	defer s.lock.Unlock()
	return s.db.Query(func(ocr *ClientRecord) bool {
		return true
	})
}

func (s *State) Reset() {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.db = s.initDb()
}

func (s *State) GetDb() *Db {
	s.lock.Lock()
	defer s.lock.Unlock()
	return s.db
}

// GetExpectedAudience returns the authority URL with trailing slash.
// Maskinporten requires the audience claim to match the issuer exactly.
func (s *State) GetExpectedAudience() string {
	return maskinporten.EnsureTrailingSlash(s.cfg.MaskinportenApi.AuthorityUrl)
}

func (s *State) initDb() *Db {
	db := NewDb()
	jwk := crypto.Jwk{}
	if err := json.Unmarshal([]byte(s.cfg.MaskinportenApi.Jwk), &jwk); err != nil {
		log.Fatalf("couldn't unmarshal JWK: %v", err)
	}
	publicJwk := jwk.Public()

	integrationType := maskinporten.IntegrationTypeMaskinporten
	appType := maskinporten.ApplicationTypeWeb
	tokenEndpointMethod := maskinporten.TokenEndpointAuthMethodPrivateKeyJwt
	orgNo := "991825827"
	jwks := crypto.NewJwks(publicJwk)
	_, err := db.Insert(&maskinporten.AddClientRequest{
		ClientName:  &s.cfg.MaskinportenApi.ClientId,
		ClientOrgno: &orgNo,
		GrantTypes: []maskinporten.GrantType{
			maskinporten.GrantTypeJwtBearer,
		},
		Scopes:                  []string{s.cfg.MaskinportenApi.Scope},
		IntegrationType:         &integrationType,
		ApplicationType:         &appType,
		TokenEndpointAuthMethod: &tokenEndpointMethod,
	}, jwks, s.cfg.MaskinportenApi.ClientId)
	if err != nil {
		log.Fatalf("couldn't insert supplier client: %v", err)
	}

	return db
}

func NewState(cfg *config.Config) *State {
	s := &State{
		cfg:  cfg,
		lock: sync.Mutex{},
	}
	s.db = s.initDb()
	return s
}
