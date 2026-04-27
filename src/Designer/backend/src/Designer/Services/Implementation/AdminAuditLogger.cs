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

    public async Task LogInstanceDeletedAsync(
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
            UserName = userName,
            Timestamp = _timeProvider.GetUtcNow(),
        };

        await _repository.AddAsync(entry, cancellationToken);
    }
}
