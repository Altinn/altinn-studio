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
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
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
    public async Task Execute_MissingAgentFolder_FailsAbortProcessNext()
    {
        var mutator = CreateMutator("finnes-ikke", stored: []);

        var result = await CreateSut().Execute(new ServiceTaskContext { InstanceDataMutator = mutator });

        result.Should().BeOfType<ServiceTaskFailedResult>()
            .Which.ErrorHandling.Strategy.Should().Be(ServiceTaskErrorStrategy.AbortProcessNext);
    }

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

    private static AiServiceTask CreateSut(AiEnrichmentOptions? options = null)
    {
        var factory = new AgentRuntimeFactory(
            new StubChatService(),
            new TypstRenderer(NullLogger<TypstRenderer>.Instance, Options.Create(new TypstOptions())),
            new MarkdownRulesLoader(),
            NullLoggerFactory.Instance);

        return new AiServiceTask(
            factory,
            Options.Create(options ?? new AiEnrichmentOptions()),
            Options.Create(new AppSettings { AppBasePath = TestPaths.TestDataRoot }),
            NullLogger<AiServiceTask>.Instance);
    }

    private static IInstanceDataMutator CreateMutator(
        string taskId,
        List<(string DataType, string ContentType, string? Filename, byte[] Bytes)> stored,
        string? extraFormDataType = null)
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
