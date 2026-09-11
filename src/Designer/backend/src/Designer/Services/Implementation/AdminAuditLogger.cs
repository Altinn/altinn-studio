using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AdminAuditLogger : IAdminAuditLogger
{
    private readonly IAdminAuditLogRepository _repository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly TimeProvider _timeProvider;

    public AdminAuditLogger(
        IAdminAuditLogRepository repository,
        IHttpContextAccessor httpContextAccessor,
        TimeProvider timeProvider
    )
    {
        _repository = repository;
        _httpContextAccessor = httpContextAccessor;
        _timeProvider = timeProvider;
    }

    public async Task<long> LogInstanceDeletionRequestedAsync(
        string org,
        string env,
        string app,
        string instanceId,
        CancellationToken cancellationToken = default
    )
    {
        HttpContext httpContext = _httpContextAccessor.HttpContext ?? throw new InvalidOperationException();

        string userName = AuthenticationHelper.GetDeveloperUserName(httpContext);

        var entry = new AdminAuditLogEntry
        {
            Org = org,
            Env = env,
            App = app,
            InstanceId = instanceId,
            Action = AdminAuditActions.DeleteInstance,
            Status = AdminAuditStatuses.Requested,
            UserName = userName,
            Timestamp = _timeProvider.GetUtcNow(),
        };

        return await _repository.AddAsync(entry, cancellationToken);
    }

    public async Task LogInstanceDeletionCompletedAsync(long entryId, CancellationToken cancellationToken = default)
    {
        await _repository.UpdateStatusAsync(entryId, AdminAuditStatuses.Completed, cancellationToken);
    }

    public async Task LogInstanceDeletionFailedAsync(long entryId, CancellationToken cancellationToken = default)
    {
        await _repository.UpdateStatusAsync(entryId, AdminAuditStatuses.Failed, cancellationToken);
    }
}
