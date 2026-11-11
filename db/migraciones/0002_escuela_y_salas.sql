CREATE TABLE "cargos" (
	"id" serial PRIMARY KEY NOT NULL,
	"estudiante_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"concepto" text NOT NULL,
	"periodo" text,
	"monto_usd" numeric(10, 2) NOT NULL,
	"vence_el" date NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"reporte_id" integer,
	"recordado_el" timestamp with time zone,
	"mora_avisada_el" timestamp with time zone,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cargos_estudiante_tipo_periodo" UNIQUE("estudiante_id","tipo","periodo")
);
--> statement-breakpoint
CREATE TABLE "estudiantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"representante_id" integer,
	"nivel_id" integer,
	"nombres" text NOT NULL,
	"apellidos" text NOT NULL,
	"fecha_nacimiento" date,
	"estado" text DEFAULT 'solicitud' NOT NULL,
	"fecha_ingreso" date,
	"beca_pct" integer DEFAULT 0 NOT NULL,
	"rep_nombre" text DEFAULT '' NOT NULL,
	"rep_cedula" text DEFAULT '' NOT NULL,
	"rep_telefono" text DEFAULT '' NOT NULL,
	"rep_correo" text DEFAULT '' NOT NULL,
	"observaciones" text DEFAULT '' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reportes_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"metodo" text NOT NULL,
	"referencia" text DEFAULT '' NOT NULL,
	"monto_usd" numeric(10, 2) NOT NULL,
	"tasa" numeric(14, 4),
	"monto_bs" numeric(16, 2),
	"captura_url" text,
	"estado" text DEFAULT 'reportado' NOT NULL,
	"revisado_por" integer,
	"nota" text DEFAULT '' NOT NULL,
	"numero_recibo" integer,
	"detalle" jsonb NOT NULL,
	"confirmado_el" timestamp with time zone,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reportes_pago_numero_recibo_unique" UNIQUE("numero_recibo")
);
--> statement-breakpoint
CREATE TABLE "salas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"definicion" jsonb NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "telefono" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cedula" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_estudiante_id_estudiantes_id_fk" FOREIGN KEY ("estudiante_id") REFERENCES "public"."estudiantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_reporte_id_reportes_pago_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."reportes_pago"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_representante_id_usuarios_id_fk" FOREIGN KEY ("representante_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_nivel_id_niveles_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes_pago" ADD CONSTRAINT "reportes_pago_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes_pago" ADD CONSTRAINT "reportes_pago_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cargos_estado_idx" ON "cargos" USING btree ("estado");
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "recibos_seq" START 1;
--> statement-breakpoint
UPDATE "butacas" SET "bloque" = 'Lado ' || "bloque" WHERE "bloque" IN ('izquierdo', 'central', 'derecho');
