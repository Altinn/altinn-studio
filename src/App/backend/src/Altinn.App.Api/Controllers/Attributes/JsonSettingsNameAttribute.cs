using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Controllers.Attributes;

[AttributeUsage(AttributeTargets.Class)]
internal class JsonSettingsNameAttribute : Attribute, IFilterMetadata
{
    internal JsonSettingsNameAttribute(string name)
    {
        Name = name;
    }

    internal string Name { get; }
}

internal static class JsonSettingNames
{
    internal const string AltinnApi = "AltinnApi";
}
