CREATE TABLE "fichas_artista" (
	"id" serial PRIMARY KEY NOT NULL,
	"estudiante_id" integer NOT NULL,
	"slug" text NOT NULL,
	"publicada" boolean DEFAULT false NOT NULL,
	"autorizada_el" timestamp with time zone,
	"autorizada_via" text DEFAULT '' NOT NULL,
	"nombre_artistico" text DEFAULT '' NOT NULL,
	"frase" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"gustos" text DEFAULT '' NOT NULL,
	"foto_url" text,
	"galeria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fichas_artista_estudiante_id_unique" UNIQUE("estudiante_id"),
	CONSTRAINT "fichas_artista_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tokens_clave" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"vence_el" timestamp with time zone NOT NULL,
	"usado_el" timestamp with time zone,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_clave_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "elenco" ADD COLUMN "descripcion" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "elenco" ADD COLUMN "estudiante_id" integer;--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "confirmado_el" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fichas_artista" ADD CONSTRAINT "fichas_artista_estudiante_id_estudiantes_id_fk" FOREIGN KEY ("estudiante_id") REFERENCES "public"."estudiantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_clave" ADD CONSTRAINT "tokens_clave_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
UPDATE "pagos" SET "confirmado_el" = "creado_el" WHERE "estado" = 'confirmado' AND "confirmado_el" IS NULL;
