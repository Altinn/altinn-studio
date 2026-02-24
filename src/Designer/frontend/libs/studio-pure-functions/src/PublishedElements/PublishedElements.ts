import { Guard } from '@studio/guard';
import { FileNameUtils } from '../FileNameUtils';

export class PublishedElements {
  readonly #fileNames: readonly string[];

  constructor(fileNames: string[]) {
    this.#fileNames = fileNames;
  }

  public latestVersionOrNull(elementName: string): number | null {
    return this.isPublished(elementName) ? this.latestVersion(elementName) : null;
  }

  public isPublished(elementName: string): boolean {
    return this.hasVersion('_latest', elementName) && this.hasVersion('1', elementName);
  }

  private hasVersion(version: string, elementName: string): boolean {
    return this.#fileNames.map(FileNameUtils.removeExtension).includes(`${elementName}/${version}`);
  }

  private latestVersion(elementName: string): number {
    const allVersions = this.allStaticVersionsAsNumbers(elementName);
    return Math.max(...allVersions);
  }

  private allStaticVersionsAsNumbers(elementName: string): number[] {
    const allStaticFiles = this.allStaticFiles(elementName);
    return allStaticFiles.map(PublishedElements.evaluateVersionNumberFromFileName);
  }

  private allStaticFiles(elementName: string): string[] {
    const allFileNames = this.allElementFiles(elementName);
    return allFileNames.filter(PublishedElements.isStaticFile);
  }

  private allElementFiles(elementName: string): string[] {
    return this.#fileNames.filter((filePath) => filePath.startsWith(elementName + '/'));
  }

  private static isStaticFile(fileName: string): boolean {
    return /.+\/\d+\.json$/i.test(fileName);
  }

  private static evaluateVersionNumberFromFileName(fileName: string): number {
    const match = fileName.match(/(?<=\/)(\d+)(?=\.json$)/i);
    Guard.againstNull(match);
    return parseInt(match[0], 10);
  }
}
