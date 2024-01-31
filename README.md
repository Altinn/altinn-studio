# altinn-studio-cli

Command line tool for app development

## Requirements

- .NET 8

## Local installation

To install the tool from source, run the following command:

```
make install-locally
```

If you already have the tool installed, you can reinstall it by running:

```
make reinstall-locally
```

## Upgrading apps

To upgrade an app backend from v7 to v8, navigate to the apps root folder and run the following command:

```
altinn-studio upgrade backend
```

Similarly, to upgrade an app from using frontend v3 to v4, run:

```
altinn-studio upgrade frontend
```
