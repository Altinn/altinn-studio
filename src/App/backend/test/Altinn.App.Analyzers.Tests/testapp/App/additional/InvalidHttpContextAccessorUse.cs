using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Models.logic;

internal sealed class ProcessTaskStart1 : IProcessTask
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly HttpContext _httpContext;
    public string Type => "data";

    public ProcessTaskStart1(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
        _httpContext = httpContextAccessor.HttpContext;
        _httpContext = httpContextAccessor?.HttpContext ?? throw new Exception();
    }

    public Task Start(ProcessTaskContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.CompletedTask;
    }
}

internal sealed class ProcessTaskStart2(IHttpContextAccessor httpContextAccessor) : IProcessTask
{
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    private readonly HttpContext _httpContext1 = httpContextAccessor.HttpContext;
    private HttpContext _httpContext2 { get; } = httpContextAccessor.HttpContext;
    private HttpContext _httpContext3 { get; } = httpContextAccessor?.HttpContext ?? throw new Exception();
    public string Type => "data";

    public Task Start(ProcessTaskContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.CompletedTask;
    }
}
