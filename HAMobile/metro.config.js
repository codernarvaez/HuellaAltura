const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Encontrar la raíz del proyecto y la raíz del monorepo (workspace)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Observar todos los archivos dentro del monorepo
config.watchFolders = [workspaceRoot];

// 2. Indicar a Metro dónde resolver los paquetes y en qué orden
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Forzar a Metro a resolver módulos desde las carpetas de node_modules
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
