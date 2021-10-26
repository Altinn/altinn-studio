using System;
using System.IO;
using System.Net.Http;
using System.Security.Claims;
using Altinn.App.PlatformServices.Implementation;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

using Xunit;

namespace App.IntegrationTestsRef.Process
{
    public class ProcessEngineTest
    {
        /// <summary>
        /// Test to verify start process
        /// </summary>
        [Fact]
        public async void ProcessStart()
        {
            PlatformSettings plattformSettings = new PlatformSettings();
            plattformSettings.ApiStorageEndpoint = "http://platform.mock.no";
            Moq.Mock<IOptions<PlatformSettings>> moqPlattformSettings = new Mock<IOptions<PlatformSettings>>();
            moqPlattformSettings.Setup(c => c.Value).Returns(plattformSettings);

            AppSettings appSettings = new AppSettings();
            appSettings.AppBasePath = GetAppPath("ttd", "presentationfields-app");
            Moq.Mock<IOptions<AppSettings>> moqappSettings = new Mock<IOptions<AppSettings>>();
            moqappSettings.Setup(c => c.Value).Returns(appSettings);

            Moq.Mock<IInstanceEvent> moqInstanceEvents = new Mock<IInstanceEvent>();

            Moq.Mock<ILogger<ProcessAppSI>> moqLogger = new Mock<ILogger<ProcessAppSI>>();
            Moq.Mock<IHttpContextAccessor> moqContextAccessor = new Mock<IHttpContextAccessor>();
            HttpClient httpClient = new HttpClient();

            Instance instance = new Instance();
            instance.Id = "1337/" + Guid.NewGuid();
            instance.InstanceOwner = new InstanceOwner() { PartyId = "1337" };

            ProcessChangeHandler processChangeHandler = new ProcessChangeHandler();
            ProcessAppSI processSi = new ProcessAppSI(moqPlattformSettings.Object, moqappSettings.Object, moqInstanceEvents.Object, moqLogger.Object, moqContextAccessor.Object, httpClient);
            ProcessEngine processEngine = new ProcessEngine(processChangeHandler, processSi);

            ProcessChangeContext processChange = new ProcessChangeContext();
            processChange.Instance = instance;
            processChange.Performer = PrincipalUtil.GetUserPrincipal(1337);

            ProcessChangeContext updated = await processEngine.StartProcess(processChange);

            Assert.NotNull(updated.Instance.Id);
            Assert.Equal("StartEvent_1", updated.Instance.Process.StartEvent);
            Assert.Equal("Task_1", updated.Instance.Process.CurrentTask.ElementId);
            Assert.Equal(2, updated.Events.Count);
        }

        /// <summary>
        /// Test to verify start process and then next
        /// </summary>
        [Fact]
        public async void ProcessNext()
        {
            PlatformSettings plattformSettings = new PlatformSettings();
            plattformSettings.ApiStorageEndpoint = "http://platform.mock.no";
            Moq.Mock<IOptions<PlatformSettings>> moqPlattformSettings = new Mock<IOptions<PlatformSettings>>();
            moqPlattformSettings.Setup(c => c.Value).Returns(plattformSettings);

            AppSettings appSettings = new AppSettings();
            appSettings.AppBasePath = GetAppPath("ttd", "presentationfields-app");
            Moq.Mock<IOptions<AppSettings>> moqappSettings = new Mock<IOptions<AppSettings>>();
            moqappSettings.Setup(c => c.Value).Returns(appSettings);

            Moq.Mock<IInstanceEvent> moqInstanceEvents = new Mock<IInstanceEvent>();

            Moq.Mock<ILogger<ProcessAppSI>> moqLogger = new Mock<ILogger<ProcessAppSI>>();
            Moq.Mock<IHttpContextAccessor> moqContextAccessor = new Mock<IHttpContextAccessor>();
            HttpClient httpClient = new HttpClient();

            Instance instance = new Instance();
            instance.Id = "1337/" + Guid.NewGuid();
            instance.InstanceOwner = new InstanceOwner() { PartyId = "1337" };

            ProcessChangeHandler processChangeHandler = new ProcessChangeHandler();
            ProcessAppSI processSi = new ProcessAppSI(moqPlattformSettings.Object, moqappSettings.Object, moqInstanceEvents.Object, moqLogger.Object, moqContextAccessor.Object, httpClient);
            ProcessEngine processEngine = new ProcessEngine(processChangeHandler, processSi);

            ProcessChangeContext processChange = new ProcessChangeContext();
            processChange.Instance = instance;
            processChange.Performer = PrincipalUtil.GetUserPrincipal(1337);

            ProcessChangeContext updated = await processEngine.StartProcess(processChange);
            updated = await processEngine.Next(updated);

            Assert.NotNull(updated.Instance.Id);
            Assert.Equal("StartEvent_1", updated.Instance.Process.StartEvent);
            Assert.NotNull(updated.Instance.Process.Ended);
            Assert.Equal("EndEvent_1", updated.Instance.Process.EndEvent);
            Assert.Equal(3, updated.Events.Count);
        }

        /// <summary>
        /// Test to verify start process and then next
        /// </summary>
        [Fact]
        public async void ProcessNextComplex()
        {
            PlatformSettings plattformSettings = new PlatformSettings();
            plattformSettings.ApiStorageEndpoint = "http://platform.mock.no";
            Moq.Mock<IOptions<PlatformSettings>> moqPlattformSettings = new Mock<IOptions<PlatformSettings>>();
            moqPlattformSettings.Setup(c => c.Value).Returns(plattformSettings);

            AppSettings appSettings = new AppSettings();
            appSettings.AppBasePath = GetAppPath("tdd", "complex-process");
            Moq.Mock<IOptions<AppSettings>> moqappSettings = new Mock<IOptions<AppSettings>>();
            moqappSettings.Setup(c => c.Value).Returns(appSettings);

            Moq.Mock<IInstanceEvent> moqInstanceEvents = new Mock<IInstanceEvent>();

            Moq.Mock<ILogger<ProcessAppSI>> moqLogger = new Mock<ILogger<ProcessAppSI>>();
            Moq.Mock<IHttpContextAccessor> moqContextAccessor = new Mock<IHttpContextAccessor>();
            HttpClient httpClient = new HttpClient();

            Instance instance = new Instance();
            instance.Id = "1337/" + Guid.NewGuid();
            instance.InstanceOwner = new InstanceOwner() { PartyId = "1337" };

            ProcessChangeHandler processChangeHandler = new ProcessChangeHandler();
            ProcessAppSI processSi = new ProcessAppSI(moqPlattformSettings.Object, moqappSettings.Object, moqInstanceEvents.Object, moqLogger.Object, moqContextAccessor.Object, httpClient);
            ProcessEngine processEngine = new ProcessEngine(processChangeHandler, processSi);

            ProcessChangeContext processChange = new ProcessChangeContext();
            processChange.Instance = instance;
            processChange.Performer = PrincipalUtil.GetUserPrincipal(1337);

            // First start task 
            ProcessChangeContext updated = await processEngine.StartProcess(processChange);
            Assert.Equal("Task_1", updated.Instance.Process.CurrentTask.ElementId);

            // Trigger next
            updated = await processEngine.Next(updated);

            Assert.NotNull(updated.Instance.Id);
            Assert.Equal("StartEvent_1", updated.Instance.Process.StartEvent);
            Assert.Equal("Task_2", updated.Instance.Process.CurrentTask.ElementId);
            Assert.Equal(2, updated.Events.Count);
        }

        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ProcessEngineTest).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/Apps/{org}/{app}/");
        }
    }
}
