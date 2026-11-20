using System;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class DeploymentMapperTests
{
    [Theory]
    [InlineData("UnderDevelopment", AppStatus.UnderDevelopment)]
    [InlineData("Completed", AppStatus.Completed)]
    [InlineData("Deprecated", AppStatus.Deprecated)]
    [InlineData(null, null)]
    [InlineData("SomeFutureStatus", null)]
    [InlineData("completed", null)]
    [InlineData("42", null)]
    public void MapToModel_MapsKnownAppStatusAndTreatsUnknownAsNull(
        string storedAppStatus,
        AppStatus? expectedAppStatus
    )
    {
        DeploymentDbModel dbObject = new()
        {
            Org = "ttd",
            App = "test-app",
            EnvName = "tt02",
            Tagname = "1.0.0",
            CreatedBy = "testUser",
            Created = DateTime.UtcNow,
            Entity = "{}",
            AppStatus = storedAppStatus,
        };

        DeploymentEntity deploymentEntity = DeploymentMapper.MapToModel(dbObject);

        Assert.Equal(expectedAppStatus, deploymentEntity.AppStatus);
    }
}
