using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IImagesService
{
    Stream GetImage(string org, string repo, string developer, string imageFilePath);
    List<string> GetAllImageFileNames(string org, string repo, string developer);
    Task UploadImage(string org, string repo, string developer, string imageName, Stream imageStream, bool overrideExisting);
    Task DeleteImage(string org, string repo, string developer, string imageFilePath);

}
