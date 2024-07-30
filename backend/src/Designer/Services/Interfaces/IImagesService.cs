using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IImagesService
{
  FileStreamResult GetImage(string org, string repo, string developer, string imageFilePath);
  List<FileStreamResult> GetAllImages(string org, string repo, string developer);
  List<string> GetAllImageFileNames(string org, string repo, string developer);
  Task UploadImage(string org, string repo, string developer, string imageName, Stream imageStream);
  Task DeleteImage(string org, string repo, string developer, string imageFilePath);
  
}