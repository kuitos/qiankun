# qiankun

## 3.0.0-rc.20

### Patch Changes

- ea18ce6: feat(shared): introduce retryable and throwable to fetch-utils
- e28c729: fix(qiankun): should remove internal cache of loadMicroApp while loading failed
- 7d77699: feat(loader): supports passing Response as entry parameter for loadEntry function
- Updated dependencies [ea18ce6]
- Updated dependencies [7d77699]
- Updated dependencies [9c56910]
- Updated dependencies [6d252c6]
  - @qiankunjs/shared@0.0.1-rc.12
  - @qiankunjs/loader@0.0.1-rc.20
  - @qiankunjs/sandbox@0.0.1-rc.17

## 3.0.0-rc.19

### Patch Changes

- ac068ae: fix: remove unused umd bundle configuration
- 56fef69: feat: remove webpack chunk cache attributes just while there are multi instances loaded on document
- 99bf65f: feat: support huge inline-script who might be split into multiple chunks during transfer
- Updated dependencies [56fef69]
- Updated dependencies [99bf65f]
  - @qiankunjs/shared@0.0.1-rc.11
  - @qiankunjs/loader@0.0.1-rc.19
  - @qiankunjs/sandbox@0.0.1-rc.16

## 3.0.0-rc.18

### Patch Changes

- Updated dependencies [c3416647]
  - @qiankunjs/sandbox@0.0.1-rc.15
  - @qiankunjs/loader@0.0.1-rc.18

## 3.0.0-rc.17

### Patch Changes

- Updated dependencies [8c526255]
  - @qiankunjs/sandbox@0.0.1-rc.14
  - @qiankunjs/loader@0.0.1-rc.17

## 3.0.0-rc.16

### Patch Changes

- 3e43a111: fix: optimize types and add a warning for preload
- f09c1538: feat: pass container with parameters rather than getter function
- b2d2c11a: feat: optimize lifecycle validate log
- feb544f0: fix: dynamic append element should support for the same container between micro apps
- Updated dependencies [a826cf5e]
- Updated dependencies [3e43a111]
- Updated dependencies [f09c1538]
- Updated dependencies [d904f5d8]
- Updated dependencies [b2d2c11a]
- Updated dependencies [feb544f0]
- Updated dependencies [2e528c9d]
- Updated dependencies [9082546e]
- Updated dependencies [62048537]
  - @qiankunjs/shared@0.0.1-rc.10
  - @qiankunjs/sandbox@0.0.1-rc.13
  - @qiankunjs/loader@0.0.1-rc.16

## 3.0.0-rc.15

### Patch Changes

- a8809ecf: feat: enable sandbox by default
- Updated dependencies [bd12dbad]
  - @qiankunjs/loader@0.0.1-rc.15
  - @qiankunjs/sandbox@0.0.1-rc.12
  - @qiankunjs/shared@0.0.1-rc.9

## 3.0.0-rc.14

### Patch Changes

- Updated dependencies [98b071bf]
  - @qiankunjs/loader@0.0.1-rc.14
  - @qiankunjs/sandbox@0.0.1-rc.11
  - @qiankunjs/shared@0.0.1-rc.8

## 3.0.0-rc.13

### Patch Changes

- f2af2e36: feat: extract NodeTransformer type to shared package
- Updated dependencies [f2af2e36]
  - @qiankunjs/loader@0.0.1-rc.13
  - @qiankunjs/sandbox@0.0.1-rc.10
  - @qiankunjs/shared@0.0.1-rc.7

## 3.0.0-rc.12

### Patch Changes

- 7cc06bd4: feat(loader): add lru cache for assets fetch by default
- 312abbc7: feat: remove lru-cache and move wrapFetch to shared package
- Updated dependencies [d3e9872d]
- Updated dependencies [7cc06bd4]
- Updated dependencies [54b0878e]
- Updated dependencies [7ba95cf2]
- Updated dependencies [312abbc7]
- Updated dependencies [6f074136]
  - @qiankunjs/sandbox@0.0.1-rc.9
  - @qiankunjs/loader@0.0.1-rc.12
  - @qiankunjs/shared@0.0.1-rc.6

## 3.0.0-rc.11

### Patch Changes

- 43bf37a5: fix(sandbox): should get container from getter function in every accessing
- Updated dependencies [43bf37a5]
- Updated dependencies [a34a92a9]
- Updated dependencies [7cf93b54]
- Updated dependencies [32106b11]
  - @qiankunjs/loader@0.0.1-rc.11
  - @qiankunjs/sandbox@0.0.1-rc.8

## 3.0.0-rc.10

### Patch Changes

- 8e54e129: feat: add isRuntimeCompatible api to check qiankun3 compatibility
- Updated dependencies [5f77347b]
- Updated dependencies [8e54e129]
  - @qiankunjs/sandbox@0.0.1-rc.7
  - @qiankunjs/shared@0.0.1-rc.5
  - @qiankunjs/loader@0.0.1-rc.10

## 3.0.0-rc.9

### Patch Changes

- 2aca545c: fix: should invoke getContainer method to get container every time to avoid reference misordering
- fe68e878: fix: should re-init container while app remounted from cache
- Updated dependencies [2aca545c]
  - @qiankunjs/sandbox@0.0.1-rc.6
  - @qiankunjs/loader@0.0.1-rc.8

## 3.0.0-rc.8

### Patch Changes

- 1d9adcaa: fix: transformer should be generated in every load
- Updated dependencies [1d9adcaa]
  - @qiankunjs/loader@0.0.1-rc.7

## 3.0.0-rc.7

### Patch Changes

- Updated dependencies [3d1d3367]
  - @qiankunjs/sandbox@0.0.1-rc.5
  - @qiankunjs/loader@0.0.1-rc.6

## 3.0.0-rc.6

### Patch Changes

- 317961eb: feat: add transformer options for app loader
- e448082c: feat: make loadEntry and beforeLoad runs parallelly
- 76b6bff7: 🐛 compatible with webpack chunk cache logic
- Updated dependencies [76b6bff7]
  - @qiankunjs/sandbox@0.0.1-rc.4
  - @qiankunjs/loader@0.0.1-rc.5
  - @qiankunjs/shared@0.0.1-rc.4

## 3.0.0-rc.5

### Patch Changes

- 268f64ae: ✨ set data-name on micro app container
- Updated dependencies [39301f19]
  - @qiankunjs/sandbox@0.0.1-rc.3
  - @qiankunjs/loader@0.0.1-rc.4
  - @qiankunjs/shared@0.0.1-rc.3

## 3.0.0-rc.4

### Patch Changes

- Updated dependencies [b23d3d7b]
  - @qiankunjs/shared@0.0.1-rc.2
  - @qiankunjs/loader@0.0.1-rc.3
  - @qiankunjs/sandbox@0.0.1-rc.2

## 3.0.0-rc.3

### Patch Changes

- Updated dependencies [ebb2bcaa]
  - @qiankunjs/shared@0.0.1-rc.1
  - @qiankunjs/loader@0.0.1-rc.2
  - @qiankunjs/sandbox@0.0.1-rc.1

## 3.0.0-rc.0

### Patch Changes

- 806b823a: 🐛 fix tsc error
- 6f799edd: ✨add registerMicroApps api

## 3.0.0-beta.7

### Patch Changes

- ffd77800: ✨support to transform head/body tags to qiankun head/body in stream
- Updated dependencies [ffd77800]
  - @qiankunjs/loader@0.0.1-beta.6
  - @qiankunjs/sandbox@0.0.1-beta.6
  - @qiankunjs/shared@0.0.1-beta.6

## 3.0.0-alpha.6

### Patch Changes

- Updated dependencies [931dc1f7]
  - @qiankunjs/shared@0.0.1-alpha.5
  - @qiankunjs/loader@0.0.1-alpha.5
  - @qiankunjs/sandbox@0.0.1-alpha.5

## 3.0.0-alpha.5

### Patch Changes

- 62d3b482: 🏷️ fix typings temporary
- ⚡️ support preload with dependencies reusing
- Updated dependencies [62d3b482]
  - @qiankunjs/shared@0.0.1-alpha.4
  - @qiankunjs/loader@0.0.1-alpha.4
  - @qiankunjs/sandbox@0.0.1-alpha.4

## 3.0.0-alpha.4

### Patch Changes

- Updated dependencies [daaa9ccc]
  - @qiankunjs/shared@0.0.1-alpha.3
  - @qiankunjs/loader@0.0.1-alpha.3
  - @qiankunjs/sandbox@0.0.1-alpha.3

## 3.0.0-alpha.3

### Patch Changes

- 33e65888: fix: changeset
- Updated dependencies [33e65888]
  - @qiankunjs/sandbox@0.0.1-alpha.2
  - @qiankunjs/loader@0.0.1-alpha.2
  - @qiankunjs/shared@0.0.1-alpha.2

## 3.0.0-alpha.2

### Patch Changes

- 34c0bda5: fix dependecies
- Updated dependencies
  - @qiankunjs/loader@0.0.1-alpha.1
  - @qiankunjs/sandbox@0.0.1-alpha.1
  - @qiankunjs/shared@0.0.1-alpha.1

## 3.0.0-alpha.1

### Patch Changes

- fix dependecies

## 3.0.0-alpha.0

### Major Changes

- 3.0 alpha

### Patch Changes

- Updated dependencies
  - @qiankunjs/sandbox@0.0.1-alpha.0
  - @qiankunjs/loader@0.0.1-alpha.0
  - @qiankunjs/shared@0.0.1-alpha.0
