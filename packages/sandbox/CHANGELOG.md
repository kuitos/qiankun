# @qiankunjs/sandbox

## 0.0.1-rc.17

### Patch Changes

- 9c56910: feat: support addEventListener with once options to avoid memory leak
- 6d252c6: chore: optimize code
- Updated dependencies [ea18ce6]
  - @qiankunjs/shared@0.0.1-rc.12

## 0.0.1-rc.16

### Patch Changes

- 99bf65f: feat: support huge inline-script who might be split into multiple chunks during transfer
- Updated dependencies [56fef69]
- Updated dependencies [99bf65f]
  - @qiankunjs/shared@0.0.1-rc.11

## 0.0.1-rc.15

### Patch Changes

- c3416647: fix: double quote link element href as selector

## 0.0.1-rc.14

### Patch Changes

- 8c526255: Revert "fix(sandbox): non-hijacking elements should be appended to global document (#2861)"

## 0.0.1-rc.13

### Patch Changes

- f09c1538: feat: pass container with parameters rather than getter function
- d904f5d8: fix(sandbox): compatible with dynamically appending stylesheets to detached containers
- b2d2c11a: feat: optimize lifecycle validate log
- feb544f0: fix: dynamic append element should support for the same container between micro apps
- 9082546e: fix(sandbox): compatible with dynamically appending scripts to detached containers
- 62048537: fix(sandbox): non-hijacking elements should be appended to global document
- Updated dependencies [a826cf5e]
- Updated dependencies [3e43a111]
- Updated dependencies [feb544f0]
  - @qiankunjs/shared@0.0.1-rc.10

## 0.0.1-rc.12

### Patch Changes

- bd12dbad: fix: defer scripts should wait until html loaded
- Updated dependencies [bd12dbad]
  - @qiankunjs/shared@0.0.1-rc.9

## 0.0.1-rc.11

### Patch Changes

- 98b071bf: feat: support defer scripts and keep the executing order to consist with browser
- Updated dependencies [98b071bf]
  - @qiankunjs/shared@0.0.1-rc.8

## 0.0.1-rc.10

### Patch Changes

- f2af2e36: feat: extract NodeTransformer type to shared package
- Updated dependencies [f2af2e36]
  - @qiankunjs/shared@0.0.1-rc.7

## 0.0.1-rc.9

### Patch Changes

- d3e9872d: feat(sandbox): use cloneNode api instead of importNode for compatible
- 7cc06bd4: feat(loader): add lru cache for assets fetch by default
- Updated dependencies [54b0878e]
- Updated dependencies [7ba95cf2]
- Updated dependencies [312abbc7]
- Updated dependencies [6f074136]
  - @qiankunjs/shared@0.0.1-rc.6

## 0.0.1-rc.8

### Patch Changes

- 43bf37a5: fix(sandbox): should get container from getter function in every accessing
- a34a92a9: feat(sandbox): micro app mounting should wait unit rebuilding link element loaded to avoid unstyleed content flash
- 7cf93b54: fix(sandbox): createElement hijack must be paired to avoid rewriting leak
- 32106b11: fix(sandbox): dynamic async script order should calculate on the fly

## 0.0.1-rc.7

### Patch Changes

- 5f77347b: feat(sandbox): support dynamic sync scripts executed by order in sandbox
- Updated dependencies [5f77347b]
- Updated dependencies [8e54e129]
  - @qiankunjs/shared@0.0.1-rc.5

## 0.0.1-rc.6

### Patch Changes

- 2aca545c: fix: should invoke getContainer method to get container every time to avoid reference misordering

## 0.0.1-rc.5

### Patch Changes

- 3d1d3367: fix: should patch the container head/body element immediately rather than patch its functions with proxy

## 0.0.1-rc.4

### Patch Changes

- 488447ad: ✨ set proxy appendChild/insertBefore method for every sandbox rather than modify prototype on HTMLElement
- dc4d9aef: 🐛parallel sandbox should use different compartment id
- e7d788ef: feat: not rebind non-native global properties
- 76b6bff7: 🐛 compatible with webpack chunk cache logic
- Updated dependencies [76b6bff7]
  - @qiankunjs/shared@0.0.1-rc.4

## 0.0.1-rc.3

### Patch Changes

- 39301f19: 🔀 merge master
  - @qiankunjs/shared@0.0.1-rc.3

## 0.0.1-rc.2

### Patch Changes

- Updated dependencies [b23d3d7b]
  - @qiankunjs/shared@0.0.1-rc.2

## 0.0.1-rc.1

### Patch Changes

- Updated dependencies [ebb2bcaa]
  - @qiankunjs/shared@0.0.1-rc.1

## 0.0.1-beta.6

### Patch Changes

- ffd77800: ✨support to transform head/body tags to qiankun head/body in stream
- Updated dependencies [ffd77800]
  - @qiankunjs/shared@0.0.1-beta.6

## 0.0.1-alpha.5

### Patch Changes

- Updated dependencies [fcb49aad]
- Updated dependencies [065d2c54]
- Updated dependencies [931dc1f7]
  - @qiankunjs/shared@0.0.1-alpha.5

## 0.0.1-alpha.4

### Patch Changes

- Updated dependencies [62d3b482]
  - @qiankunjs/shared@0.0.1-alpha.4

## 0.0.1-alpha.3

### Patch Changes

- daaa9ccc: ✨support code block in sandbox
- Updated dependencies [e12d29ae]
- Updated dependencies [daaa9ccc]
  - @qiankunjs/shared@0.0.1-alpha.3

## 0.0.1-alpha.2

### Patch Changes

- 33e65888: fix: changeset
- Updated dependencies [33e65888]
  - @qiankunjs/shared@0.0.1-alpha.2

## 0.0.1-alpha.1

### Patch Changes

- Updated dependencies
  - @qiankunjs/shared@0.0.1-alpha.1

## 0.0.1-alpha.0

### Patch Changes

- 3.0 alpha
- Updated dependencies
  - @qiankunjs/shared@0.0.1-alpha.0
