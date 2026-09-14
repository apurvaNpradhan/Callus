CREATE TABLE "body_part" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" text PRIMARY KEY,
	"user_id" text,
	"name" text NOT NULL,
	"exercise_type" text NOT NULL,
	"instructions" text,
	"image_key" text,
	"video_key" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_name_trimmed_check" CHECK ("name" = btrim("name") AND length("name") > 0),
	CONSTRAINT "exercise_type_check" CHECK ("exercise_type" IN ('weight_reps', 'duration', 'distance_duration')),
	CONSTRAINT "exercise_custom_id_uuid_check" CHECK ("user_id" IS NULL OR "id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
);
--> statement-breakpoint
CREATE TABLE "exercise_to_body_part" (
	"id" text PRIMARY KEY,
	"exercise_id" text NOT NULL,
	"body_part_id" text NOT NULL,
	CONSTRAINT "exercise_to_body_part_id_check" CHECK ("id" = "exercise_id" || ':' || "body_part_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_to_equipment" (
	"id" text PRIMARY KEY,
	"exercise_id" text NOT NULL,
	"equipment_id" text NOT NULL,
	CONSTRAINT "exercise_to_equipment_id_check" CHECK ("id" = "exercise_id" || ':' || "equipment_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_to_muscle" (
	"id" text PRIMARY KEY,
	"exercise_id" text NOT NULL,
	"muscle_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exercise_to_muscle_id_check" CHECK ("id" = "exercise_id" || ':' || "muscle_id")
);
--> statement-breakpoint
CREATE TABLE "muscle" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
DROP TABLE "item";--> statement-breakpoint
CREATE INDEX "exercise_user_id_idx" ON "exercise" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_to_body_part_pair_uidx" ON "exercise_to_body_part" ("exercise_id","body_part_id");--> statement-breakpoint
CREATE INDEX "exercise_to_body_part_body_part_id_idx" ON "exercise_to_body_part" ("body_part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_to_equipment_pair_uidx" ON "exercise_to_equipment" ("exercise_id","equipment_id");--> statement-breakpoint
CREATE INDEX "exercise_to_equipment_equipment_id_idx" ON "exercise_to_equipment" ("equipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_to_muscle_pair_uidx" ON "exercise_to_muscle" ("exercise_id","muscle_id");--> statement-breakpoint
CREATE INDEX "exercise_to_muscle_muscle_id_idx" ON "exercise_to_muscle" ("muscle_id");--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_body_part" ADD CONSTRAINT "exercise_to_body_part_exercise_id_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_body_part" ADD CONSTRAINT "exercise_to_body_part_body_part_id_body_part_id_fkey" FOREIGN KEY ("body_part_id") REFERENCES "body_part"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_equipment" ADD CONSTRAINT "exercise_to_equipment_exercise_id_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_equipment" ADD CONSTRAINT "exercise_to_equipment_equipment_id_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_muscle" ADD CONSTRAINT "exercise_to_muscle_exercise_id_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_to_muscle" ADD CONSTRAINT "exercise_to_muscle_muscle_id_muscle_id_fkey" FOREIGN KEY ("muscle_id") REFERENCES "muscle"("id") ON DELETE CASCADE;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_role') THEN
		GRANT SELECT ON TABLE "body_part", "equipment", "exercise", "exercise_to_body_part", "exercise_to_equipment", "exercise_to_muscle", "muscle" TO "powersync_role";
	END IF;
END
$$;
