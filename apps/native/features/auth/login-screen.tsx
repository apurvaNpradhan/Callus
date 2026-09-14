import { Button, Card, FieldError, Input, Label, TextField, Typography } from "heroui-native";
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
        <Card.Body>
          <View className="gap-4">
            {signUp ? (
              <TextField isRequired>
                <Label>Name</Label>
                <Input value={name} onChangeText={setName} />
              </TextField>
            ) : null}
            <TextField isRequired>
              <Label>Email</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </TextField>
            <TextField isRequired isInvalid={Boolean(error)}>
              <Label>Password</Label>
              <Input value={password} onChangeText={setPassword} secureTextEntry />
              {error ? <FieldError>{error}</FieldError> : null}
            </TextField>
            <Button isDisabled={submitting} onPress={() => void submit()}>
              {submitting ? "Signing in…" : signUp ? "Sign up" : "Sign in"}
            </Button>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSignUp((value) => !value);
                setError(undefined);
              }}
            >
              <Typography align="center" color="muted">
                {signUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Typography>
            </Pressable>
          </View>
        </Card.Body>
      </Card>
    </SafeAreaView>
  );
}
