using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

public interface IRequestSyncEvaluator
{
    bool IsEligibleForSynchronization(HttpContext httpContext);
}
