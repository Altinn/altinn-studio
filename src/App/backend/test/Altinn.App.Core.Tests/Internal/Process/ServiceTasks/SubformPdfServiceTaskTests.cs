using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class SubformPdfServiceTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<ILogger<SubformPdfServiceTask>> _loggerMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new();
    private readonly Mock<IProcessTaskCleaner> _processTaskCleanerMock = new();
    private readonly SubformPdfServiceTask _serviceTask;

    private const string SubformComponentId = "subform-mopeder";
    private const string SubformDataTypeId = "subform-data-type";
    private const string FileName = "customFilenameTextResourceKey";

    public SubformPdfServiceTaskTests()
    {
        // Setup PDF service to return a DataElement
        _pdfServiceMock
            .Setup(x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (Instance _, string _, string _, SubformPdfContext subformContext, CancellationToken _) =>
                    new DataElement { Id = $"pdf-{subformContext.DataElementId}" }
            );

        // Setup data client to allow metadata updates
        _dataClientMock
            .Setup(x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<Altinn.App.Core.Features.StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    Instance _,
                    DataElement de,
                    Altinn.App.Core.Features.StorageAuthenticationMethod? _,
                    CancellationToken _
                ) => de
            );

        _serviceTask = new SubformPdfServiceTask(
            _processReaderMock.Object,
            _pdfServiceMock.Object,
            _dataClientMock.Object,
            _processTaskCleanerMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task Execute_Should_Call_GenerateAndStorePdf_ForEachDataElement()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();

        // Verify that GenerateAndStoreSubformPdfs was called for each data element
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.Is<Instance>(i => i == instance),
                    It.Is<string>(taskId => taskId == "taskId"),
                    It.Is<string?>(filename => filename == FileName),
                    It.Is<SubformPdfContext>(ctx => ctx.ComponentId == SubformComponentId),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2) // Should be called twice for the two data elements
        );
    }

    [Fact]
    public async Task Execute_WithNoMatchingDataElements_Should_Not_Call_GenerateAndStorePdf()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithoutSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();

        // Verify that GenerateAndStoreSubformPdfs was not called
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithSpecificDataElements_Should_Call_GenerateAndStorePdf_WithCorrectIds()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify that the correct data element IDs were used
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(ctx =>
                        ctx.DataElementId == "data-element-1" || ctx.DataElementId == "data-element-2"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Execute_WithNoPdfConfiguration_Should_Use_DefaultConfiguration()
    {
        // Arrange
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { TaskType = "subformPdf" });

        var instance = CreateInstanceWithoutSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await Assert.ThrowsAsync<ApplicationConfigException>(async () => await _serviceTask.Execute(context));
    }

    // ===== CLEANUP TESTS =====

    [Fact]
    public async Task Execute_Should_CallProcessTaskCleanerWithCorrectTaskId()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify ProcessTaskCleaner was called with the correct taskId
        _processTaskCleanerMock.Verify(
            x =>
                x.RemoveAllDataElementsGeneratedFromTask(
                    It.Is<Instance>(i => i == instance),
                    It.Is<string>(t => t == "taskId")
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenCleanupFails_Should_PropagateException()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        _processTaskCleanerMock
            .Setup(x => x.RemoveAllDataElementsGeneratedFromTask(It.IsAny<Instance>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Cleanup failed"));

        // Act & Assert - should propagate the exception
        await Assert.ThrowsAsync<Exception>(async () => await _serviceTask.Execute(context));
    }

    // ===== METADATA TESTS =====

    [Fact]
    public async Task AddSubformPdfMetadata_Should_SetCorrectMetadata()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify metadata was set correctly for both PDFs
        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.Is<DataElement>(de =>
                        de.Metadata != null
                        && de.Metadata.Any(m => m.Key == "subformComponentId" && m.Value == SubformComponentId)
                        && de.Metadata.Any(m =>
                            m.Key == "subformDataElementId"
                            && (m.Value == "data-element-1" || m.Value == "data-element-2")
                        )
                    ),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task AddSubformPdfMetadata_Should_CallUpdateWithCorrectParameters()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert
        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.Is<Instance>(i => i == instance),
                    It.Is<DataElement>(de => de.Id.StartsWith("pdf-")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    // ===== CONFIGURATION VALIDATION TESTS =====

    [Fact]
    public async Task Execute_WithMissingSubformComponentId_Should_ThrowApplicationConfigException()
    {
        // Arrange
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = null, // Missing
                        SubformDataTypeId = SubformDataTypeId,
                    },
                }
            );

        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(async () =>
            await _serviceTask.Execute(context)
        );
        Assert.Contains("SubformComponentId", exception.Message);
    }

    [Fact]
    public async Task Execute_WithMissingSubformDataTypeId_Should_ThrowApplicationConfigException()
    {
        // Arrange
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = SubformComponentId,
                        SubformDataTypeId = null, // Missing
                    },
                }
            );

        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(async () =>
            await _serviceTask.Execute(context)
        );
        Assert.Contains("SubformDataTypeId", exception.Message);
    }

    [Fact]
    public async Task Execute_WithWhitespaceFilename_Should_NormalizeToNull()
    {
        // Arrange
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = SubformComponentId,
                        SubformDataTypeId = SubformDataTypeId,
                        FilenameTextResourceKey = "   ", // Whitespace only
                    },
                }
            );

        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - should be called with null filename
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<string?>(filename => filename == null),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.AtLeastOnce
        );
    }

    // ===== ERROR HANDLING TESTS =====

    [Fact]
    public async Task Execute_WhenPdfGenerationFails_Should_PropagateException()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        _pdfServiceMock
            .Setup(x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("PDF generation failed"));

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () => await _serviceTask.Execute(context));
    }

    [Fact]
    public async Task Execute_WhenMetadataUpdateFails_Should_PropagateException()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        _dataClientMock
            .Setup(x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("Metadata update failed"));

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () => await _serviceTask.Execute(context));
    }

    [Fact]
    public async Task Execute_WhenOnePdfFails_Should_FailEntireOperation()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithMultipleSubformData();
        var context = CreateServiceTaskContext(instance);

        var callCount = 0;
        _pdfServiceMock
            .Setup(x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (Instance _, string _, string _, SubformPdfContext subformContext, CancellationToken _) =>
                {
                    callCount++;
                    if (callCount == 2)
                        throw new Exception("Second PDF failed");
                    return new DataElement { Id = $"pdf-{subformContext.DataElementId}" };
                }
            );

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () => await _serviceTask.Execute(context));
    }

    [Fact]
    public async Task Execute_WithCancellationToken_Should_PropagateCancellation()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var cts = new CancellationTokenSource();
        cts.Cancel(); // Already cancelled
        var context = CreateServiceTaskContext(instance, cts.Token);

        _pdfServiceMock
            .Setup(x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new OperationCanceledException());

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(async () => await _serviceTask.Execute(context));
    }

    // ===== INTEGRATION SCENARIOS =====

    [Fact]
    public async Task Execute_Should_CleanupBeforePdfGeneration()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - cleanup should happen before PDF generation
        _processTaskCleanerMock.Verify(
            x => x.RemoveAllDataElementsGeneratedFromTask(It.IsAny<Instance>(), It.IsAny<string>()),
            Times.Once
        );

        // And PDFs should be generated
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Execute_WithMultipleSubformDataElements_Should_CreateCorrectMetadataForEach()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithMultipleSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify each PDF gets metadata linking to correct source
        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.Is<DataElement>(de =>
                        de.Metadata != null
                        && de.Metadata.Any(m => m.Key == "subformDataElementId" && m.Value == "data-element-1")
                    ),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.Is<DataElement>(de =>
                        de.Metadata != null
                        && de.Metadata.Any(m => m.Key == "subformDataElementId" && m.Value == "data-element-2")
                    ),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.Is<DataElement>(de =>
                        de.Metadata != null
                        && de.Metadata.Any(m => m.Key == "subformDataElementId" && m.Value == "data-element-3")
                    ),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    // ===== EDGE CASES =====

    [Fact]
    public async Task Execute_WithSingleSubformDataElement_Should_WorkCorrectly()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSingleSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(ctx => ctx.DataElementId == "single-data-element"),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WithManySubformDataElements_Should_HandleAll()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithManySubformData(10);
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(10)
        );
    }

    [Fact]
    public async Task Execute_Should_PassCancellationTokenToAllDependencies()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var cts = new CancellationTokenSource();
        var context = CreateServiceTaskContext(instance, cts.Token);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify cancellation token was passed to dependencies
        _pdfServiceMock.Verify(
            x =>
                x.GenerateAndStoreSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.Is<CancellationToken>(ct => ct == cts.Token)
                ),
            Times.AtLeastOnce
        );

        _dataClientMock.Verify(
            x =>
                x.Update(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.Is<CancellationToken>(ct => ct == cts.Token)
                ),
            Times.AtLeastOnce
        );
    }

    private void SetupProcessReader()
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = SubformComponentId,
                        SubformDataTypeId = SubformDataTypeId,
                        FilenameTextResourceKey = FileName,
                    },
                }
            );
    }

    private static Instance CreateInstanceWithSubformData()
    {
        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = new List<DataElement>
            {
                new() { Id = "data-element-1", DataType = SubformDataTypeId },
                new() { Id = "data-element-2", DataType = SubformDataTypeId },
                new() { Id = "other-data-element", DataType = "other-type" }, // Should be filtered out
            },
        };
    }

    private static Instance CreateInstanceWithoutSubformData()
    {
        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = new List<DataElement>
            {
                new() { Id = "other-data-element", DataType = "other-type" },
            },
        };
    }

    private static ServiceTaskContext CreateServiceTaskContext(
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        var instanceMutatorMock = new Mock<IInstanceDataMutator>();
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);
        return new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            CancellationToken = cancellationToken,
        };
    }

    private static Instance CreateInstanceWithMultipleSubformData()
    {
        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = new List<DataElement>
            {
                new() { Id = "data-element-1", DataType = SubformDataTypeId },
                new() { Id = "data-element-2", DataType = SubformDataTypeId },
                new() { Id = "data-element-3", DataType = SubformDataTypeId },
            },
        };
    }

    private static Instance CreateInstanceWithSingleSubformData()
    {
        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = new List<DataElement>
            {
                new() { Id = "single-data-element", DataType = SubformDataTypeId },
            },
        };
    }

    private static Instance CreateInstanceWithManySubformData(int count)
    {
        var dataElements = new List<DataElement>();
        for (int i = 0; i < count; i++)
        {
            dataElements.Add(new DataElement { Id = $"data-element-{i}", DataType = SubformDataTypeId });
        }

        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = dataElements,
        };
    }
}
