using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class PersonalAccessTokenRepository(DesignerdbContext dbContext) : IPersonalAccessTokenRepository
{
    public async Task<PersonalAccessTokenDbModel?> GetByKeyHashAsync(
        string keyHash,
        CancellationToken cancellationToken = default
    )
    {
        return await dbContext
            .PersonalAccessTokens.AsNoTracking()
            .Include(t => t.UserAccount)
            .Where(t => t.KeyHash == keyHash)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<List<PersonalAccessTokenDbModel>> GetByUserAccountIdAsync(
        Guid userAccountId,
        PersonalAccessTokenType? tokenType = null,
        CancellationToken cancellationToken = default
    )
    {
        var query = dbContext.PersonalAccessTokens.AsNoTracking().Where(t => t.UserAccountId == userAccountId);

        if (tokenType.HasValue)
        {
            query = query.Where(t => t.TokenType == tokenType.Value);
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
    }

    public async Task<PersonalAccessTokenDbModel> CreateAsync(
        PersonalAccessTokenDbModel model,
        CancellationToken cancellationToken = default
    )
    {
        dbContext.PersonalAccessTokens.Add(model);
        await dbContext.SaveChangesAsync(cancellationToken);
        return model;
    }

    public async Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default)
    {
        await dbContext
            .PersonalAccessTokens.Where(t => t.Id == id && t.UserAccountId == userAccountId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Revoked, true), cancellationToken);
    }
}
