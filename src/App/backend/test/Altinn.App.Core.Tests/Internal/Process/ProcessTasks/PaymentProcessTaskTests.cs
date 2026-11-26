using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class PaymentProcessTaskTests
{
    [Fact]
    public void ValidateConfiguration_MissingConfiguration_ReturnsError()
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = null });

        string finding = Assert.Single(
            _paymentProcessTask.ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
        );

        Assert.Contains("PaymentConfig is missing", finding);
    }

    [Theory]
    [InlineData(null, "receipt", "PaymentDataType")]
    [InlineData(" ", "receipt", "PaymentDataType")]
    [InlineData("payment", null, "PaymentReceiptPdfDataType")]
    public void ValidateConfiguration_RejectsMissingPaymentDataTypes(
        string? paymentType,
        string? receiptType,
        string field
    )
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration
                    {
                        PaymentDataType = paymentType,
                        PaymentReceiptPdfDataType = receiptType,
                    },
                }
            );

        string finding = Assert.Single(
            _paymentProcessTask.ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
        );

        Assert.Contains(field, finding);
    }

    [Theory]
    [InlineData(HostingEnvironment.Development, false)]
    [InlineData(HostingEnvironment.Production, true)]
    public void ValidateConfiguration_PaymentDataTypeMustBeAppOwnedDuringDevelopment(
        HostingEnvironment environment,
        bool valid
    )
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration
                    {
                        PaymentDataType = "payment",
                        PaymentReceiptPdfDataType = "receipt",
                    },
                }
            );
        ProcessTaskValidationContext context = ValidationContext(environment);
        context.ApplicationMetadata.DataTypes.Add(new DataType { Id = "payment" });

        string[] findings = _paymentProcessTask.ValidateConfiguration(context).ToArray();

        if (valid)
            Assert.Empty(findings);
        else
            Assert.Contains("app:owned", Assert.Single(findings));
    }

    private static ProcessTaskValidationContext ValidationContext(HostingEnvironment environment) =>
        new()
        {
            TaskId = "Task_1",
            Environment = environment,
            ApplicationMetadata = new ApplicationMetadata("ttd/app") { DataTypes = [] },
        };

    private readonly Mock<IPdfService> _pdfServiceMock;
    private readonly Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<ITranslationService> _translationServiceMock;
    private readonly PaymentProcessTask _paymentProcessTask;

    public PaymentProcessTaskTests()
    {
        _pdfServiceMock = new Mock<IPdfService>();
        _processReaderMock = new Mock<IProcessReader>();
        _paymentServiceMock = new Mock<IPaymentService>(MockBehavior.Strict);
        _translationServiceMock = new Mock<ITranslationService>();

        _paymentProcessTask = new PaymentProcessTask(
            _pdfServiceMock.Object,
            _processReaderMock.Object,
            _paymentServiceMock.Object,
            _translationServiceMock.Object
        );
    }

    // The payment service is the task's only way to the payment processor, and it is a strict mock with no setups.
    [Theory]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Created)]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Authorized)]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Paid)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Created)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Authorized)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Paid)]
    public async Task StartOrAbandon_PaymentThatCanStillComplete_KeepsRecordWithoutContactingProcessor(
        string step,
        PaymentStatus status
    )
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        var dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, status);
        SetupPaymentConfiguration();

        StageResult result = await RunStartOrAbandon(step, dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        _paymentServiceMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Skipped)]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Cancelled)]
    [InlineData(nameof(PaymentProcessTask.DefineStart), PaymentStatus.Failed)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Skipped)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Cancelled)]
    [InlineData(nameof(PaymentProcessTask.DefineAbandon), PaymentStatus.Failed)]
    public async Task StartOrAbandon_PaymentThatCannotComplete_RemovesRecordWithoutContactingProcessor(
        string step,
        PaymentStatus status
    )
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        var dataMutator = CreateDataMutator(CreateInstance(paymentDataElement));
        SetupPaymentInformation(dataMutator, paymentDataElement, status);
        SetupPaymentConfiguration();

        StageResult result = await RunStartOrAbandon(step, dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        dataMutator.Verify(x => x.RemoveDataElement(paymentDataElement));
        _paymentServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Start_NoPayment_DoesNothing()
    {
        var dataMutator = CreateDataMutator(CreateInstance());
        SetupPaymentConfiguration();

        StageResult result = await RunStart(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        _paymentServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task End_PaymentCompleted_ShouldGeneratePdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None))
            .ReturnsAsync(new byte[] { 1, 2, 3 });

        StageResult result = await RunEnd(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None));
        dataMutator.Verify(x =>
            x.AddBinaryDataElement(
                validPaymentConfiguration.PaymentReceiptPdfDataType,
                "application/pdf",
                "Betalingskvittering.pdf",
                It.IsAny<ReadOnlyMemory<byte>>(),
                taskId,
                It.IsAny<List<KeyValueEntry>?>()
            )
        );
    }

    [Fact]
    public async Task End_PaymentSkipped_ShouldNotGeneratePdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Skipped);

        StageResult result = await RunEnd(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _pdfServiceMock.Verify(
            x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None),
            Times.Never
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_ReceiptAlreadyStoredByThisTask_KeepsItInsteadOfStoringAnother()
    {
        // The ending step committed the receipt, then ran again: the stage must be idempotent.
        DataElement paymentDataElement = CreatePaymentDataElement();
        DataElement receipt = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentReceiptPdfDataType",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_1",
                },
            ],
        };
        Instance instance = CreateInstance(paymentDataElement, receipt);
        var dataMutator = CreateDataMutator(instance);

        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);

        StageResult result = await RunEnd(dataMutator.Object);

        Assert.IsType<CompletedStageResult>(result);
        _pdfServiceMock.VerifyNoOtherCalls();
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_PaymentNotCompleted_FailsRetryably()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Created);

        _pdfServiceMock.Verify(
            x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None),
            Times.Never
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );

        var failed = Assert.IsType<FailedStageResult>(await RunEnd(dataMutator.Object));
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Equal("The payment is not completed.", failed.ErrorMessage);
    }

    [Fact]
    public async Task PrepareAbandon_CanAbandon_LetsTheRejectGoAhead()
    {
        var dataMutator = CreateDataMutator(CreateInstance());
        SetupPaymentConfiguration();
        SetupPrepareAbandon(dataMutator, alreadyPaid: false);

        ProcessChangeResult? result = await _paymentProcessTask.PrepareAbandon(
            dataMutator.Object,
            "Task_1",
            CancellationToken.None
        );

        Assert.Null(result);
    }

    [Fact]
    public async Task PrepareAbandon_AlreadyPaid_RefusesWithTranslatedPaymentAlreadyCompletedIssue()
    {
        var dataMutator = CreateDataMutator(CreateInstance());
        dataMutator.Setup(x => x.Language).Returns("en");
        SetupPaymentConfiguration();
        SetupPrepareAbandon(dataMutator, alreadyPaid: true);
        _translationServiceMock
            .Setup(x =>
                x.TranslateTextKey(
                    "validation_errors.payment_already_completed",
                    "en",
                    It.IsAny<Dictionary<string, string>?>()
                )
            )
            .ReturnsAsync("The payment has already gone through, so you cannot go back.");

        ProcessChangeResult? result = await _paymentProcessTask.PrepareAbandon(
            dataMutator.Object,
            "Task_1",
            CancellationToken.None
        );

        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        var issue = Assert.Single(result.ValidationIssues ?? []);
        Assert.Equal("PaymentAlreadyCompleted", issue.Code);
        Assert.Equal("validation_errors.payment_already_completed", issue.CustomTextKey);
        Assert.Equal("The payment has already gone through, so you cannot go back.", issue.Description);
        Assert.Equal(typeof(PaymentProcessTask).FullName, issue.Source);
    }

    [Fact]
    public async Task End_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = () => RunEnd(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task End_PaymentDataTypeIsNullOrWhitespace_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration { PaymentDataType = "" },
                }
            );

        Func<Task> act = () => RunEnd(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentDataType is missing*");
    }

    [Fact]
    public async Task End_ValidConfiguration_ShouldNotThrow()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(ps =>
                ps.GeneratePdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    null,
                    false,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new byte[] { 1, 2, 3 });

        Func<Task> act = () => RunEnd(dataMutator.Object);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Abandon_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = () => RunAbandon(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task Abandon_ValidConfiguration_ShouldNotThrow()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        Func<Task> act = () => RunAbandon(CreateDataMutator(CreateInstance()).Object);

        await act.Should().NotThrowAsync();
    }

    private void SetupPaymentConfiguration() =>
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

    private void SetupPrepareAbandon(Mock<IInstanceDataMutator> dataMutator, bool alreadyPaid) =>
        _paymentServiceMock
            .Setup(x =>
                x.PrepareAbandon(
                    dataMutator.Object,
                    It.Is<ValidAltinnPaymentConfiguration>(c => c.PaymentDataType == "paymentDataType"),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(alreadyPaid);

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static void SetupPaymentInformation(
        Mock<IInstanceDataMutator> dataMutator,
        DataElement paymentDataElement,
        PaymentStatus status
    )
    {
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(CreatePaymentInformation(status)));
    }

    private Task<StageResult> RunStart(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineStart(new PipelineBuilder()), dataMutator);

    private Task<StageResult> RunEnd(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineEnd(new PipelineBuilder()), dataMutator);

    private Task<StageResult> RunAbandon(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineAbandon(new PipelineBuilder()), dataMutator);

    /// <summary>Runs the stages in order, as the engine would, stopping at the first that does not complete.</summary>
    private static async Task<StageResult> Run(ProcessTaskPipeline pipeline, IInstanceDataMutator dataMutator)
    {
        var context = new StageContext
        {
            InstanceDataMutator = dataMutator,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
        foreach (PipelineStage.Plain stage in pipeline.Stages)
        {
            StageResult result = await stage.Work(context);
            if (result is not CompletedStageResult)
            {
                return result;
            }
        }
        return StageResult.Completed();
    }

    private Task<StageResult> RunStartOrAbandon(string step, IInstanceDataMutator dataMutator) =>
        step == nameof(PaymentProcessTask.DefineStart) ? RunStart(dataMutator) : RunAbandon(dataMutator);

    private static Instance CreateInstance(params DataElement[] dataElements)
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
            },
            Data = [.. dataElements],
        };
    }

    private static AltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };
    }

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status)
    {
        return new PaymentInformation
        {
            TaskId = "Task_1",
            Status = status,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Receiver = new PaymentReceiver { Name = "Receiver" },
                Currency = "NOK",
                OrderLines =
                [
                    new PaymentOrderLine
                    {
                        Id = "line-1",
                        Name = "test",
                        PriceExVat = 100,
                        Quantity = 1,
                        VatPercent = 25,
                    },
                ],
            },
            PaymentDetails = new PaymentDetails { PaymentId = "payment-123" },
        };
    }

    private static DataElement CreatePaymentDataElement()
    {
        return new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentDataType",
            ContentType = "application/json",
            Filename = "paymentDataType.json",
        };
    }
}
