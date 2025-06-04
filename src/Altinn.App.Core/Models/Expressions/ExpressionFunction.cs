using System.Text.Json.Serialization;

// ReSharper disable InconsistentNaming

namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// Enumeration for valid functions in Layout Expressions
///
/// Note that capitalization follows the JavaScript convention of camelCase for function names
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
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
    ///  Lookup and count the number of data elements for a given data type
    /// </summary>
    countDataElements,

    /// <summary>
    /// Lookup a few properties from the instance
    /// </summary>
    instanceContext,

    /// <summary>
    /// Parse a date string to a date object, and format it to a string (possibly given a format)
    /// </summary>
    formatDate,

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
    ///  Capitalize the first letter of a string
    /// </summary>
    upperCaseFirst,

    /// <summary>
    ///  Lowercase the first letter of a string
    /// </summary>
    lowerCaseFirst,

    /// <summary>
    /// Compare two values using an operator (and possibly 'not' before it), return a boolean
    /// </summary>
    compare,

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
    ///  Return the position of a substring in a string
    /// </summary>
    stringIndexOf,

    /// <summary>
    ///  Replace a substring in a string with another string
    /// </summary>
    stringReplace,

    /// <summary>
    ///  Return a substring of a string
    /// </summary>
    stringSlice,

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

    /// <summary>
    /// Returns a positional argument
    /// </summary>
    argv,

    /// <summary>
    /// Get the action performed in task prior to bpmn gateway
    /// </summary>
    gatewayAction,

    /// <summary>
    /// Gets the currently selected language (or "nb" if not in a context where language is available)
    /// </summary>
    language,

    /// <summary>
    /// Lookup the text key in the app's text resources and return the translated value or the key if not found
    ///
    /// If no translations exist for the current language, we will use the resources for "nb"
    /// </summary>
    text,
}
