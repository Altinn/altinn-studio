using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ContactPointsController;

public class ToggleContactPointActiveTests
    : ContactPointsControllerTestsBase<ToggleContactPointActiveTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    public ToggleContactPointActiveTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task ToggleContactPointActive_ShouldUpdatePersistedState()
    {
        var existing = await SeedContactPointAsync(
            AllowedOrg,
            $"contact-points-patch-{Guid.NewGuid():N}",
            true,
            [],
            [CreateMethodDbModel(ContactMethodType.Email, "toggle@example.com")]
        );

        using var request = new HttpRequestMessage(
            HttpMethod.Patch,
            $"{VersionPrefix(AllowedOrg)}/{existing.Id}/active"
        )
        {
            Content = CreateJsonContent(new ToggleActiveRequest { IsActive = false }),
        };

        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture
            .DbContext.ContactPoints.AsNoTracking()
            .SingleAsync(contactPoint => contactPoint.Id == existing.Id);

        Assert.False(dbRecord.IsActive);
    }
}
