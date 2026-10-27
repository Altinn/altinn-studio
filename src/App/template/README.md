# App templates

[Designer](../../Designer/README.md) creates each new app from one of these templates. Each folder is one template,
and its name is the template's ID. `<id>/src` is a complete app that references the
[Altinn.App libraries](../backend/README.md), and it becomes the new app's repository, less the files its
`.releaseignore` lists. The [Designer Dockerfile](../../Designer/Dockerfile) copies each template into its image.
Designer is deployed continuously from `main`, so a broken template on `main` breaks every new app.

## Versions

There is one template per major version of the libraries. Each is a full copy, because they diverge and each must
build on its own. Make a change that applies to every version in each folder, and do not move shared parts of the
app into a common layer. The build tooling at this level, such as `Directory.Build.props` and the CSharpier
configuration, is shared instead. MSBuild and CSharpier search upwards from the app, and nothing outside `src` reaches
a new app.

`v9` started as a copy of `v8`, migrated once with `studioctl app upgrade v9`. Changes to `v8` are not carried over.
Each `<id>/global.json` pins the SDK that the template's Dockerfile builds with, so building `v8` needs a .NET 10 SDK.

To add a version, copy a folder and change its `apptemplate.json`, `App.csproj` and `global.json`. Then add its ID
wherever the existing IDs appear: the template workflows, `renovate.json` and the Designer Dockerfile. Without the
Dockerfile the template is missing from Designer's image.

## Build and test

Build and test a template with `dotnet build src/App.sln` and `dotnet test src/App.sln` in its folder. When you change
the Dockerfile, the referenced library version or anything else in the build, also build the image from the files a
new app gets, as CI does:

```sh
cd src/App/template/<id>/src
rsync . -r --exclude-from=.releaseignore --exclude-from=.gitignore /tmp/app-template-release
docker build /tmp/app-template-release
```
