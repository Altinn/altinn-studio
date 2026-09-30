import {
  FileCsvIcon,
  FileExcelIcon,
  FileIcon,
  FilePdfIcon,
  FileWordIcon,
} from '@navikt/aksel-icons';

type FileExtensionIconProps = {
  fileEnding: string;
  className?: string;
};

export function FileExtensionIcon({ fileEnding, className }: FileExtensionIconProps) {
  const iconMap: Record<string, typeof FileIcon> = {
    '.pdf': FilePdfIcon,
    '.doc': FileWordIcon,
    '.docx': FileWordIcon,
    '.xls': FileExcelIcon,
    '.xlsx': FileExcelIcon,
    '.csv': FileCsvIcon,
  };

  const IconComponent = iconMap[fileEnding] || FileIcon;
  return <IconComponent className={className} aria-hidden />;
}
