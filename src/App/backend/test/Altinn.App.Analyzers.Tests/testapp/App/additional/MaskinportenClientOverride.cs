using Altinn.App.Api.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Models.logic;

internal static class MaskinportenClientOverride
{
    private const string ProvisionedSection = "MaskinportenSettings";

    public static void Register(IServiceCollection services)
    {
        // Violates ALTINNAPP0802: redirects the default client to a custom configuration section.
        services.ConfigureMaskinportenClient("MyOwnMaskinporten");

        // Violates ALTINNAPP0802: a configuration lambda takes over the default options.
        services.ConfigureMaskinportenClient(settings =>
        {
            settings.ClientId = "my-client";
            settings.Authority = "https://test.maskinporten.no/";
        });

        // Violates ALTINNAPP0802: a section path that is not a compile-time constant cannot be proven
        // to be the provisioned section.
        services.ConfigureMaskinportenClient(GetSectionName());

        // Fine: re-binding the provisioned section is what the default registration does anyway.
        services.ConfigureMaskinportenClient("MaskinportenSettings");

        // Fine: configuration keys are case-insensitive, so this binds the same section.
        services.ConfigureMaskinportenClient("maskinportensettings");

        // Fine: the constant resolves to the provisioned section name.
        services.ConfigureMaskinportenClient(ProvisionedSection);
    }

    private static string GetSectionName() => "MaskinportenSettings";
}
