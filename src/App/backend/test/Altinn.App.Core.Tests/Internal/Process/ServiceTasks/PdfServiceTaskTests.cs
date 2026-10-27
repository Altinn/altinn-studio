using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Tests.Features.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class PdfServiceTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<ITranslationService> _translationServiceMock = new();
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
                    It.IsAny<string>(),
                    It.IsAny<List<string>?>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new byte[] { 1, 2, 3 });
        _translationServiceMock
            .Setup(x =>
                x.TranslateTextKey(
                    It.IsAny<string>(),
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ComponentContext?>(),
                    null
                )
            )
            .ReturnsAsync("receipt.pdf");

        _serviceTask = new PdfServiceTask(
            _pdfServiceMock.Object,
            _translationServiceMock.Object,
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
                    "en",
                    It.IsAny<List<string>?>(),
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
        _translationServiceMock.Verify(
            x =>
                x.TranslateTextKey(
                    FileName,
                    instanceMutatorMock.Object,
                    It.Is<ComponentContext>(c => c.DataElementIdentifier == null),
                    null
                ),
            Times.Once
        );
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
                    "en",
                    taskIds,
                    false,
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_Fails_Permanently_When_AutoPdfTaskIds_Only_Has_Blank_Entries()
    {
        SetupAutoPdfTaskIds("pdfTask", [" "]);

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    public enum UiFolder
    {
        None,
        WithoutPdfLayoutName,
        WithPdfLayoutName,
    }

    [Theory]
    // pdfLayoutName draws the PDF, and the listed tasks are ignored
    [InlineData(UiFolder.WithPdfLayoutName, false)]
    [InlineData(UiFolder.WithPdfLayoutName, true)]
    // Without pdfLayoutName, the PDF is the automatic one from autoPdfTaskIds, folder or not
    [InlineData(UiFolder.WithoutPdfLayoutName, true)]
    [InlineData(UiFolder.None, true)]
    public async Task Execute_Generates_The_Pdf_When_There_Is_Something_To_Render(UiFolder uiFolder, bool listsTasks)
    {
        List<string> autoPdfTaskIds = listsTasks ? ["Task_1"] : [];
        SetupAutoPdfTaskIds("pdfTask", autoPdfTaskIds);
        SetupUiFolder("pdfTask", uiFolder);

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        Assert.IsType<SuccessfulServiceTaskResult>(result);
        _pdfServiceMock.Verify(
            x =>
                x.GeneratePdf(
                    It.IsAny<Instance>(),
                    "pdfTask",
                    It.IsAny<string>(),
                    autoPdfTaskIds,
                    false,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    // Neither autoPdfTaskIds nor a UI folder for the PDF task - the setup from Altinn/altinn-studio#19425.
    [InlineData(UiFolder.None)]
    // The folder's pages are what people see while the process is at the task, never the PDF.
    [InlineData(UiFolder.WithoutPdfLayoutName)]
    public async Task Execute_Fails_Permanently_When_There_Is_Nothing_To_Render(UiFolder uiFolder)
    {
        SetupAutoPdfTaskIds("pdfTask", []);
        SetupUiFolder("pdfTask", uiFolder);

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        var failed = Assert.IsType<FailedServiceTaskResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains("'pdfTask' has nothing to render", failed.ErrorMessage);
        Assert.Contains("'ui/pdfTask/Settings.json'", failed.ErrorMessage);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task Execute_Treats_A_Blank_PdfLayoutName_As_None(string pdfLayoutName)
    {
        SetupAutoPdfTaskIds("pdfTask", []);
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder("pdfTask"))
            .Returns(new LayoutSettings { Pages = new Pages { PdfLayoutName = pdfLayoutName } });

        var result = await _serviceTask.Execute(CreateContext("pdfTask"));

        Assert.Equal(FailureKind.Permanent, Assert.IsType<FailedServiceTaskResult>(result).Kind);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    private void SetupUiFolder(string pdfTaskId, UiFolder uiFolder) =>
        _appResourcesMock
            .Setup(x => x.GetLayoutSettingsForFolder(pdfTaskId))
            .Returns(
                uiFolder switch
                {
                    UiFolder.None => null,
                    UiFolder.WithoutPdfLayoutName => new LayoutSettings
                    {
                        Pages = new Pages { Order = ["WaitingPage"] },
                    },
                    _ => new LayoutSettings
                    {
                        Pages = new Pages { Order = ["WaitingPage"], PdfLayoutName = "PdfLayout" },
                    },
                }
            );

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

    private static StageContext CreateContext(string currentTaskId) =>
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

    private static StageContext CreateServiceTaskContext(Mock<IInstanceDataMutator> instanceMutatorMock)
    {
        return new StageContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
    }
}
