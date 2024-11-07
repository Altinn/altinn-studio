using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public interface IRequestSyncEvaluator
{
    bool EvaluateSyncRequest(HttpContext httpContext);
}
