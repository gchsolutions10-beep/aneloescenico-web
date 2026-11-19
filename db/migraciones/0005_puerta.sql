CREATE TABLE "movimientos_puerta" (
	"id" serial PRIMARY KEY NOT NULL,
	"entrada_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"usuario_id" integer,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entradas" ADD COLUMN "fuera_desde" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "movimientos_puerta" ADD CONSTRAINT "movimientos_puerta_entrada_id_entradas_id_fk" FOREIGN KEY ("entrada_id") REFERENCES "public"."entradas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_puerta" ADD CONSTRAINT "movimientos_puerta_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;