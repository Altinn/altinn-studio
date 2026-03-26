using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ContactPointsController;

public class DeleteContactPointTests
    : ContactPointsControllerTestsBase<DeleteContactPointTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    public DeleteContactPointTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task DeleteContactPoint_ShouldRemoveContactPointAndMethods()
    {
        var existing = await SeedContactPointAsync(
            AllowedOrg,
            $"contact-points-delete-{Guid.NewGuid():N}",
            true,
            [],
            [
                CreateMethodDbModel(ContactMethodType.Email, "delete@example.com"),
                CreateMethodDbModel(ContactMethodType.Slack, "#delete"),
            ]
        );

        using var response = await HttpClient.DeleteAsync($"{VersionPrefix(AllowedOrg)}/{existing.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var deletedContactPoint = await DesignerDbFixture
            .DbContext.ContactPoints.AsNoTracking()
            .SingleOrDefaultAsync(contactPoint => contactPoint.Id == existing.Id);
        var deletedMethods = await DesignerDbFixture
            .DbContext.ContactMethods.AsNoTracking()
            .Where(method => method.ContactPointId == existing.Id)
            .ToListAsync();

        Assert.Null(deletedContactPoint);
        Assert.Empty(deletedMethods);
    }
}
