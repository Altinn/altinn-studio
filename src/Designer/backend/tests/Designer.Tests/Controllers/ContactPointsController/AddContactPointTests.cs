using System;
using System.Linq;
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

public class AddContactPointTests
    : ContactPointsControllerTestsBase<AddContactPointTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    public AddContactPointTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task AddContactPoint_ShouldCreateContactPointAndReturnCreatedEntity()
    {
        var name = $"contact-points-post-{Guid.NewGuid():N}";
        var payload = CreateRequest(
            name,
            true,
            ["test", "prod"],
            [
                CreateMethodRequest(ContactMethodType.Email, "service@example.com"),
                CreateMethodRequest(ContactMethodType.Slack, "#service-alerts"),
            ]
        );

        using var request = new HttpRequestMessage(HttpMethod.Post, VersionPrefix(AllowedOrg))
        {
            Content = CreateJsonContent(payload),
        };

        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await DeserializeAsync<ContactPointResponse>(response.Content);
        Assert.NotEqual(Guid.Empty, created.Id);
        Assert.Equal(payload.Name, created.Name);
        Assert.Equal(payload.IsActive, created.IsActive);
        Assert.Equal(payload.Environments, created.Environments);
        Assert.Equal(payload.Methods.Count, created.Methods.Count);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture
            .DbContext.ContactPoints.Include(contactPoint => contactPoint.Methods)
            .AsNoTracking()
            .SingleAsync(contactPoint => contactPoint.Id == created.Id);

        Assert.Equal(AllowedOrg, dbRecord.Org);
        Assert.Equal(payload.Name, dbRecord.Name);
        Assert.Equal(payload.IsActive, dbRecord.IsActive);
        Assert.Equal(payload.Environments, dbRecord.Environments);
        Assert.Collection(
            dbRecord.Methods.OrderBy(method => method.Value),
            first =>
            {
                Assert.Equal(ContactMethodType.Slack, first.MethodType);
                Assert.Equal("#service-alerts", first.Value);
            },
            second =>
            {
                Assert.Equal(ContactMethodType.Email, second.MethodType);
                Assert.Equal("service@example.com", second.Value);
            }
        );
    }
}
