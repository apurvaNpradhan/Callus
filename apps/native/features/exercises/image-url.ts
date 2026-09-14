const exerciseImageBaseUrl = "https://pub-21c59f218c914a3a810e5ca6aa5a4143.r2.dev";

export function exerciseImageUrl(imageKey: string | null | undefined) {
  if (!imageKey) return undefined;
  if (/^https?:\/\//i.test(imageKey)) return imageKey;
  return `${exerciseImageBaseUrl}/${imageKey.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
}
