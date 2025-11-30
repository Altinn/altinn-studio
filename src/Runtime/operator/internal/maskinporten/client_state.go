package maskinporten

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/jonboulle/clockwork"
	corev1 "k8s.io/api/core/v1"
)

const JsonFileName = "maskinporten-settings.json"

// Condition types for MaskinportenClient status
const (
	ConditionTypeReady            = "Ready"
	ConditionTypeClientRegistered = "ClientRegistered"
	ConditionTypeSecretSynced     = "SecretSynced"
	ConditionTypeDeleting         = "Deleting"
)

// MissingSecretError is returned when the app secret doesn't exist yet
// This is a recoverable error that should be handled gracefully
type MissingSecretError struct {
	AppName string
}

func (e *MissingSecretError) Error() string {
	return fmt.Sprintf("app secret not found for MaskinportenClient: %s", e.AppName)
}

// ClientState reprsents a snapshot of the state of a Maskinporten client
// across sources such as
//   - MaskinportenClient k8s CRD
//   - Maskinporten Self-Service API
//   - Altinn app k8s secret
//
// The struct is organized to reflect this and the responsbility
// of this model is to communicate a path forward in terms of reconciliation/desired state.
// You can think of this struct as a state machine without explicit states or state transitions.
// The `reconcile` function just emits a set of commands that will take the current state -> desired state.
// It does so while being pure to be easily unit-testable.
// The members of the are partially references into structs owned by other components
// in this package (such as `OidcClientRequest` which reflects the contract owned by `httpApiClient`).
// This is OK since all parts of the maskinporten package are likely to change together.
type ClientState struct {
	AppId string

	// Fields set in the MaskinportenClient CRD - we only manage the status
	Crd *resourcesv1alpha1.MaskinportenClient
	// State kept in the Maskinporten API
	Api *ApiState
	// The "output" of this operatator, serialized to field
	Secret SecretState
}

type ApiState struct {
	ClientId string
	Req      *AddClientRequest
	Jwks     *crypto.Jwks
}

type SecretState struct {
	Content  *SecretStateContent
	Manifest *corev1.Secret
}

type SecretStateContent struct {
	ClientId  string       `json:"clientId"`
	Authority string       `json:"authority"`
	Jwks      *crypto.Jwks `json:"jwks"`
	Jwk       *crypto.Jwk  `json:"jwk"`
}

func (c *SecretStateContent) SerializeTo(secret *corev1.Secret) error {
	if secret == nil {
		return fmt.Errorf("cant serialize to nil secret")
	}
	data, err := json.Marshal(c)
	if err != nil {
		return err
	}
	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}

	secret.Data[JsonFileName] = data
	return nil
}

func DeleteSecretStateContent(secret *corev1.Secret) {
	delete(secret.Data, JsonFileName)
}

func DeserializeSecretStateContent(secret *corev1.Secret) (*SecretStateContent, error) {
	if secret == nil {
		return nil, fmt.Errorf("cant deserialize from nil secret")
	}
	if secret.Data == nil {
		return nil, nil
	}
	data, ok := secret.Data[JsonFileName]
	if !ok {
		return nil, nil
	}

	content := &SecretStateContent{}
	err := json.Unmarshal(data, content)
	if err != nil {
		return nil, err
	}

	return content, nil
}

func NewClientState(
	crd *resourcesv1alpha1.MaskinportenClient,
	api *ClientResponse,
	apiJwks *crypto.Jwks,
	secret *corev1.Secret,
	secretStateContent *SecretStateContent,
) (*ClientState, error) {
	if crd == nil {
		return nil, fmt.Errorf("tried to hydrate client state without CRD")
	}
	// Secret may be nil if the app hasn't been deployed yet or secret was deleted
	// This is a recoverable condition - we'll wait for the secret to be created
	if secret == nil {
		return nil, &MissingSecretError{AppName: crd.Name}
	}
	if api == nil && apiJwks != nil {
		return nil, fmt.Errorf("unexpected condition, api resource was not created but api JWKS was")
	}

	nameSplit := strings.Split(crd.Name, "-")
	if len(nameSplit) < 2 {
		return nil, fmt.Errorf("unexpected name format for MaskinportenClient resource: %s", crd.Name)
	}
	appId := nameSplit[1]

	state := &ClientState{
		AppId: appId,

		Crd: crd,
		Api: nil,
		Secret: SecretState{
			Manifest: secret,
			Content:  secretStateContent,
		},
	}

	if api != nil {
		if api.ClientId == "" {
			return nil, fmt.Errorf("received empty ClientId when building client state")
		}
		state.Api = &ApiState{
			ClientId: api.ClientId,
			Req:      MapClientResponseToAddRequest(api),
			Jwks:     apiJwks,
		}
	}

	return state, nil
}

func (s *ClientState) getNotAfter(clock clockwork.Clock) time.Time {
	return clock.Now().UTC().Add(time.Hour * 24 * 30)
}

func (s *ClientState) Reconcile(
	context *operatorcontext.Context,
	config *config.Config,
	crypto *crypto.CryptoService,
	clock clockwork.Clock,
) (CommandList, error) {
	// ClientState keeps the state of Maskinporten-related config
	// related to a specific app. This function evalues current state,
	// computes desired state based on state, and returns
	// a set of commands for the controller to apply (call Maskinporten API, etc).
	// This function should be pure and easily testable.
	// For any change command that is output, status of the CRD must also be updated
	// TODO: consider producing k8s events as well? From observability pov
	//
	// Order of operations
	// 1. CRD is created
	// 2. Create initial JWKS
	// 3. Create client in Maskinporten API
	// 4. Create client JWKS in Maskinporten API
	// 5. Update secret contents with output

	// Furthermore, changes may occur during the lifecycle of the resources
	// n. Scopes change - users make changes in Studio interface
	//   n.1. Update client in Maskinporten API
	// n. Authority changes - should be rare or even unlikely
	//   n.1. Update secret contents
	// n. Cert used in JWKS expires - will happen regularly
	//   n.1. Generate next cert and JWK
	//   n.2. Update secret contents
	// n. Deletion timestamp is set on CRD (it's deleted)
	//   n.1. Delete secret contents
	//   n.2. Delete client in API

	// Other events not currently being considered
	// n. Someone deletes/modifies secret/contents by accident
	// n. Someone deletes/modifies Maskinporten API client definition by accident (it is not locked)
	// n. ???

	commands := make([]Command, 0, 4)
	if s.Crd.DeletionTimestamp != nil {
		// The CRD is being deleted, which means we need to cleanup all associated resources
		if s.Secret.Content != nil {
			commands = append(commands, NewDeleteSecretContentCommand())
		}
		if s.Api != nil {
			commands = append(commands, NewDeleteClientInApiCommand(s.Api.ClientId))
		}
	} else if s.Api == nil {
		// The initial case, where we have to create everything
		// There may be the case that the `api` resource is null,
		// but the secret output exists, in which case we just overwrite it
		req := s.buildApiReq(context)
		jwks, err := crypto.CreateJwks(s.AppId, s.getNotAfter(clock))
		if err != nil {
			return nil, err
		}
		publicJwks, err := jwks.ToPublic()
		if err != nil {
			return nil, err
		}
		apiState := &ApiState{
			ClientId: "", // don't know yet
			Req:      req,
			Jwks:     publicJwks,
		}
		assert.That(len(jwks.Keys) > 0, "JWKS must have at least one key", "appId", s.AppId)
		secretStateContent := &SecretStateContent{
			ClientId:  "", // set via the callback below
			Authority: config.MaskinportenApi.AuthorityUrl,
			Jwks:      jwks,
			Jwk:       jwks.Keys[0],
		}
		commands = append(commands, NewCreateClientInApiCommand(apiState, func(respObj any) error {
			resp := respObj.(*CreateClientInApiCommandResponse)
			apiState.ClientId = resp.Resp.ClientId
			secretStateContent.ClientId = resp.Resp.ClientId
			return nil
		}))
		commands = append(commands, NewUpdateSecretContentCommand(secretStateContent))
	} else {
		if s.Secret.Content == nil {
			// In this case, there are two possible scenarios
			// * The API client was created, but we failed to update the secret content
			// * Someone else created the API client

			// Since the private JWKS is stored in the secret, it has been lost and we need to create a new one
			jwks, err := crypto.CreateJwks(s.AppId, s.getNotAfter(clock))
			if err != nil {
				return nil, err
			}
			publicJwks, err := jwks.ToPublic()
			if err != nil {
				return nil, err
			}
			apiState := &ApiState{
				ClientId: s.Api.ClientId,
				Req:      nil, // signals no update
				Jwks:     publicJwks,
			}
			commands = append(commands, NewUpdateClientInApiCommand(apiState))
			assert.That(len(jwks.Keys) > 0, "JWKS must have at least one key", "appId", s.AppId)
			secretStateContent := &SecretStateContent{
				ClientId:  s.Api.ClientId,
				Authority: config.MaskinportenApi.AuthorityUrl,
				Jwks:      jwks,
				Jwk:       jwks.Keys[0],
			}
			commands = append(commands, NewUpdateSecretContentCommand(secretStateContent))
		} else {
			authorityChanged := config.MaskinportenApi.AuthorityUrl != s.Secret.Content.Authority
			scopesChanged := !reflect.DeepEqual(s.Crd.Spec.Scopes, s.Api.Req.Scopes)
			jwks, err := crypto.RotateIfNeeded(s.AppId, s.getNotAfter(clock), s.Secret.Content.Jwks)
			if err != nil {
				return nil, err
			}
			jwksChanged := jwks != nil

			// Handle state changes that are contained in the secret
			if authorityChanged || jwksChanged {
				if !jwksChanged {
					jwks = s.Secret.Content.Jwks
				}
				assert.That(jwks != nil, "JWKS must be non-nil", "appId", s.AppId)
				assert.That(len(jwks.Keys) > 0, "JWKS must have at least one key", "appId", s.AppId)

				secretStateContent := &SecretStateContent{
					ClientId:  s.Api.ClientId,
					Authority: config.MaskinportenApi.AuthorityUrl,
					Jwks:      jwks,
					Jwk:       jwks.Keys[0],
				}
				// TODO: what happens if we succeed in updating the secret but fail in updating the client in API?
				// Update API before secret
				commands = append(commands, NewUpdateSecretContentCommand(secretStateContent))
			}

			// Handle client JWKS endpoint state changes
			if jwksChanged {
				publicJwks, err := jwks.ToPublic()
				if err != nil {
					return nil, err
				}
				apiState := &ApiState{
					ClientId: s.Api.ClientId,
					Req:      nil, // signals no update
					Jwks:     publicJwks,
				}
				commands = append(commands, NewUpdateClientInApiCommand(apiState))
			}

			// Handle client endpoint state changes
			if scopesChanged {
				apiState := &ApiState{
					ClientId: s.Api.ClientId,
					Req:      s.buildApiReq(context), // this reads scopes from CRD
					Jwks:     nil,                    // signals no update
				}
				commands = append(commands, NewUpdateClientInApiCommand(apiState))
			}
		}

	}

	return commands, nil
}

func getClientNamePrefix(context *operatorcontext.Context) string {
	return fmt.Sprintf("altinnoperator-%s-%s-", context.ServiceOwnerId, context.Environment)
}

func GetClientName(context *operatorcontext.Context, appId string) string {
	return getClientNamePrefix(context) + appId
}

func (s *ClientState) buildApiReq(context *operatorcontext.Context) *AddClientRequest {
	integrationType := IntegrationTypeMaskinporten
	appType := ApplicationTypeWeb
	tokenEndpointMethod := TokenEndpointAuthMethodPrivateKeyJwt
	clientName := GetClientName(context, s.AppId)
	description := fmt.Sprintf(
		"Altinn Operator managed client for %s/%s/%s",
		context.ServiceOwnerId,
		context.Environment,
		s.AppId,
	)
	return &AddClientRequest{
		ClientName:  &clientName,
		Description: &description,
		ClientOrgno: &context.ServiceOwnerOrgNo,
		GrantTypes: []GrantType{
			GrantTypeJwtBearer,
		},
		Scopes:                  s.Crd.Spec.Scopes,
		IntegrationType:         &integrationType,
		ApplicationType:         &appType,
		TokenEndpointAuthMethod: &tokenEndpointMethod,
	}
}

type Command struct {
	Data     any
	Callback func(respObj any) error
}

type CommandList []Command

func (l CommandList) Strings() []string {
	result := make([]string, len(l))
	for i := 0; i < len(l); i++ {
		result[i] = reflect.ValueOf(l[i].Data).Elem().Type().Name()
	}

	return result
}

type CreateClientInApiCommand struct {
	Api *ApiState
}
type CreateClientInApiCommandResponse struct {
	Resp *ClientResponse
}
type UpdateSecretContentCommand struct {
	SecretContent *SecretStateContent
}
type UpdateClientInApiCommand struct {
	Api *ApiState
}
type DeleteClientInApiCommand struct {
	ClientId string
}
type DeleteSecretContentCommand struct {
}

func NewCreateClientInApiCommand(api *ApiState, callback func(respObj any) error) Command {
	assert.That(api != nil, "CreateClientInApiCommand requires non-nil Api")
	return Command{
		Data:     &CreateClientInApiCommand{Api: api},
		Callback: callback,
	}
}

func NewUpdateClientInApiCommand(api *ApiState) Command {
	assert.That(api != nil, "UpdateClientInApiCommand requires non-nil Api")
	return Command{
		Data:     &UpdateClientInApiCommand{Api: api},
		Callback: nil,
	}
}

func NewUpdateSecretContentCommand(content *SecretStateContent) Command {
	assert.That(content != nil, "UpdateSecretContentCommand requires non-nil SecretContent")
	return Command{
		Data:     &UpdateSecretContentCommand{SecretContent: content},
		Callback: nil,
	}
}

func NewDeleteClientInApiCommand(clientId string) Command {
	assert.That(clientId != "", "DeleteClientInApiCommand requires non-empty ClientId")
	return Command{
		Data:     &DeleteClientInApiCommand{ClientId: clientId},
		Callback: nil,
	}
}

func NewDeleteSecretContentCommand() Command {
	return Command{
		Data:     &DeleteSecretContentCommand{},
		Callback: nil,
	}
}

// ErrSkipped indicates a command was not executed because a previous command failed
var ErrSkipped = fmt.Errorf("skipped: previous command failed")

// CommandResult types - one per command type

type CreateClientInApiCommandResult struct {
	ClientId string
	Scopes   int
	Err      error
}

type UpdateClientInApiCommandResult struct {
	ClientId string
	Scopes   int
	HasJwks  bool
	Err      error
}

type UpdateSecretContentCommandResult struct {
	Authority string
	KeyIds    []string
	Err       error
}

type DeleteClientInApiCommandResult struct {
	ClientId string
	Err      error
}

type DeleteSecretContentCommandResult struct {
	Err error
}

// CommandResult wraps a command with its execution result
type CommandResult struct {
	Command   any // One of the *Command types
	Result    any // One of the *CommandResult types
	Timestamp time.Time
}

type CommandResultList []CommandResult

// CommandResultBuilder accumulates fields for building a CommandResult.
// Call Build() to get the final result with assertions.
type CommandResultBuilder struct {
	command   any
	result    any
	timestamp time.Time
}

func NewCommandResultBuilder(cmd any, timestamp time.Time) *CommandResultBuilder {
	assert.That(cmd != nil, "CommandResultBuilder requires non-nil command")
	assert.That(!timestamp.IsZero(), "CommandResultBuilder requires valid timestamp")
	return &CommandResultBuilder{
		command:   cmd,
		timestamp: timestamp,
	}
}

func (b *CommandResultBuilder) WithCreateClientInApiResult(result *CreateClientInApiCommandResult) *CommandResultBuilder {
	_, ok := b.command.(*CreateClientInApiCommand)
	assert.That(ok, "Command type mismatch: expected CreateClientInApiCommand")
	b.result = result
	return b
}

func (b *CommandResultBuilder) WithUpdateClientInApiResult(result *UpdateClientInApiCommandResult) *CommandResultBuilder {
	_, ok := b.command.(*UpdateClientInApiCommand)
	assert.That(ok, "Command type mismatch: expected UpdateClientInApiCommand")
	b.result = result
	return b
}

func (b *CommandResultBuilder) WithUpdateSecretContentResult(result *UpdateSecretContentCommandResult) *CommandResultBuilder {
	_, ok := b.command.(*UpdateSecretContentCommand)
	assert.That(ok, "Command type mismatch: expected UpdateSecretContentCommand")
	b.result = result
	return b
}

func (b *CommandResultBuilder) WithDeleteClientInApiResult(result *DeleteClientInApiCommandResult) *CommandResultBuilder {
	_, ok := b.command.(*DeleteClientInApiCommand)
	assert.That(ok, "Command type mismatch: expected DeleteClientInApiCommand")
	b.result = result
	return b
}

func (b *CommandResultBuilder) WithDeleteSecretContentResult(result *DeleteSecretContentCommandResult) *CommandResultBuilder {
	_, ok := b.command.(*DeleteSecretContentCommand)
	assert.That(ok, "Command type mismatch: expected DeleteSecretContentCommand")
	b.result = result
	return b
}

func (b *CommandResultBuilder) Build() CommandResult {
	assert.That(b.result != nil, "CommandResult requires non-nil Result")
	return CommandResult{Command: b.command, Result: b.result, Timestamp: b.timestamp}
}

func MapClientResponseToAddRequest(api *ClientResponse) *AddClientRequest {
	grantTypes := make([]GrantType, len(api.GrantTypes))
	copy(grantTypes, api.GrantTypes)
	req := &AddClientRequest{
		ClientName:              api.ClientName,
		Description:             api.Description,
		ClientOrgno:             api.ClientOrgno,
		GrantTypes:              grantTypes,
		Scopes:                  api.Scopes,
		IntegrationType:         api.IntegrationType,
		ApplicationType:         api.ApplicationType,
		TokenEndpointAuthMethod: api.TokenEndpointAuthMethod,
	}
	return req
}

func ConvertAddRequestToUpdateRequest(req *AddClientRequest) *UpdateClientRequest {
	return &UpdateClientRequest{
		ClientId:                          req.ClientId,
		ClientName:                        req.ClientName,
		ClientOrgno:                       req.ClientOrgno,
		SupplierOrgno:                     req.SupplierOrgno,
		Description:                       req.Description,
		Active:                            req.Active,
		ApplicationType:                   req.ApplicationType,
		IntegrationType:                   req.IntegrationType,
		Scopes:                            req.Scopes,
		GrantTypes:                        req.GrantTypes,
		TokenEndpointAuthMethod:           req.TokenEndpointAuthMethod,
		RefreshTokenLifetime:              req.RefreshTokenLifetime,
		RefreshTokenUsage:                 req.RefreshTokenUsage,
		AccessTokenLifetime:               req.AccessTokenLifetime,
		AuthorizationLifetime:             req.AuthorizationLifetime,
		LogoUri:                           req.LogoUri,
		RedirectUris:                      req.RedirectUris,
		PostLogoutRedirectUris:            req.PostLogoutRedirectUris,
		FrontchannelLogoutSessionRequired: req.FrontchannelLogoutSessionRequired,
		FrontchannelLogoutUri:             req.FrontchannelLogoutUri,
		SsoDisabled:                       req.SsoDisabled,
		CodeChallengeMethod:               req.CodeChallengeMethod,
	}
}
