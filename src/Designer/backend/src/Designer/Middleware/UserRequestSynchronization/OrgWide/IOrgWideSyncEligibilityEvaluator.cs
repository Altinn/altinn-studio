using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide;

/// <summary>
/// Marker interface used to identify request sync evaluators for repo user wide synchronization.
/// </summary>
public interface IOrgWideSyncEligibilityEvaluator : ISyncEligibilityEvaluator
{
}
