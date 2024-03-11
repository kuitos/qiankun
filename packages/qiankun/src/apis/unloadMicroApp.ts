import { unloadApplication } from 'single-spa';
import { unload } from './loadMicroApp';
import { microApps } from './registerMicroApps';

export async function unloadMicroApp(appName: string): Promise<unknown> {
  if (microApps.some((app) => app.name === appName)) {
    return unloadApplication(appName, { waitForUnmount: true });
  }

  return unload(appName);
}
