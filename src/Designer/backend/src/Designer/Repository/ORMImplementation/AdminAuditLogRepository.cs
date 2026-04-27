using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class AdminAuditLogRepository : IAdminAuditLogRepository
{
    private readonly DesignerdbContext _dbContext;

    public AdminAuditLogRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(AdminAuditLogEntry entry, CancellationToken cancellationToken = default)
    {
        var dbModel = new AdminAuditLogDbModel
        {
            Org = entry.Org,
            App = entry.App,
            InstanceId = entry.InstanceId,
            Action = entry.Action,
            UserName = entry.UserName,
            Env = entry.Env,
            Timestamp = entry.Timestamp,
        };

        _dbContext.AdminAuditLog.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminAuditLogEntry>> GetForOrgAsync(
        string org,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AdminAuditLog.AsNoTracking()
            .Where(e => e.Org == org)
            .OrderByDescending(e => e.Timestamp)
            .Select(e => new AdminAuditLogEntry
            {
                Id = e.Id,
                Org = e.Org,
                App = e.App,
                InstanceId = e.InstanceId,
                Action = e.Action,
                UserName = e.UserName,
                Env = e.Env,
                Timestamp = e.Timestamp,
            })
            .ToListAsync(cancellationToken);
    }
}
