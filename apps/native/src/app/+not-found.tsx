import { Link } from "expo-router";
import { Button, Typography } from "heroui-native";
import { View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-5 bg-background px-6">
      <Typography.Heading>Not found</Typography.Heading>
      <Link href="/" asChild>
        <Button className="rounded-md">
          <Button.Label>Go home</Button.Label>
        </Button>
      </Link>
    </View>
  );
}
