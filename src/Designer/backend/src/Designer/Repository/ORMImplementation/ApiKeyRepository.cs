using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ApiKeyRepository(DesignerdbContext dbContext) : IApiKeyRepository
{
    public async Task<ApiKeyDbModel?> GetByKeyHashAsync(string keyHash, CancellationToken cancellationToken = default)
    {
        return await dbContext
            .ApiKeys.AsNoTracking()
            .Include(t => t.UserAccount)
            .Where(t => t.KeyHash == keyHash)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<List<ApiKeyDbModel>> GetByUserAccountIdAsync(
        Guid userAccountId,
        ApiKeyType? tokenType = null,
        CancellationToken cancellationToken = default
    )
    {
        var query = dbContext.ApiKeys.AsNoTracking().Where(t => t.UserAccountId == userAccountId && !t.Revoked);

        if (tokenType.HasValue)
        {
            query = query.Where(t => t.TokenType == tokenType.Value);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
    }

    public async Task<ApiKeyDbModel> CreateAsync(ApiKeyDbModel model, CancellationToken cancellationToken = default)
    {
        dbContext.ApiKeys.Add(model);
        await dbContext.SaveChangesAsync(cancellationToken);
        return model;
    }

    public async Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default)
    {
        await dbContext
            .ApiKeys.Where(t => t.Id == id && t.UserAccountId == userAccountId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Revoked, true), cancellationToken);
    }
}
