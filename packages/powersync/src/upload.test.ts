import assert from "node:assert/strict";
import test from "node:test";

import { parseUploadPayload, uploadOperationSchema, uploadPayloadSchema } from "./upload";

test("PowerSync upload contract accepts mixed exercise mutations", () => {
  const valid = uploadPayloadSchema.safeParse({
    operations: [
      {
        id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c",
        table: "exercise",
        op: "PUT",
        opData: {
          name: "Renamed",
          exercise_type: "weight_reps",
          image_key: null,
          user_id: "client-value",
          updated_at: new Date().toISOString(),
          video_key: null,
        },
      },
      {
        id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c:1",
        table: "exercise_to_body_part",
        op: "PUT",
        opData: { exercise_id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c", body_part_id: "1" },
      },
    ],
  });
  assert.equal(valid.success, true);

  const normalized = uploadOperationSchema.parse({
    id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c:2",
    table: "exercise_to_muscle",
    op: "PATCH",
    opData: { is_primary: 0 },
  });
  assert.equal(
    normalized.opData && "is_primary" in normalized.opData
      ? normalized.opData.is_primary
      : undefined,
    false,
  );

  const untrusted = uploadPayloadSchema.safeParse({
    operations: [
      {
        id: "item-1",
        table: "user",
        op: "PUT",
        opData: { title: "Nope", user_id: "someone-else" },
      },
    ],
  });
  assert.equal(untrusted.success, false);

  const source = uploadPayloadSchema.safeParse({
    operations: [
      {
        id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c",
        table: "exercise",
        op: "PUT",
        opData: { name: "Nope", exercise_type: "weight_reps", source: "catalog" },
      },
    ],
  });
  assert.equal(source.success, false);

  const customMedia = uploadPayloadSchema.safeParse({
    operations: [
      {
        id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c",
        table: "exercise",
        op: "PUT",
        opData: {
          exercise_type: "weight_reps",
          image_key: "legacy-key",
          name: "No media",
        },
      },
    ],
  });
  assert.equal(customMedia.success, false);
});

test("PowerSync upload treats malformed payloads as transient failures (ok:false), never success", () => {
  const validBody = JSON.stringify({
    operations: [
      {
        id: "6f4c2a36-1db5-4e19-9c7e-8f2f82e45f7c",
        table: "exercise",
        op: "PUT",
        opData: { name: "Renamed", exercise_type: "weight_reps" },
      },
    ],
  });

  const valid = parseUploadPayload(validBody);
  assert.equal(valid.ok, true);

  const notJson = parseUploadPayload("{not json");
  assert.equal(notJson.ok, false);
  assert.equal(notJson.error, "Invalid JSON");

  const invalidSchema = parseUploadPayload(
    JSON.stringify({ operations: [{ id: "x", table: "user", op: "DELETE" }] }),
  );
  assert.equal(invalidSchema.ok, false);
  assert.equal(invalidSchema.error, "Invalid upload payload");

  // Size is checked before parsing: a >64 KB body is rejected as transient even if
  // it would not parse, so it can never be acknowledged and discarded.
  const tooLarge = parseUploadPayload("y".repeat(64_001));
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.error, "Payload too large");
});
