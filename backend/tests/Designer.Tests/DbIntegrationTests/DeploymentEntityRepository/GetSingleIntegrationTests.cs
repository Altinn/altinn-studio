using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetSingleIntegrationTests : DbIntegrationTestsBase
{
    public GetSingleIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Get_ShouldReturnRecordFromDatabase(string org)
    {
        var deploymentEntity = EntityGenerationUtils.GenerateDeploymentEntity(org);
        await PrepareEntityInDatabase(deploymentEntity);

        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var result = await repository.Get(deploymentEntity.Org, deploymentEntity.Build.Id);
        result.Should().BeEquivalentTo(deploymentEntity);
    }

    private async Task PrepareEntityInDatabase(DeploymentEntity deploymentEntity)
    {
        var dbObject = new Altinn.Studio.Designer.Repository.ORMImplementation.Models.Deployment
        {
            Buildid = deploymentEntity.Build.Id,
            Tagname = deploymentEntity.TagName,
            Org = deploymentEntity.Org,
            App = deploymentEntity.App,
            Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue(),
            Created = deploymentEntity.Created,
            Entity = JsonSerializer.Serialize(deploymentEntity, JsonOptions)
        };

        await DbFixture.DbContext.Deployments.AddAsync(dbObject);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }
}
