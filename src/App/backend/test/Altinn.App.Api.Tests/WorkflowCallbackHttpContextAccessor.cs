using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Api.Tests;

/// <summary>
/// The test host's <see cref="IHttpContextAccessor"/>: ASP.NET Core's own, except while <see cref="FakeWorkflowEngineClient"/>
/// runs a callback, when it returns that callback's request.
/// </summary>
/// <remarks>
/// The fake engine runs a callback inside the request that enqueued its workflow, but the real engine calls back in a
/// request of its own: no query string, authenticated as the app. Through the plain accessor a callback would see the
/// enqueuing request instead, such as its <c>language</c> query and its user, and tests would pass on values a callback
/// never has. The override is an <see cref="AsyncLocal{T}"/> set in <see cref="RunCallback{T}"/>, so it ends with the
/// callback and leaves the enqueuing request's context alone, which setting <see cref="HttpContextAccessor.HttpContext"/>
/// would clear.
/// </remarks>
internal sealed class WorkflowCallbackHttpContextAccessor : IHttpContextAccessor
{
    private static readonly AsyncLocal<HttpContext?> _callbackContext = new();
    private readonly HttpContextAccessor _requestContext = new();

    public HttpContext? HttpContext
    {
        get => _callbackContext.Value ?? _requestContext.HttpContext;
        set => _requestContext.HttpContext = value;
    }

    /// <summary>Runs <paramref name="callback"/> with <paramref name="callbackContext"/> as the current request.</summary>
    public static async Task<T> RunCallback<T>(HttpContext callbackContext, Func<Task<T>> callback)
    {
        _callbackContext.Value = callbackContext;
        return await callback();
    }
}
