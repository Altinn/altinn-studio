using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
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
            ProcessAppSI processAppSI = GetProcessService();

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
            ProcessAppSI processAppSI = GetProcessService();

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
            ProcessAppSI processAppSI = GetProcessService();

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

        private static ProcessAppSI GetProcessService()
        {
            AppSettings appSettings = new AppSettings();
            appSettings.AppBasePath = GetAppPath("tdd", "endring-av-navn");
            IOptions<AppSettings> appSettingsO = Options.Create<AppSettings>(appSettings);

            PlatformSettings platformSettings = new PlatformSettings();
            platformSettings.ApiStorageEndpoint = "http://localhost/";
            IOptions<PlatformSettings> plattformSettings0 = Options.Create<PlatformSettings>(platformSettings);

            ProcessAppSI processAppSI = new ProcessAppSI(plattformSettings0, appSettingsO, null, null, null, new System.Net.Http.HttpClient());
            return processAppSI;
        }


        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ProcessEngineTest).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/Apps/{org}/{app}/");
        }
    }
}
