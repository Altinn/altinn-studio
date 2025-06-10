#nullable disable
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Action;

public class PaymentUserActionTests
{
    private readonly Mock<IDataService> _dataServiceMock = new();
    private readonly Mock<IPaymentService> _paymentServiceMock = new();

    [Fact]
    public async Task HandleAction_returns_redirect_result_correctly()
    {
        // Arrange
        Instance instance = CreateInstance();

        PaymentInformation paymentInformation = new()
        {
            TaskId = instance.Process.CurrentTask.ElementId,
            Status = PaymentStatus.Created,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { PaymentId = "1", RedirectUrl = "https://example.com" },
        };

        var userActionContext = new UserActionContext(instance, 1337);

        _paymentServiceMock
            .Setup(x =>
                x.StartPayment(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>(), It.IsAny<string>())
            )
            .ReturnsAsync((paymentInformation, false));

        // Act
        PaymentUserAction userAction = CreatePaymentUserAction();
        UserActionResult result = await userAction.HandleAction(userActionContext);

        // Assert
        result
            .Should()
            .BeEquivalentTo(UserActionResult.RedirectResult(new Uri(paymentInformation.PaymentDetails.RedirectUrl)));
    }

    [Fact]
    public async Task HandleAction_returns_success_result_when_no_redirect_url()
    {
        // Arrange
        Instance instance = CreateInstance();

        PaymentInformation paymentInformation = new()
        {
            TaskId = instance.Process.CurrentTask.ElementId,
            Status = PaymentStatus.Skipped,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { PaymentId = null, RedirectUrl = null },
        };

        var userActionContext = new UserActionContext(instance, 1337);

        _paymentServiceMock
            .Setup(x =>
                x.StartPayment(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>(), It.IsAny<string>())
            )
            .ReturnsAsync((paymentInformation, false));

        // Act
        PaymentUserAction userAction = CreatePaymentUserAction();
        UserActionResult result = await userAction.HandleAction(userActionContext);

        // Assert
        result.Should().BeEquivalentTo(UserActionResult.SuccessResult());
    }

    [Fact]
    public async Task HandleAction_returns_failure_result_when_already_paid()
    {
        // Arrange
        Instance instance = CreateInstance();

        PaymentInformation paymentInformation = new()
        {
            TaskId = instance.Process.CurrentTask.ElementId,
            Status = PaymentStatus.Skipped,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { PaymentId = "1", RedirectUrl = "https://example.com" },
        };

        var userActionContext = new UserActionContext(instance, 1337);

        _paymentServiceMock
            .Setup(x =>
                x.StartPayment(It.IsAny<Instance>(), It.IsAny<ValidAltinnPaymentConfiguration>(), It.IsAny<string>())
            )
            .ReturnsAsync((paymentInformation, true));

        // Act
        PaymentUserAction userAction = CreatePaymentUserAction();
        UserActionResult result = await userAction.HandleAction(userActionContext);

        // Assert
        result
            .Should()
            .BeEquivalentTo(
                UserActionResult.FailureResult(
                    error: new ActionError { Code = "PaymentAlreadyCompleted", Message = "Payment already completed." },
                    errorType: ProcessErrorType.Conflict
                )
            );
    }

    private PaymentUserAction CreatePaymentUserAction(string testBpmnFilename = "payment-task-process.bpmn")
    {
        IProcessReader processReader = ProcessTestUtils.SetupProcessReader(
            testBpmnFilename,
            Path.Combine("Features", "Action", "TestData")
        );
        return new PaymentUserAction(processReader, _paymentServiceMock.Object, NullLogger<PaymentUserAction>.Instance);
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
            InstanceOwner = new InstanceOwner { PartyId = "5000" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task2" } },
            Data = [new DataElement { Id = "a499c3ef-e88a-436b-8650-1c43e5037ada", DataType = "Model" }],
        };
    }
}
