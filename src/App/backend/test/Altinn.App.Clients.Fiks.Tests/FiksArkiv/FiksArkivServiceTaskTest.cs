using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivServiceTaskTest
{
    [Fact]
    public async Task Execute_CallsGenerateAndSendMessage()
    {
        // Arrange
        var instance = new Instance
        {
            Id = "12345/27fde586-4078-4c16-8c5f-ec406f1b17de",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var instanceDataMutatorMock = InstanceDataMutatorMockFactory(instance);
        var fiksArkivHostMock = FiksArkivHostMockFactory(
            instance: instance,
            messageType: "no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett"
        );

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(fiksArkivHostMock.Object);
        });

        // Act
        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceDataMutatorMock.Object };
        await fixture.FiksArkivServiceTask.Execute(parameters);

        // Assert
        fiksArkivHostMock.Verify();
    }

    [Fact]
    public async Task Execute_SuccessfulSend_ReturnsSuccessResult()
    {
        // Arrange
        var instanceDataMutatorMock = InstanceDataMutatorMockFactory(
            new Instance
            {
                Id = "12345/27fde586-4078-4c16-8c5f-ec406f1b17de",
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            }
        );

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(Mock.Of<IFiksArkivHost>());
        });

        // Act
        var parameters = new ServiceTaskContext { InstanceDataMutator = instanceDataMutatorMock.Object };
        var result = await fixture.FiksArkivServiceTask.Execute(parameters);

        // Assert
        Assert.IsType<ServiceTaskSuccessResult>(result);
    }

    [Theory]
    [InlineData(true, "reject")]
    [InlineData(true, "something-custom")]
    [InlineData(true, null)]
    [InlineData(false, null)]
    public async Task Execute_FailedSend_ReturnsFailedResult(bool moveToNextTask, string? action)
    {
        // Arrange
        var fiksArkivSettings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = moveToNextTask, Action = action },
        };
        await using var fixture = TestFixture.Create(
            services => services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings"),
            [("CustomFiksArkivSettings", fiksArkivSettings)]
        );

        // Act
        var result = await fixture.FiksArkivServiceTask.Execute(null!);

        // Assert
        Assert.NotNull(result);
        var errorResult = Assert.IsType<ServiceTaskFailedResult>(result);
        var expectedErrorStrategy = moveToNextTask
            ? ServiceTaskErrorStrategy.ContinueProcessNext
            : ServiceTaskErrorStrategy.AbortProcessNext;
        Assert.Equal(expectedErrorStrategy, errorResult.ErrorHandling.Strategy);

        // NOTE: Because of TestFixture serialization reasons, the `Action` property will be set to its default value if
        // null was provided in the test case. The default value is "reject".
        if (moveToNextTask)
            Assert.Equal(action ?? "reject", errorResult.ErrorHandling.Action);
    }

    private static Mock<IInstanceDataMutator> InstanceDataMutatorMockFactory(Instance instance)
    {
        var instanceMutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        instanceMutatorMock.Setup(x => x.Instance).Returns(instance);

        return instanceMutatorMock;
    }

    private static Mock<IFiksArkivHost> FiksArkivHostMockFactory(Instance instance, string messageType)
    {
        var fiksArkivHostMock = new Mock<IFiksArkivHost>(MockBehavior.Strict);
        fiksArkivHostMock
            .Setup(x =>
                x.GenerateAndSendMessage(
                    instance.Process.CurrentTask.ElementId,
                    It.Is<Instance>(i => i.Id == instance.Id),
                    messageType,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse())
            .Verifiable(Times.Once);

        return fiksArkivHostMock;
    }
}
