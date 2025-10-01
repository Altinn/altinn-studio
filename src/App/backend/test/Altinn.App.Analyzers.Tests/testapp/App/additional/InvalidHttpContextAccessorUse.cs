using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Models.logic;

internal sealed class ProcessTaskStart1 : IProcessTaskStart
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly HttpContext _httpContext;

    public ProcessTaskStart1(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
        _httpContext = httpContextAccessor.HttpContext;
        _httpContext = httpContextAccessor?.HttpContext ?? throw new Exception();
    }

    public Task Start(string taskId, Instance instance, Dictionary<string, string> prefill)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.CompletedTask;
    }
}

internal sealed class ProcessTaskStart2(IHttpContextAccessor httpContextAccessor) : IProcessTaskStart
{
    private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
    private readonly HttpContext _httpContext1 = httpContextAccessor.HttpContext;
    private HttpContext _httpContext2 { get; } = httpContextAccessor.HttpContext;
    private HttpContext _httpContext3 { get; } = httpContextAccessor?.HttpContext ?? throw new Exception();

    public Task Start(string taskId, Instance instance, Dictionary<string, string> prefill)
    {
        _ = _httpContextAccessor.HttpContext;
        _ = _httpContextAccessor.HttpContext.User;
        return Task.CompletedTask;
    }
}
