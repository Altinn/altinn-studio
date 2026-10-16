using System.Text.RegularExpressions;
using Altinn.App.Core.Features;
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
internal sealed class TranslationService : ITranslationService
{
    private readonly string _org;
    private readonly string _app;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata? _appMetadata;
    private readonly ILogger<TranslationService> _logger;

    public TranslationService(
        AppIdentifier appIdentifier,
        IAppResources appResources,
        ILogger<TranslationService> logger,
        IAppMetadata? appMetadata = null
    )
    {
        _org = appIdentifier.Org;
        _app = appIdentifier.App;
        _appResources = appResources;
        _logger = logger;
        _appMetadata = appMetadata;
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
        return await Translate(key, language, state: null, context: null, customTextParameters);
    }

    public async Task<string?> TranslateTextKey(
        string key,
        LayoutEvaluatorState state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        return await Translate(key, state.GetLanguage(), state, context, customTextParameters);
    }

    public async Task<string?> TranslateTextKey(
        string key,
        IInstanceDataAccessor instanceDataAccessor,
        ComponentContext? context = null,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        return await Translate(
            key,
            instanceDataAccessor.Language,
            instanceDataAccessor.GetLayoutEvaluatorState(),
            context,
            customTextParameters
        );
    }

    private readonly Regex _cleanPathRegex = new(@"\[\{\d+\}\]", RegexOptions.Compiled, TimeSpan.FromMilliseconds(10));

    /// <summary>
    /// Translates the app's text resource for the key, or the built-in default text when the app has none.
    /// </summary>
    private async Task<string?> Translate(
        string key,
        string? language,
        LayoutEvaluatorState? state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        var resourceElement = await GetTextResourceElement(key, language);
        if (resourceElement is null)
        {
            // Built-in texts have nb, nn and en. Any other language gets the en text, while its variables are
            // still translated in the requested language.
            language ??= LanguageConst.Nb;
            var textLanguage = language is LanguageConst.Nb or LanguageConst.Nn ? language : LanguageConst.En;
            if (BuiltInTextResources.Find(key, textLanguage) is { } template)
            {
                return await ApplyTemplate(key, template, language, state, context, customTextParameters);
            }
        }

        return await ReplaceVariables(resourceElement, state, context, customTextParameters, language);
    }

    /// <summary>
    /// Resolves the template's variables and fills them in.
    /// </summary>
    private async Task<string> ApplyTemplate(
        string key,
        TextTemplate template,
        string language,
        LayoutEvaluatorState? state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        var values = new string[template.Variables.Length];
        for (var i = 0; i < values.Length; i++)
        {
            var source = template.Variables[i];
            values[i] =
                await EvaluateSource(key, source, state, language, context, customTextParameters)
                ?? source.DefaultValue
                ?? KeyAsWritten(source);
        }

        return template.Apply(values);
    }

    private async Task<string?> EvaluateSource(
        string textResourceId,
        TextVariableSource source,
        LayoutEvaluatorState? state,
        string language,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    ) =>
        source switch
        {
            TextVariableSource.CustomTextParameter parameter => customTextParameters?.GetValueOrDefault(parameter.Name),
            TextVariableSource.Text text => await EvaluateText(
                textResourceId,
                text.TextKey,
                state,
                language,
                context,
                customTextParameters
            ),
            TextVariableSource.DataModel dataModel => await EvaluateDataModel(
                textResourceId,
                dataModel.DataType ?? "default",
                dataModel.Field,
                state,
                context
            ),
            TextVariableSource.InstanceContext instanceContext => EvaluateInstanceContext(
                textResourceId,
                InstanceContextKeyName(instanceContext.Key),
                state
            ),
            TextVariableSource.ApplicationSetting setting => EvaluateApplicationSetting(
                textResourceId,
                setting.Key,
                state
            ),
            TextVariableSource.Unsupported unsupported => LogUnsupportedDataSource(
                textResourceId,
                unsupported.DataSource
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(source), source, "Unknown text variable source"),
        };

    /// <summary>
    /// The variable's key as it would be written in a text resource, shown when it has no value and no default value.
    /// </summary>
    private static string KeyAsWritten(TextVariableSource source) =>
        source switch
        {
            TextVariableSource.CustomTextParameter parameter => parameter.Name,
            TextVariableSource.Text text => text.TextKey,
            TextVariableSource.DataModel dataModel => dataModel.Field,
            TextVariableSource.InstanceContext instanceContext => InstanceContextKeyName(instanceContext.Key),
            TextVariableSource.ApplicationSetting setting => setting.Key,
            TextVariableSource.Unsupported unsupported => unsupported.Key,
            _ => throw new ArgumentOutOfRangeException(nameof(source), source, "Unknown text variable source"),
        };

    private static string InstanceContextKeyName(InstanceContextKey key) =>
        key switch
        {
            InstanceContextKey.InstanceOwnerPartyId => "instanceOwnerPartyId",
            InstanceContextKey.AppId => "appId",
            InstanceContextKey.InstanceId => "instanceId",
            InstanceContextKey.InstanceOwnerPartyType => "instanceOwnerPartyType",
            _ => throw new ArgumentOutOfRangeException(nameof(key), key, "Unknown instance context key"),
        };

    private async Task<string?> ReplaceVariables(
        TextResourceElement? resourceElement,
        LayoutEvaluatorState? state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters,
        string? language // language is also available in state, but we pass it explicitly for cases where state is null
    )
    {
        var value = resourceElement?.Value;
        if (value is not null && resourceElement?.Variables?.Count > 0)
        {
            var index = 0;
            foreach (var variable in resourceElement.Variables)
            {
                var replacement =
                    await EvaluateTextVariable(
                        resourceElement.Id,
                        variable.DataSource,
                        variable.Key,
                        state,
                        language,
                        context,
                        customTextParameters
                    ) ?? variable.DefaultValue;
                value = value.Replace("{" + index + "}", replacement ?? variable.Key);
                index++;
            }
        }

        return value;
    }

    private async Task<string?> EvaluateTextVariable(
        string textResourceId,
        string dataSource,
        string variableKey,
        LayoutEvaluatorState? state,
        string? language,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        if (dataSource.StartsWith("dataModel.", StringComparison.Ordinal))
        {
            return await EvaluateDataModel(
                textResourceId,
                dataSource.Substring("dataModel.".Length),
                variableKey,
                state,
                context
            );
        }

        return dataSource switch
        {
            "instanceContext" => EvaluateInstanceContext(textResourceId, variableKey, state),
            "applicationSettings" => EvaluateApplicationSetting(textResourceId, variableKey, state),
            "customTextParameters" => customTextParameters?.GetValueOrDefault(variableKey),
            "text" => await EvaluateText(textResourceId, variableKey, state, language, context, customTextParameters),
            _ => LogUnsupportedDataSource(textResourceId, dataSource),
        };
    }

    private async Task<string?> EvaluateDataModel(
        string textResourceId,
        string dataModelName,
        string path,
        LayoutEvaluatorState? state,
        ComponentContext? context
    )
    {
        var dataSource = $"dataModel.{dataModelName}";
        if (state == null)
        {
            return LogNotSupportedInContext(textResourceId, dataSource);
        }

        // For compatibility with docs, we allow {[0]} indexes in the path, even though we don't need them
        // when we know what part of the path is a list.
        var cleanPath = _cleanPathRegex.Replace(path, "");

        // Resolve "default" to the actual data type from the layout-set.
        // If there's no layout-set (e.g., some service tasks), GetDefaultDataTypeId() returns null.
        string? resolvedDataType = dataModelName == "default" ? state.GetDefaultDataTypeId() : dataModelName;

        if (resolvedDataType is null)
        {
            throw new InvalidOperationException(
                $"Text resource '{textResourceId}' uses 'dataModel.default' but no layout-set is available to determine the default data type. "
                    + "Use an explicit data type name instead (e.g., 'dataModel.MyDataType')."
            );
        }

        var binding = new ModelBinding() { DataType = resolvedDataType, Field = cleanPath };

        try
        {
            var fieldValue = ExpressionValue.FromObject(
                await state.GetModelData(binding, context?.DataElementIdentifier, context?.RowIndices)
            );

            return fieldValue.ToStringForText();
        }
        catch (Exception e)
        {
            // Errors getting data from the data model should not break text resource rendering
            _logger.LogError(
                e,
                "Error getting value for text resource variable with dataSource '{DataSource}' and key '{Key}'. In text resource with id = {TextResourceId}",
                dataSource,
                path,
                textResourceId
            );
            return null;
        }
    }

    private string? EvaluateInstanceContext(string textResourceId, string key, LayoutEvaluatorState? state) =>
        state == null ? LogNotSupportedInContext(textResourceId, "instanceContext") : state.GetInstanceContext(key);

    private string? EvaluateApplicationSetting(string textResourceId, string key, LayoutEvaluatorState? state) =>
        state == null ? LogNotSupportedInContext(textResourceId, "applicationSettings") : state.GetFrontendSetting(key);

    private async Task<string?> EvaluateText(
        string textResourceId,
        string textKey,
        LayoutEvaluatorState? state,
        string? language,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        if (textKey == textResourceId)
        {
            // TODO: Detect bigger cycles?
            _logger.LogWarning(
                "Text resource variable with dataSource 'text' cannot reference itself. In text resource with id = {TextResourceId}",
                textResourceId
            );
            return null;
        }
        return state == null
            ? await TranslateTextKey(textKey, language, customTextParameters)
            : await TranslateTextKey(textKey, state, context, customTextParameters);
    }

    private string? LogNotSupportedInContext(string textResourceId, string dataSource)
    {
        _logger.LogWarning(
            "Text resource variable with dataSource '{DataSource}' is not supported in this context. In text resource with id = {TextResourceId}",
            dataSource,
            textResourceId
        );
        return null;
    }

    private string? LogUnsupportedDataSource(string textResourceId, string dataSource)
    {
        _logger.LogWarning(
            "Text resource variable with dataSource '{DataSource}' is not supported. Only 'dataModel.*', instanceContext, applicationSettings, text and customTextParameters is supported. In text resource with id = {TextResourceId}",
            dataSource,
            textResourceId
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
        var resource = textResource?.Resources.Find(resource => resource.Id == key);
        if (resource is not null)
        {
            return resource;
        }

        if (key == "appName")
        {
            // Previous apps might have used "ServiceName" as key for the app name, so we check that as a fallback
            resource = textResource?.Resources.Find(r => r.Id == "ServiceName");
            if (resource is not null)
            {
                return resource;
            }

            if (_appMetadata is not null)
            {
                var appMetadata = _appMetadata.ApplicationMetadata;
                if (appMetadata?.Title?.Count > 0)
                {
                    return appMetadata.Title.TryGetValue(language, out var title)
                        ? new TextResourceElement() { Id = "appName", Value = title }
                        : new TextResourceElement() { Id = "appName", Value = appMetadata.Title.First().Value };
                }
            }
            // Fallback to just using the app id as app name
            return new TextResourceElement() { Id = "appName", Value = _app };
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
