import { Button, Card, Input, Text } from "panelui-native";
import { useState } from "react";
import { Pressable, SafeAreaView, View } from "react-native";

import { authClient } from "@/lib/auth-client";

export function LoginScreen() {
  const [signUp, setSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = signUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (result.error) setError(result.error.message ?? "Authentication failed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 justify-center bg-background px-5">
      <Card>
        <Card.Header>
          <Card.Title>{signUp ? "Create your account" : "Welcome back"}</Card.Title>
          <Card.Description>
            {signUp ? "Build your private exercise library." : "Sign in to access your exercises."}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <View className="gap-4">
            {signUp ? <Input label="Name" value={name} onChangeText={setName} isRequired /> : null}
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              isRequired
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              isRequired
              errorMessage={error}
            />
            <Button fullWidth loading={submitting} onPress={() => void submit()}>
              {signUp ? "Sign up" : "Sign in"}
            </Button>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSignUp((value) => !value);
                setError(undefined);
              }}
            >
              <Text className="text-center" muted>
                {signUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Text>
            </Pressable>
          </View>
        </Card.Content>
      </Card>
    </SafeAreaView>
  );
}
