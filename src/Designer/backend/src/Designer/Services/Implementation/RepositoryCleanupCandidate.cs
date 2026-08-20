using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed record RepositoryCleanupCandidate(
    AltinnRepoEditingContext EditingContext,
    string DeveloperPath,
    string OrganizationPath,
    string RepositoryPath
);

internal enum RepositoryCleanupCandidateOutcome
{
    Deleted,
    Failed,
    Skipped,
}
