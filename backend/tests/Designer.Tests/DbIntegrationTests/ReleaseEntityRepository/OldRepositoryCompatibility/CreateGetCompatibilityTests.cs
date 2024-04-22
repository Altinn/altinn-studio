using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.OldRepositoryCompatibility;

public class CreateGetCompatibilityTests : ReleaseEntityIntegrationTestsBase
{
    public CreateGetCompatibilityTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task CreateOld_ShouldBeCompatibleWithNewGet(string org)
    {
        var oldRepository = CreateOldRepository();
        string buildId = Guid.NewGuid().ToString();
        var releaseEntity = EntityGenerationUtils.GenerateReleaseEntity(org, buildId: buildId);
        await oldRepository.Create(releaseEntity);
        var newRepository = new ORMReleaseRepository(DbFixture.DbContext);
        var queriedEntity = (await newRepository.Get(org, buildId)).Single();
        queriedEntity.Should().BeEquivalentTo(releaseEntity);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task CreateNew_ShouldBeCompatibleWithOldGet(string org)
    {
        var newRepository = new ORMReleaseRepository(DbFixture.DbContext);
        string buildId = Guid.NewGuid().ToString();
        var releaseEntity = EntityGenerationUtils.GenerateReleaseEntity(org, buildId: buildId);
        await newRepository.Create(releaseEntity);
        var oldRepository = CreateOldRepository();
        var queriedEntity = (await oldRepository.Get(org, buildId)).Single();
        queriedEntity.Should().BeEquivalentTo(releaseEntity);
    }

    private ReleaseRepository CreateOldRepository()
    {
        var options = new PostgreSQLSettings
        {
            ConnectionString = DbFixture.ConnectionString
        };
        return new ReleaseRepository(options, new Mock<ILogger<ReleaseRepository>>().Object);
    }
}
