package fakes

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
)

type State struct {
	Db   map[string]*Db
	Cfg  *config.Config
	lock sync.Mutex
}

func (s *State) GetAll() map[string][]ClientRecord {
	s.lock.Lock()
	defer s.lock.Unlock()
	res := make(map[string][]ClientRecord)
	for runId, db := range s.Db {
		records := db.Query(func(ocr *ClientRecord) bool {
			return true
		})
		res[runId] = records
	}
	return res
}

func (s *State) GetDb(req *http.Request) *Db {
	runId := req.Header.Get("X-Altinn-Operator-RunId")
	if runId == "" {
		log.Fatalf("Missing X-Altinn-Operator-RunId header in request: %v", req)
	}

	s.lock.Lock()
	defer s.lock.Unlock()
	var db *Db
	if existingDb, ok := s.Db[runId]; !ok {
		db = s.initDb()
		s.Db[runId] = db
	} else {
		db = existingDb
	}

	return db
}

func (s *State) initDb() *Db {
	db := NewDb()
	jwk := crypto.Jwk{}
	if err := json.Unmarshal([]byte(s.Cfg.MaskinportenApi.Jwk), &jwk); err != nil {
		log.Fatalf("couldn't unmarshal JWK: %v", err)
	}
	publicJwk := jwk.Public()

	integrationType := maskinporten.IntegrationTypeMaskinporten
	appType := maskinporten.ApplicationTypeWeb
	tokenEndpointMethod := maskinporten.TokenEndpointAuthMethodPrivateKeyJwt
	orgNo := "991825827"
	jwks := crypto.NewJwks(publicJwk)
	_, err := db.Insert(&maskinporten.AddClientRequest{
		ClientName:  &s.Cfg.MaskinportenApi.ClientId,
		ClientOrgno: &orgNo,
		GrantTypes: []maskinporten.GrantType{
			maskinporten.GrantTypeJwtBearer,
		},
		Scopes:                  []string{s.Cfg.MaskinportenApi.Scope},
		IntegrationType:         &integrationType,
		ApplicationType:         &appType,
		TokenEndpointAuthMethod: &tokenEndpointMethod,
	}, jwks, s.Cfg.MaskinportenApi.ClientId)
	if err != nil {
		log.Fatalf("couldn't insert supplier client: %v", err)
	}

	return db
}

func NewState(cfg *config.Config) *State {
	return &State{
		Db:   make(map[string]*Db),
		Cfg:  cfg,
		lock: sync.Mutex{},
	}
}
