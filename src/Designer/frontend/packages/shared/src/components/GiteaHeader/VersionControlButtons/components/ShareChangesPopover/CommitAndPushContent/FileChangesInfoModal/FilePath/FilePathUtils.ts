const DIFF_START_BINARY_IDENTIFIER = 'Binary files';
const DIFF_START_IDENTIFIER = '@@';
const DIFF_END_IDENTIFIER = 'No newline at end of file';

export const convertPureGitDiffToUserFriendlyDiff = (file: string): string[] => {
  const lines = file.split('\n');
  let showLine = false;
  const linesToRender = lines.filter((line) => {
    if (line.includes(DIFF_START_BINARY_IDENTIFIER)) showLine = true; // For images etc. we want to include this line
    if (showLine) return line;
    if (line.startsWith(DIFF_START_IDENTIFIER)) showLine = true; // For other general files we want to include all lines after this line
  });
  if (linesToRender[linesToRender.length - 1]?.includes(DIFF_END_IDENTIFIER))
    linesToRender.splice(linesToRender.length - 1);
  return linesToRender;
};
