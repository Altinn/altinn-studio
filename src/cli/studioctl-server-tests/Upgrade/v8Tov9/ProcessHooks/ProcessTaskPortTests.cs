using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// v9 runs what a custom process task does as it starts, ends or is abandoned as the stages its <c>DefineStart</c>,
/// <c>DefineEnd</c> and <c>DefineAbandon</c> compose, so the v8 methods would compile and never run: each becomes the
/// stage of its <c>Define</c> member, is deleted when it did nothing, and has its Storage calls moved to the context's
/// mutator.
/// </summary>
public sealed class ProcessTaskPortTests : IDisposable
{
    private const string TaskPath = "Features/Signing/ParallelSigningTask.cs";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private static string WithProcessTasks(string members) =>
        InApp(members)
            .Replace(
                "using Altinn.App.Core.Features;",
                "using Altinn.App.Core.Features;\nusing Altinn.App.Core.Internal.Process.ProcessTasks;",
                StringComparison.Ordinal
            );

    [Fact]
    public void MethodsThatDoNothing_AreDeleted_AndOneThatCallsStorage_ReadsThroughTheContextsMutator()
    {
        // brg/virksomhetsregistrering App/Features/Signing/ParallelSigningTask.cs:8.
        var source = WithProcessTasks(
            """
            public interface ISigningService
            {
                Task AbandonSigningAsync(Instance instance);
            }

            public class SigningService(Altinn.App.Core.Internal.Data.IDataClient dataClient) : ISigningService
            {
                public async Task AbandonSigningAsync(Instance instance)
                {
                    foreach (var element in instance.Data)
                    {
                        await dataClient.GetFormData(instance, element);
                    }
                }
            }

            public class ParallelSigningTask(ISigningService signingService) : IProcessTask
            {
                public const string TaskId = "parallel_signing";
                public string Type { get; } = TaskId;

                public Task Start(string taskId, Instance instance)
                {
                    return Task.CompletedTask;
                }

                public Task End(string taskId, Instance instance)
                {
                    return Task.CompletedTask;
                }

                public async Task Abandon(string taskId, Instance instance)
                {
                    await signingService.AbandonSigningAsync(instance);
                }
            }
            """
        );
        _app.Write(TaskPath, source);

        var result = Port(AppFolder);

        Assert.Equal(
            WithProcessTasks(
                $$"""
                public interface ISigningService
                {
                    Task AbandonSigningAsync({{IInstanceDataMutator}} dataMutator);
                }

                public class SigningService : ISigningService
                {
                    public async Task AbandonSigningAsync({{IInstanceDataMutator}} dataMutator)
                    {
                        Instance instance = dataMutator.Instance;
                        foreach (var element in instance.Data)
                        {
                            await dataMutator.GetFormData(element);
                        }
                    }
                }

                public class ParallelSigningTask(ISigningService signingService) : IProcessTask
                {
                    public const string TaskId = "parallel_signing";
                    public string Type { get; } = TaskId;

                    public {{ProcessTaskPipeline}} DefineAbandon({{PipelineBuilder}} pipeline) => pipeline.Stage(Abandon).Build();

                    public async Task<{{StageResult}}> Abandon({{StageContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        await signingService.AbandonSigningAsync(dataMutator);
                        return {{StageResult}}.Completed();
                    }
                }
                """
            ),
            _app.Read(TaskPath)
        );
        Assert.Equal(
            [
                Warning(
                    $"{TaskPath}:{LineOf(source, "public class SigningService")}: removed the IDataClient that "
                        + "SigningService no longer uses."
                ),
                Warning(
                    $"{TaskPath}:{LineOf(source, "await dataClient.GetFormData")}: IDataClient.GetFormData now reads "
                        + "the form with dataMutator.GetFormData."
                ),
                Warning(
                    $"{TaskPath}:{LineOf(source, "public Task Start")}: removed ParallelSigningTask.Start, which did "
                        + "nothing; v9 never calls it, and DefineStart composes no stages by default."
                ),
                Warning(
                    $"{TaskPath}:{LineOf(source, "public Task End")}: removed ParallelSigningTask.End, which did "
                        + "nothing; v9 never calls it, and DefineEnd composes no stages by default."
                ),
                Warning(
                    $"{TaskPath}:{LineOf(source, "public async Task Abandon(")}: ParallelSigningTask.Abandon now takes "
                        + "the StageContext v9 calls it with, as the stage of DefineAbandon. v9 runs it inside the "
                        + "process transition and runs it again when a step fails, so calls it makes to other systems, "
                        + "such as e-mail, case numbers or external APIs, can repeat."
                ),
            ],
            result.Messages
        );
    }

    [Fact]
    public void MethodsWithoutStorageCalls_BecomeTheStagesOfTheirDefineMembers()
    {
        var source = WithProcessTasks(
            """
            public class ArchiveTask(ILogger<ArchiveTask> logger) : IProcessTask
            {
                public string Type => "archive";

                public Task Start(string taskId, Instance instance)
                {
                    logger.LogInformation("Archiving {InstanceId} at {TaskId}", instance.Id, taskId);
                    return Task.CompletedTask;
                }

                async Task IProcessTask.End(string taskId, Instance instance)
                {
                    await Task.Yield();
                    logger.LogInformation("Archived {InstanceId}", instance.Id);
                }
            }
            """
        );
        _app.Write(TaskPath, source);

        var result = Port(AppFolder);

        Assert.Equal(
            WithProcessTasks(
                $$"""
                public class ArchiveTask(ILogger<ArchiveTask> logger) : IProcessTask
                {
                    public string Type => "archive";

                    public {{ProcessTaskPipeline}} DefineStart({{PipelineBuilder}} pipeline) => pipeline.Stage(Start).Build();

                    public Task<{{StageResult}}> Start({{StageContext}} context)
                    {
                        string taskId = context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;
                        Instance instance = context.InstanceDataMutator.Instance;
                        logger.LogInformation("Archiving {InstanceId} at {TaskId}", instance.Id, taskId);
                        return Task.FromResult<{{StageResult}}>({{StageResult}}.Completed());
                    }

                    public {{ProcessTaskPipeline}} DefineEnd({{PipelineBuilder}} pipeline) => pipeline.Stage(End).Build();

                    public async Task<{{StageResult}}> End({{StageContext}} context)
                    {
                        Instance instance = context.InstanceDataMutator.Instance;
                        await Task.Yield();
                        logger.LogInformation("Archived {InstanceId}", instance.Id);
                        return {{StageResult}}.Completed();
                    }
                }
                """
            ),
            _app.Read(TaskPath)
        );
        Assert.Equal(
            [
                Warning(
                    $"{TaskPath}:{LineOf(source, "public Task Start")}: ArchiveTask.Start now takes the StageContext v9 "
                        + "calls it with, as the stage of DefineStart. v9 runs it inside the process transition and runs "
                        + "it again when a step fails, so calls it makes to other systems, such as e-mail, case numbers "
                        + "or external APIs, can repeat."
                ),
                Warning(
                    $"{TaskPath}:{LineOf(source, "async Task IProcessTask.End")}: ArchiveTask.End now takes the "
                        + "StageContext v9 calls it with, as the stage of DefineEnd. v9 runs it inside the process "
                        + "transition and runs it again when a step fails, so calls it makes to other systems, such as "
                        + "e-mail, case numbers or external APIs, can repeat."
                ),
            ],
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AMethodThatCannotBeMoved_IsATodo()
    {
        var source = WithProcessTasks(
            """
            public class ArchiveTask : IProcessTask
            {
                public string Type => "archive";

                public virtual Task End(string taskId, Instance instance) => Task.Delay(1);
            }
            """
        );
        _app.Write(TaskPath, source);

        var result = Port(AppFolder);

        Assert.Equal(
            [
                Todo(
                    $"{TaskPath}:{LineOf(source, "public virtual Task End")}: ArchiveTask.End(string taskId, Instance "
                        + "instance) is never called in v9 and was not moved: it overrides or is overridden. Move it to "
                        + "a stage of DefineEnd(PipelineBuilder pipeline), with instance data from the StageContext's "
                        + "InstanceDataMutator."
                ),
            ],
            result.Messages
        );
        Assert.Equal(source, _app.Read(TaskPath));
    }
}
