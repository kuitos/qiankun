export enum MainFrameworkTemplate {
  'React18+Webpack' = 'react18-main',
  'React18+umi4' = 'umi-main',
  'Vue3+Webpack' = 'vue3-main',
}

export enum SubFrameworkTemplate {
  'React18+Webpack' = 'react18-webpack-sub',
  'React18+umi4' = 'umi-sub',
  'Vue3+Webpack' = 'vue3-webpack-sub',
  'Vue2+Webpack' = 'vue2-webpack-sub',
}

type OptionType = { title: string; value: string };

export function enumToArray(enumObject: Record<string, string>): OptionType[] {
  return Object.keys(enumObject)
    .filter((key) => isNaN(Number(key)))
    .map((key) => {
      return { title: key, value: enumObject[key] };
    });
}

export const mainFrameworkList = enumToArray(MainFrameworkTemplate);
export const mainFrameworkItems = mainFrameworkList.map((item) => item.value);

export const mainFrameworkFilesEffectsMap = new Map([['vue3-main', ['src/main.ejs']]]);

export const subFrameworkList = enumToArray(SubFrameworkTemplate);
