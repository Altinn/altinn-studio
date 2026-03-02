using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ApiKeyRepository : IApiKeyRepository
{
    private readonly DesignerdbContext _dbContext;

    public ApiKeyRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ApiKeyDbModel?> GetByKeyHashAsync(string keyHash, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ApiKeys
            .AsNoTracking()
            .Where(k => k.KeyHash == keyHash)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<List<ApiKeyDbModel>> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ApiKeys
            .AsNoTracking()
            .Where(k => k.Username == username)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<ApiKeyDbModel> CreateAsync(ApiKeyDbModel model, CancellationToken cancellationToken = default)
    {
        _dbContext.ApiKeys.Add(model);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return model;
    }

    public async Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default)
    {
        await _dbContext.ApiKeys
            .Where(k => k.Id == id && k.Username == username)
            .ExecuteUpdateAsync(s => s.SetProperty(k => k.Revoked, true), cancellationToken);
    }
}
