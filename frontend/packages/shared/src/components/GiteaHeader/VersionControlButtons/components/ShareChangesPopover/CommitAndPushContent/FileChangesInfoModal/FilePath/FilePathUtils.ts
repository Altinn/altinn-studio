export const convertPureGitDiffToUserFriendlyDiff = (file: string): string[] => {
  const lines = file.split('\n');
  let showLine = false;
  const linesToRender = lines.filter((line) => {
    if (showLine) return line;
    if (line.startsWith('@@')) showLine = true;
  });
  if (linesToRender[linesToRender.length - 1].includes('No newline at end of file'))
    linesToRender.splice(linesToRender.length - 1);
  return linesToRender;
};
