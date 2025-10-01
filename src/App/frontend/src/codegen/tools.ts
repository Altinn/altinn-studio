import crypto from 'crypto';
import { loadESLint } from 'eslint';
import fs from 'node:fs/promises';
import type { ESLint } from 'eslint';

export async function saveFile(targetPath: string, _content: string, removeText?: RegExp, fileExisted?: boolean) {
  const content = `${_content.trim()}\n`;
  try {
    const fd = await fs.open(targetPath, 'r+');
    let textToCompare = (await fd.readFile('utf-8')).toString();
    if (removeText) {
      textToCompare = textToCompare.replace(removeText, '');
    }
    if (textToCompare.trim() !== content.trim()) {
      console.log(fileExisted === false ? `Created ${targetPath}` : `Regenerated ${targetPath}`);
      await fd.truncate(0);
      await fd.write(content, 0, 'utf-8');
    }
    await fd.close();
  } catch (_err) {
    // File does not exist
    await fs.writeFile(targetPath, content, 'utf-8');
    console.log(`Created ${targetPath}`);
  }
}

async function fileExists(path: string) {
  try {
    await fs.stat(path);
    return true;
  } catch (_err) {
    return false;
  }
}

let eslint: ESLint | undefined;
async function getESLint() {
  if (!eslint) {
    const ESLint = await loadESLint({ useFlatConfig: true });
    eslint = new ESLint({
      fix: true,
      cache: true,
    });
  }

  return eslint;
}

type TsResult = { result: string };

export async function saveTsFile(targetPath: string, content: TsResult | Promise<TsResult>) {
  const { result } = await content;
  const contentHash = crypto.createHash('sha256').update(result).digest('hex');
  const _fileExists = await fileExists(targetPath);
  if (_fileExists) {
    const existingContent = await fs.readFile(targetPath, 'utf-8');
    const sourceHash = existingContent.match(/\/\/ Source hash: ([a-f0-9]+)/);
    if (sourceHash && sourceHash[1] === contentHash) {
      // No changes, avoids running eslint
      return;
    }
  } else {
    // For some reason eslint needs the file to exist before it can fix it, even if we're passing
    // the content directly to it.
    await fs.writeFile(targetPath, result, 'utf-8');
  }

  const eslint = await getESLint();
  const results = await eslint.lintText(result, { filePath: targetPath });
  const output = results[0].output;

  if (!output && results[0].errorCount > 0) {
    console.error(`Error linting/fixing ${targetPath}:`);
    console.error(results[0].messages);
  }

  const contentMain = output || result;
  const regexToIgnore = /\/\/ Source hash: [a-f0-9]+/;
  await saveFile(targetPath, `${contentMain.trim()}\n\n// Source hash: ${contentHash}`, regexToIgnore, _fileExists);
}
