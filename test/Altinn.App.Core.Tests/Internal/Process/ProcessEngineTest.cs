using System.Collections.Generic;
using System.IO;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Process
{
    /// <summary>
    /// Test clas for SimpleInstanceMapper
    /// </summary>
    public class ProcessEngineTest
    {
        [Fact]
        public async void MissingCurrentTask()
        {
            IProcessReader processReader = GetProcessReader();

            ProcessEngine processEngine = new ProcessEngine(null!, processReader, GetFlowHydration(processReader));

            Instance instance = new Instance
            {
                Process = new ProcessState()
            };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null!);

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Equal("Instance does not have current task information!", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void RequestingCurrentTask()
        {
            IProcessReader processReader = GetProcessReader();

            ProcessEngine processEngine = new ProcessEngine(null!, processReader, GetFlowHydration(processReader));

            Instance instance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" }
                }
            };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null!)
            {
                RequestedProcessElementId = "Task_1"
            };

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Equal("Requested process element Task_1 is same as instance's current task. Cannot change process.", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void RequestInvalidTask()
        {
            IProcessReader processReader = GetProcessReader();

            ProcessEngine processEngine = new ProcessEngine(null!, processReader, GetFlowHydration(processReader));

            Instance instance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" }
                }
            };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null!)
            {
                RequestedProcessElementId = "Task_10"
            };

            processChangeContext = await processEngine.Next(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("The proposed next element id 'Task_10' is", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void StartStartedTask()
        {
            IProcessReader processReader = GetProcessReader();

            ProcessEngine processEngine = new ProcessEngine(null!, processReader, GetFlowHydration(processReader));

            Instance instance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" }
                }
            };

            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null!)
            {
                RequestedProcessElementId = "Task_10"
            };

            processChangeContext = await processEngine.StartProcess(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("Process is already started. Use next.", processChangeContext.ProcessMessages[0].Message);
        }

        [Fact]
        public async void InvalidStartEvent()
        {
            IProcessReader processReader = GetProcessReader();

            ProcessEngine processEngine = new ProcessEngine(null!, processReader, GetFlowHydration(processReader));

            Instance instance = new Instance();
            
            ProcessChangeContext processChangeContext = new ProcessChangeContext(instance, null!)
            {
                RequestedProcessElementId = "Task_10"
            };

            processChangeContext = await processEngine.StartProcess(processChangeContext);

            Assert.True(processChangeContext.FailedProcessChange);
            Assert.Contains("No matching startevent", processChangeContext.ProcessMessages[0].Message);
        }

        private static IProcessReader GetProcessReader()
        {
            AppSettings appSettings = new AppSettings
            {
                AppBasePath = Path.Join("Internal", "Process", "TestData", "ProcessEngineTest") + Path.DirectorySeparatorChar
            };
            IOptions<AppSettings> appSettingsO = Microsoft.Extensions.Options.Options.Create(appSettings);

            PlatformSettings platformSettings = new PlatformSettings
            {
                ApiStorageEndpoint = "http://localhost/"
            };
            IOptions<PlatformSettings> platformSettings0 = Microsoft.Extensions.Options.Options.Create(platformSettings);

            ProcessClient processClient = new ProcessClient(platformSettings0, appSettingsO, null!, new NullLogger<ProcessClient>(), null!, new System.Net.Http.HttpClient());
            return new ProcessReader(processClient);
        }

        private static IFlowHydration GetFlowHydration(IProcessReader processReader)
        {
            return new FlowHydration(processReader, new ExclusiveGatewayFactory(new List<IProcessExclusiveGateway>()));
        }
    }
}
