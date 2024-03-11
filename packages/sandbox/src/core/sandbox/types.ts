/**
 * @author Kuitos
 * @since 2023-05-04
 */

import type { Compartment } from '../compartment';

export enum SandboxType {
  Standard = 'Standard',
  Snapshot = 'Snapshot',
}

export interface Disposable {
  dispose(): void;
}

export interface Sandbox extends Compartment {
  name: string;
  type: SandboxType;
  latestSetProp?: PropertyKey;

  active(): void;

  inactive(): void;

  addIntrinsics: (intrinsics: Record<string, PropertyDescriptor>) => void;

  // TODO for gc
  // destroy(): void;
}
