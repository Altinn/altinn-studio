using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Tests.Features.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class SubformPdfServiceTaskTests
{
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<ITranslationService> _translationServiceMock = new();
    private readonly Mock<ILogger<SubformPdfServiceTask>> _loggerMock = new();
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly SubformPdfServiceTask _serviceTask;

    private const string DataElementId1 = "bb09a8ef-ec2e-484e-acd7-f821b73908cb";
    private const string DataElementId2 = "369b633c-405d-4f3e-8e64-7c2d67d785a9";
    private const string DataElementId3 = "174245e1-fd83-418a-9f2e-0941eb5271c8";
    private const string SubformComponentId = "subform-mopeder";
    private const string SubformDataTypeId = "subform-data-type";
    private const string FileName = "customFilenameTextResourceKey";

    public SubformPdfServiceTaskTests()
    {
        _pdfServiceMock
            .Setup(x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Array.Empty<byte>());
        _translationServiceMock
            .Setup(x =>
                x.TranslateTextKey(
                    It.IsAny<string>(),
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ComponentContext?>(),
                    null
                )
            )
            .ReturnsAsync("subform.pdf");

        _serviceTask = new SubformPdfServiceTask(
            _processReaderMock.Object,
            _pdfServiceMock.Object,
            _translationServiceMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task Execute_Should_Call_GenerateSubformPdf_ForEachDataElement()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();

        // Verify that GenerateSubformPdf was called for each data element
        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    "taskId",
                    It.Is<SubformPdfContext>(ctx => ctx.ComponentId == SubformComponentId),
                    "en",
                    false,
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2) // Should be called twice for the two data elements
        );
        _translationServiceMock.Verify(
            x => x.TranslateTextKey(FileName, It.IsAny<IInstanceDataAccessor>(), It.IsAny<ComponentContext?>(), null),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Execute_WithNoMatchingDataElements_Should_Not_Call_GenerateSubformPdf()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithoutSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        var result = await _serviceTask.Execute(context);

        // Assert
        result.Should().BeOfType<ServiceTaskSuccessResult>();

        // Verify that GenerateSubformPdf was not called
        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithSpecificDataElements_Should_Call_GenerateSubformPdf_WithCorrectIds()
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(ctx =>
                        ctx.DataElementId == DataElementId1 || ctx.DataElementId == DataElementId2
                    ),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
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

    // ===== METADATA TESTS =====

    [Fact]
    public async Task Execute_Should_PassSubformContextToGenerateSubformPdf()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify the subform was passed to the pdf service for both PDFs
        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(subform =>
                        subform.ComponentId == SubformComponentId
                        && (subform.DataElementId == DataElementId1 || subform.DataElementId == DataElementId2)
                    ),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Execute_Should_Add_Each_Pdf_Generated_From_The_Task_With_Its_Subform()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - each PDF is named from its subform's data and says which subform it was made from
        var mutatorMock = Mock.Get(context.InstanceDataMutator);
        foreach (string dataElementId in new[] { DataElementId1, DataElementId2 })
        {
            _translationServiceMock.Verify(
                x =>
                    x.TranslateTextKey(
                        FileName,
                        context.InstanceDataMutator,
                        It.Is<ComponentContext>(c =>
                            c.DataElementIdentifier != null && c.DataElementIdentifier.Value.Id == dataElementId
                        ),
                        null
                    ),
                Times.Once
            );
            mutatorMock.Verify(
                x =>
                    x.AddBinaryDataElement(
                        "ref-data-as-pdf",
                        "application/pdf",
                        "subform.pdf",
                        It.IsAny<ReadOnlyMemory<byte>>(),
                        "taskId",
                        It.Is<List<KeyValueEntry>?>(metadata =>
                            metadata != null
                            && metadata.Count == 2
                            && metadata.Any(entry =>
                                entry.Key == "subformComponentId" && entry.Value == SubformComponentId
                            )
                            && metadata.Any(entry =>
                                entry.Key == "subformDataElementId" && entry.Value == dataElementId
                            )
                        )
                    ),
                Times.Once
            );
        }
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

        // Assert - a blank configured key uses the default file name
        _translationServiceMock.Verify(
            x =>
                x.TranslateTextKey(
                    BuiltInTextResources.PdfDefaultFileName.Key,
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ComponentContext?>(),
                    null
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("PDF generation failed"));

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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    Instance _,
                    string _,
                    SubformPdfContext _,
                    string? _,
                    bool _,
                    StorageAuthenticationMethod? _,
                    CancellationToken _
                ) =>
                {
                    callCount++;
                    if (callCount == 2)
                        throw new Exception("Second PDF failed");
                    return Array.Empty<byte>();
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new OperationCanceledException());

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(async () => await _serviceTask.Execute(context));
    }

    // ===== INTEGRATION SCENARIOS =====

    [Fact]
    public async Task Execute_WithMultipleSubformDataElements_Should_PassCorrectSubformForEach()
    {
        // Arrange
        SetupProcessReader();
        var instance = CreateInstanceWithMultipleSubformData();
        var context = CreateServiceTaskContext(instance);

        // Act
        await _serviceTask.Execute(context);

        // Assert - verify each PDF gets the correct data element id
        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(subform => subform.DataElementId == DataElementId1),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(subform => subform.DataElementId == DataElementId2),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _pdfServiceMock.Verify(
            x =>
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(subform => subform.DataElementId == DataElementId3),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.Is<SubformPdfContext>(ctx => ctx.DataElementId == DataElementId1),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
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
                x.GenerateSubformPdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<SubformPdfContext>(),
                    It.IsAny<string>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.Is<CancellationToken>(cancellationToken => cancellationToken == cts.Token)
                ),
            Times.AtLeastOnce
        );
    }

    // ===== STARTUP VALIDATION TESTS =====

    [Fact]
    public void ValidateConfiguration_CompleteConfiguration_ReturnsNoFindings()
    {
        SetupProcessReader();

        Assert.Empty(_serviceTask.ValidateConfiguration(ValidationContext()));
    }

    [Fact]
    public void ValidateConfiguration_MissingConfiguration_ReturnsFinding()
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("Task_SubformPdf"))
            .Returns(new AltinnTaskExtension { TaskType = "subformPdf" });

        string finding = Assert.Single(_serviceTask.ValidateConfiguration(ValidationContext()));

        Assert.Contains("<altinn:subformPdfConfig>", finding);
    }

    [Theory]
    [InlineData(null, SubformDataTypeId, nameof(AltinnSubformPdfConfiguration.SubformComponentId))]
    [InlineData(" ", SubformDataTypeId, nameof(AltinnSubformPdfConfiguration.SubformComponentId))]
    [InlineData(SubformComponentId, null, nameof(AltinnSubformPdfConfiguration.SubformDataTypeId))]
    [InlineData(SubformComponentId, "", nameof(AltinnSubformPdfConfiguration.SubformDataTypeId))]
    public void ValidateConfiguration_MissingRequiredField_ReturnsFinding(
        string? subformComponentId,
        string? subformDataTypeId,
        string field
    )
    {
        SetupProcessReader(subformComponentId, subformDataTypeId);

        string finding = Assert.Single(_serviceTask.ValidateConfiguration(ValidationContext()));

        Assert.Contains($"{field} is missing", finding);
    }

    [Theory]
    [InlineData("other-data-type")]
    // Execute matches data elements by exact data type id.
    [InlineData("Subform-Data-Type")]
    public void ValidateConfiguration_UndeclaredSubformDataType_ReturnsFinding(string declaredDataTypeId)
    {
        SetupProcessReader();

        string finding = Assert.Single(
            _serviceTask.ValidateConfiguration(ValidationContext([new DataType { Id = declaredDataTypeId }]))
        );

        Assert.Contains($"subform data type '{SubformDataTypeId}'", finding);
        Assert.Contains("applicationmetadata.json", finding);
    }

    [Fact]
    public async Task StartupValidation_InvalidConfiguration_StopsStartup()
    {
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => RunStartupValidation("undeclared"));

        string message = exception.Message;
        Assert.Contains("Task 'Task_SubformPdf': ", message);
        Assert.Contains($"subform data type '{SubformDataTypeId}'", message);
    }

    [Fact]
    public async Task StartupValidation_ValidConfiguration_Passes()
    {
        await RunStartupValidation();
    }

    private static ProcessTaskValidationContext ValidationContext(List<DataType>? dataTypes = null) =>
        new()
        {
            TaskId = "Task_SubformPdf",
            Environment = HostingEnvironment.Production,
            ApplicationMetadata = new ApplicationMetadata("ttd/app")
            {
                DataTypes = dataTypes ?? [new DataType { Id = SubformDataTypeId }],
            },
        };

    private async Task RunStartupValidation(string declaredDataTypeId = SubformDataTypeId)
    {
        List<ProcessTask> tasks =
        [
            new ServiceTask
            {
                Id = "Task_SubformPdf",
                ExtensionElements = new ExtensionElements
                {
                    TaskExtension = new AltinnTaskExtension
                    {
                        TaskType = "subformPdf",
                        SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                        {
                            SubformComponentId = SubformComponentId,
                            SubformDataTypeId = SubformDataTypeId,
                            FilenameTextResourceKey = FileName,
                        },
                    },
                },
            },
        ];
        _processReaderMock.Setup(x => x.GetProcessTasks()).Returns(tasks);
        _processReaderMock.Setup(x => x.GetExclusiveGateways()).Returns([]);
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((string taskId) => tasks.Single(task => task.Id == taskId).ExtensionElements?.TaskExtension);
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("ttd/app") { DataTypes = [new DataType { Id = declaredDataTypeId }] });
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(x => x.EnvironmentName).Returns("Production");

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAppImplementationFactory();
        services.AddSingleton(_processReaderMock.Object);
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(hostEnvironment.Object);
        services.AddSingleton(_pdfServiceMock.Object);
        services.AddSingleton(_translationServiceMock.Object);
        services.AddTransient<IServiceTask, SubformPdfServiceTask>();
        await using ServiceProvider provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true }
        );
        var validationService = new ProcessTaskConfigurationValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            services,
            NullLogger<ProcessTaskConfigurationValidationService>.Instance
        );

        await validationService.StartAsync(CancellationToken.None);
    }

    private void SetupProcessReader(
        string? subformComponentId = SubformComponentId,
        string? subformDataTypeId = SubformDataTypeId
    )
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = subformComponentId,
                        SubformDataTypeId = subformDataTypeId,
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
                new() { Id = DataElementId1, DataType = SubformDataTypeId },
                new() { Id = DataElementId2, DataType = SubformDataTypeId },
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
        instanceMutatorMock.Setup(x => x.Language).Returns("en");
        return new ServiceTaskContext
        {
            InstanceDataMutator = instanceMutatorMock.Object,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
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
                new() { Id = DataElementId1, DataType = SubformDataTypeId },
                new() { Id = DataElementId2, DataType = SubformDataTypeId },
                new() { Id = DataElementId3, DataType = SubformDataTypeId },
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
                new() { Id = DataElementId1, DataType = SubformDataTypeId },
            },
        };
    }

    private static Instance CreateInstanceWithManySubformData(int count)
    {
        var dataElements = new List<DataElement>();
        for (int i = 0; i < count; i++)
        {
            dataElements.Add(new DataElement { Id = Guid.NewGuid().ToString(), DataType = SubformDataTypeId });
        }

        return new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "taskId" } },
            Data = dataElements,
        };
    }
}
