using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class EformidlingServiceTaskTests
{
    private readonly ILogger<EformidlingServiceTask> _logger;
    private readonly Mock<IAppMetadata> _appMetadata;
    private readonly Mock<IInstanceClient> _instanceClient;
    private readonly Mock<IEFormidlingService> _eFormidlingService;

    public EformidlingServiceTaskTests()
    {
        _logger = NullLogger<EformidlingServiceTask>.Instance;
        _appMetadata = new Mock<IAppMetadata>();
        _instanceClient = new Mock<IInstanceClient>();
        _eFormidlingService = new Mock<IEFormidlingService>();
    }

    [Fact]
    public async Task Execute_EFormidlingIsEnabledAndSendAfterTaskIdMatchesCurrentTask_EFormidlingShipment_is_sent()
    {
        // Arrange
        var appSettings = new AppSettings { EnableEFormidling = true };
        var applicationMetadata = new ApplicationMetadata("ttd/test")
        {
            EFormidling = new EFormidlingContract() { SendAfterTaskId = "Task_1" }
        };
        var instance = new Instance();
        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        _instanceClient.Setup(x => x.GetInstance(instance)).ReturnsAsync(instance);
        _eFormidlingService.Setup(x => x.SendEFormidlingShipment(instance)).Returns(Task.CompletedTask);
        var eformidlingServiceTask = GetEformidlingServiceTask(appSettings, _eFormidlingService.Object);

        // Act
        await eformidlingServiceTask.Execute("Task_1", instance);

        // Assert
        _appMetadata.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _instanceClient.Verify(x => x.GetInstance(instance), Times.Once);
        _eFormidlingService.Verify(x => x.SendEFormidlingShipment(instance), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _eFormidlingService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_EFormidlingIsEnabledAndSendAfterTaskIdMatchesCurrentTask_but_EformidlingService_is_null_EFormidlingShipment_is_not_sent()
    {
        // Arrange
        var appSettings = new AppSettings { EnableEFormidling = true };
        var applicationMetadata = new ApplicationMetadata("ttd/test")
        {
            EFormidling = new EFormidlingContract() { SendAfterTaskId = "Task_1" }
        };
        var instance = new Instance();
        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var eformidlingServiceTask = GetEformidlingServiceTask(appSettings);

        // Act
        await eformidlingServiceTask.Execute("Task_1", instance);

        // Assert
        _appMetadata.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _eFormidlingService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_EFormidlingIsNotEnabledAndSendAfterTaskIdMatchesCurrentTask_EFormidlingShipment_is_not_sent()
    {
        // Arrange
        var appSettings = new AppSettings { EnableEFormidling = false };
        var applicationMetadata = new ApplicationMetadata("ttd/test")
        {
            EFormidling = new EFormidlingContract() { SendAfterTaskId = "Task_1" }
        };
        var instance = new Instance();
        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var eformidlingServiceTask = GetEformidlingServiceTask(appSettings, _eFormidlingService.Object);

        // Act
        await eformidlingServiceTask.Execute("Task_1", instance);

        // Assert
        _appMetadata.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _eFormidlingService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_EFormidlingIsEnabledAndSendAfterTaskIdNotMatchingCurrentTask_EFormidlingShipment_is_not_sent()
    {
        // Arrange
        var appSettings = new AppSettings { EnableEFormidling = true };
        var applicationMetadata = new ApplicationMetadata("ttd/test")
        {
            EFormidling = new EFormidlingContract() { SendAfterTaskId = "Task_2" }
        };
        var instance = new Instance();
        _appMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var eformidlingServiceTask = GetEformidlingServiceTask(appSettings, _eFormidlingService.Object);

        // Act
        await eformidlingServiceTask.Execute("Task_1", instance);

        // Assert
        _appMetadata.Verify(x => x.GetApplicationMetadata(), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _instanceClient.VerifyNoOtherCalls();
        _eFormidlingService.VerifyNoOtherCalls();
    }

    public EformidlingServiceTask GetEformidlingServiceTask(
        AppSettings? appSettings,
        IEFormidlingService? eFormidlingService = null
    )
    {
        return new EformidlingServiceTask(
            _logger,
            _appMetadata.Object,
            _instanceClient.Object,
            eFormidlingService,
            appSettings == null ? null : Options.Create(appSettings)
        );
    }
}
