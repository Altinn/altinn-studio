using System;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository.Models.RepositoryActivity;

public sealed record RepositoryActivityEntity(
    AltinnRepoEditingContext EditingContext,
    DateTimeOffset LastAccessedAt,
    bool CleanupPending
);
