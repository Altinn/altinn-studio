using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Reports;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ContactPointRepository;

public class ContactPointRepositoryIntegrationTests : DbIntegrationTestsBase
{
    public ContactPointRepositoryIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByOrgAndOrderByName()
    {
        var org = $"org-{Guid.NewGuid():N}";

        await SeedContactPointAsync(
            org,
            "zeta",
            true,
            ["prod"],
            [CreateMethodDbModel(ContactMethodType.Email, "zeta@example.com")]
        );
        await SeedContactPointAsync(
            org,
            "alpha",
            true,
            ["test"],
            [CreateMethodDbModel(ContactMethodType.Slack, "#alpha")]
        );
        await SeedContactPointAsync(
            $"{org}-other",
            "beta",
            true,
            [],
            [CreateMethodDbModel(ContactMethodType.Email, "other@example.com")]
        );

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ContactPointRepository(
            DbFixture.DbContext
        );

        var result = await repository.GetAllAsync(org);

        Assert.Collection(
            result,
            first =>
            {
                Assert.Equal(org, first.Org);
                Assert.Equal("alpha", first.Name);
            },
            second =>
            {
                Assert.Equal(org, second.Org);
                Assert.Equal("zeta", second.Name);
            }
        );
    }

    [Fact]
    public async Task UpdateAsync_ShouldReplaceMethodsAndUpdateFields()
    {
        var org = $"org-{Guid.NewGuid():N}";
        var existing = await SeedContactPointAsync(
            org,
            "before-update",
            true,
            ["prod"],
            [
                CreateMethodDbModel(ContactMethodType.Email, "before@example.com"),
                CreateMethodDbModel(ContactMethodType.Slack, "#before"),
            ]
        );
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ContactPointRepository(
            DbFixture.DbContext
        );
        var updateEntity = new ContactPointEntity
        {
            Id = existing.Id,
            Org = org,
            Name = "after-update",
            IsActive = false,
            Environments = ["dev", "staging"],
            Methods = [new ContactMethodEntity { MethodType = ContactMethodType.Sms, Value = "+4711223344" }],
        };

        var result = await repository.UpdateAsync(updateEntity);

        Assert.Equal(updateEntity.Id, result.Id);
        Assert.Equal(updateEntity.Name, result.Name);
        Assert.False(result.IsActive);
        Assert.Equal(updateEntity.Environments, result.Environments);
        Assert.Single(result.Methods);
        Assert.Equal(ContactMethodType.Sms, result.Methods[0].MethodType);
        Assert.Equal("+4711223344", result.Methods[0].Value);

        DbFixture.DbContext.ChangeTracker.Clear();
        var dbRecord = await DbFixture
            .DbContext.ContactPoints.Include(contactPoint => contactPoint.Methods)
            .AsNoTracking()
            .SingleAsync(contactPoint => contactPoint.Id == existing.Id);

        Assert.Equal(updateEntity.Name, dbRecord.Name);
        Assert.False(dbRecord.IsActive);
        Assert.Equal(updateEntity.Environments, dbRecord.Environments);
        Assert.Single(dbRecord.Methods);
        Assert.Equal(ContactMethodType.Sms, dbRecord.Methods[0].MethodType);
        Assert.Equal("+4711223344", dbRecord.Methods[0].Value);
        Assert.DoesNotContain(dbRecord.Methods, method => method.Value == "before@example.com");
        Assert.DoesNotContain(dbRecord.Methods, method => method.Value == "#before");
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveContactPointAndCascadeDeleteMethods()
    {
        var org = $"org-{Guid.NewGuid():N}";
        var existing = await SeedContactPointAsync(
            org,
            "before-delete",
            true,
            [],
            [
                CreateMethodDbModel(ContactMethodType.Email, "delete@example.com"),
                CreateMethodDbModel(ContactMethodType.Slack, "#delete"),
            ]
        );
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ContactPointRepository(
            DbFixture.DbContext
        );

        await repository.DeleteAsync(org, existing.Id);

        DbFixture.DbContext.ChangeTracker.Clear();
        var deletedContactPoint = await DbFixture
            .DbContext.ContactPoints.AsNoTracking()
            .SingleOrDefaultAsync(contactPoint => contactPoint.Id == existing.Id);
        var deletedMethods = await DbFixture
            .DbContext.ContactMethods.AsNoTracking()
            .Where(method => method.ContactPointId == existing.Id)
            .ToListAsync();

        Assert.Null(deletedContactPoint);
        Assert.Empty(deletedMethods);
    }

    [Fact]
    public async Task GetReportTargetsAsync_ShouldReturnEachSubscribedOrgAndEnvironmentOnce()
    {
        var org = $"org-{Guid.NewGuid():N}";
        var otherOrg = $"org-{Guid.NewGuid():N}";
        List<ContactMethodDbModel> Email() => [CreateMethodDbModel(ContactMethodType.Email, "report@example.com")];

        await SeedContactPointAsync(org, "weekly", true, ["tt02", "prod"], Email(), ReportFrequency.Weekly);
        await SeedContactPointAsync(org, "weekly-duplicate", true, ["tt02"], Email(), ReportFrequency.Weekly);
        await SeedContactPointAsync(org, "weekly-inactive", false, ["at22"], Email(), ReportFrequency.Weekly);
        await SeedContactPointAsync(org, "daily", true, ["yt01"], Email(), ReportFrequency.Daily);
        await SeedContactPointAsync(org, "no-report", true, ["at23"], Email());
        await SeedContactPointAsync(otherOrg, "weekly", true, ["tt02"], Email(), ReportFrequency.Weekly);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.ContactPointRepository(
            DbFixture.DbContext
        );

        var result = await repository.GetReportTargetsAsync(ReportFrequency.Weekly);

        Assert.Equal(
            [new ReportTarget(org, "prod"), new ReportTarget(org, "tt02")],
            result.Where(target => target.Org == org)
        );
        Assert.Contains(new ReportTarget(otherOrg, "tt02"), result);
    }

    private async Task<ContactPointDbModel> SeedContactPointAsync(
        string org,
        string name,
        bool isActive,
        List<string> environments,
        List<ContactMethodDbModel> methods,
        ReportFrequency reportFrequency = ReportFrequency.None
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
            ReportFrequency = (int)reportFrequency,
        };

        foreach (var method in contactPoint.Methods)
        {
            method.ContactPointId = contactPoint.Id;
        }

        await DbFixture.DbContext.ContactPoints.AddAsync(contactPoint);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.ChangeTracker.Clear();

        return contactPoint;
    }

    private static ContactMethodDbModel CreateMethodDbModel(ContactMethodType methodType, string value) =>
        new()
        {
            Id = Guid.NewGuid(),
            MethodType = methodType,
            Value = value,
        };
}
