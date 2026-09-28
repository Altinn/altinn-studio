namespace Altinn.App.Core.Configuration;

/// <summary>
/// Class that represents the ServiceRepositorySettings
/// </summary>
// TODO: IOptions validation so that we know which of these properties are required
public class AppSettings
{
    /// <summary>
    /// Gets or sets the BaseResourceFolderContainer that identifies where in the docker container the runtime can find files needed
    /// </summary>
    // TODO: can this be removed?
    // Env var being set is ServiceRepositorySettings__BaseResourceFolderContainer, but this prop is not used anywhere
#nullable disable
    [Obsolete("This is not used, and will be removed in the next major version")]
    public string BaseResourceFolderContainer { get; set; }

#nullable restore

    /// <summary>
    /// Gets or sets The name of the FormLayout json file Name
    /// </summary>
    public string FormLayoutJSONFileName { get; set; } = "FormLayout.json";

    /// <summary>
    /// Gets or sets React file name
    /// </summary>
    public string RuntimeAppFileName { get; set; } = "runtime.js";

    /// <summary>
    /// Gets or sets React CSS file name
    /// </summary>
    public string RuntimeCssFileName { get; set; } = "runtime.css";

    /// <summary>
    /// Gets or sets styles config file name for the app.
    /// </summary>
    public string ServiceStylesConfigFileName { get; set; } = "Styles.json";

    /// <summary>
    /// Gets or sets default Bootstrap url
    /// </summary>
    public string DefaultBootstrapUrl { get; set; } =
        "https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css";

    /// <summary>
    /// Gets or sets the frontend asset URL used by the generated controller index page.
    /// </summary>
    /// <remarks>
    /// This setting is only honored when the host runs in the Development environment. PDF rendering runs in a
    /// container, so avoid loopback URLs such as <c>localhost</c> because they resolve inside the container.
    /// </remarks>
    public string? AppFrontendAssetBaseUrl { get; set; }

    /// <summary>
    /// Open Id Connect Well known endpoint
    /// </summary>
#nullable disable
    public string OpenIdWellKnownEndpoint { get; set; }

    /// <summary>
    /// App OIDC provider for application that overrides the default OIDC provider in platform
    /// </summary>
    public string AppOidcProvider { get; set; }

    /// <summary>
    /// Name of the cookie for runtime
    /// </summary>
    public string RuntimeCookieName { get; set; }

#nullable restore

    /// <summary>
    /// Option to disable csrf check
    /// </summary>
    public bool DisableCsrfCheck { get; set; }

    /// <summary>
    /// Cache lifetime for app resources
    /// </summary>
    public int CacheResourceLifeTimeInSeconds { get; set; } = 3600;

    /// <summary>
    /// Gets or sets a value indicating whether the app should send events to the Events component.
    /// </summary>
    public bool RegisterEventsWithEventsComponent { get; set; }

    /// <summary>
    /// Gets or sets the sender of the eFormidling shipment.
    /// </summary>
    /// <remarks>
    /// If overriding for testing purposes, ensure to only update appsettings.Development.
    /// Integration will not work if value is overridden in staging or production.
    /// </remarks>
    public string EFormidlingSender { get; set; } = "910075918";

    /// <summary>
    /// Gets or sets the version of the application.
    /// </summary>
#nullable disable
    public string AppVersion { get; set; }

#nullable restore

    /// <summary>
    /// Enable the functionality to load layout in backend and remove data from hidden components before task completion
    /// </summary>
    public bool RemoveHiddenData { get; set; }

    /// <summary>
    /// Enable the functionality to load layout in backend and validate required fields as defined in the layout
    /// </summary>
    public bool RequiredValidation { get; set; }

    /// <summary>
    /// Enable the functionality to run expression validation in backend
    /// </summary>
    public bool ExpressionValidation { get; set; }

    /// <summary>
    /// Enable the functionality to validate form data against corresponding XSD if present
    /// </summary>
    public bool XsdValidation { get; set; }

    /// <summary>
    /// Enables OpenTelemetry as a substitute for Application Insights SDK
    /// Improves instrumentation throughout the Altinn app libraries.
    /// </summary>
    public bool UseOpenTelemetry { get; set; }

    /// <summary>
    /// Use OpenTelemetry collector via OTLP exporter instead of Azure Monitor exporters.
    /// </summary>
    public bool UseOpenTelemetryCollector { get; set; }

    /// <summary>
    /// Enforce that a DataType (applicationmetadata.json) that specifies a taskId is only externally mutable (using app apis) when the instance is in this task.
    /// Enabled by default. Enforces that elements of data types with a TaskId can only be mutated when the instance is in that task.
    /// </summary>
    public bool EnforceDataTypeTaskId { get; set; } = true;
}
