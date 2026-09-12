export default {
  source: ["package.json", "apps/*/package.json", "packages/*/package.json"],
  versionGroups: [
    {
      // The native app is Expo-managed: it pins the exact react/react-dom
      // versions Expo expects for react-native 0.86 and uses `~` ranges for
      // @types/react, while the rest of the workspace tracks latest via the
      // pnpm catalog. These are exempt from unification.
      label: "Expo-managed versions in the native app",
      packages: ["native"],
      dependencies: ["react", "react-dom", "@types/react"],
      isIgnored: true,
    },
  ],
};
