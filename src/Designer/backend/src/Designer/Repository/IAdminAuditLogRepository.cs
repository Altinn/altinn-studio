using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IAdminAuditLogRepository
{
    /// <summary>
    /// Persists the entry and returns the generated entry id.
    /// </summary>
    Task<long> AddAsync(AdminAuditLogEntry entry, CancellationToken cancellationToken = default);

    Task UpdateStatusAsync(long entryId, string status, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminAuditLogEntry>> GetForOrgAsync(string org, CancellationToken cancellationToken = default);
}
