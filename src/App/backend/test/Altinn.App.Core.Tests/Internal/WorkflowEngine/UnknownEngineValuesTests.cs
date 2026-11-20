using System.Text.Json;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class UnknownEngineValuesTests
{
    [Fact]
    public void LogNew_LogsEachValueOnce_HoweverOftenItIsRead()
    {
        var values = new UnknownEngineValues();
        var logger = new FakeLogger();

        values.Record(nameof(PersistentItemStatus), "Suspended");
        values.Record(nameof(PersistentItemStatus), "Suspended");
        values.LogNew(logger);
        values.Record(nameof(PersistentItemStatus), "Suspended");
        values.Record(nameof(WorkflowRole), "Suspended");
        values.LogNew(logger);

        Assert.Equal(
            ["PersistentItemStatus.Suspended", "WorkflowRole.Suspended"],
            logger.Collector.GetSnapshot().Select(record => record.StructuredState?[0].Value)
        );
        Assert.All(logger.Collector.GetSnapshot(), record => Assert.Equal(LogLevel.Warning, record.Level));
    }

    [Fact]
    public void Record_KeepsABoundedNumberOfValues()
    {
        var values = new UnknownEngineValues();
        var logger = new FakeLogger();

        for (int i = 0; i < 1000; i++)
        {
            values.Record(nameof(PersistentItemStatus), $"Status{i}");
        }
        values.LogNew(logger);

        Assert.Equal(100, logger.Collector.Count);
    }
}

/// <summary>
/// Reads and logs through the process-wide <see cref="UnknownEngineValues.Shared"/>, which any test that reads the
/// engine also drains. The collection keeps those tests from running at the same time.
/// </summary>
[Collection(nameof(UnknownEngineValuesSharedCollection))]
public class UnknownEngineValuesSharedTests
{
    [Fact]
    public async Task StatusRead_WithAValueThisVersionDoesNotKnow_LogsAWarningNamingItOnce()
    {
        string unknownStatus = $"Suspended{Guid.NewGuid():N}";
        Guid instanceGuid = Guid.NewGuid();
        string collectionKey = instanceGuid.ToString();
        string json = $$"""
            {
              "key": "{{collectionKey}}",
              "namespace": "ttd/app",
              "createdAt": "2026-11-11T10:00:00+00:00",
              "heads": [{ "databaseId": "{{Guid.NewGuid()}}", "status": "{{unknownStatus}}" }]
            }
            """;
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c => c.GetCollection("ttd/app", collectionKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
                JsonSerializer.Deserialize<WorkflowCollectionDetailResponse>(json, JsonSerializerOptions.Web)
            );
        var logger = new FakeLogger<WorkflowEngineService>();
        var service = new WorkflowEngineService(
            processNextRequestFactory: null!,
            client.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new AppIdentifier("ttd", "app"),
            logger
        );
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        await service.ResolveWorkflowTaskStatus(instance);
        await service.ResolveWorkflowTaskStatus(instance);

        FakeLogRecord warning = Assert.Single(
            logger.Collector.GetSnapshot(),
            record => record.Message.Contains(unknownStatus, StringComparison.Ordinal)
        );
        Assert.Equal(LogLevel.Warning, warning.Level);
    }
}

[CollectionDefinition(nameof(UnknownEngineValuesSharedCollection), DisableParallelization = true)]
public class UnknownEngineValuesSharedCollection;
