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

describe('FilePathUtils', () => {
  describe('convertPureGitDiffToUserFriendlyDiff', () => {
    afterEach(jest.clearAllMocks);
    it('removes all metadata including line with double @ in the diff string', () => {
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(diffStringMock);

      expect(userFriendlyDiff).not.toContain('diff --git a/fileName.json b/fileName.json');
      expect(userFriendlyDiff).not.toContain('index 0909a03..527e226 100644');
      expect(userFriendlyDiff).not.toContain('--- a/fileName.json');
      expect(userFriendlyDiff).not.toContain('+++ b/fileName.json');
      expect(userFriendlyDiff).not.toContain('@@ -2,6 +2,30 @@');
      expect(userFriendlyDiff).toContain('- old line');
      expect(userFriendlyDiff).toContain('+ new line');
      expect(userFriendlyDiff).toContain('unchanged line');
    });

    it('removes last metadata line if it exists', () => {
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(diffStringMock);

      expect(userFriendlyDiff).not.toContain('No newline at end of file');
    });

    it('returns last line if it is not metadata', () => {
      diffStringMock.replace(' No newline at end of file', '');
      const userFriendlyDiff: string[] = convertPureGitDiffToUserFriendlyDiff(diffStringMock);

      expect(userFriendlyDiff).not.toContain('No newline at end of file');
      expect(userFriendlyDiff).toContain('+ new line');
      expect(userFriendlyDiff).toContain('unchanged line');
    });
  });
});
