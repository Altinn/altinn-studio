using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Models.logic;

internal sealed class ProcessTaskStart1 : IWorkflowEngineCommand
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly HttpContext _httpContext;

    public string GetKey() => "x1";

    public ProcessTaskStart1(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
        _httpContext = httpContextAccessor.HttpContext;
        _httpContext = httpContextAccessor?.HttpContext ?? throw new Exception();
    }

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.FromResult(ProcessEngineCommandResult.Completed());
    }
}

internal sealed class ProcessTaskStart2(IHttpContextAccessor httpContextAccessor) : IWorkflowEngineCommand
{
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    private readonly HttpContext _httpContext1 = httpContextAccessor.HttpContext;
    private HttpContext _httpContext2 { get; } = httpContextAccessor.HttpContext;
    private HttpContext _httpContext3 { get; } = httpContextAccessor?.HttpContext ?? throw new Exception();

    public string GetKey() => "x2";

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.FromResult(ProcessEngineCommandResult.Completed());
    }
}
