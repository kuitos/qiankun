/**
 * @author Kuitos
 * @since 2019-04-11
 */

import { SandboxType } from '../core/sandbox/types';
import { patchStandardSandbox } from './dynamicAppend';
import type { SandboxAndSandboxConfig } from './dynamicAppend/types';
import patchHistoryListener from './historyListener';
import patchInterval from './interval';
import type { Free } from './types';
import patchWindowListener from './windowListener';

export function patchAtBootstrapping(
  appName: string,
  getContainer: () => HTMLElement,
  opts: Pick<SandboxAndSandboxConfig, 'sandbox' | 'fetch' | 'nodeTransformer'>,
): Free[] {
  const patchersInSandbox = {
    [SandboxType.Standard]: [() => patchStandardSandbox(appName, getContainer, { mounting: false, ...opts })],
    [SandboxType.Snapshot]: [],
  } as const;
  const { sandbox } = opts;

  return patchersInSandbox[sandbox.type].map((patch) => patch());
}

export function patchAtMounting(
  appName: string,
  getContainer: () => HTMLElement,
  opts: Pick<SandboxAndSandboxConfig, 'sandbox' | 'fetch' | 'nodeTransformer'>,
): Free[] {
  const { sandbox } = opts;
  const basePatchers = [
    () => patchInterval(sandbox.globalThis),
    () => patchWindowListener(sandbox.globalThis),
    () => patchHistoryListener(),
  ];

  const patchersInSandbox = {
    [SandboxType.Standard]: [
      ...basePatchers,
      () => patchStandardSandbox(appName, getContainer, { mounting: true, ...opts }),
    ],
    [SandboxType.Snapshot]: basePatchers,
  };

  return patchersInSandbox[sandbox.type].map((patch) => patch());
}

export { disposeStandardSandbox as disposePatcher } from './dynamicAppend';
