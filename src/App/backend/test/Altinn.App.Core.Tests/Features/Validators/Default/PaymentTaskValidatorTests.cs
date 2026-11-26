using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class PaymentTaskValidatorTests
{
    private const string TaskId = "Task_1";
    private const string PaymentDataType = "paymentInformation";

    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly PaymentTaskValidator _validator;

    public PaymentTaskValidatorTests()
    {
        _validator = new PaymentTaskValidator(_processReaderMock.Object);
    }

    [Theory]
    [InlineData("payment", true, true)]
    [InlineData("payment", false, false)]
    [InlineData("signing", true, false)]
    [InlineData(null, false, false)]
    public void ShouldRunForTask_OnlyForPaymentTasks(string? taskType, bool hasPaymentConfiguration, bool expected)
    {
        _processReaderMock
            .Setup(r => r.GetFlowElement(TaskId))
            .Returns(
                new ProcessTask
                {
                    Id = TaskId,
                    ExtensionElements = taskType is null
                        ? null
                        : new ExtensionElements
                        {
                            TaskExtension = new AltinnTaskExtension
                            {
                                TaskType = taskType,
                                PaymentConfiguration = hasPaymentConfiguration ? CreatePaymentConfiguration() : null,
                            },
                        },
                }
            );

        Assert.Equal(expected, _validator.ShouldRunForTask(TaskId));
    }

    [Theory]
    [InlineData(PaymentStatus.Paid)]
    [InlineData(PaymentStatus.Skipped)]
    public async Task Validate_PaidOrSkipped_ReturnsNoIssues(PaymentStatus status)
    {
        SetupPaymentTask();

        List<ValidationIssue> issues = await _validator.Validate(CreateDataAccessor(status), TaskId, null);

        Assert.Empty(issues);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PaymentStatus.Uninitialized)]
    [InlineData(PaymentStatus.Created)]
    [InlineData(PaymentStatus.Authorized)]
    [InlineData(PaymentStatus.Failed)]
    [InlineData(PaymentStatus.Cancelled)]
    public async Task Validate_PaymentNotPaidOrSkipped_ReturnsPaymentNotCompleted(PaymentStatus? status)
    {
        SetupPaymentTask();

        List<ValidationIssue> issues = await _validator.Validate(CreateDataAccessor(status), TaskId, null);

        ValidationIssue issue = Assert.Single(issues);
        Assert.Equal("PaymentNotCompleted", issue.Code);
        Assert.Equal(ValidationIssueSeverity.Error, issue.Severity);
        Assert.Equal("validation_errors.payment_not_completed", issue.CustomTextKey);
        Assert.Null(issue.DataElementId);
    }

    private void SetupPaymentTask() =>
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension(TaskId))
            .Returns(
                new AltinnTaskExtension { TaskType = "payment", PaymentConfiguration = CreatePaymentConfiguration() }
            );

    private static AltinnPaymentConfiguration CreatePaymentConfiguration() =>
        new() { PaymentDataType = PaymentDataType, PaymentReceiptPdfDataType = "paymentReceipt" };

    private static IInstanceDataAccessor CreateDataAccessor(PaymentStatus? status)
    {
        var paymentDataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = PaymentDataType };
        var dataAccessor = new Mock<IInstanceDataAccessor>();
        dataAccessor.Setup(x => x.Instance).Returns(new Instance { Data = status is null ? [] : [paymentDataElement] });
        if (status is { } storedStatus)
        {
            var paymentInformation = new PaymentInformation
            {
                TaskId = TaskId,
                Status = storedStatus,
                OrderDetails = new OrderDetails
                {
                    PaymentProcessorId = "paymentProcessorId",
                    Currency = "NOK",
                    OrderLines = [],
                    Receiver = new PaymentReceiver(),
                },
            };
            dataAccessor
                .Setup(x => x.GetBinaryData(paymentDataElement))
                .ReturnsAsync(
                    JsonSerializer.SerializeToUtf8Bytes(
                        paymentInformation,
                        new JsonSerializerOptions(JsonSerializerDefaults.Web)
                    )
                );
        }

        return dataAccessor.Object;
    }
}
