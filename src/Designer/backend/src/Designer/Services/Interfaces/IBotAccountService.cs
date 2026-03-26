using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.BotAccount;
using ApiKeyModel = Altinn.Studio.Designer.Models.ApiKey.ApiKey;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IBotAccountService
{
    Task<BotAccount> CreateAsync(
        string org,
        string name,
        string createdByUsername,
        IEnumerable<string>? deployEnvironments = null,
        CancellationToken cancellationToken = default
    );

    Task<List<BotAccount>> ListByOrgAsync(string org, CancellationToken cancellationToken = default);

    Task<BotAccount> GetAsync(Guid botAccountId, string org, CancellationToken cancellationToken = default);

    Task DeactivateAsync(Guid botAccountId, string org, CancellationToken cancellationToken = default);

    Task<(string RawKey, ApiKeyModel Key)> CreateApiKeyAsync(
        Guid botAccountId,
        string org,
        string keyName,
        DateTimeOffset expiresAt,
        string createdByUsername,
        CancellationToken cancellationToken = default
    );

    Task<List<ApiKeyModel>> ListApiKeysAsync(
        Guid botAccountId,
        string org,
        CancellationToken cancellationToken = default
    );

    Task RevokeApiKeyAsync(Guid botAccountId, long apiKeyId, string org, CancellationToken cancellationToken = default);

    Task AddToDeployTeamAsync(
        Guid botAccountId,
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );

    Task RemoveFromDeployTeamAsync(
        Guid botAccountId,
        string org,
        string environment,
        CancellationToken cancellationToken = default
    );
}
