import type { MainFrameworkTemplate, SubFrameworkTemplate } from './template';

export enum IRoutePattern {
  hash = 'hash',
  history = 'history',
}

export enum PackageManager {
  npm = 'npm',
  yarn = 'yarn',
  pnpm = 'pnpm',
  pnpmWorkspace = 'pnpm workspace',
}

export interface PromptAnswer {
  projectName: string;
  createKind: CreateKind;
  mainAppName?: MainFrameworkTemplate;
  subAppNameList?: SubFrameworkTemplate[];
  mainRoute?: IRoutePattern;
  packageManager?: PackageManager;
}

export enum CreateKind {
  CreateMainApp = '1',
  CreateSubApp = '2',
  CreateMainAndSubApp = '3',
}
