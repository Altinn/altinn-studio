import { convertPureGitDiffToUserFriendlyDiff } from 'app-shared/components/GiteaHeader/VersionControlButtons/components/ShareChangesPopover/CommitAndPushContent/FileChangesInfoModal/FilePath/FilePathUtils';

const diffStringMock = `diff --git a/fileName.json b/fileName.json
index 0909a03..527e226 100644
--- a/fileName.json
+++ b/fileName.json
@@ -2,6 +2,30 @@
- old line
+ new line
unchanged line
\ No newline at end of file`;

const diffStringWithoutLastMetadataLineMock = `diff --git a/fileName.json b/fileName.json
index 0909a03..527e226 100644
--- a/fileName.json
+++ b/fileName.json
@@ -2,6 +2,30 @@
- old line
+ new line
unchanged line
`;

describe('FilePathUtils', () => {
  describe('convertPureGitDiffToUserFriendlyDiff', () => {
    it('removes all metadata including line with double @ in the diff string', () => {
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(diffStringMock);

      expect(userFriendlyDiff).toEqual(['- old line', '+ new line', 'unchanged line']);
    });

    it('returns last line if it is not metadata', () => {
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(
        diffStringWithoutLastMetadataLineMock,
      );

      expect(userFriendlyDiff).toEqual(['- old line', '+ new line', 'unchanged line']);
    });

    it('handles binary diff changes metadata', () => {
      const binaryGitDiffString = `diff --git a/App/wwwroot/image.png b/App/wwwroot/image.png
      new file mode 100644
      index 0000000..48550ba
      Binary files /dev/null and b/App/wwwroot/image.png differ`;
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(binaryGitDiffString);

      expect(userFriendlyDiff).toEqual([
        '      Binary files /dev/null and b/App/wwwroot/image.png differ',
      ]); // Includes whitespaces
    });
  });
});
