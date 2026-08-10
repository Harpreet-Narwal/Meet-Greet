// Metro in a pnpm workspace.
//
// Expo's monorepo guide is written for npm/yarn, where every transitive dep is
// hoisted flat into the workspace root. pnpm is the opposite: each package gets
// an isolated node_modules symlinked into `.pnpm/`, so a dep of `expo` lives at
// `.pnpm/expo@x/node_modules/@expo/log-box` and nowhere else.
//
// That difference decides the two resolver flags below. Copying the guide
// verbatim here fails on the first deep import inside a dependency.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so `@mulaqat/tokens` recompiles on edit.
config.watchFolders = [workspaceRoot];

// Extra roots for the app's own bare imports. These are additions to the normal
// resolution walk, not a replacement for it.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Follow symlinks rather than treating each as an opaque leaf — under pnpm
// nearly every entry in node_modules is one.
config.resolver.unstable_enableSymlinks = true;

// NOT disableHierarchicalLookup. The guide turns it on because under a flat
// layout the upward walk is pure wasted stat() calls. Under pnpm that walk is
// the only thing that finds a package's own private deps, since they are never
// visible from the app or the workspace root. Turning it off is what breaks
// `@expo/log-box` and friends.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
