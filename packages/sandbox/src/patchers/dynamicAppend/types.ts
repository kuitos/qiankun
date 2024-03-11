/**
 * @author Kuitos
 * @since 2023-05-04
 */
import type { Sandbox } from '@qiankunjs/sandbox';
import type { BaseLoaderOpts, Deferred, NodeTransformer } from '@qiankunjs/shared';

export type SandboxConfig = {
  appName: string;
  dynamicStyleSheetElements: Array<HTMLStyleElement | HTMLLinkElement>;
  dynamicExternalSyncScriptDeferredList: Array<Deferred<void>>;
  nodeTransformer: NodeTransformer;
} & BaseLoaderOpts;

export type SandboxAndSandboxConfig = { sandbox: Sandbox } & SandboxConfig;
