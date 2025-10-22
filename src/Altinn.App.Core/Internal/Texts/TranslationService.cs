using System.Text.RegularExpressions;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Translation service
/// </summary>
internal class TranslationService : ITranslationService
{
    private readonly string _org;
    private readonly string _app;
    private readonly IAppResources _appResources;
    private readonly ILogger<TranslationService> _logger;

    public TranslationService(
        AppIdentifier appIdentifier,
        IAppResources appResources,
        ILogger<TranslationService> logger
    )
    {
        _org = appIdentifier.Org;
        _app = appIdentifier.App;
        _appResources = appResources;
        _logger = logger;
    }

    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <param name="customTextParameters">Dictionary of extra parameters for rendering this text <see cref="ValidationIssue.CustomTextParameters"/></param>
    /// <returns>The value of the text resource in the specified language</returns>
    public async Task<string?> TranslateTextKey(
        string key,
        string? language,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        var resourceElement = await GetTextResourceElement(key, language);
        var value = await ReplaceVariables(resourceElement, null, null, customTextParameters);
        return value;
    }

    public async Task<string?> TranslateTextKey(
        string key,
        LayoutEvaluatorState state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        var resourceElement = await GetTextResourceElement(key, state.GetLanguage());
        var value = await ReplaceVariables(resourceElement, state, context, customTextParameters);
        return value;
    }

    private readonly Regex _cleanPathRegex = new(@"\[\{\d+\}\]", RegexOptions.Compiled, TimeSpan.FromMilliseconds(10));

    private async Task<string?> ReplaceVariables(
        TextResourceElement? resourceElement,
        LayoutEvaluatorState? state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        var value = resourceElement?.Value;
        if (value is not null && resourceElement?.Variables?.Count > 0)
        {
            var index = 0;
            foreach (var variable in resourceElement.Variables)
            {
                var replacement =
                    await EvaluateTextVariable(resourceElement, variable, state, context, customTextParameters)
                    ?? variable.DefaultValue;
                value = value.Replace("{" + index + "}", replacement ?? variable.Key);
                index++;
            }
        }

        return value;
    }

    private async Task<string?> EvaluateTextVariable(
        TextResourceElement resourceElement,
        TextResourceVariable variable,
        LayoutEvaluatorState? state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        // Do replacements for
        if (variable.DataSource.StartsWith("dataModel.", StringComparison.Ordinal))
        {
            if (state == null || context == null)
            {
                _logger.LogWarning(
                    "Text resource variable with dataSource '{DataSource}' is not supported in this context. In text resource with id = {TextResourceId}",
                    variable.DataSource,
                    resourceElement.Id
                );
                return null;
            }

            var dataModelName = variable.DataSource.Substring("dataModel.".Length);

            // For compatibility with docs, we allow {[0]} indexes in the path, even though we don't need them
            // when we know what part of the path is a list.
            var cleanPath = _cleanPathRegex.Replace(variable.Key, "");

            var binding = new ModelBinding()
            {
                DataType = dataModelName == "default" ? null : dataModelName,
                Field = cleanPath,
            };

            return await state.GetModelData(binding, context.DataElementIdentifier, context.RowIndices) as string;
        }

        if (variable.DataSource == "instanceContext")
        {
            if (state == null)
            {
                _logger.LogWarning(
                    "Text resource variable with dataSource '{DataSource}' is not supported in this context. In text resource with id = {TextResourceId}",
                    variable.DataSource,
                    resourceElement.Id
                );
                return null;
            }

            return state.GetInstanceContext(variable.Key);
        }

        if (variable.DataSource == "applicationSettings")
        {
            if (state == null)
            {
                _logger.LogWarning(
                    "Text resource variable with dataSource '{DataSource}' is not supported in this context. In text resource with id = {TextResourceId}",
                    variable.DataSource,
                    resourceElement.Id
                );
                return null;
            }

            return state.GetFrontendSetting(variable.Key);
        }

        if (variable.DataSource == "customTextParameters")
        {
            return customTextParameters?.GetValueOrDefault(variable.Key);
        }

        _logger.LogWarning(
            "Text resource variable with dataSource '{DataSource}' is not supported. Only 'dataModel.*', instanceContext, applicationSettings, and customTextParameters is supported. In text resource with id = {TextResourceId}",
            variable.DataSource,
            resourceElement.Id
        );

        return null;
    }

    private async Task<TextResourceElement?> GetTextResourceElement(string key, string? language)
    {
        language ??= LanguageConst.Nb;
        TextResource? textResource = await _appResources.GetTexts(_org, _app, language);

        if (textResource is null && language != LanguageConst.Nb)
        {
            textResource = await _appResources.GetTexts(_org, _app, LanguageConst.Nb);
        }

        return textResource?.Resources.Find(resource => resource.Id == key)
            ?? GetBackendFallbackResource(key, language);
    }

    private static TextResourceElement? GetBackendFallbackResource(string key, string language)
    {
        // When the list of backend text resources grows, we might want to have these in a separate file or similar.
        switch (key)
        {
            case "backend.validation_errors.required":
                return new TextResourceElement()
                {
                    Id = "backend.validation_errors.required",
                    Value = language switch
                    {
                        LanguageConst.Nb => "Feltet er påkrevd",
                        LanguageConst.Nn => "Feltet er påkravd",
                        _ => "Field is required",
                    },
                };
            case "backend.validation_errors.invalid_signature_hash":
                return new TextResourceElement()
                {
                    Id = "backend.validation_errors.invalid_signature_hash",
                    Value = language switch
                    {
                        LanguageConst.Nb => "Signerte data er endret etter at signaturen ble utført.",
                        LanguageConst.Nn => "Signerte data er endra etter at signaturen vart utført.",
                        _ => "The signed data has been modified after the signature was made.",
                    },
                };
        }

        return null;
    }

    /// <summary>
    /// Get the first matching text resource value for the specified keys in the specified language.
    /// </summary>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <param name="keys">Array of keys to search for</param>
    /// <returns>The value of the first matching text resource in the specified language or null</returns>
    public async Task<string?> TranslateFirstMatchingTextKey(string? language, params string[] keys)
    {
        language ??= LanguageConst.Nb;
        foreach (var key in keys)
        {
            TextResource? textResource = await _appResources.GetTexts(_org, _app, language);

            if (textResource is null && language != LanguageConst.Nb)
            {
                textResource = await _appResources.GetTexts(_org, _app, LanguageConst.Nb);
            }
            var value = textResource?.Resources.Find(resource => resource.Id == key)?.Value;
            if (value is not null)
            {
                return value;
            }
        }
        return null;
    }

    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource. If null, returns null.</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <returns>The value of the text resource in the specified language or null</returns>
    /// <exception cref="ArgumentException">If the text resource with the specified key does not exist</exception>
    public async Task<string?> TranslateTextKeyLenient(string? key, string? language)
    {
        if (string.IsNullOrEmpty(key))
        {
            return null;
        }

        return await TranslateTextKey(key, language, null);
    }
}
