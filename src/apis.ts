import { mountRootParcel, registerApplication, start as startSingleSpa } from 'single-spa';
import { FrameworkConfiguration, FrameworkLifeCycles, LoadableApp, MicroApp, RegistrableApp } from './interfaces';
import { loadApp } from './loader';
import { prefetchApps } from './prefetch';
import { Deferred } from './utils';

window.__POWERED_BY_QIANKUN__ = true;

let microApps: RegistrableApp[] = [];

// eslint-disable-next-line import/no-mutable-exports
export let frameworkConfiguration: FrameworkConfiguration = {};
const frameworkStartedDefer = new Deferred<void>();

export function registerMicroApps<T extends object = {}>(
  apps: Array<RegistrableApp<T>>,
  lifeCycles?: FrameworkLifeCycles<T>,
) {
  // Each app only needs to be registered once
  const unregisteredApps = apps.filter(app => !microApps.some(registeredApp => registeredApp.name === app.name));

  microApps = [...microApps, ...unregisteredApps];

  unregisteredApps.forEach(app => {
    const { name, activeRule, props, ...appConfig } = app;

    registerApplication({
      name,
      app: async () => {
        await frameworkStartedDefer.promise;
        return loadApp({ name, props, ...appConfig }, frameworkConfiguration, lifeCycles);
      },
      activeWhen: activeRule,
      customProps: props,
    });
  });
}

export function loadMicroApp<T extends object = {}>(
  app: LoadableApp<T>,
  configuration = frameworkConfiguration,
): MicroApp {
  const { props, ...appConfig } = app;
  return mountRootParcel(() => loadApp(appConfig, configuration), {
    domElement: document.createElement('div'),
    ...props,
  });
}

export function start(opts: FrameworkConfiguration = {}) {
  frameworkConfiguration = opts;
  const {
    prefetch = true,
    sandbox = true,
    singular = true,
    urlRerouteOnly,
    ...importEntryOpts
  } = frameworkConfiguration;

  if (prefetch) {
    prefetchApps(microApps, prefetch, importEntryOpts);
  }

  if (sandbox) {
    if (!window.Proxy) {
      console.warn('[qiankun] Miss window.Proxy, proxySandbox will degenerate into snapshotSandbox');
      // 快照沙箱不支持非 singular 模式
      if (!singular) {
        console.error('[qiankun] singular is forced to be true when sandbox enable but proxySandbox unavailable');
        frameworkConfiguration.singular = true;
      }
    }
  }

  startSingleSpa({ urlRerouteOnly });

  frameworkStartedDefer.resolve();
}
