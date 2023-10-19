/**
 * @author Kuitos
 * @since 2019-04-11
 */
import { patchAtBootstrapping, patchAtMounting } from '../../patchers';
import type { Free, Rebuild } from '../../patchers/types';
import type { Endowments } from '../membrane';
import { StandardSandbox } from './StandardSandbox';
import type { Sandbox } from './types';

export type { Sandbox };

/**
 * 生成应用运行时沙箱
 *
 * 沙箱分两个类型：
 * 1. app 环境沙箱
 *  app 环境沙箱是指应用初始化过之后，应用会在什么样的上下文环境运行。每个应用的环境沙箱只会初始化一次，因为子应用只会触发一次 bootstrap 。
 *  子应用在切换时，实际上切换的是 app 环境沙箱。
 * 2. render 沙箱
 *  子应用在 app mount 开始前生成好的的沙箱。每次子应用切换过后，render 沙箱都会重现初始化。
 *
 * 这么设计的目的是为了保证每个子应用切换回来之后，还能运行在应用 bootstrap 之后的环境下。
 *
 * @param appName
 * @param getContainer
 * @param opts
 */
export function createSandboxContainer(
  appName: string,
  getContainer: () => HTMLElement,
  opts: {
    globalContext?: WindowProxy;
    extraGlobals?: Endowments;
  },
) {
  const { globalContext, extraGlobals = {} } = opts;
  let sandbox: Sandbox;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (window.Proxy) {
    sandbox = new StandardSandbox(appName, extraGlobals, globalContext);
  } else {
    // TODO snapshot sandbox
    sandbox = new StandardSandbox(appName, extraGlobals, globalContext);
  }

  // some side effect could be invoked while bootstrapping, such as dynamic stylesheet injection with style-loader, especially during the development phase
  const bootstrappingFrees = patchAtBootstrapping(appName, getContainer, sandbox);
  // mounting frees are one-off and should be re-init at every mounting time
  let mountingFrees: Free[] = [];

  let sideEffectsRebuilds: Rebuild[] = [];

  return {
    instance: sandbox,

    /**
     * 沙箱被 mount
     * 可能是从 bootstrap 状态进入的 mount
     * 也可能是从 unmount 之后再次唤醒进入 mount
     */
    async mount() {
      /* ------------------------------------------ 因为有上下文依赖（window），以下代码执行顺序不能变 ------------------------------------------ */

      /* ------------------------------------------ 1. 启动/恢复 沙箱------------------------------------------ */
      sandbox.active();

      const sideEffectsRebuildsAtBootstrapping = sideEffectsRebuilds.slice(0, bootstrappingFrees.length);
      const sideEffectsRebuildsAtMounting = sideEffectsRebuilds.slice(bootstrappingFrees.length);

      // must rebuild the side effects which added at bootstrapping firstly to recovery to nature state
      if (sideEffectsRebuildsAtBootstrapping.length) {
        sideEffectsRebuildsAtBootstrapping.forEach((rebuild) => rebuild());
      }

      /* ------------------------------------------ 2. 开启全局变量补丁 ------------------------------------------*/
      // render 沙箱启动时开始劫持各类全局监听，尽量不要在应用初始化阶段有 事件监听/定时器 等副作用
      mountingFrees = patchAtMounting(appName, getContainer, sandbox);

      /* ------------------------------------------ 3. 重置一些初始化时的副作用 ------------------------------------------*/
      // 存在 rebuilds 则表明有些副作用需要重建
      if (sideEffectsRebuildsAtMounting.length) {
        sideEffectsRebuildsAtMounting.forEach((rebuild) => rebuild());
      }

      // clean up rebuilds
      sideEffectsRebuilds = [];
    },

    /**
     * 恢复 global 状态，使其能回到应用加载之前的状态
     */
    async unmount() {
      // record the rebuilds of window side effects (event listeners or timers)
      // note that the frees of mounting phase are one-off as it will be re-init at next mounting
      sideEffectsRebuilds = [...bootstrappingFrees, ...mountingFrees].map((free) => free());

      sandbox.inactive();
    },
  };
}
