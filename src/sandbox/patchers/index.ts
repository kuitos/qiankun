/**
 * @author Kuitos
 * @since 2019-04-11
 */

import type { Freer, SandBox } from '../../interfaces';
import { SandBoxType } from '../../interfaces';
import * as css from './css';
import { patchLooseSandbox, patchStrictSandbox } from './dynamicAppend';
import patchHistoryListener from './historyListener';
import patchInterval from './interval';
import patchWindowListener from './windowListener';

export function patchAtMounting(
  appName: string,
  elementGetter: () => HTMLElement | ShadowRoot,
  sandbox: SandBox,
  scopedCSS: boolean,
  proxyCSS: boolean,
  excludeAssetFilter?: CallableFunction,
  speedySandBox?: boolean,
): Freer[] {
  const basePatchers = [
    () => patchInterval(sandbox.proxy),
    () => patchWindowListener(sandbox.proxy),
    () => patchHistoryListener(),
  ];

  const patchersInSandbox = {
    [SandBoxType.LegacyProxy]: [
      ...basePatchers,
      () => patchLooseSandbox(appName, elementGetter, sandbox, true, scopedCSS, proxyCSS, excludeAssetFilter),
    ],
    [SandBoxType.Proxy]: [
      ...basePatchers,
      () =>
        patchStrictSandbox(
          appName,
          elementGetter,
          sandbox,
          true,
          scopedCSS,
          proxyCSS,
          excludeAssetFilter,
          speedySandBox,
        ),
    ],
    [SandBoxType.Snapshot]: [
      ...basePatchers,
      () => patchLooseSandbox(appName, elementGetter, sandbox, true, scopedCSS, proxyCSS, excludeAssetFilter),
    ],
  };

  return patchersInSandbox[sandbox.type]?.map((patch) => patch());
}

export function patchAtBootstrapping(
  appName: string,
  elementGetter: () => HTMLElement | ShadowRoot,
  sandbox: SandBox,
  scopedCSS: boolean,
  proxyCSS: boolean,
  excludeAssetFilter?: CallableFunction,
  speedySandBox?: boolean,
): Freer[] {
  const patchersInSandbox = {
    [SandBoxType.LegacyProxy]: [
      () => patchLooseSandbox(appName, elementGetter, sandbox, false, scopedCSS, proxyCSS, excludeAssetFilter),
    ],
    [SandBoxType.Proxy]: [
      () =>
        patchStrictSandbox(
          appName,
          elementGetter,
          sandbox,
          false,
          scopedCSS,
          proxyCSS,
          excludeAssetFilter,
          speedySandBox,
        ),
    ],
    [SandBoxType.Snapshot]: [
      () => patchLooseSandbox(appName, elementGetter, sandbox, false, scopedCSS, proxyCSS, excludeAssetFilter),
    ],
  };

  return patchersInSandbox[sandbox.type]?.map((patch) => patch());
}

export { css };
