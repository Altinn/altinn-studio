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
        var resourceElement = await GetTextResourceElement(key, language);
        var value = await ReplaceVariables(resourceElement, state: null, context: null, customTextParameters, language);
        return value;
    }

    public async Task<string?> TranslateTextKey(
        string key,
        LayoutEvaluatorState state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        string language = state.GetLanguage();
        var resourceElement = await GetTextResourceElement(key, language);
        var value = await ReplaceVariables(resourceElement, state, context, customTextParameters, language);
        return value;
    }

    public async Task<string?> TranslateTextKey(
        string key,
        IInstanceDataAccessor instanceDataAccessor,
        ComponentContext? context = null,
        Dictionary<string, string>? customTextParameters = null
    )
    {
        var resourceElement = await GetTextResourceElement(key, instanceDataAccessor.Language);
        var value = await ReplaceVariables(
            resourceElement,
            instanceDataAccessor.GetLayoutEvaluatorState(),
            context,
            customTextParameters,
            instanceDataAccessor.Language
        );
        return value;
    }

    private readonly Regex _cleanPathRegex = new(@"\[\{\d+\}\]", RegexOptions.Compiled, TimeSpan.FromMilliseconds(10));

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
                        resourceElement,
                        variable,
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
        TextResourceElement resourceElement,
        TextResourceVariable variable,
        LayoutEvaluatorState? state,
        string? language,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters
    )
    {
        // Do replacements for
        if (variable.DataSource.StartsWith("dataModel.", StringComparison.Ordinal))
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

            var dataModelName = variable.DataSource.Substring("dataModel.".Length);

            // For compatibility with docs, we allow {[0]} indexes in the path, even though we don't need them
            // when we know what part of the path is a list.
            var cleanPath = _cleanPathRegex.Replace(variable.Key, "");

            // Resolve "default" to the actual data type from the layout-set.
            // If there's no layout-set (e.g., some service tasks), GetDefaultDataType() returns null.
            string? resolvedDataType = dataModelName == "default" ? state.GetDefaultDataType()?.Id : dataModelName;

            if (resolvedDataType is null)
            {
                throw new InvalidOperationException(
                    $"Text resource '{resourceElement.Id}' uses 'dataModel.default' but no layout-set is available to determine the default data type. "
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
                    variable.DataSource,
                    variable.Key,
                    resourceElement.Id
                );
                return null;
            }
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

        if (variable.DataSource == "text")
        {
            if (variable.Key == resourceElement.Id)
            {
                // TODO: Detect bigger cycles?
                _logger.LogWarning(
                    "Text resource variable with dataSource 'text' cannot reference itself. In text resource with id = {TextResourceId}",
                    resourceElement.Id
                );
                return null;
            }
            return state == null
                ? await TranslateTextKey(variable.Key, language, customTextParameters)
                : await TranslateTextKey(variable.Key, state, context, customTextParameters);
        }

        _logger.LogWarning(
            "Text resource variable with dataSource '{DataSource}' is not supported. Only 'dataModel.*', instanceContext, applicationSettings, text and customTextParameters is supported. In text resource with id = {TextResourceId}",
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

        return GetBackendFallbackResource(key, language);
    }

    private static TextResourceElement? GetBackendFallbackResource(string key, string language)
    {
        // When the list of backend text resources grows, we might want to have these in a separate file or similar.
        switch (key)
        {
            case "backend.validation_errors.required":
                return Localized(
                    key,
                    language,
                    nb: "Feltet er påkrevd",
                    nn: "Feltet er påkravd",
                    en: "Field is required"
                );
            case "backend.pdf_default_file_name":
                return new TextResourceElement()
                {
                    Id = "backend.pdf_default_file_name",
                    Value = "{0}.pdf",
                    Variables =
                    [
                        new TextResourceVariable()
                        {
                            Key = "appName",
                            DataSource = "text",
                            DefaultValue = "Altinn PDF",
                        },
                    ],
                };
            case "pdfPreviewText":
                return Localized(
                    key,
                    language,
                    nb: "Dokumentet er en forhåndsvisning",
                    nn: "Dokumentet er ein førehandsvisning",
                    en: "The document is a preview"
                );
            case "backend.xsd_validation":
                return Localized(
                    key,
                    language,
                    nb: "Et felt bryter reglene satt av XSD. Melding: {0}",
                    nn: "Eit felt bryt reglane sette av XSD. Melding: {0}",
                    en: "A field is in violation of the rules set by the XSD schema. Message: {0}",
                    customTextParameterKeys: ["message"]
                );
            case "altinn.standard_validation.file_content_type_not_allowed":
                return Localized(
                    key,
                    language,
                    nb: "Det ser ut som du prøver å laste opp en filtype som ikke er tillatt. Sjekk at filen faktisk er av den typen den utgir seg for å være. Tillatte filtyper er: {0}.",
                    nn: "Det ser ut som du prøver å lasta opp ein filtype som ikkje er tillaten. Sjekk at fila faktisk er av den typen han gir seg ut for å vera. Tillatne filtypar er: {0}.",
                    en: "It looks like you are trying to upload a file type that is not allowed. Please make sure that the file is actually the type it claims to be. Allowed file types are: {0}.",
                    customTextParameterKeys: ["allowedContentTypes"]
                );
            case "backend.validation_errors.missing_content_type":
                return Localized(
                    key,
                    language,
                    nb: "Filen har ingen filtype.",
                    nn: "Fila har ingen filtype.",
                    en: "The file is missing a content type."
                );
            case "backend.validation_errors.file_too_large":
                return Localized(
                    key,
                    language,
                    nb: "Filen er for stor. Største tillatte filstørrelse er {0} MB.",
                    nn: "Fila er for stor. Største tillatne filstorleik er {0} MB.",
                    en: "The file is too large. The maximum file size is {0} MB.",
                    customTextParameterKeys: ["maxSize"]
                );
            case "backend.validation_errors.file_infected":
                return Localized(
                    key,
                    language,
                    nb: "Filen er infisert med skadelig programvare og kan ikke brukes.",
                    nn: "Fila er infisert med skadeleg programvare og kan ikkje brukast.",
                    en: "The file is infected with malware and cannot be used."
                );
            case "backend.validation_errors.file_scan_pending":
                return Localized(
                    key,
                    language,
                    nb: "Filen blir skannet for skadelig programvare. Vent til skanningen er ferdig.",
                    nn: "Fila blir skanna for skadeleg programvare. Vent til skanninga er ferdig.",
                    en: "The file is being scanned for malware. Please wait until the scan is complete."
                );
            case "backend.validation_errors.too_many_data_elements":
                return Localized(
                    key,
                    language,
                    nb: "Det er lagt til flere enn {0} elementer av typen {1}.",
                    nn: "Det er lagt til fleire enn {0} element av typen {1}.",
                    en: "More than {0} items of type {1} have been added.",
                    customTextParameterKeys: ["maxCount", "dataType"]
                );
            case "backend.validation_errors.too_few_data_elements":
                return Localized(
                    key,
                    language,
                    nb: "Det må legges til minst {0} elementer av typen {1}.",
                    nn: "Det må leggjast til minst {0} element av typen {1}.",
                    en: "At least {0} items of type {1} must be added.",
                    customTextParameterKeys: ["minCount", "dataType"]
                );
            case "backend.validation_errors.missing_signatures":
                return Localized(
                    key,
                    language,
                    nb: "Det mangler påkrevde signaturer.",
                    nn: "Det manglar påkravde signaturar.",
                    en: "Required signatures are missing."
                );
            case "backend.validation_errors.invalid_signature_hash":
                return Localized(
                    key,
                    language,
                    nb: "Signerte data er endret etter at signaturen ble utført.",
                    nn: "Signerte data er endra etter at signaturen vart utført.",
                    en: "The signed data has been modified after the signature was made."
                );
        }

        return null;
    }

    /// <summary>
    /// Builds a built-in text in the requested language. Each key in <paramref name="customTextParameterKeys"/>
    /// fills the placeholder at its position ({0}, {1}, ...) from the issue's customTextParameters.
    /// </summary>
    private static TextResourceElement Localized(
        string key,
        string language,
        string nb,
        string nn,
        string en,
        string[]? customTextParameterKeys = null
    )
    {
        return new TextResourceElement()
        {
            Id = key,
            Value = language switch
            {
                LanguageConst.Nb => nb,
                LanguageConst.Nn => nn,
                _ => en,
            },
            Variables = (customTextParameterKeys ?? [])
                .Select(parameter => new TextResourceVariable()
                {
                    DataSource = "customTextParameters",
                    Key = parameter,
                    DefaultValue = "",
                })
                .ToList(),
        };
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
