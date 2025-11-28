package fakes

import (
	"time"

	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"github.com/go-errors/errors"
	"github.com/google/uuid"
)

var InvalidClientName = errors.Errorf("invalid client ID")
var ClientAlreadyExists = errors.Errorf("client already exists")

const SupplierOrgNo string = "991825827"

type Db struct {
	Clients       []ClientRecord
	ClientIdIndex map[string]int
}

type ClientRecord struct {
	ClientId string
	Client   *maskinporten.ClientResponse
	Jwks     *crypto.Jwks
}

func NewDb() *Db {
	return &Db{
		Clients:       make([]ClientRecord, 0, 64),
		ClientIdIndex: make(map[string]int, 64),
	}
}

func (d *Db) Insert(
	req *maskinporten.AddClientRequest,
	jwks *crypto.Jwks,
	overrideClientId string,
) (*ClientRecord, error) {
	if req.ClientName == nil || *req.ClientName == "" {
		return nil, errors.New(InvalidClientName)
	}
	var clientId string
	if overrideClientId != "" {
		clientId = overrideClientId
	} else {
		clientId = uuid.New().String()
	}
	_, ok := d.ClientIdIndex[clientId]
	if ok {
		return nil, errors.New(ClientAlreadyExists)
	}

	supplierOrg := SupplierOrgNo
	now := time.Now()
	active := true
	jwksUri := ""
	client := &maskinporten.ClientResponse{
		ClientId:                          clientId,
		ClientName:                        req.ClientName,
		LogoUri:                           req.LogoUri,
		Description:                       req.Description,
		Scopes:                            req.Scopes,
		RedirectUris:                      req.RedirectUris,
		PostLogoutRedirectUris:            req.PostLogoutRedirectUris,
		AuthorizationLifetime:             req.AuthorizationLifetime,
		AccessTokenLifetime:               req.AccessTokenLifetime,
		RefreshTokenLifetime:              req.RefreshTokenLifetime,
		RefreshTokenUsage:                 req.RefreshTokenUsage,
		FrontchannelLogoutUri:             req.FrontchannelLogoutUri,
		FrontchannelLogoutSessionRequired: req.FrontchannelLogoutSessionRequired,
		TokenEndpointAuthMethod:           req.TokenEndpointAuthMethod,
		GrantTypes:                        req.GrantTypes,
		IntegrationType:                   req.IntegrationType,
		ApplicationType:                   req.ApplicationType,
		SsoDisabled:                       req.SsoDisabled,
		CodeChallengeMethod:               req.CodeChallengeMethod,
		LastUpdated:                       &now,
		Created:                           &now,
		ClientSecret:                      nil,
		ClientOrgno:                       req.ClientOrgno,
		SupplierOrgno:                     &supplierOrg,
		Active:                            &active,
		JwksUri:                           &jwksUri,
	}

	record := ClientRecord{
		ClientId: clientId,
		Client:   client,
		Jwks:     jwks,
	}

	idx := len(d.Clients)
	d.Clients = append(d.Clients, record)
	d.ClientIdIndex[clientId] = idx
	return &record, nil
}

func (d *Db) UpdateJwks(clientId string, jwks *crypto.Jwks) error {
	i, ok := d.ClientIdIndex[clientId]
	if !ok {
		return errors.New("client not found")
	}

	d.Clients[i].Jwks = jwks
	return nil
}

func (d *Db) Delete(clientId string) bool {
	i, ok := d.ClientIdIndex[clientId]
	if !ok {
		return false
	}

	delete(d.ClientIdIndex, clientId)

	// If we're not deleting the last element, swap with last and update index
	lastIdx := len(d.Clients) - 1
	if i != lastIdx {
		movedClient := d.Clients[lastIdx]
		d.Clients[i] = movedClient
		d.ClientIdIndex[movedClient.ClientId] = i
	}
	d.Clients = d.Clients[:lastIdx]
	return true
}

func (d *Db) Get(clientId string) *ClientRecord {
	i, ok := d.ClientIdIndex[clientId]
	if !ok {
		return nil
	}

	client := &d.Clients[i]
	if client.ClientId != clientId {
		panic("inconsistent state")
	}

	return client
}

func (d *Db) Query(predicate func(*ClientRecord) bool) []ClientRecord {
	result := make([]ClientRecord, 0, 4)
	for i := 0; i < len(d.Clients); i++ {
		client := &d.Clients[i]
		if predicate(client) {
			result = append(result, *client)
		}
	}
	return result
}
