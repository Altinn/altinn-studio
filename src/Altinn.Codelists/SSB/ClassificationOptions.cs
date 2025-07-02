using Altinn.Codelists.SSB.Clients;

namespace Altinn.Codelists.SSB;

/// <summary>
/// Controls various options when returning data from  the SSB Classification API.
/// </summary>
public class ClassificationOptions
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ClassificationOptions"/> class.
    /// </summary>
    public ClassificationOptions() { }

    /// <summary>
    /// Maps the classification notes field to the description field.
    /// </summary>
    public bool MapNotesToDescription { get; set; } = false;

    /// <summary>
    /// Defines a custom mapping function for the description field.
    /// </summary>
    public Func<ClassificationCode, string>? MapDescriptionFunc { get; set; }

    /// <summary>
    /// Returns the description for the provided <see cref="ClassificationCode"/>.
    /// If <see cref="MapDescriptionFunc"/> is set, this will be used.
    /// If <see cref="MapNotesToDescription"/> is set, the notes field will be used.
    /// If <see cref="MapNotesToDescription"/> is not set and no <see cref="MapDescriptionFunc"/>
    /// is specified, an empty string will be returned.
    /// </summary>
    public string GetDescription(ClassificationCode classificationCode)
    {
        if (MapDescriptionFunc == null)
        {
            return MapNotesToDescription ? classificationCode.Notes : string.Empty;
        }

        return MapDescriptionFunc.Invoke(classificationCode);
    }

    /// <summary>
    /// Maps the classification notes field to the help text field.
    /// </summary>
    public bool MapNotesToHelpText { get; set; } = true;

    /// <summary>
    /// Defines a custom mapping function for the helptext field.
    /// </summary>
    public Func<ClassificationCode, string>? MapHelpTextFunc { get; set; }

    /// <summary>
    /// Returns the helptext for the provided <see cref="ClassificationCode"/>.
    /// If <see cref="MapHelpTextFunc"/> is set, this will be used.
    /// If <see cref="MapNotesToHelpText"/> is set, the notes field will be used.
    /// If <see cref="MapNotesToHelpText"/> is not set and no <see cref="MapHelpTextFunc"/>
    /// is specified, an empty string will be returned.
    /// </summary>
    public string GetHelpText(ClassificationCode classificationCode)
    {
        if (MapHelpTextFunc == null)
        {
            return MapNotesToHelpText ? classificationCode.Notes : string.Empty;
        }

        return MapHelpTextFunc.Invoke(classificationCode);
    }
}
