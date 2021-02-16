using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class AppBaseTests : TestBase
    {
        [Fact]
        public async Task GetOptionsDictionary_ShouldBeAllowedToEndTask()
        {
            // Arrange
            IAltinnApp app = GetApp();
            Instance instance = GetInstance(new Guid("90000000-0000-0000-0000-000000000009"));

            var filePath = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "Implementation\\data",
                "AppBaseTests_GetOptionsDictionary_ShouldBeAllowedToEndTask.json");
            var json = File.ReadAllText(filePath);

            resourceService.Setup(m => m.GetLayouts()).Returns(json);

            // Act
            await app.OnEndProcessTask("Task_1", instance);

            // Assert no exceptions
        }
    }
}
