ALTER TABLE "exercise_to_body_part" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "exercise_to_equipment" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "exercise_to_muscle" ADD COLUMN "user_id" text;--> statement-breakpoint

UPDATE "exercise_to_body_part" AS link
SET "user_id" = exercise."user_id"
FROM "exercise"
WHERE exercise."id" = link."exercise_id";--> statement-breakpoint
UPDATE "exercise_to_equipment" AS link
SET "user_id" = exercise."user_id"
FROM "exercise"
WHERE exercise."id" = link."exercise_id";--> statement-breakpoint
UPDATE "exercise_to_muscle" AS link
SET "user_id" = exercise."user_id"
FROM "exercise"
WHERE exercise."id" = link."exercise_id";--> statement-breakpoint

CREATE OR REPLACE FUNCTION "set_exercise_link_user_id"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT "user_id" INTO NEW."user_id" FROM "exercise" WHERE "id" = NEW."exercise_id";
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "exercise_to_body_part_set_user_id"
BEFORE INSERT OR UPDATE OF "exercise_id", "user_id" ON "exercise_to_body_part"
FOR EACH ROW EXECUTE FUNCTION "set_exercise_link_user_id"();--> statement-breakpoint
CREATE TRIGGER "exercise_to_equipment_set_user_id"
BEFORE INSERT OR UPDATE OF "exercise_id", "user_id" ON "exercise_to_equipment"
FOR EACH ROW EXECUTE FUNCTION "set_exercise_link_user_id"();--> statement-breakpoint
CREATE TRIGGER "exercise_to_muscle_set_user_id"
BEFORE INSERT OR UPDATE OF "exercise_id", "user_id" ON "exercise_to_muscle"
FOR EACH ROW EXECUTE FUNCTION "set_exercise_link_user_id"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "cascade_exercise_link_user_id"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "exercise_to_body_part" SET "user_id" = NEW."user_id" WHERE "exercise_id" = NEW."id";
  UPDATE "exercise_to_equipment" SET "user_id" = NEW."user_id" WHERE "exercise_id" = NEW."id";
  UPDATE "exercise_to_muscle" SET "user_id" = NEW."user_id" WHERE "exercise_id" = NEW."id";
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "exercise_cascade_link_user_id"
AFTER UPDATE OF "user_id" ON "exercise"
FOR EACH ROW
WHEN (OLD."user_id" IS DISTINCT FROM NEW."user_id")
EXECUTE FUNCTION "cascade_exercise_link_user_id"();--> statement-breakpoint

CREATE INDEX "exercise_to_body_part_user_id_idx" ON "exercise_to_body_part" ("user_id");--> statement-breakpoint
CREATE INDEX "exercise_to_equipment_user_id_idx" ON "exercise_to_equipment" ("user_id");--> statement-breakpoint
CREATE INDEX "exercise_to_muscle_user_id_idx" ON "exercise_to_muscle" ("user_id");