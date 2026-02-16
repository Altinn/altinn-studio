namespace Altinn.Studio.Gateway.Api.Hosting;

internal static class PortConfiguration
{
    public const int InternalPort = 8080;
    public const int PublicPort = 8081;

    public static WebApplicationBuilder ConfigureKestrelPorts(this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.ListenAnyIP(InternalPort);
            options.ListenAnyIP(PublicPort);
        });

        return builder;
    }
}
