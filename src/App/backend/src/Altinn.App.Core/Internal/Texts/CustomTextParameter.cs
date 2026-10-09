namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A parameter that a <see cref="BackendTextResource"/> receives in customTextParameters, and that a text resource
/// can read through a variable with <c>dataSource: "customTextParameters"</c>.
/// </summary>
/// <param name="Name">The key in customTextParameters, and the placeholder name in default texts (<c>{Name}</c>)</param>
/// <param name="Description">What the value is, for documentation</param>
internal sealed record CustomTextParameter(string Name, string Description);
