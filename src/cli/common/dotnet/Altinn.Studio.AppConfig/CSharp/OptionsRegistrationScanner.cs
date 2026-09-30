using System.Collections.Frozen;
using Altinn.Studio.AppConfig.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.AppConfig.CSharp;

internal static class OptionsRegistrationScanner
{
    private static readonly string[] _kartverketIds = ["fylker-kv", "kommuner-kv"];

    private static readonly string[] _ssbClassificationIds =
    [
        "kjønn",
        "næringsgruppering",
        "yrker",
        "sivilstand",
        "grunnbeløpfolketrygden",
        "fylker",
        "kommuner",
        "land",
    ];

    private static readonly string[] _postenIds = ["poststed"];

    private static readonly FrozenDictionary<string, string[]> _idsRegisteredBy = new Dictionary<string, string[]>(
        StringComparer.Ordinal
    )
    {
        ["AddAltinnCodelists"] = [.. _kartverketIds, .. _ssbClassificationIds, .. _postenIds],
        ["AddKartverketAdministrativeUnits"] = _kartverketIds,
        ["AddSSBClassifications"] = _ssbClassificationIds,
        ["AddPosten"] = _postenIds,
    }.ToFrozenDictionary(StringComparer.Ordinal);

    private static readonly FrozenDictionary<string, string> _idParameterOf = new Dictionary<string, string>(
        StringComparer.Ordinal
    )
    {
        ["AddSSBClassificationCodelistProvider"] = "id",
        ["AddAltinn2CodeList"] = "id",
        ["AddAltinn3CodeList"] = "optionId",
        ["AddJoinedAppOptions"] = "id",
    }.ToFrozenDictionary(StringComparer.Ordinal);

    public static void Collect(string file, SyntaxNode root, StringConstants constants, AppModelBuilder app)
    {
        foreach (var call in root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (MethodName(call) is not { } method)
                continue;
            var registeredBy = method.Identifier.ValueText + "()";
            if (_idsRegisteredBy.TryGetValue(method.Identifier.ValueText, out var ids))
            {
                var span = RoslynSyntaxIntrospector.SpanOf(method, file);
                foreach (var id in ids)
                    app.OptionsProviders.TryAdd(id, new OptionsProvider(id, registeredBy, span));
            }
            else if (
                _idParameterOf.TryGetValue(method.Identifier.ValueText, out var parameter)
                && IdArgument(call, parameter) is { } argument
                && constants.Evaluate(argument) is { Length: > 0 } id
            )
                app.OptionsProviders.TryAdd(
                    id,
                    new OptionsProvider(id, registeredBy, RoslynSyntaxIntrospector.SpanOf(argument, file))
                );
        }
    }

    private static SimpleNameSyntax? MethodName(InvocationExpressionSyntax call) =>
        call.Expression switch
        {
            MemberAccessExpressionSyntax member => member.Name,
            SimpleNameSyntax name => name,
            _ => null,
        };

    private static ExpressionSyntax? IdArgument(InvocationExpressionSyntax call, string parameter)
    {
        var arguments = call.ArgumentList.Arguments;
        var named = arguments.FirstOrDefault(a =>
            string.Equals(a.NameColon?.Name.Identifier.ValueText, parameter, StringComparison.Ordinal)
        );
        return (named ?? arguments.FirstOrDefault(a => a.NameColon is null))?.Expression;
    }
}
