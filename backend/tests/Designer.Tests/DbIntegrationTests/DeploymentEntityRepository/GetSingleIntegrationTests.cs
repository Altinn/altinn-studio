using System.Text.Json;
using System.Text.Json.Serialization;
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
    private JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };
    public GetSingleIntegrationTests(PostgreSqlFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Get_ShouldReturnRecordFromDatabase(string org)
    {
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(org);
        await PrepareEntityInDatabase(deploymentEntity);

        var repository = new ORMDeploymentRepository(DbContext);
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
            Entity = JsonSerializer.Serialize(deploymentEntity, _jsonOptions)
        };

        await DbContext.Deployments.AddAsync(dbObject);
        await DbContext.SaveChangesAsync();
        DbContext.Entry(dbObject).State = EntityState.Detached;

    }
}
