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

public class UpdateContactPointTests
    : ContactPointsControllerTestsBase<UpdateContactPointTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    public UpdateContactPointTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture) { }

    [Fact]
    public async Task UpdateContactPoint_ShouldReplacePersistedMethodsAndFields()
    {
        var existing = await SeedContactPointAsync(
            AllowedOrg,
            $"contact-points-put-{Guid.NewGuid():N}",
            true,
            ["prod"],
            [
                CreateMethodDbModel(ContactMethodType.Email, "before@example.com"),
                CreateMethodDbModel(ContactMethodType.Slack, "#before"),
            ]
        );
        var payload = CreateRequest(
            $"{existing.Name}-updated",
            false,
            ["dev", "staging"],
            [CreateMethodRequest(ContactMethodType.Sms, "+4712345678")]
        );

        using var request = new HttpRequestMessage(HttpMethod.Put, $"{VersionPrefix(AllowedOrg)}/{existing.Id}")
        {
            Content = CreateJsonContent(payload),
        };

        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await DeserializeAsync<ContactPointResponse>(response.Content);
        Assert.Equal(existing.Id, updated.Id);
        Assert.Equal(payload.Name, updated.Name);
        Assert.False(updated.IsActive);
        Assert.Equal(payload.Environments, updated.Environments);
        Assert.Single(updated.Methods);

        DesignerDbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DesignerDbFixture
            .DbContext.ContactPoints.Include(contactPoint => contactPoint.Methods)
            .AsNoTracking()
            .SingleAsync(contactPoint => contactPoint.Id == existing.Id);

        Assert.Equal(payload.Name, dbRecord.Name);
        Assert.False(dbRecord.IsActive);
        Assert.Equal(payload.Environments, dbRecord.Environments);
        Assert.Single(dbRecord.Methods);
        Assert.Equal(ContactMethodType.Sms, dbRecord.Methods[0].MethodType);
        Assert.Equal("+4712345678", dbRecord.Methods[0].Value);
        Assert.DoesNotContain(dbRecord.Methods, method => method.Value == "before@example.com");
        Assert.DoesNotContain(dbRecord.Methods, method => method.Value == "#before");
    }
}
