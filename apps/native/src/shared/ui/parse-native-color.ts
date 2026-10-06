import { processColor } from "react-native";

export function parseNativeColor(value: string | number | undefined): string | undefined {
  const color = /^#[\da-f]{6}$/i.exec(String(value))?.[0];

  if (!color || processColor(color) == null) return undefined;

  return color;
}
