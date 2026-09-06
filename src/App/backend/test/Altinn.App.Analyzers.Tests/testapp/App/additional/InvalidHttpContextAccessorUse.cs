using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Models.logic;

internal sealed class ProcessTaskStart1 : IProcessTaskCommand
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly HttpContext _httpContext;
    public string Key => "x1";

    public ProcessTaskStart1(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
        _httpContext = httpContextAccessor.HttpContext;
        _httpContext = httpContextAccessor?.HttpContext ?? throw new Exception();
    }

    public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.FromResult(ProcessTaskCommandResult.Completed());
    }
}

internal sealed class ProcessTaskStart2(IHttpContextAccessor httpContextAccessor) : IProcessTaskCommand
{
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    private readonly HttpContext _httpContext1 = httpContextAccessor.HttpContext;
    private HttpContext _httpContext2 { get; } = httpContextAccessor.HttpContext;
    private HttpContext _httpContext3 { get; } = httpContextAccessor?.HttpContext ?? throw new Exception();
    public string Key => "x2";

    public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.FromResult(ProcessTaskCommandResult.Completed());
    }
}
