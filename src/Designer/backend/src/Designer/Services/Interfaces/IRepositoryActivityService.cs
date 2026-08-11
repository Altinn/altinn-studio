using System;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IRepositoryActivityService
{
    void MarkActive(AltinnRepoEditingContext editingContext, string repositoryPath);

    bool HasMarker(AltinnRepoEditingContext editingContext);

    void EnsureMarker(AltinnRepoEditingContext editingContext, DateTimeOffset lastActivity);

    DateTimeOffset GetLastActivity(AltinnRepoEditingContext editingContext, string repositoryPath);

    void RemoveMarker(AltinnRepoEditingContext editingContext);
}
