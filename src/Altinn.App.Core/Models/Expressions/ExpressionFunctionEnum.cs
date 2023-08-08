namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// Enumeration for valid functions in Layout Expressions
/// </summary>
public enum ExpressionFunction
{
    /// <summary>
    /// Value for all unknown functions.
    /// </summary>
    INVALID,
    /// <summary>
    /// Lookup in datamodel (respect current context for missing indexes for repeating groups)
    /// </summary>
    dataModel,
    /// <summary>
    /// Lookup data in simpleBinding for a component with this ID
    /// </summary>
    component,
    /// <summary>
    /// Lookup a few properties from the instance
    /// </summary>
    instanceContext,
    /// <summary>
    /// Conditional
    /// </summary>
    @if,
    /// <summary>
    /// Lookup settings from the `frontendSettings` key in appsettings.json (or any environment overrides)
    /// </summary>
    frontendSettings,
    /// <summary>
    /// Concat strings
    /// </summary>
    concat,
    /// <summary>
    /// Turn characters to upper case
    /// </summary>
    upperCase,
    /// <summary>
    /// Turn characters to lower case
    /// </summary>
    lowerCase,
    /// <summary>
    /// Check if a string contains another string
    /// </summary>
    contains,
    /// <summary>
    /// Check if a string does not contain another string
    /// </summary>
    notContains,
    /// <summary>
    /// Check if a comma separated string contains a value
    /// </summary>
    commaContains,
    /// <summary>
    /// Check if a string ends with another string
    /// </summary>
    endsWith,
    /// <summary>
    /// Check if a string starts with another string
    /// </summary>
    startsWith,
    /// <summary>
    /// Check if values are equal
    /// </summary>
    equals,
    /// <summary>
    /// <see cref="equals" />
    /// </summary>
    notEquals,
    /// <summary>
    /// Compare numerically
    /// </summary>
    greaterThanEq,
    /// <summary>
    /// Compare numerically
    /// </summary>
    lessThan,
    /// <summary>
    /// Compare numerically
    /// </summary>
    lessThanEq,
    /// <summary>
    /// Compare numerically
    /// </summary>
    greaterThan,
    /// <summary>
    ///  Return the length of a string
    /// </summary>
    stringLength,
    /// <summary>
    /// Rounds a number to an integer, or optionally a decimal with a configurable amount of decimal points
    /// </summary>
    round,
    /// <summary>
    /// Return true if all the expressions evaluate to true
    /// </summary>
    and,
    /// <summary>
    /// Return true if any of the expressions evaluate to true
    /// </summary>
    or,
    /// <summary>
    /// Return true if the single argument evaluate to false, otherwise return false
    /// </summary>
    not,
}