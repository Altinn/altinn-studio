using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IImagesService
{
    Stream GetImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageFilePath);
    List<string> GetAllImageFileNames(AltinnRepoEditingContext altinnRepoEditingContext);
    Task UploadImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageName, Stream imageStream, bool overrideExisting);
    Task DeleteImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageFilePath);

}
