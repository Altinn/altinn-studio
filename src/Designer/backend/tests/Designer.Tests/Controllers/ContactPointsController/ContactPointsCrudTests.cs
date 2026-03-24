using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.ContactPointsController;

public class ContactPointsCrudTests
    : DbDesignerEndpointsTestsBase<ContactPointsCrudTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    private const string AllowedOrg = "Org1";

    private static string VersionPrefix(string org) => $"/designer/api/v1/admin/contact-points/{org}";

    public ContactPointsCrudTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
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

    private async Task<ContactPointDbModel> SeedContactPointAsync(
        string org,
        string name,
        bool isActive,
        List<string> environments,
        List<ContactMethodDbModel> methods
    )
    {
        var contactPoint = new ContactPointDbModel
        {
            Id = Guid.NewGuid(),
            Org = org,
            Name = name,
            IsActive = isActive,
            CreatedAt = DateTimeOffset.UtcNow,
            Environments = environments,
            Methods = methods,
        };

        foreach (var method in contactPoint.Methods)
        {
            method.ContactPointId = contactPoint.Id;
        }

        await DesignerDbFixture.DbContext.ContactPoints.AddAsync(contactPoint);
        await DesignerDbFixture.DbContext.SaveChangesAsync();
        DesignerDbFixture.DbContext.ChangeTracker.Clear();

        return contactPoint;
    }

    private StringContent CreateJsonContent<T>(T value) =>
        new(JsonSerializer.Serialize(value, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);

    private async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        var rawContent = await content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<T>(rawContent, JsonSerializerOptions);
        Assert.NotNull(result);
        return result!;
    }

    private static ContactPointRequest CreateRequest(
        string name,
        bool isActive,
        List<string> environments,
        List<ContactMethodRequest> methods
    ) =>
        new()
        {
            Name = name,
            IsActive = isActive,
            Environments = environments,
            Methods = methods,
        };

    private static ContactMethodRequest CreateMethodRequest(ContactMethodType methodType, string value) =>
        new() { MethodType = methodType, Value = value };

    private static ContactMethodDbModel CreateMethodDbModel(ContactMethodType methodType, string value) =>
        new()
        {
            Id = Guid.NewGuid(),
            MethodType = methodType,
            Value = value,
        };
}
