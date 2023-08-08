using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Tests.TestHelpers;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Primitives;
using Moq;
using Prometheus;
using Xunit;

namespace Altinn.App.Core.Tests.InfrastrucZture.Clients.Storage;

public class InstanceClientMetricsDecoratorTests
{
    public InstanceClientMetricsDecoratorTests()
    {
        Metrics.SuppressDefaultMetrics();
    }

    [Fact]
    public async Task CreateInstance_calls_decorated_service_and_update_on_success()
    {
        // Arrange
        Mock<IInstanceClient> instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceTemplate = new Instance();

        // Act
        await instanceClientMetricsDecorator.CreateInstance("org", "app", instanceTemplate);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_created{result=\"success\"} 1");
        instanceClient.Verify(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateInstance_calls_decorated_service_and_update_on_failure()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var platformHttpException = new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.BadRequest), "test");
        instanceClient.Setup(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>())).ThrowsAsync(platformHttpException);
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceTemplate = new Instance();

        // Act
        var ex = await Assert.ThrowsAsync<PlatformHttpException>(async () => await instanceClientMetricsDecorator.CreateInstance("org", "app", instanceTemplate));
        ex.Should().BeSameAs(platformHttpException);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_created{result=\"failure\"} 1");
        instanceClient.Verify(i => i.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AddCompleteConfirmation_calls_decorated_service_and_update_on_success()
    {
        // Arrange
        Mock<IInstanceClient> instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        await instanceClientMetricsDecorator.AddCompleteConfirmation(1337, Guid.NewGuid());
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_completed{result=\"success\"} 1");
        instanceClient.Verify(i => i.AddCompleteConfirmation(It.IsAny<int>(), It.IsAny<Guid>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AddCompleteConfirmation_calls_decorated_service_and_update_on_failure()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var platformHttpException = new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.BadRequest), "test");
        instanceClient.Setup(i => i.AddCompleteConfirmation(It.IsAny<int>(), It.IsAny<Guid>())).ThrowsAsync(platformHttpException);
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        var ex = await Assert.ThrowsAsync<PlatformHttpException>(async () => await instanceClientMetricsDecorator.AddCompleteConfirmation(1337, Guid.NewGuid()));
        ex.Should().BeSameAs(platformHttpException);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_completed{result=\"failure\"} 1");
        instanceClient.Verify(i => i.AddCompleteConfirmation(It.IsAny<int>(), It.IsAny<Guid>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task DeleteInstance_calls_decorated_service_and_update_on_success_soft_delete()
    {
        // Arrange
        Mock<IInstanceClient> instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        await instanceClientMetricsDecorator.DeleteInstance(1337, Guid.NewGuid(), false);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_deleted{result=\"success\",mode=\"soft\"} 1");
        instanceClient.Verify(i => i.DeleteInstance(It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<bool>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task DeleteInstance_calls_decorated_service_and_update_on_success_soft_hard()
    {
        // Arrange
        Mock<IInstanceClient> instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        await instanceClientMetricsDecorator.DeleteInstance(1337, Guid.NewGuid(), true);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_deleted{result=\"success\",mode=\"hard\"} 1");
        instanceClient.Verify(i => i.DeleteInstance(It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<bool>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task DeleteInstance_calls_decorated_service_and_update_on_failure()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var platformHttpException = new PlatformHttpException(new HttpResponseMessage(HttpStatusCode.BadRequest), "test");
        instanceClient.Setup(i => i.DeleteInstance(It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<bool>())).ThrowsAsync(platformHttpException);
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        var ex = await Assert.ThrowsAsync<PlatformHttpException>(async () => await instanceClientMetricsDecorator.DeleteInstance(1337, Guid.NewGuid(), false));
        ex.Should().BeSameAs(platformHttpException);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().HaveCount(1);
        diff.Should().Contain("altinn_app_instances_deleted{result=\"failure\",mode=\"soft\"} 1");
        instanceClient.Verify(i => i.DeleteInstance(It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<bool>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetInstance_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        var instanceId = Guid.NewGuid();
        await instanceClientMetricsDecorator.GetInstance("test-app", "ttd", 1337, instanceId);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.GetInstance("test-app", "ttd", 1337, instanceId));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetInstance_instance_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instance = new Instance();

        // Act
        await instanceClientMetricsDecorator.GetInstance(instance);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.GetInstance(instance));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetInstances_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Act
        await instanceClientMetricsDecorator.GetInstances(new Dictionary<string, StringValues>());
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.GetInstances(new Dictionary<string, StringValues>()));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateProcess_of_instance_owner_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instance = new Instance();

        // Act
        await instanceClientMetricsDecorator.UpdateProcess(instance);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.UpdateProcess(instance));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateReadStatus_of_instance_owner_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceGuid = Guid.NewGuid();

        // Act
        await instanceClientMetricsDecorator.UpdateReadStatus(1337, instanceGuid, "read");
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.UpdateReadStatus(1337, instanceGuid, "read"));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateSubstatus_of_instance_owner_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceGuid = Guid.NewGuid();
        var substatus = new Substatus();

        // Act
        await instanceClientMetricsDecorator.UpdateSubstatus(1337, instanceGuid, substatus);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.UpdateSubstatus(1337, instanceGuid, substatus));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdatePresentationTexts_of_instance_owner_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceGuid = Guid.NewGuid();
        var presentationTexts = new PresentationTexts();

        // Act
        await instanceClientMetricsDecorator.UpdatePresentationTexts(1337, instanceGuid, presentationTexts);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.UpdatePresentationTexts(1337, instanceGuid, presentationTexts));
        instanceClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UpdateDataValues_of_instance_owner_calls_decorated_service()
    {
        // Arrange
        var instanceClient = new Mock<IInstanceClient>();
        var instanceClientMetricsDecorator = new InstanceClientMetricsDecorator(instanceClient.Object);
        var preUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();
        var instanceGuid = Guid.NewGuid();
        var dataValues = new DataValues();

        // Act
        await instanceClientMetricsDecorator.UpdateDataValues(1337, instanceGuid, dataValues);
        var postUpdateMetrics = await PrometheusTestHelper.ReadPrometheusMetricsToString();

        // Assert
        var diff = GetDiff(preUpdateMetrics, postUpdateMetrics);
        diff.Should().BeEmpty();
        instanceClient.Verify(i => i.UpdateDataValues(1337, instanceGuid, dataValues));
        instanceClient.VerifyNoOtherCalls();
    }

    private static List<string> GetDiff(string s1, string s2)
    {
        List<string> diff;
        IEnumerable<string> set1 = s1.Split('\n').Distinct().Where(s => !s.StartsWith("#"));
        IEnumerable<string> set2 = s2.Split('\n').Distinct().Where(s => !s.StartsWith("#"));

        diff = set2.Count() > set1.Count() ? set2.Except(set1).ToList() : set1.Except(set2).ToList();

        return diff;
    }
}
