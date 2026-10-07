namespace Altinn.Studio.AppDist;

/// <summary>Well-known file paths in the schemas layer of an app distribution.</summary>
public static class JsonSchemaPaths
{
    public const string ApplicationMetadata = "schemas/json/application/application-metadata.schema.v1.json";
    public const string Expression = "schemas/json/layout/expression.schema.v1.json";
    public const string Footer = "schemas/json/layout/footer.schema.v1.json";
    public const string Layout = "schemas/json/layout/layout.schema.v1.json";
    public const string LayoutSettings = "schemas/json/layout/layoutSettings.schema.v1.json";
    public const string NumberFormat = "schemas/json/component/number-format.schema.v1.json";
    public const string TextResources = "schemas/json/text-resources/text-resources.schema.v1.json";
    public const string Validation = "schemas/json/validation/validation.schema.v1.json";
}

/// <summary>Well-known file paths in the content layer of an app distribution.</summary>
public static class FrontendPaths
{
    public const string AltinnAppFrontendJavascript = "altinn-app-frontend.js";
    public const string AltinnAppFrontendStyles = "altinn-app-frontend.css";
}
