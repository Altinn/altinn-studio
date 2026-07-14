using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.StudioctlServer.Studioctl;

/// <summary>The JSON shape must stay in sync with the Go client structs in internal/studioctlserver/client.go.</summary>
internal static class ValidateEndpoint
{
    public static RouteGroupBuilder MapValidateEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/validate/rules", ListRules);
        group.MapPost("/validate", Run);
        return group;
    }

    private static IResult ListRules()
    {
        var rules = ValidationEngine
            .AllRules.Select(r => new ValidateRuleJson(
                r.Metadata.Id,
                r.Metadata.Title,
                r.Metadata.DefaultSeverity.ToToken(),
                r.Metadata.Description
            ))
            .ToArray();
        return Results.Ok(rules);
    }

    private static async Task<IResult> Run(
        ValidateRequest? request,
        AppDistSchemasService schemas,
        CancellationToken cancellationToken
    )
    {
        if (request is null || string.IsNullOrEmpty(request.Path))
            return Results.BadRequest(new CommandResponse("path is required"));
        if (!Directory.Exists(request.Path))
            return Results.BadRequest(new CommandResponse($"directory does not exist: {request.Path}"));

        AppConfigEngine engine;
        AppModel model;
        try
        {
            engine = AppConfigEngine.Open(request.Path);
            model = engine.Build();
        }
        catch (Exception ex)
        {
            return Results.Problem($"load app: {ex.Message}", statusCode: 422);
        }

        var report = engine.ValidateAll(await schemas.GetAsync(model.AltinnAppVersion, cancellationToken));

        Severity minSev = Severity.Warning;
        if (!string.IsNullOrEmpty(request.Severity) && !SeverityExtensions.TryParse(request.Severity, out minSev))
            return Results.BadRequest(new CommandResponse($"invalid severity: {request.Severity}"));
        var filtered = report.Filter(minSev);
        var summary = filtered.Summary();

        var findings = filtered
            .Findings.Select(f =>
            {
                var pos = engine.ResolvePosition(f.Position);
                return new ValidateFindingJson(
                    f.RuleId,
                    f.Severity.ToToken(),
                    f.Message,
                    pos.File,
                    pos.Pointer,
                    pos.Line,
                    pos.Column
                );
            })
            .ToArray();

        return Results.Ok(
            new ValidateResponse(
                findings,
                new ValidateSummaryJson(summary.Errors, summary.Warnings, summary.Info, summary.RulesRun)
            )
        );
    }

    public sealed record ValidateRequest(string Path, string? Severity);

    public sealed record ValidateFindingJson(
        string RuleId,
        string Severity,
        string Message,
        string File,
        string? Pointer,
        int Line,
        int Column
    );

    public sealed record ValidateRuleJson(string Id, string Title, string Severity, string Description);

    public sealed record ValidateSummaryJson(int Errors, int Warnings, int Info, int RulesRun);

    public sealed record ValidateResponse(ValidateFindingJson[] Findings, ValidateSummaryJson Summary);

    public sealed record CommandResponse(string Message);
}
