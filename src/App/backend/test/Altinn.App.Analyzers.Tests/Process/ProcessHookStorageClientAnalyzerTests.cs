using System.Collections.Immutable;
using Altinn.App.Core.Features.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Analyzers.Tests.Process;

public class ProcessHookStorageClientAnalyzerTests
{
    private const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Features.Process;
        using Altinn.App.Core.Internal.Data;
        using Altinn.App.Core.Internal.Instances;
        using Altinn.App.Core.Internal.Process.ProcessTasks;
        using Altinn.App.Core.Models;
        using Altinn.Platform.Storage.Interface.Models;
        using Microsoft.Extensions.Primitives;

        """;

    public static TheoryData<string, string> Hooks =>
        new()
        {
            {
                "IOnTaskStartingHandler.Execute",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IOnTaskStartingHandler
                    {
                        public bool ShouldRunForTask(string taskId) => true;
                        public async Task<HandlerResult> Execute(OnTaskStartingContext context)
                        {
                            await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "IOnTaskEndingHandler.Execute",
                """
                    public sealed class Hook(IDataClient dataClient) : IOnTaskEndingHandler
                    {
                        public bool ShouldRunForTask(string taskId) => true;
                        public async Task<HandlerResult> Execute(OnTaskEndingContext context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            await dataClient.GetFormData(instance, instance.Data[0]);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "IOnTaskEndingHandler.Execute",
                """
                    public abstract class HookBase : IOnTaskEndingHandler
                    {
                        public bool ShouldRunForTask(string taskId) => true;
                        public abstract Task<HandlerResult> Execute(OnTaskEndingContext context);
                    }

                    public sealed class Hook(IInstanceClient instanceClient) : HookBase
                    {
                        public override async Task<HandlerResult> Execute(OnTaskEndingContext context)
                        {
                            await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "IOnTaskEndingHandler.Execute",
                """
                    public class HookBase : IOnTaskEndingHandler
                    {
                        public bool ShouldRunForTask(string taskId) => true;
                        public virtual Task<HandlerResult> Execute(OnTaskEndingContext context) =>
                            Task.FromResult<HandlerResult>(HandlerResult.Success());
                    }

                    public sealed class Hook(IInstanceClient instanceClient) : HookBase
                    {
                        public override async Task<HandlerResult> Execute(OnTaskEndingContext context)
                        {
                            await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "IOnTaskAbandoningHandler.Execute",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IOnTaskAbandoningHandler
                    {
                        public bool ShouldRunForTask(string taskId) => true;
                        async Task<HandlerResult> IOnTaskAbandoningHandler.Execute(OnTaskAbandoningContext context)
                        {
                            await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "IOnProcessEndedHandler.Execute",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IOnProcessEndedHandler
                    {
                        public async Task<HandlerResult> Execute(OnProcessEndedContext context)
                        {
                            await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                            return HandlerResult.Success();
                        }
                    }
                    """
            },
            {
                "Hook.Execute",
                """
                    public sealed class Hook(IDataService dataService) : IServiceTask
                    {
                        public string Type => "hook";
                        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Execute);
                        private async Task<ServiceTaskResult> Execute(StageContext context)
                        {
                            await dataService.DeleteById(new InstanceIdentifier(context.InstanceDataMutator.Instance), Guid.NewGuid());
                            return ServiceTaskResult.Success();
                        }
                    }
                    """
            },
            {
                "IServiceTask.DefineExecute",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IServiceTask
                    {
                        public string Type => "hook";
                        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                            pipeline.Finally(async context =>
                            {
                                await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                                return ServiceTaskResult.Success();
                            });
                    }
                    """
            },
            {
                "IProcessTask.DefineStart",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IProcessTask
                    {
                        public string Type => "hook";
                        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
                            pipeline.Stage(async context =>
                            {
                                await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                                return StageResult.Completed();
                            }).Build();
                    }
                    """
            },
            {
                "IProcessTask.DefineEnd",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IProcessTask
                    {
                        public string Type => "hook";
                        public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
                            pipeline.Stage(async context =>
                            {
                                await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                                return StageResult.Completed();
                            }).Build();
                    }
                    """
            },
            {
                "IProcessTask.DefineAbandon",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IProcessTask
                    {
                        public string Type => "hook";
                        public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
                            pipeline.Stage(async context =>
                            {
                                await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                                return StageResult.Completed();
                            }).Build();
                    }
                    """
            },
            {
                "IInstantiationProcessor.DataCreation",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IInstantiationProcessor
                    {
                        public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
                            instanceClient.GetInstance(instance);
                    }
                    """
            },
            {
                "IInstantiationProcessor.DataCreation",
                """
                    public sealed class Hook(IInstanceClient instanceClient) : IInstantiationProcessor
                    {
                        public Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill) =>
                            instanceClient.GetInstance(instanceDataMutator.Instance);
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Hooks))]
    public async Task Reports_A_Client_Call_In_A_Hook_Member(string hookMember, string source)
    {
        var diagnostics = await Analyze(source);

        Diagnostic diagnostic = Assert.Single(diagnostics);
        Assert.Equal("ALTINNAPP0501", diagnostic.Id);
        Assert.Contains($"'{hookMember}'", diagnostic.GetMessage(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Reports_A_Client_Method_Group_And_A_Call_In_A_Local_Function_Of_A_Hook_Member()
    {
        var diagnostics = await Analyze(
            """
            public sealed class Hook(IInstanceClient instanceClient) : IOnTaskEndingHandler
            {
                public bool ShouldRunForTask(string taskId) => true;
                public async Task<HandlerResult> Execute(OnTaskEndingContext context)
                {
                    Func<Instance, Task<Instance>> read = instanceClient.GetInstance;
                    await read(context.InstanceDataMutator.Instance);
                    await ReadAgain();
                    return HandlerResult.Success();

                    Task<Instance> ReadAgain() => instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                }
            }
            """
        );

        Assert.Equal(
            ["instanceClient.GetInstance", "instanceClient.GetInstance(context.InstanceDataMutator.Instance)"],
            diagnostics.Select(diagnostic =>
                diagnostic.Location.SourceTree!.GetText().ToString(diagnostic.Location.SourceSpan)
            )
        );
    }

    [Fact]
    public async Task Does_Not_Report_Calls_Outside_The_Hook_Members()
    {
        var diagnostics = await Analyze(
            """
            public sealed class Hook(IInstanceClient instanceClient) : IOnTaskEndingHandler
            {
                public bool ShouldRunForTask(string taskId) => instanceClient is not null;
                public async Task<HandlerResult> Execute(OnTaskEndingContext context)
                {
                    await Read(context.InstanceDataMutator.Instance);
                    return HandlerResult.Success();
                }
                private Task<Instance> Read(Instance instance) => instanceClient.GetInstance(instance);
            }

            public sealed class NotAHook(IInstanceClient instanceClient)
            {
                public async Task<HandlerResult> Execute(OnTaskEndingContext context)
                {
                    await instanceClient.GetInstance(context.InstanceDataMutator.Instance);
                    return HandlerResult.Success();
                }
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Does_Not_Report_Reading_Other_Instances()
    {
        var diagnostics = await Analyze(
            """
            public sealed class Hook(IInstanceClient instanceClient) : IOnTaskEndingHandler
            {
                public bool ShouldRunForTask(string taskId) => true;
                public async Task<HandlerResult> Execute(OnTaskEndingContext context)
                {
                    await instanceClient.GetInstances(new Dictionary<string, StringValues>());
                    return HandlerResult.Success();
                }
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    private static async Task<ImmutableArray<Diagnostic>> Analyze(string source)
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Append(typeof(IServiceTask).Assembly)
            .Append(typeof(Instance).Assembly)
            .Append(typeof(StringValues).Assembly)
            .Distinct()
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(Usings + source, path: "/repo/App/Hooks.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        return await compilation
            .WithAnalyzers([new ProcessHookStorageClientAnalyzer()])
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);
    }
}
