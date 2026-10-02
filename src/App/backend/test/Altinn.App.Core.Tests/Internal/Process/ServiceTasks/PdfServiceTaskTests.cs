using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Features.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class PdfServiceTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<IPdfFileNameResolver> _pdfFileNameResolverMock = new();
    private readonly Mock<ILogger<PdfServiceTask>> _loggerMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IAppResources> _appResourcesMock = new();
    private readonly PdfServiceTask _serviceTask;

    private const string FileName = "customFilenameTextResourceKey";

    public PdfServiceTaskTests()
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "pdf",
                    PdfConfiguration = new AltinnPdfConfiguration { FilenameTextResourceKey = FileName },
                }
            );
        _pdfServiceMock
            .Setup(x =>
                x.GeneratePdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<string?>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new byte[] { 1, 2, 3 });
        _pdfFileNameResolverMock
            .Setup(x =>
                x.GetFileName(It.IsAny<IInstanceDataAccessor>(), It.IsAny<string?>(), It.IsAny<SubformPdfContext?>())
            )
            .ReturnsAsync("receipt.pdf");

        _serviceTask = new PdfServiceTask(
            _pdfServiceMock.Object,
            _pdfFileNameResolverMock.Object,
            _processReaderMock.Object,
            _appResourcesMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task Execute_Should_Call_GeneratePdf()
    {
        // Arrange
        // No autoPdfTaskIds, so the PDF comes from the task's own UI folder.
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder("taskId"))
            .Returns(new LayoutSettings { Pages = new Pages { PdfLayoutName = "PdfLayout" } });
        var instanceMutatorMock = CreateInstanceMutatorMock("taskId");
        var parameters = CreateServiceTaskContext(instanceMutatorMock);

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _pdfServiceMock.Verify(
            x =>
                x.GeneratePdf(
                    instanceMutatorMock.Object.Instance,
                    "taskId",
                    It.IsAny<List<string>?>(),
                    "en",
                    false,
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Should_Add_The_Pdf_Generated_From_The_Task()
    {
        // Arrange
        // No autoPdfTaskIds, so the PDF comes from the task's own UI folder.
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder("taskId"))
            .Returns(new LayoutSettings { Pages = new Pages { PdfLayoutName = "PdfLayout" } });
        var instanceMutatorMock = CreateInstanceMutatorMock("taskId");
        var parameters = CreateServiceTaskContext(instanceMutatorMock);

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _pdfFileNameResolverMock.Verify(x => x.GetFileName(instanceMutatorMock.Object, FileName, null), Times.Once);
        instanceMutatorMock.Verify(
            x =>
                x.AddBinaryDataElement(
                    "ref-data-as-pdf",
                    "application/pdf",
                    "receipt.pdf",
                    It.Is<ReadOnlyMemory<byte>>(bytes => bytes.ToArray().SequenceEqual(new byte[] { 1, 2, 3 })),
                    "taskId",
                    null
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Should_Pass_AutoPdfTaskIds_To_PdfService()
    {
        // Arrange
        var taskIds = new List<string> { "Task_1", "Task_2", "Task_3" };

        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("pdfTask"))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "pdf",
                    PdfConfiguration = new AltinnPdfConfiguration
                    {
                        FilenameTextResourceKey = "customFilenameTextResourceKey",
                        AutoPdfTaskIds = taskIds,
                    },
                }
            );

        var instanceMutatorMock = CreateInstanceMutatorMock("pdfTask");
        var parameters = CreateServiceTaskContext(instanceMutatorMock);

        // Act
        await _serviceTask.Execute(parameters);

        // Assert
        _pdfServiceMock.Verify(
            x =>
                x.GeneratePdf(
                    instanceMutatorMock.Object.Instance,
                    "pdfTask",
                    taskIds,
                    "en",
                    false,
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Fails_Permanently_When_There_Is_Nothing_To_Render()
    {
        // Neither autoPdfTaskIds nor a UI folder for the PDF task - the setup from Altinn/altinn-studio#19425.
        var result = await _serviceTask.Execute(CreateContext("taskId"));

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("'taskId' has nothing to render", failed.ErrorMessage);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_Fails_Permanently_When_AutoPdfTaskIds_Only_Has_Blank_Entries()
    {
        SetupAutoPdfTaskIds("pdfTask", [" "]);

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_Fails_Permanently_When_AutoPdfTaskIds_Is_Combined_With_A_UI_Folder_Without_PdfLayoutName()
    {
        SetupAutoPdfTaskIds("pdfTask", ["Task_1"]);
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder("pdfTask"))
            .Returns(new LayoutSettings { Pages = new Pages() });

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        var failed = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("without a pdfLayoutName", failed.ErrorMessage);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_Generates_From_Own_UI_Folder_With_PdfLayoutName_Even_With_AutoPdfTaskIds()
    {
        SetupAutoPdfTaskIds("pdfTask", ["Task_1"]);
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder("pdfTask"))
            .Returns(new LayoutSettings { Pages = new Pages { PdfLayoutName = "PdfLayout" } });

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        Assert.IsType<ServiceTaskSuccessResult>(result);
        _pdfServiceMock.Verify(
            x =>
                x.GeneratePdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<string?>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private void SetupAutoPdfTaskIds(string pdfTaskId, List<string> autoPdfTaskIds) =>
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(pdfTaskId))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "pdf",
                    PdfConfiguration = new AltinnPdfConfiguration { AutoPdfTaskIds = autoPdfTaskIds },
                }
            );

    private static ServiceTaskContext CreateContext(string currentTaskId) =>
        CreateServiceTaskContext(CreateInstanceMutatorMock(currentTaskId));

    private static Mock<IInstanceDataMutator> CreateInstanceMutatorMock(string currentTaskId)
    {
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = currentTaskId } },
        };

        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);
        instanceMutatorMock.Setup(x => x.Language).Returns("en");
        return instanceMutatorMock;
    }

    private static ServiceTaskContext CreateServiceTaskContext(Mock<IInstanceDataMutator> instanceMutatorMock)
    {
        return new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
    }
}
