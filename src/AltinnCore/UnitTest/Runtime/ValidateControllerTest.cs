using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RestControllers;
using AltinnCore.UnitTest.TestData;

using Microsoft.AspNetCore.Mvc;

using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Represents a collection of unit tests for the <see cref="ValidateController"/>.
    /// </summary>
    public class ValidateControllerTest
    {
        private readonly string org = "tdd";
        private readonly string app = "simple";

        private readonly int instanceOwnerId = 347829;
        private readonly Guid instanceId = Guid.Parse("762011d1-d341-4c0a-8641-d8a104e83d30");

        /// <summary>
        /// Test that target can validate a simple instance.
        /// </summary>
        /// <returns>Returns nothing</returns>
        [Fact]
        public async Task ValidateInstance_Validation_ReturnsNoError()
        {
            // Arrange
            Instance instance = InstanceData.Get(org, app, instanceOwnerId, instanceId);

            Mock<IInstance> instanceService = new Mock<IInstance>();
            instanceService
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            Application application = ApplicationData.Get(instance.AppId);

            Mock<IRepository> repositoryServiceMock = new Mock<IRepository>();
            repositoryServiceMock.Setup(r => r.GetApplication(org, app)).Returns(application);

            Instance instanceWithData = new Instance
            {
                Id = instance.Id,
                InstanceOwnerId = instance.InstanceOwnerId,
                AppId = instance.AppId,
                Org = instance.Org,
                Data = new List<DataElement>()
            };

            Mock<IData> dataService = new Mock<IData>();
            dataService
                .Setup(d => d.InsertData(It.IsAny<object>(), It.IsAny<Guid>(), It.IsAny<Type>(), org, app, It.IsAny<int>()))
                .Returns(Task.FromResult(instanceWithData));

            ValidateController target = new ValidateController(repositoryServiceMock.Object, instanceService.Object, dataService.Object, );

            // Act
            ActionResult result = await target.ValidateInstance(org, app, instanceOwnerId, instanceId);

            OkObjectResult actual = result as OkObjectResult;

            // Arrange
            Assert.NotNull(actual);

            instanceService.Verify(i => i.GetInstance(org, app, instanceOwnerId, instanceId));
        }
    }
}
