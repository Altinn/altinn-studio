using System;
using System.Collections.Generic;
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
using Xunit;

namespace Designer.Tests.Controllers.ContactPointsController;

public abstract class ContactPointsControllerTestsBase<TTestClass>
    : DbDesignerEndpointsTestsBase<TTestClass>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
    where TTestClass : class
{
    protected const string AllowedOrg = "Org1";

    protected static string VersionPrefix(string org) => $"/designer/api/v1/admin/contact-points/{org}";

    protected ContactPointsControllerTestsBase(
        WebApplicationFactory<Program> factory,
        DesignerDbFixture designerDbFixture
    )
        : base(factory, designerDbFixture) { }

    protected async Task<ContactPointDbModel> SeedContactPointAsync(
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

    protected StringContent CreateJsonContent<T>(T value) =>
        new(JsonSerializer.Serialize(value, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);

    protected async Task<T> DeserializeAsync<T>(HttpContent content)
    {
        var rawContent = await content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<T>(rawContent, JsonSerializerOptions);
        Assert.NotNull(result);
        return result!;
    }

    protected static ContactPointRequest CreateRequest(
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

    protected static ContactMethodRequest CreateMethodRequest(ContactMethodType methodType, string value) =>
        new() { MethodType = methodType, Value = value };

    protected static ContactMethodDbModel CreateMethodDbModel(ContactMethodType methodType, string value) =>
        new()
        {
            Id = Guid.NewGuid(),
            MethodType = methodType,
            Value = value,
        };
}
