import { useStatus as usePowerSyncStatus, useQuery } from "@powersync/react-native";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { Button, Card, MoonIcon, SunIcon, Text, useThemeMode } from "panelui-native";
import { SafeAreaView, View } from "react-native";

import { authClient } from "@/lib/auth-client";

import { exerciseLookups } from "./catalog";
import { exercisesQuery } from "./queries";

const bodyPartNames = new Map(Object.entries(exerciseLookups.bodyParts));
const bodyPartName = (id: string) => bodyPartNames.get(id) ?? id;

export function ExerciseLibraryScreen() {
  const session = authClient.useSession();
  const { mode, toggleMode } = useThemeMode();
  const status = usePowerSyncStatus();
  const query = useQuery(exercisesQuery());
  const offline = Boolean(session.error);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View className="flex-1 gap-6 px-5 py-6">
        <View className="flex-row items-center justify-between">
          <Text size="3xl" weight="semibold">
            Callus
          </Text>
          <Button
            accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            onPress={toggleMode}
            size="icon"
            variant="ghost"
          >
            {mode === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
        </View>
        <View className="flex-1 gap-4">
          <Text size="xl" weight="semibold">
            Exercise library
          </Text>
          <Text muted>
            {offline
              ? "Offline — your local catalog remains available."
              : status.connected
                ? "Catalog synced"
                : "Catalog available offline"}
          </Text>
          {status.uploadError || status.downloadError ? (
            <Text className="text-destructive">
              {(status.uploadError ?? status.downloadError)?.message}
            </Text>
          ) : null}
          {query.error ? (
            <Text className="text-destructive">
              Could not load local exercises: {query.error.message}
            </Text>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text muted>
              {query.isLoading ? "Loading exercises…" : `${query.data.length} exercises`}
            </Text>
            <Button variant="outline" onPress={() => void authClient.signOut()} size="sm">
              Log out
            </Button>
          </View>
          {query.isLoading ? (
            <Text muted>Loading exercises…</Text>
          ) : query.error ? null : query.data.length === 0 ? (
            <Text muted>No exercises available.</Text>
          ) : (
            <FlashList
              className="flex-1"
              data={query.data}
              numColumns={2}
              contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 4 }}
              renderItem={({ item }) => (
                <Card className="mx-1 mb-3 flex-1">
                  <Card.Header>
                    <Card.Title numberOfLines={2}>{item.name}</Card.Title>
                    <Card.Description numberOfLines={1}>
                      {item.bodyPartLinks
                        .map(({ bodyPartId }) => bodyPartName(bodyPartId))
                        .join(", ")}
                    </Card.Description>
                  </Card.Header>
                </Card>
              )}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
