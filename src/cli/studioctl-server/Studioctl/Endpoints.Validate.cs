using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.StudioctlServer.Studioctl;

/// <summary>The JSON shape must stay in sync with the Go client structs in internal/studioctlserver/client.go.</summary>
internal static partial class Endpoints
{
    private static void MapValidateEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/validate/rules", ListValidationRules);
        group.MapPost("/validate", RunValidation);
    }

    private static IResult ListValidationRules()
    {
        var rules = ValidationEngine
            .AllRules.Select(r => new ValidateRuleResponse(
                r.Metadata.Id,
                r.Metadata.Title,
                r.Metadata.DefaultSeverity.ToToken(),
                r.Metadata.Description
            ))
            .ToArray();
        return Results.Ok(rules);
    }

    private static async Task<IResult> RunValidation(
        AppValidationService validation,
        ValidateRequest? request,
        CancellationToken cancellationToken
    )
    {
        if (request is null)
            return Results.BadRequest(new CommandResponse("request body is required"));

        var result = await validation.RunAsync(request.Path, request.Severity, cancellationToken);
        return result.Kind switch
        {
            AppValidationResultKind.Invalid => Results.BadRequest(new CommandResponse(result.Message)),
            AppValidationResultKind.LoadFailed => Results.UnprocessableEntity(new CommandResponse(result.Message)),
            _ => Results.Ok(
                new ValidateResponse(
                    [
                        .. result.Findings.Select(f => new ValidateFindingResponse(
                            f.RuleId,
                            f.Severity.ToToken(),
                            f.Message,
                            f.File,
                            f.Pointer,
                            f.Line,
                            f.Column
                        )),
                    ],
                    new ValidateSummaryResponse(
                        result.Summary.Errors,
                        result.Summary.Warnings,
                        result.Summary.Info,
                        result.Summary.RulesRun
                    ),
                    new SchemaValidationResponse(
                        result.SchemaValidation.Ran,
                        result.SchemaValidation.Version,
                        result.SchemaValidation.Reason,
                        [.. result.SchemaValidation.Warnings]
                    )
                )
            ),
        };
    }

    private sealed record ValidateRequest(string? Path, string? Severity);

    private sealed record ValidateFindingResponse(
        string RuleId,
        string Severity,
        string Message,
        string File,
        string? Pointer,
        int Line,
        int Column
    );

    private sealed record ValidateRuleResponse(string Id, string Title, string Severity, string Description);

    private sealed record ValidateSummaryResponse(int Errors, int Warnings, int Info, int RulesRun);

    private sealed record SchemaValidationResponse(bool Ran, string? Version, string? Reason, string[] Warnings);

    private sealed record ValidateResponse(
        ValidateFindingResponse[] Findings,
        ValidateSummaryResponse Summary,
        SchemaValidationResponse SchemaValidation
    );
}
