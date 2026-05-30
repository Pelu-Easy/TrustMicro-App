const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Force Metro to resolve "browser" versions of packages (Fixes Axios/Crypto error)
config.resolver.resolverMainFields = ['browser', 'react-native', 'main'];

// 2. Disable Package Exports (Secondary fix for modern library conflicts)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
