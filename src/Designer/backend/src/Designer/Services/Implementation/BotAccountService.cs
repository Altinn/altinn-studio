using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.BotAccount;
using Altinn.Studio.Designer.Models.UserAccount;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using ApiKeyModel = Altinn.Studio.Designer.Models.ApiKey.ApiKey;
using ApiKeyType = Altinn.Studio.Designer.Models.ApiKey.ApiKeyType;

namespace Altinn.Studio.Designer.Services.Implementation;

public class BotAccountService(
    DesignerdbContext dbContext,
    IUserProvisioningService userProvisioningService,
    IApiKeyService apiKeyService,
    IDeployEnvironmentAccessService deployEnvironmentAccessService,
    TimeProvider timeProvider
) : IBotAccountService
{
    public async Task<BotAccount> CreateAsync(
        string org,
        string name,
        string createdByUsername,
        IEnumerable<string>? deployEnvironments = null,
        CancellationToken cancellationToken = default
    )
    {
        string username = GiteaUsernameGenerator.GenerateBotUsername(org, name);

        await userProvisioningService.EnsureUserExistsAsync(username, cancellationToken: cancellationToken);

        Guid? createdByUserAccountId = await ResolveUserAccountIdAsync(createdByUsername, cancellationToken);

        var model = new UserAccountDbModel
        {
            Username = username,
            AccountType = AccountType.Bot,
            OrganizationName = org,
            CreatedByUserAccountId = createdByUserAccountId,
            Created = timeProvider.GetUtcNow(),
        };

        dbContext.UserAccounts.Add(model);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (deployEnvironments != null)
        {
            await deployEnvironmentAccessService.GrantAccessAsync(org, username, deployEnvironments, cancellationToken);
        }

        return MapToDomain(model, createdByUsername, [.. deployEnvironments ?? []]);
    }

    public async Task<List<BotAccount>> ListByOrgAsync(string org, CancellationToken cancellationToken = default)
    {
        var models = await dbContext
            .UserAccounts.AsNoTracking()
            .Include(u => u.CreatedByUserAccount)
            .Where(u => u.OrganizationName == org && u.AccountType == AccountType.Bot && !u.Deactivated)
            .OrderByDescending(u => u.Created)
            .ToListAsync(cancellationToken);
        List<Team> orgTeams = await deployEnvironmentAccessService.GetDeployTeamsAsync(org, cancellationToken);

        Dictionary<long, List<User>> membersByTeam = await deployEnvironmentAccessService.GetTeamMembersAsync(
            orgTeams,
            cancellationToken
        );

        return models
            .Select(m =>
                MapToDomain(
                    m,
                    m.CreatedByUserAccount?.Username,
                    deployEnvironmentAccessService.GetDeployEnvironments(m.Username, orgTeams, membersByTeam)
                )
            )
            .ToList();
    }

    public async Task<Dictionary<Guid, int>> GetApiKeyCountsByBotIdsAsync(
        IEnumerable<Guid> botAccountIds,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext
            .ApiKeys.AsNoTracking()
            .Where(k => botAccountIds.Contains(k.UserAccount.Id) && !k.Revoked)
            .GroupBy(k => k.UserAccount.Id)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), cancellationToken);
    }

    public async Task<BotAccount> GetAsync(Guid botAccountId, string org, CancellationToken cancellationToken = default)
    {
        var model = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        List<string> environments = await deployEnvironmentAccessService.GetDeployEnvironmentsAsync(
            model.Username,
            org,
            cancellationToken
        );
        return MapToDomain(model, model.CreatedByUserAccount?.Username, environments);
    }

    public async Task DeactivateAsync(Guid botAccountId, string org, CancellationToken cancellationToken = default)
    {
        var model =
            await dbContext
                .UserAccounts.Include(u => u.CreatedByUserAccount)
                .FirstOrDefaultAsync(
                    u => u.Id == botAccountId && u.OrganizationName == org && u.AccountType == AccountType.Bot,
                    cancellationToken
                )
            ?? throw new InvalidOperationException($"Bot account '{botAccountId}' not found in org '{org}'.");

        List<string> deployEnvironments = await deployEnvironmentAccessService.GetDeployEnvironmentsAsync(
            model.Username,
            org,
            cancellationToken
        );

        await deployEnvironmentAccessService.RevokeAccessAsync(
            org,
            model.Username,
            deployEnvironments,
            cancellationToken
        );

        model.Deactivated = true;
        model.DeactivatedAt = timeProvider.GetUtcNow();

        var apiKeys = await dbContext
            .ApiKeys.Where(k => k.UserAccountId == botAccountId && !k.Revoked)
            .ToListAsync(cancellationToken);

        foreach (var key in apiKeys)
        {
            key.Revoked = true;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<(string RawKey, ApiKeyModel Key)> CreateApiKeyAsync(
        Guid botAccountId,
        string org,
        string keyName,
        DateTimeOffset expiresAt,
        string createdByUsername,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);

        if (botAccount.Deactivated)
        {
            throw new InvalidOperationException("Cannot create API key for a deactivated bot account.");
        }

        return await apiKeyService.CreateAsync(
            botAccount.Username,
            keyName,
            ApiKeyType.User,
            expiresAt,
            createdByUsername,
            cancellationToken
        );
    }

    public async Task<List<ApiKeyModel>> ListApiKeysAsync(
        Guid botAccountId,
        string org,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        return await apiKeyService.ListAsync(botAccount.Username, cancellationToken: cancellationToken);
    }

    public async Task RevokeApiKeyAsync(
        Guid botAccountId,
        long apiKeyId,
        string org,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        await apiKeyService.RevokeAsync(apiKeyId, botAccount.Username, cancellationToken);
    }

    public async Task UpdateAsync(
        Guid botAccountId,
        string org,
        IEnumerable<string> desiredEnvironments,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);

        List<string> currentEnvironments = await deployEnvironmentAccessService.GetDeployEnvironmentsAsync(
            botAccount.Username,
            org,
            cancellationToken
        );

        var desired = desiredEnvironments.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var current = currentEnvironments.ToHashSet(StringComparer.OrdinalIgnoreCase);

        IEnumerable<string> toAdd = desired.Except(current, StringComparer.OrdinalIgnoreCase);
        IEnumerable<string> toRemove = current.Except(desired, StringComparer.OrdinalIgnoreCase);
        await Task.WhenAll(
            deployEnvironmentAccessService.GrantAccessAsync(org, botAccount.Username, toAdd, cancellationToken),
            deployEnvironmentAccessService.RevokeAccessAsync(org, botAccount.Username, toRemove, cancellationToken)
        );
    }

    private async Task<UserAccountDbModel> GetBotAccountModelAsync(
        Guid botAccountId,
        string org,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
                .UserAccounts.AsNoTracking()
                .Include(u => u.CreatedByUserAccount)
                .FirstOrDefaultAsync(
                    u =>
                        u.Id == botAccountId
                        && u.OrganizationName == org
                        && u.AccountType == AccountType.Bot
                        && !u.Deactivated,
                    cancellationToken
                )
            ?? throw new InvalidOperationException($"Bot account '{botAccountId}' not found in org '{org}'.");
    }

    private async Task<Guid?> ResolveUserAccountIdAsync(string username, CancellationToken cancellationToken)
    {
        var account = await dbContext
            .UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        return account?.Id;
    }

    private static BotAccount MapToDomain(
        UserAccountDbModel model,
        string? createdByUsername,
        List<string> deployEnvironments
    ) =>
        new()
        {
            Id = model.Id,
            Username = model.Username,
            OrganizationName = model.OrganizationName ?? string.Empty,
            AccountType = model.AccountType,
            Deactivated = model.Deactivated,
            Created = model.Created,
            CreatedByUsername = createdByUsername,
            DeployEnvironments = deployEnvironments,
        };
}
