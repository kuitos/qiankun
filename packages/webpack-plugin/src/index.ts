import fs from 'fs';
import path from 'path';
import type { Compiler, Configuration, Compilation } from 'webpack';
import { RawSource } from 'webpack-sources';

interface QiankunPluginOptions {
  packageName?: string;
  webpackVersion?: string;
  scriptMatchPattern?: RegExp; // 新增可选参数，用于匹配script标签
}

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

class QiankunPlugin {
  private packageName: string;
  private webpackVersion: string; // 用户指定的webpack版本
  private scriptMatchPattern: RegExp; // 用户提供的正则表达式

  private static packageJson: PackageJson = QiankunPlugin.readPackageJson();

  constructor(options: QiankunPluginOptions = {}) {
    this.packageName = options.packageName || QiankunPlugin.packageJson.name || '';
    this.webpackVersion = options.webpackVersion || QiankunPlugin.getWebpackVersion(); // 使用用户指定的版本或者读取的版本
    this.scriptMatchPattern = options.scriptMatchPattern || /<script[^>]*src="[^"]+"[^>]*><\/script>/g; // 使用用户提供的正则或默认值
  }

  private static readPackageJson(): PackageJson {
    const projectRoot: string = process.cwd();
    const packageJsonPath: string = path.join(projectRoot, 'package.json');
    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  }

  private static getWebpackVersion(): string {
    return QiankunPlugin.packageJson.dependencies?.webpack || QiankunPlugin.packageJson.devDependencies?.webpack || '';
  }

  apply(compiler: Compiler): void {
    this.configureWebpackOutput(compiler);
    compiler.hooks.emit.tapAsync('QiankunPlugin', (compilation: Compilation, callback: () => void) => {
      this.modifyHtmlAssets(compilation);
      callback();
    });
  }

  private configureWebpackOutput(compiler: Compiler): void {
    const webpackCompilerOptions = compiler.options as Configuration & { output: { jsonpFunction?: string } };
    if (this.webpackVersion.startsWith('4')) {
      // webpack 4
      webpackCompilerOptions.output.library = `${this.packageName}`;
      webpackCompilerOptions.output.libraryTarget = 'window';
      webpackCompilerOptions.output.jsonpFunction = `webpackJsonp_${this.packageName}`;
      webpackCompilerOptions.output.globalObject = 'window';
      webpackCompilerOptions.output.chunkLoadingGlobal = `webpackJsonp_${this.packageName}`;
    } else if (this.webpackVersion.startsWith('5')) {
      // webpack 5
      webpackCompilerOptions.output.library = {
        name: `${this.packageName}`,
        type: 'window',
      };
      webpackCompilerOptions.output.libraryTarget = 'window';
      webpackCompilerOptions.output.jsonpFunction = `webpackJsonp_${this.packageName}`;
      webpackCompilerOptions.output.globalObject = 'window';
      webpackCompilerOptions.output.chunkLoadingGlobal = `webpackJsonp_${this.packageName}`;
    }
  }

  private modifyHtmlAssets(compilation: Compilation): void {
    Object.keys(compilation.assets).forEach((filename) => {
      if (filename.endsWith('.html')) {
        const htmlSource = compilation.assets[filename].source();
        const htmlString = typeof htmlSource === 'string' ? htmlSource : htmlSource.toString('utf-8');

        const modifiedHtml = this.addEntryAttributeToScripts(htmlString);
        // eslint-disable-next-line
        compilation.assets[filename] = new RawSource(modifiedHtml) as any;
      }
    });
  }

  private addEntryAttributeToScripts(htmlString: string): string {
    const scriptTags = htmlString.match(/<script[^>]*src="[^"]+"[^>]*><\/script>/g) || [];

    if (scriptTags.length) {
      const lastScriptTag = scriptTags[scriptTags.length - 1];
      const modifiedScriptTag = lastScriptTag.replace('<script', '<script entry');
      return htmlString.replace(lastScriptTag, modifiedScriptTag);
    }
    return htmlString;
  }
}

module.exports = QiankunPlugin;
