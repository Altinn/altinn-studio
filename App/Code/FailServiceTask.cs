using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

public class FailServiceTask : IServiceTask
{
    public Task Start(string taskId, Instance instance)
    {
        return Task.CompletedTask;
    }

    public Task End(string taskId, Instance instance)
    {
        return Task.CompletedTask;
    }

    public Task Abandon(string taskId, Instance instance)
    {
        return Task.CompletedTask;
    }

    public string Type => "fail";

    public Task Execute(string taskId, Instance instance, CancellationToken cancellationToken = new CancellationToken())
    {
        throw new Exception("This is a failing service task. It is used to test the process engine's error handling capabilities.");
    }
}