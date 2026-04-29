using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize(Policy = AltinnPolicy.MustBeOrgOwner)]
[AutoValidateAntiforgeryToken]
[FeatureGate(StudioFeatureFlags.StudioOidc)]
[Route("/designer/api/v1/orgs/{org}/bot-accounts")]
public class BotAccountsController(IBotAccountService botAccountService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CreateBotAccountResponse>> Create(
        string org,
        [FromBody] CreateBotAccountRequest request,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var botAccount = await botAccountService.CreateAsync(
            org,
            request.Name,
            username,
            request.DeployEnvironments,
            cancellationToken
        );

        return CreatedAtAction(
            nameof(Get),
            new { org, id = botAccount.Id },
            new CreateBotAccountResponse(
                botAccount.Id,
                botAccount.Username,
                botAccount.OrganizationName,
                botAccount.Created
            )
        );
    }

    [HttpGet]
    public async Task<ActionResult<List<BotAccountResponse>>> List(string org, CancellationToken cancellationToken)
    {
        var botAccounts = await botAccountService.ListByOrgAsync(org, cancellationToken);

        var apiKeyCounts = await botAccountService.GetApiKeyCountsByBotIdsAsync(
            botAccounts.Select(b => b.Id),
            cancellationToken
        );

        var response = botAccounts
            .Select(botAccount => new BotAccountResponse(
                botAccount.Id,
                botAccount.Username,
                botAccount.OrganizationName,
                botAccount.Deactivated,
                botAccount.Created,
                botAccount.CreatedByUsername,
                botAccount.DeployEnvironments,
                apiKeyCounts.GetValueOrDefault(botAccount.Id, 0)
            ))
            .ToList();

        return Ok(response);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        string org,
        Guid id,
        [FromBody] UpdateBotAccountRequest request,
        CancellationToken cancellationToken
    )
    {
        await botAccountService.UpdateAsync(id, org, request.DeployEnvironments, cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BotAccountResponse>> Get(string org, Guid id, CancellationToken cancellationToken)
    {
        var botAccount = await botAccountService.GetAsync(id, org, cancellationToken);
        var apiKeyCounts = await botAccountService.GetApiKeyCountsByBotIdsAsync([id], cancellationToken);

        return Ok(
            new BotAccountResponse(
                botAccount.Id,
                botAccount.Username,
                botAccount.OrganizationName,
                botAccount.Deactivated,
                botAccount.Created,
                botAccount.CreatedByUsername,
                botAccount.DeployEnvironments,
                apiKeyCounts.GetValueOrDefault(id, 0)
            )
        );
    }

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(string org, Guid id, CancellationToken cancellationToken)
    {
        await botAccountService.DeactivateAsync(id, org, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/api-keys")]
    public async Task<ActionResult<CreateBotAccountApiKeyResponse>> CreateApiKey(
        string org,
        Guid id,
        [FromBody] CreateBotAccountApiKeyRequest request,
        CancellationToken cancellationToken
    )
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        var (rawKey, apiKey) = await botAccountService.CreateApiKeyAsync(
            id,
            org,
            request.Name,
            request.ExpiresAt,
            username,
            cancellationToken
        );

        return Created(
            string.Empty,
            new CreateBotAccountApiKeyResponse(apiKey.Id, rawKey, apiKey.Name, apiKey.ExpiresAt, username)
        );
    }

    [HttpGet("{id:guid}/api-keys")]
    public async Task<ActionResult<List<BotAccountApiKeyResponse>>> ListApiKeys(
        string org,
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var apiKeys = await botAccountService.ListApiKeysAsync(id, org, cancellationToken);

        var response = apiKeys
            .Select(k => new BotAccountApiKeyResponse(k.Id, k.Name, k.ExpiresAt, k.CreatedAt, k.CreatedByUsername))
            .ToList();

        return Ok(response);
    }

    [HttpDelete("{id:guid}/api-keys/{keyId:long}")]
    public async Task<IActionResult> RevokeApiKey(string org, Guid id, long keyId, CancellationToken cancellationToken)
    {
        await botAccountService.RevokeApiKeyAsync(id, keyId, org, cancellationToken);
        return NoContent();
    }
}
