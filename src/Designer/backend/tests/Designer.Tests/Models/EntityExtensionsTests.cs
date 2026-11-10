using System;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Microsoft.Extensions.Time.Testing;
using Xunit;

namespace Designer.Tests.Models;

public class EntityExtensionsTests
{
    [Fact]
    public void PopulateBaseProperties_SetsCreatedInUtc()
    {
        var now = new DateTimeOffset(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);
        var entity = new DeploymentEntity();

        entity.PopulateBaseProperties(
            AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "app", "testUser"),
            new FakeTimeProvider(now)
        );

        // The repository converts Created to UTC, and would read a value of unspecified kind as local time.
        Assert.Equal(DateTimeKind.Utc, entity.Created.Kind);
        Assert.Equal(now.UtcDateTime, entity.Created);
    }
}
