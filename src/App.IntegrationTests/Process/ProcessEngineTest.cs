using System;
using System.IO;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Xunit;

namespace App.IntegrationTestsRef.Process
{
    /// <summary>
    /// Test clas for SimpleInstanceMapper
    /// </summary>
    public class ProcessEngineTest
    {
        [Fact]
        public async void MissingCurrentTask()
        {
            ProcessClient processAppSI = GetProcessService();

            ProcessEngine processEngine = new ProcessEngine(null, processAppSI);

            Instance instance = new Instance();
            instance.Process = new ProcessState();

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null);

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Equal("Instance does not have current task information!", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void RequestingCurrentTask()
        {
            ProcessClient processAppSI = GetProcessService();

            ProcessEngine processEngine = new ProcessEngine(null, processAppSI);

            Instance instance = new Instance();
            instance.Process = new ProcessState();
            instance.Process.CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null);
            processChangeContext.RequestedProcessElementId = "Task_1";

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Equal("Requested process element Task_1 is same as instance's current task. Cannot change process.", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void RequestInvalidTask()
        {
            ProcessClient processAppSI = GetProcessService();

            ProcessEngine processEngine = new ProcessEngine(null, processAppSI);

            Instance instance = new Instance();
            instance.Process = new ProcessState();
            instance.Process.CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null);
            processChangeContext.RequestedProcessElementId = "Task_10";

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("The proposed next element id 'Task_10' is", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void StartStartedTask()
        {
            ProcessClient processAppSI = GetProcessService();

            ProcessEngine processEngine = new ProcessEngine(null, processAppSI);

            Instance instance = new Instance();
            instance.Process = new ProcessState();
            instance.Process.CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null);
            processChangeContext.RequestedProcessElementId = "Task_10";

            processChangeContext = await processEngine.StartProcess(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("Process is already started. Use next.", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void InvalidStartEvent()
        {
            ProcessClient processAppSI = GetProcessService();

            ProcessEngine processEngine = new ProcessEngine(null, processAppSI);

            Instance instance = new Instance();
            
            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null);
            processChangeContext.RequestedProcessElementId = "Task_10";

            processChangeContext = await processEngine.StartProcess(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("No matching startevent", processChangeContext.ProcessMessages[0].Message);
        }

        private static ProcessClient GetProcessService()
        {
            AppSettings appSettings = new AppSettings();
            appSettings.AppBasePath = GetAppPath("tdd", "endring-av-navn");
            IOptions<AppSettings> appSettingsO = Options.Create<AppSettings>(appSettings);

            PlatformSettings platformSettings = new PlatformSettings();
            platformSettings.ApiStorageEndpoint = "http://localhost/";
            IOptions<PlatformSettings> plattformSettings0 = Options.Create<PlatformSettings>(platformSettings);

            ProcessClient processAppSI = new ProcessClient(plattformSettings0, appSettingsO, null, null, null, new System.Net.Http.HttpClient());
            return processAppSI;
        }

        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ProcessEngineTest).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/apps/{org}/{app}/");
        }
    }
}
