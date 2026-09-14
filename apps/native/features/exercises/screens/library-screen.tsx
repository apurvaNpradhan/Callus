import { Ionicons } from "@expo/vector-icons";
import { useStatus as usePowerSyncStatus, useQuery } from "@powersync/react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { Button, Card, Typography, useThemeColor } from "heroui-native";
import { Image, SafeAreaView, View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

import { exerciseLookups } from "@/features/exercises/catalog";
import { exercisesQuery } from "@/features/exercises/data/local";
import { exerciseImageUrl } from "@/features/exercises/image-url";
import { authClient } from "@/lib/auth-client";

const bodyPartNames = new Map(Object.entries(exerciseLookups.bodyParts));
const bodyPartName = (id: string) => bodyPartNames.get(id) ?? id;

export function ExerciseLibraryScreen() {
  const session = authClient.useSession();
  const { theme } = useUniwind();
  const iconColor = useThemeColor("foreground");
  const status = usePowerSyncStatus();
  const query = useQuery(exercisesQuery());
  const offline = Boolean(session.error);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <View className="flex-1 gap-6 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <Typography.Heading type="h1">Callus</Typography.Heading>
          <Button
            accessibilityLabel={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            isIconOnly
            onPress={() => Uniwind.setTheme(theme === "dark" ? "light" : "dark")}
            variant="ghost"
          >
            <Ionicons
              name={theme === "dark" ? "sunny-outline" : "moon-outline"}
              size={20}
              color={iconColor}
            />
          </Button>
        </View>
        <View className="flex-1 gap-4">
          <Typography.Heading type="h3">Exercise library</Typography.Heading>
          <Typography color="muted">
            {offline
              ? "Offline — your local catalog remains available."
              : status.connected
                ? "Catalog synced"
                : "Catalog available offline"}
          </Typography>
          {status.uploadError || status.downloadError ? (
            <Typography className="text-danger">
              {(status.uploadError ?? status.downloadError)?.message}
            </Typography>
          ) : null}
          {query.error ? (
            <Typography className="text-danger">
              Could not load local exercises: {query.error.message}
            </Typography>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Typography color="muted">
              {query.isLoading ? "Loading exercises…" : `${query.data.length} exercises`}
            </Typography>
            <Button variant="outline" onPress={() => void authClient.signOut()} size="sm">
              Log out
            </Button>
          </View>
          {query.isLoading ? (
            <Typography color="muted">Loading exercises…</Typography>
          ) : query.error ? null : query.data.length === 0 ? (
            <Typography color="muted">No exercises available.</Typography>
          ) : (
            <FlashList
              className="flex-1"
              data={query.data}
              numColumns={2}
              contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 4 }}
              renderItem={({ item }) => {
                const imageUrl = exerciseImageUrl(item.imageKey);
                return (
                  <Card className="mx-1 mb-3 flex-1 overflow-hidden">
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        resizeMode="contain"
                        style={{ width: "100%", aspectRatio: 1 }}
                      />
                    ) : null}
                    <Card.Body>
                      <Card.Title numberOfLines={2}>{item.name}</Card.Title>
                      <Card.Description numberOfLines={1}>
                        {item.bodyPartLinks
                          .map(({ bodyPartId }) => bodyPartName(bodyPartId))
                          .join(", ")}
                      </Card.Description>
                    </Card.Body>
                  </Card>
                );
              }}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
