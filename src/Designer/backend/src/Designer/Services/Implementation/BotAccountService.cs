using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models.BotAccount;
using Altinn.Studio.Designer.Models.UserAccount;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using ApiKeyModel = Altinn.Studio.Designer.Models.ApiKey.ApiKey;
using ApiKeyType = Altinn.Studio.Designer.Models.ApiKey.ApiKeyType;

namespace Altinn.Studio.Designer.Services.Implementation;

public class BotAccountService(
    DesignerdbContext dbContext,
    IUserProvisioningService userProvisioningService,
    IApiKeyService apiKeyService,
    IGiteaClient giteaClient,
    TimeProvider timeProvider
) : IBotAccountService
{
    private const int MaxGiteaUsernameLength = 40;
    private const int RandomSuffixLength = 4;
    private const string DeployTeamPrefix = "Deploy-";

    public async Task<BotAccount> CreateAsync(
        string org,
        string name,
        string createdByUsername,
        IEnumerable<string>? deployEnvironments = null,
        CancellationToken cancellationToken = default
    )
    {
        string username = GenerateBotUsername(org, name);

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
            await AddToDeployTeamsAsync(org, username, deployEnvironments, cancellationToken);
        }

        return MapToDomain(model, createdByUsername);
    }

    public async Task<List<BotAccount>> ListByOrgAsync(string org, CancellationToken cancellationToken = default)
    {
        var models = await dbContext
            .UserAccounts.AsNoTracking()
            .Include(u => u.CreatedByUserAccount)
            .Where(u => u.OrganizationName == org && u.AccountType == AccountType.Bot && !u.Deactivated)
            .OrderByDescending(u => u.Created)
            .ToListAsync(cancellationToken);

        return models.Select(m => MapToDomain(m, m.CreatedByUserAccount?.Username)).ToList();
    }

    public async Task<BotAccount> GetAsync(Guid botAccountId, string org, CancellationToken cancellationToken = default)
    {
        var model = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        return MapToDomain(model, model.CreatedByUserAccount?.Username);
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

    public async Task AddToDeployTeamAsync(
        Guid botAccountId,
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        var orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);
        string teamName = $"{DeployTeamPrefix}{environment}";

        var team =
            orgTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Deploy team '{teamName}' not found in org '{org}'.");

        await giteaClient.AddTeamMemberAsync(team.Id, botAccount.Username, cancellationToken);
    }

    public async Task RemoveFromDeployTeamAsync(
        Guid botAccountId,
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        var botAccount = await GetBotAccountModelAsync(botAccountId, org, cancellationToken);
        var orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);
        string teamName = $"{DeployTeamPrefix}{environment}";

        var team =
            orgTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Deploy team '{teamName}' not found in org '{org}'.");

        await giteaClient.RemoveTeamMemberAsync(team.Id, botAccount.Username, cancellationToken);
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
                    u => u.Id == botAccountId && u.OrganizationName == org && u.AccountType == AccountType.Bot,
                    cancellationToken
                )
            ?? throw new InvalidOperationException($"Bot account '{botAccountId}' not found in org '{org}'.");
    }

    private async Task AddToDeployTeamsAsync(
        string org,
        string botUsername,
        IEnumerable<string> environments,
        CancellationToken cancellationToken
    )
    {
        var orgTeams = await giteaClient.GetOrgTeamsAsync(org, cancellationToken);

        foreach (string env in environments)
        {
            string teamName = $"{DeployTeamPrefix}{env}";
            var team = orgTeams.FirstOrDefault(t => t.Name.Equals(teamName, StringComparison.OrdinalIgnoreCase));

            if (team != null)
            {
                await giteaClient.AddTeamMemberAsync(team.Id, botUsername, cancellationToken);
            }
        }
    }

    private async Task<Guid?> ResolveUserAccountIdAsync(string username, CancellationToken cancellationToken)
    {
        var account = await dbContext
            .UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        return account?.Id;
    }

    internal static string GenerateBotUsername(string org, string name)
    {
        string sanitizedOrg = SanitizeName(org);
        string sanitizedName = SanitizeName(name);
        string suffix = Guid.NewGuid().ToString("N")[..RandomSuffixLength];

        string prefix = string.IsNullOrEmpty(sanitizedName)
            ? $"bot_{sanitizedOrg}"
            : $"bot_{sanitizedOrg}_{sanitizedName}";

        int maxPrefixLength = MaxGiteaUsernameLength - 1 - RandomSuffixLength;
        if (prefix.Length > maxPrefixLength)
        {
            prefix = prefix[..maxPrefixLength].TrimEnd('_');
        }

        return $"{prefix}_{suffix}";
    }

    private static string SanitizeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return string.Empty;
        }

        string sanitized = name.Trim().ToLowerInvariant().Replace("æ", "ae").Replace("ø", "o").Replace("å", "a");

        sanitized = Regex.Replace(sanitized, @"\s+", "_");
        sanitized = Regex.Replace(sanitized, "[^a-z0-9_]", "");
        sanitized = Regex.Replace(sanitized, "_+", "_");
        sanitized = sanitized.Trim('_');

        return sanitized;
    }

    private static BotAccount MapToDomain(UserAccountDbModel model, string? createdByUsername) =>
        new()
        {
            Id = model.Id,
            Username = model.Username,
            OrganizationName = model.OrganizationName ?? string.Empty,
            AccountType = model.AccountType,
            Deactivated = model.Deactivated,
            Created = model.Created,
            CreatedByUsername = createdByUsername,
        };
}
