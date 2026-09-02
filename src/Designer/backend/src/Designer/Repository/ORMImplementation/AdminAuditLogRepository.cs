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

    public async Task<long> AddAsync(AdminAuditLogEntry entry, CancellationToken cancellationToken = default)
    {
        var dbModel = new AdminAuditLogDbModel
        {
            Org = entry.Org,
            App = entry.App,
            InstanceId = entry.InstanceId,
            Action = entry.Action,
            Status = entry.Status,
            UserName = entry.UserName,
            Env = entry.Env,
            Timestamp = entry.Timestamp,
        };

        _dbContext.AdminAuditLog.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return dbModel.Id;
    }

    public async Task UpdateStatusAsync(long entryId, string status, CancellationToken cancellationToken = default)
    {
        await _dbContext
            .AdminAuditLog.Where(e => e.Id == entryId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(e => e.Status, status), cancellationToken);
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
                Status = e.Status,
                UserName = e.UserName,
                Env = e.Env,
                Timestamp = e.Timestamp,
            })
            .ToListAsync(cancellationToken);
    }
}
