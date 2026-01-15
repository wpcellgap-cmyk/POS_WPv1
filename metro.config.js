const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    'iconv-lite-encodings': require.resolve('iconv-lite/encodings/index.js'),
};

module.exports = config;
