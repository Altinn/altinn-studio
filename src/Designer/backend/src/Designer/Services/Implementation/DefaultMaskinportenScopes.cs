using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Altinn.Studio.Designer.Services.Implementation;

public static class DefaultMaskinportenScopes
{
    public const string ServiceOwner = "altinn:serviceowner";
    public const string ServiceOwnerInstancesRead = "altinn:serviceowner/instances.read";
    public const string ServiceOwnerInstancesWrite = "altinn:serviceowner/instances.write";

    public static readonly IReadOnlySet<string> ScopeNames = new HashSet<string>
    {
        ServiceOwner,
        ServiceOwnerInstancesRead,
        ServiceOwnerInstancesWrite,
    };

    private static readonly IReadOnlyList<MaskinPortenScopeEntity> s_scopes =
    [
        new() { Scope = ServiceOwner, Description = "Brukes til å indikere at klienten er et tjenesteeiersystem." },
        new()
        {
            Scope = ServiceOwnerInstancesRead,
            Description = "Klienter kan lese data knyttet til alle appene til tjenesteeieren.",
        },
        new() { Scope = ServiceOwnerInstancesWrite, Description = "Klienter kan skrive data for alle deres apper." },
    ];

    public static bool ContainsAll(ISet<MaskinPortenScopeEntity>? scopes)
    {
        var scopeNames = scopes?.Select(s => s.Scope).ToHashSet() ?? [];
        return ScopeNames.All(scopeNames.Contains);
    }

    public static ISet<MaskinPortenScopeEntity> MergeWith(ISet<MaskinPortenScopeEntity>? scopes)
    {
        var mergedScopes = new Dictionary<string, MaskinPortenScopeEntity>();
        foreach (MaskinPortenScopeEntity scope in scopes ?? Enumerable.Empty<MaskinPortenScopeEntity>())
        {
            mergedScopes.TryAdd(scope.Scope, scope);
        }

        foreach (MaskinPortenScopeEntity defaultScope in s_scopes)
        {
            mergedScopes.TryAdd(defaultScope.Scope, defaultScope);
        }

        return mergedScopes.Values.ToHashSet();
    }
}
