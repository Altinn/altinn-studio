using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// A result of a service task's stage or reply handler that completes the step. The step commits it with its save, and
/// what follows is derived from the verdict Storage committed, so every run of the step goes on the same way. A failure or a deferral is no verdict: the step runs again and decides again.
/// </summary>
internal abstract record ServiceTaskVerdict
{
    private ServiceTaskVerdict() { }

    /// <summary>A reply handler keeps its exchange open for the next message.</summary>
    internal sealed record AwaitNextReply : ServiceTaskVerdict;

    /// <summary>A stage, or a reply handler the pipeline carries on past, completed.</summary>
    internal sealed record Completed : ServiceTaskVerdict;

    /// <summary>The task succeeded, and the process moves on with <see cref="Action"/>.</summary>
    internal sealed record Success(string? Action) : ServiceTaskVerdict;

    /// <summary>A mailbox-opening stage concluded the whole task.</summary>
    internal sealed record Conclude(Success Result) : ServiceTaskVerdict;
}

/// <summary>
/// How a <see cref="ServiceTaskVerdict"/> is stored: as the <c>callerResult</c> of the step's save, which Storage keeps
/// with the save's idempotency record for 48 hours and hands to a run whose save it replays. That run can be another
/// version of the app, so the names are fixed here rather than taken from type names, and a reader refuses anything it
/// does not know instead of acting on the part it does.
/// </summary>
internal static class ServiceTaskVerdictFormat
{
    private const string KindProperty = "kind";
    private const string ActionProperty = "action";
    private const string ResultProperty = "result";

    private const string AwaitNextReplyKind = "awaitNextReply";
    private const string CompletedKind = "completed";
    private const string SuccessKind = "success";
    private const string ConcludeKind = "conclude";

    public static string Write(ServiceTaskVerdict verdict) => ToNode(verdict).ToJsonString();

    /// <summary>The verdict <paramref name="value"/> stores, or null when it is none this version knows.</summary>
    public static ServiceTaskVerdict? Read(string? value)
    {
        if (value is null)
        {
            return null;
        }

        try
        {
            using JsonDocument document = JsonDocument.Parse(value);
            return Read(document.RootElement);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>The name a verdict is stored under, for messages about a verdict that does not fit a step.</summary>
    public static string KindOf(ServiceTaskVerdict verdict) =>
        verdict switch
        {
            ServiceTaskVerdict.AwaitNextReply => AwaitNextReplyKind,
            ServiceTaskVerdict.Completed => CompletedKind,
            ServiceTaskVerdict.Success => SuccessKind,
            ServiceTaskVerdict.Conclude => ConcludeKind,
            _ => throw new UnreachableException($"Unknown verdict type: {verdict.GetType().Name}"),
        };

    private static JsonObject ToNode(ServiceTaskVerdict verdict)
    {
        var node = new JsonObject { [KindProperty] = KindOf(verdict) };
        switch (verdict)
        {
            case ServiceTaskVerdict.Success { Action: { } action }:
                node[ActionProperty] = action;
                break;
            case ServiceTaskVerdict.Conclude conclude:
                node[ResultProperty] = ToNode(conclude.Result);
                break;
        }

        return node;
    }

    private static ServiceTaskVerdict? Read(JsonElement element)
    {
        if (
            element.ValueKind != JsonValueKind.Object
            || !element.TryGetProperty(KindProperty, out JsonElement kind)
            || kind.ValueKind != JsonValueKind.String
        )
        {
            return null;
        }

        return kind.GetString() switch
        {
            AwaitNextReplyKind when HasOnly(element) => new ServiceTaskVerdict.AwaitNextReply(),
            CompletedKind when HasOnly(element) => new ServiceTaskVerdict.Completed(),
            SuccessKind when HasOnly(element, ActionProperty) => ReadSuccess(element),
            ConcludeKind when HasOnly(element, ResultProperty) => ReadConclude(element),
            _ => null,
        };
    }

    private static ServiceTaskVerdict.Conclude? ReadConclude(JsonElement element) =>
        element.TryGetProperty(ResultProperty, out JsonElement result)
        && Read(result) is ServiceTaskVerdict.Success success
            ? new ServiceTaskVerdict.Conclude(success)
            : null;

    private static ServiceTaskVerdict.Success? ReadSuccess(JsonElement element)
    {
        if (!element.TryGetProperty(ActionProperty, out JsonElement action))
        {
            return new ServiceTaskVerdict.Success(Action: null);
        }

        return action.ValueKind == JsonValueKind.String ? new ServiceTaskVerdict.Success(action.GetString()) : null;
    }

    // A property this version does not know may change what the verdict means, so it makes the verdict unreadable.
    private static bool HasOnly(JsonElement element, params string[] known)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (JsonProperty property in element.EnumerateObject())
        {
            if (!seen.Add(property.Name) || (property.Name != KindProperty && !known.Contains(property.Name)))
            {
                return false;
            }
        }

        return true;
    }
}
