namespace Altinn.App.Analyzers;

/// <summary>
/// A property with a fixed value: marked with [BindNever] and initialized with a literal.
/// </summary>
/// <param name="CSharpName">The property name, used for direct access in generated code and in error paths</param>
/// <param name="ValueExpression">The initializer expression as written in the model (eg <c>"7117"</c> or <c>-1.5m</c>)</param>
/// <param name="ValueDescription">A C# string literal describing the expected value for error messages</param>
public sealed record FixedValueNode(string CSharpName, string ValueExpression, string ValueDescription);
