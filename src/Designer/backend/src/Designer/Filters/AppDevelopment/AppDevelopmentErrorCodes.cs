#nullable disable
namespace Altinn.Studio.Designer.Filters.AppDevelopment;

public class AppDevelopmentErrorCodes
{
    public const string InvalidLayoutSetIdError = "AD_03";
    public const string ConflictingFileNameError = "AD_04";
    public const string UploadedImageNotValid = nameof(UploadedImageNotValid);
    public const string ResourcePublishingError = nameof(ResourcePublishingError);
    public const string SubformComponentNotFound = nameof(SubformComponentNotFound);
    public const string SubformComponentMissingLayoutSet = nameof(SubformComponentMissingLayoutSet);
    public const string SubformMissingDefaultDataType = nameof(SubformMissingDefaultDataType);
    public const string LayoutSetIsNotSubformPdfTask = nameof(LayoutSetIsNotSubformPdfTask);
}
