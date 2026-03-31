using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ContactPointsController;

public class GetContactPointsTests
    : ContactPointsControllerTestsBase<GetContactPointsTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    public GetContactPointsTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task GetContactPoints_ShouldReturnOnlyRequestedOrgOrderedByName()
    {
        var prefix = $"contact-points-get-{Guid.NewGuid():N}";

        await SeedContactPointAsync(
            AllowedOrg,
            $"{prefix}-zeta",
            true,
            ["prod"],
            [CreateMethodDbModel(ContactMethodType.Email, "zeta@example.com")]
        );
        await SeedContactPointAsync(
            AllowedOrg,
            $"{prefix}-alpha",
            false,
            ["test"],
            [CreateMethodDbModel(ContactMethodType.Slack, "#alpha")]
        );
        await SeedContactPointAsync(
            "Org2",
            $"{prefix}-other-org",
            true,
            [],
            [CreateMethodDbModel(ContactMethodType.Email, "other@example.com")]
        );

        using var response = await HttpClient.GetAsync(VersionPrefix(AllowedOrg));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await DeserializeAsync<List<ContactPointResponse>>(response.Content);
        var matchingContactPoints = content
            .Where(contactPoint => contactPoint.Name.StartsWith(prefix, StringComparison.Ordinal))
            .ToList();

        Assert.Collection(
            matchingContactPoints,
            first => Assert.Equal($"{prefix}-alpha", first.Name),
            second => Assert.Equal($"{prefix}-zeta", second.Name)
        );
        Assert.DoesNotContain(matchingContactPoints, contactPoint => contactPoint.Name.EndsWith("other-org"));
    }
}
