# @qiankunjs/loader

## 0.0.1-rc.20

### Patch Changes

- 7d77699: feat(loader): supports passing Response as entry parameter for loadEntry function
- Updated dependencies [ea18ce6]
- Updated dependencies [9c56910]
- Updated dependencies [6d252c6]
  - @qiankunjs/shared@0.0.1-rc.12
  - @qiankunjs/sandbox@0.0.1-rc.17

## 0.0.1-rc.19

### Patch Changes

- 99bf65f: feat: support huge inline-script who might be split into multiple chunks during transfer
- Updated dependencies [56fef69]
- Updated dependencies [99bf65f]
  - @qiankunjs/shared@0.0.1-rc.11
  - @qiankunjs/sandbox@0.0.1-rc.16

## 0.0.1-rc.18

### Patch Changes

- Updated dependencies [c3416647]
  - @qiankunjs/sandbox@0.0.1-rc.15

## 0.0.1-rc.17

### Patch Changes

- Updated dependencies [8c526255]
  - @qiankunjs/sandbox@0.0.1-rc.14

## 0.0.1-rc.16

### Patch Changes

- feb544f0: fix: dynamic append element should support for the same container between micro apps
- 2e528c9d: fix: prefer reading script.dataset.src in script load error message
- Updated dependencies [a826cf5e]
- Updated dependencies [3e43a111]
- Updated dependencies [f09c1538]
- Updated dependencies [d904f5d8]
- Updated dependencies [b2d2c11a]
- Updated dependencies [feb544f0]
- Updated dependencies [9082546e]
- Updated dependencies [62048537]
  - @qiankunjs/shared@0.0.1-rc.10
  - @qiankunjs/sandbox@0.0.1-rc.13

## 0.0.1-rc.15

### Patch Changes

- bd12dbad: fix: defer scripts should wait until html loaded
- Updated dependencies [bd12dbad]
  - @qiankunjs/sandbox@0.0.1-rc.12
  - @qiankunjs/shared@0.0.1-rc.9

## 0.0.1-rc.14

### Patch Changes

- 98b071bf: feat: support defer scripts and keep the executing order to consist with browser
- Updated dependencies [98b071bf]
  - @qiankunjs/sandbox@0.0.1-rc.11
  - @qiankunjs/shared@0.0.1-rc.8

## 0.0.1-rc.13

### Patch Changes

- f2af2e36: feat: extract NodeTransformer type to shared package
- Updated dependencies [f2af2e36]
  - @qiankunjs/sandbox@0.0.1-rc.10
  - @qiankunjs/shared@0.0.1-rc.7

## 0.0.1-rc.12

### Patch Changes

- 54b0878e: feat(loader): compatible with defer entry script
- 7ba95cf2: feat: change script src before it execute thus we can be more consistent with the native browser logic
- Updated dependencies [d3e9872d]
- Updated dependencies [7cc06bd4]
- Updated dependencies [54b0878e]
- Updated dependencies [7ba95cf2]
- Updated dependencies [312abbc7]
- Updated dependencies [6f074136]
  - @qiankunjs/sandbox@0.0.1-rc.9
  - @qiankunjs/shared@0.0.1-rc.6

## 0.0.1-rc.11

### Patch Changes

- 43bf37a5: fix(sandbox): should get container from getter function in every accessing
- Updated dependencies [43bf37a5]
- Updated dependencies [a34a92a9]
- Updated dependencies [7cf93b54]
- Updated dependencies [32106b11]
  - @qiankunjs/sandbox@0.0.1-rc.8

## 0.0.1-rc.10

### Patch Changes

- 8e54e129: feat: add isRuntimeCompatible api to check qiankun3 compatibility
- Updated dependencies [5f77347b]
- Updated dependencies [8e54e129]
  - @qiankunjs/sandbox@0.0.1-rc.7
  - @qiankunjs/shared@0.0.1-rc.5

## 0.0.1-rc.9

### Patch Changes

- 1b0ffa2f: fix(loader): we should invoke our script load listener before its own

## 0.0.1-rc.8

### Patch Changes

- Updated dependencies [2aca545c]
  - @qiankunjs/sandbox@0.0.1-rc.6

## 0.0.1-rc.7

### Patch Changes

- 1d9adcaa: fix: transformer should be generated in every load

## 0.0.1-rc.6

### Patch Changes

- Updated dependencies [3d1d3367]
  - @qiankunjs/sandbox@0.0.1-rc.5

## 0.0.1-rc.5

### Patch Changes

- 317961eb: ✨ add transformer options for app loader
- 76b6bff7: 🐛 compatible with webpack chunk cache logic
- Updated dependencies [488447ad]
- Updated dependencies [dc4d9aef]
- Updated dependencies [e7d788ef]
- Updated dependencies [76b6bff7]
  - @qiankunjs/sandbox@0.0.1-rc.4
  - @qiankunjs/shared@0.0.1-rc.4

## 0.0.1-rc.4

### Patch Changes

- Updated dependencies [39301f19]
  - @qiankunjs/sandbox@0.0.1-rc.3
  - @qiankunjs/shared@0.0.1-rc.3

## 0.0.1-rc.3

### Patch Changes

- Updated dependencies [b23d3d7b]
  - @qiankunjs/shared@0.0.1-rc.2
  - @qiankunjs/sandbox@0.0.1-rc.2

## 0.0.1-rc.2

### Patch Changes

- Updated dependencies [ebb2bcaa]
  - @qiankunjs/shared@0.0.1-rc.1
  - @qiankunjs/sandbox@0.0.1-rc.1

## 0.0.1-beta.6

### Patch Changes

- ffd77800: ✨support to transform head/body tags to qiankun head/body in stream
- Updated dependencies [ffd77800]
  - @qiankunjs/sandbox@0.0.1-beta.6
  - @qiankunjs/shared@0.0.1-beta.6

## 0.0.1-alpha.5

### Patch Changes

- Updated dependencies [fcb49aad]
- Updated dependencies [065d2c54]
- Updated dependencies [931dc1f7]
  - @qiankunjs/shared@0.0.1-alpha.5
  - @qiankunjs/sandbox@0.0.1-alpha.5

## 0.0.1-alpha.4

### Patch Changes

- 62d3b482: 🏷️ fix typings temporary
- ⚡️ support preload with dependencies reusing
- Updated dependencies [62d3b482]
  - @qiankunjs/shared@0.0.1-alpha.4
  - @qiankunjs/sandbox@0.0.1-alpha.4

## 0.0.1-alpha.3

### Patch Changes

- daaa9ccc: ✨support code block in sandbox
- Updated dependencies [e12d29ae]
- Updated dependencies [daaa9ccc]
  - @qiankunjs/shared@0.0.1-alpha.3
  - @qiankunjs/sandbox@0.0.1-alpha.3

## 0.0.1-alpha.2

### Patch Changes

- 33e65888: fix: changeset
- Updated dependencies [33e65888]
  - @qiankunjs/sandbox@0.0.1-alpha.2
  - @qiankunjs/shared@0.0.1-alpha.2

## 0.0.1-alpha.1

### Patch Changes

- Updated dependencies
  - @qiankunjs/sandbox@0.0.1-alpha.1
  - @qiankunjs/shared@0.0.1-alpha.1

## 0.0.1-alpha.0

### Patch Changes

- 3.0 alpha
- Updated dependencies
  - @qiankunjs/sandbox@0.0.1-alpha.0
  - @qiankunjs/shared@0.0.1-alpha.0
