/**
 * @author Kuitos
 * @since 2023-08-26
 */
import type { BaseLoaderOpts } from '../common';
import type { MatchResult } from '../module-resolver';
import type { Deferred } from '../utils';

export type BaseTranspilerOpts = BaseLoaderOpts & {
  moduleResolver?: (url: string) => MatchResult | undefined;
  sandbox?: {
    makeEvaluateFactory(source: string, sourceURL?: string): string;
  };
};

export type AssetsTranspilerOpts = BaseTranspilerOpts & { rawNode: Node };

export type NodeTransformer = <T extends Node>(node: T, opts: Omit<AssetsTranspilerOpts, 'moduleResolver'>) => T;

export type ScriptTranspilerOpts = AssetsTranspilerOpts &
  (
    | { prevScriptTranspiledDeferred: Deferred<void>; scriptTranspiledDeferred: Deferred<void> }
    | { prevScriptTranspiledDeferred?: undefined; scriptTranspiledDeferred?: undefined }
  );

export enum Mode {
  REMOTE_ASSETS_IN_SANDBOX = 'RAIS',
  REMOTE_ASSETS = 'RA',
  REUSED_DEP_IN_SANDBOX = 'RDIS',
  REUSED_DEP = 'RD',
  INLINE_CODE_IN_SANDBOX = 'ICIS',
  NONE = 'NONE',
}
