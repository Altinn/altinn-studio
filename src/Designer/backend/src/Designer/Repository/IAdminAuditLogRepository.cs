using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IAdminAuditLogRepository
{
    Task AddAsync(AdminAuditLogEntry entry, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminAuditLogEntry>> GetForOrgAsync(string org, CancellationToken cancellationToken = default);
}
