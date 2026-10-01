using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
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
            .ReturnsAsync(() => new MemoryStream(new byte[] { 1, 2, 3 }));
        _pdfFileNameResolverMock
            .Setup(x =>
                x.GetFileName(It.IsAny<IInstanceDataAccessor>(), It.IsAny<string?>(), It.IsAny<SubformPdfContext?>())
            )
            .ReturnsAsync("receipt.pdf");

        _serviceTask = new PdfServiceTask(
            _pdfServiceMock.Object,
            _pdfFileNameResolverMock.Object,
            _processReaderMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task Execute_Should_Call_GeneratePdf()
    {
        // Arrange
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
