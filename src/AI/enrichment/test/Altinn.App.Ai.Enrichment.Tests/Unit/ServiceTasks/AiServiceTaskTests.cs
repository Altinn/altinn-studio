using System.Text.Json;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.ServiceTasks;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
#if NET10_0_OR_GREATER
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
#else
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
#endif
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.ServiceTasks;

public class AiServiceTaskTests
{
    private const string FormDataType = "model";

    [Fact]
    public async Task Execute_JsonOnlyAgent_StoresEnrichmentJsonAndSucceeds()
    {
        var stored = new List<(string DataType, string ContentType, string? Filename, byte[] Bytes)>();
        var mutator = CreateMutator("demo-json", stored);

        var result = await CreateSut().Execute(new ServiceTaskContext { InstanceDataMutator = mutator });

        result.Should().BeOfType<ServiceTaskSuccessResult>();
        var entry = stored.Should().ContainSingle().Subject;
        entry.DataType.Should().Be("ai-enrichment-json");
        entry.ContentType.Should().Be("application/json");
        entry.Filename.Should().Be("sjekkliste.json");
        using var json = JsonDocument.Parse(entry.Bytes);
        json.RootElement.GetProperty("sjekkliste").EnumerateObject().Should().NotBeEmpty();
    }

    [Fact]
    public async Task Execute_MissingAgentFolder_FailsWithoutAdvancing()
    {
        var mutator = CreateMutator("finnes-ikke", stored: []);

        var result = await CreateSut().Execute(new ServiceTaskContext { InstanceDataMutator = mutator });

#if NET10_0_OR_GREATER
        // A missing agent folder is a config error: permanent, so the engine
        // does not burn retries on it. The message names the missing path.
        result.Should().BeOfType<ServiceTaskFailedResult>()
            .Which.ErrorMessage.Should().Contain("finnes-ikke");
#else
        result.Should().BeOfType<ServiceTaskFailedResult>()
            .Which.ErrorHandling.Strategy.Should().Be(ServiceTaskErrorStrategy.AbortProcessNext);
#endif
    }

#if NET10_0_OR_GREATER
    [Fact]
    public async Task Execute_ReplayWithOutputsFromSameWorkflow_SkipsAgentRun()
    {
        var workflowId = Guid.NewGuid();
        var stored = new List<(string DataType, string ContentType, string? Filename, byte[] Bytes)>();
        var mutator = CreateMutator("demo-json", stored);
        var instanceClient = Substitute.For<IInstanceClient>();
        instanceClient
            .GetInstance(Arg.Any<Instance>(), Arg.Any<StorageAuthenticationMethod?>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new Instance
            {
                Data =
                [
                    new DataElement
                    {
                        Id = Guid.NewGuid().ToString(),
                        DataType = "ai-enrichment-json",
                        Metadata =
                        [
                            new KeyValueEntry
                            {
                                Key = AiServiceTask.WorkflowIdMetadataKey,
                                Value = workflowId.ToString(),
                            },
                        ],
                    },
                ],
            }));

        var result = await CreateSut(instanceClient: instanceClient)
            .Execute(new ServiceTaskContext { InstanceDataMutator = mutator, WorkflowId = workflowId });

        result.Should().BeOfType<ServiceTaskSuccessResult>();
        stored.Should().BeEmpty("a replay must not run the agent or store duplicate outputs");
    }

    [Fact]
    public async Task Execute_WithWorkflowId_TagsOutputsWithWorkflowMarker()
    {
        var workflowId = Guid.NewGuid();
        var stored = new List<(string DataType, string ContentType, string? Filename, byte[] Bytes)>();
        var storedMetadata = new List<List<KeyValueEntry>?>();
        var mutator = CreateMutator("demo-json", stored, storedMetadata: storedMetadata);

        var result = await CreateSut()
            .Execute(new ServiceTaskContext { InstanceDataMutator = mutator, WorkflowId = workflowId });

        result.Should().BeOfType<ServiceTaskSuccessResult>();
        storedMetadata.Should().NotBeEmpty();
        storedMetadata.Should().AllSatisfy(metadata =>
            metadata.Should().ContainSingle(entry =>
                entry.Key == AiServiceTask.WorkflowIdMetadataKey && entry.Value == workflowId.ToString()));
    }

    [Fact]
    public void StepOptions_Defaults_GiveOneHourBudgetWithBoundedConstantRetries()
    {
        var stepOptions = CreateSut().StepOptions;

        stepOptions.Should().NotBeNull();
        stepOptions!.MaxExecutionTime.Should().Be(TimeSpan.FromHours(1));
        stepOptions.RetryStrategy.Should().NotBeNull();
        stepOptions.RetryStrategy!.MaxRetries.Should().Be(2);
        stepOptions.RetryStrategy.BaseInterval.Should().Be(TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void StepOptions_ZeroRetries_MapsToNoRetryStrategy()
    {
        var options = new AiEnrichmentOptions { Step = new AiEnrichmentStepOptions { MaxRetries = 0 } };

        var stepOptions = CreateSut(options).StepOptions;

        stepOptions!.RetryStrategy!.MaxRetries.Should().Be(0);
    }
#endif

    [Fact]
    public async Task Execute_TaskOptions_MapTaskIdToAgentAndOutputTypes()
    {
        var stored = new List<(string DataType, string ContentType, string? Filename, byte[] Bytes)>();
        var mutator = CreateMutator("Task_2", stored);
        var options = new AiEnrichmentOptions
        {
            Tasks =
            {
                ["Task_2"] = new AiEnrichmentTaskOptions
                {
                    Agent = "demo-json",
                    InputDataType = FormDataType,
                    JsonOutputDataType = "saksvurdering",
                },
            },
        };

        var result = await CreateSut(options).Execute(new ServiceTaskContext { InstanceDataMutator = mutator });

        result.Should().BeOfType<ServiceTaskSuccessResult>();
        stored.Should().ContainSingle().Which.DataType.Should().Be("saksvurdering");
    }

    // --- input element resolution ---------------------------------------------------

    [Fact]
    public void ResolveInputDataElement_SingleFormData_IsPicked()
    {
        var accessor = CreateMutator("t", stored: []);

        var element = AiServiceTask.ResolveInputDataElement(accessor, configuredDataType: null, "t");

        element.DataType.Should().Be(FormDataType);
    }

    [Fact]
    public void ResolveInputDataElement_MultipleFormData_ThrowsWithConfigHint()
    {
        var accessor = CreateMutator("t", stored: [], extraFormDataType: "model2");

        var act = () => AiServiceTask.ResolveInputDataElement(accessor, configuredDataType: null, "t");

        act.Should().Throw<InvalidOperationException>().WithMessage("*InputDataType*");
    }

    [Fact]
    public void ResolveInputDataElement_ConfiguredType_PicksThatElement()
    {
        var accessor = CreateMutator("t", stored: [], extraFormDataType: "model2");

        var element = AiServiceTask.ResolveInputDataElement(accessor, "model2", "t");

        element.DataType.Should().Be("model2");
    }

    [Fact]
    public void ResolveInputDataElement_ConfiguredTypeAbsent_Throws()
    {
        var accessor = CreateMutator("t", stored: []);

        var act = () => AiServiceTask.ResolveInputDataElement(accessor, "nope", "t");

        act.Should().Throw<InvalidOperationException>().WithMessage("*'nope'*");
    }

    // --- helpers ---------------------------------------------------------------------

    private static AiServiceTask CreateSut(
        AiEnrichmentOptions? options = null
#if NET10_0_OR_GREATER
        , IInstanceClient? instanceClient = null
#endif
    )
    {
        var factory = new AgentRuntimeFactory(
            new StubChatService(),
            new TypstRenderer(NullLogger<TypstRenderer>.Instance, Options.Create(new TypstOptions())),
            new MarkdownRulesLoader(),
            NullLoggerFactory.Instance);

#if NET10_0_OR_GREATER
        if (instanceClient is null)
        {
            instanceClient = Substitute.For<IInstanceClient>();
            instanceClient
                .GetInstance(Arg.Any<Instance>(), Arg.Any<StorageAuthenticationMethod?>(), Arg.Any<CancellationToken>())
                .Returns(Task.FromResult(new Instance { Data = [] }));
        }
#endif

        return new AiServiceTask(
            factory,
            Options.Create(options ?? new AiEnrichmentOptions()),
            Options.Create(new AppSettings { AppBasePath = TestPaths.TestDataRoot }),
#if NET10_0_OR_GREATER
            instanceClient,
#endif
            NullLogger<AiServiceTask>.Instance);
    }

    private static IInstanceDataMutator CreateMutator(
        string taskId,
        List<(string DataType, string ContentType, string? Filename, byte[] Bytes)> stored,
        string? extraFormDataType = null
#if NET10_0_OR_GREATER
        , List<List<KeyValueEntry>?>? storedMetadata = null
#endif
    )
    {
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data =
            [
                new DataElement { Id = Guid.NewGuid().ToString(), DataType = FormDataType },
            ],
        };
        var dataTypes = new List<DataType>
        {
            new() { Id = FormDataType, AppLogic = new ApplicationLogic { ClassRef = "App.Models.Skjema" } },
            new() { Id = "ai-enrichment-json" },
            new() { Id = "ai-enrichment-pdf" },
            new() { Id = "saksvurdering" },
        };
        if (extraFormDataType is not null)
        {
            instance.Data.Add(new DataElement { Id = Guid.NewGuid().ToString(), DataType = extraFormDataType });
            dataTypes.Add(new DataType { Id = extraFormDataType, AppLogic = new ApplicationLogic { ClassRef = "App.Models.Skjema2" } });
        }

        var mutator = Substitute.For<IInstanceDataMutator>();
        mutator.Instance.Returns(instance);
        mutator.DataTypes.Returns(dataTypes);
        mutator.GetFormData(Arg.Any<DataElementIdentifier>()).Returns(_ => Task.FromResult(SampleFormData()));
#if NET10_0_OR_GREATER
        mutator.AddBinaryDataElement(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<ReadOnlyMemory<byte>>(),
                Arg.Any<string?>(), Arg.Any<List<KeyValueEntry>?>())
            .Returns(callInfo =>
            {
                stored.Add((
                    callInfo.ArgAt<string>(0),
                    callInfo.ArgAt<string>(1),
                    callInfo.ArgAt<string?>(2),
                    callInfo.ArgAt<ReadOnlyMemory<byte>>(3).ToArray()));
                storedMetadata?.Add(callInfo.ArgAt<List<KeyValueEntry>?>(5));
                return null!;
            });
#else
        mutator.AddBinaryDataElement(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<ReadOnlyMemory<byte>>())
            .Returns(callInfo =>
            {
                stored.Add((
                    callInfo.ArgAt<string>(0),
                    callInfo.ArgAt<string>(1),
                    callInfo.ArgAt<string?>(2),
                    callInfo.ArgAt<ReadOnlyMemory<byte>>(3).ToArray()));
                return null!;
            });
#endif
        return mutator;
    }

    /// <summary>
    /// The demo booking application, deliberately kept FlatData-wrapped —
    /// like a real app model whose root property is the FlatData envelope.
    /// The service task must unwrap it before running the agent.
    /// </summary>
    private static object SampleFormData()
    {
        var bytes = File.ReadAllBytes(Path.Combine(TestPaths.ApplicationsRoot, "rombooking.json"));
        using var doc = JsonDocument.Parse(bytes);
        return doc.RootElement.Clone();
    }

    private sealed class StubChatService : IChatService
    {
        public Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(new ChatResponse
            {
                Content = """{ "status": "ok", "merknad": "stub verdict" }""",
                FinishReason = "stop",
                StatusCode = 200,
            });
    }
}
