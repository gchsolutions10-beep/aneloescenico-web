CREATE TABLE "bonos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"monto_usd" numeric(10, 2) NOT NULL,
	"saldo_usd" numeric(10, 2) NOT NULL,
	"beneficiario" text DEFAULT '' NOT NULL,
	"nota" text DEFAULT '' NOT NULL,
	"vence_el" timestamp with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_por" integer,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bonos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "butacas" (
	"id" serial PRIMARY KEY NOT NULL,
	"funcion_id" integer NOT NULL,
	"zona_id" integer NOT NULL,
	"numero" integer NOT NULL,
	"bloque" text NOT NULL,
	"fila" integer NOT NULL,
	"pos" integer NOT NULL,
	"estado" text DEFAULT 'libre' NOT NULL,
	"orden_id" integer,
	"apartada_hasta" timestamp with time zone,
	CONSTRAINT "butacas_funcion_numero" UNIQUE("funcion_id","numero")
);
--> statement-breakpoint
CREATE TABLE "elenco" (
	"id" serial PRIMARY KEY NOT NULL,
	"funcion_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"personaje" text DEFAULT '' NOT NULL,
	"foto_url" text,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entradas" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" integer NOT NULL,
	"funcion_id" integer NOT NULL,
	"numero" integer NOT NULL,
	"zona" text NOT NULL,
	"precio_usd" numeric(10, 2) NOT NULL,
	"codigo" text NOT NULL,
	"usada_el" timestamp with time zone,
	"validada_por" integer,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entradas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "ordenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"funcion_id" integer NOT NULL,
	"canal" text DEFAULT 'web' NOT NULL,
	"comprador_nombre" text DEFAULT '' NOT NULL,
	"telefono" text DEFAULT '' NOT NULL,
	"correo" text DEFAULT '' NOT NULL,
	"vendedor_id" integer,
	"detalle" jsonb NOT NULL,
	"total_usd" numeric(10, 2) NOT NULL,
	"tasa" numeric(14, 4),
	"estado" text DEFAULT 'apartada' NOT NULL,
	"vence_el" timestamp with time zone,
	"motivo" text DEFAULT '' NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordenes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden_id" integer NOT NULL,
	"metodo" text NOT NULL,
	"referencia" text DEFAULT '' NOT NULL,
	"monto_usd" numeric(10, 2) NOT NULL,
	"monto_bs" numeric(16, 2),
	"captura_url" text,
	"bono_id" integer,
	"estado" text DEFAULT 'reportado' NOT NULL,
	"revisado_por" integer,
	"nota" text DEFAULT '' NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasas" (
	"fecha" date PRIMARY KEY NOT NULL,
	"valor" numeric(14, 4) NOT NULL,
	"fuente" text NOT NULL,
	"obtenida_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zonas" (
	"id" serial PRIMARY KEY NOT NULL,
	"funcion_id" integer NOT NULL,
	"clave" text NOT NULL,
	"nombre" text NOT NULL,
	"color" text DEFAULT '#e3bd5e' NOT NULL,
	"precio_preventa" numeric(10, 2),
	"precio_regular" numeric(10, 2) DEFAULT '0' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funciones" ADD COLUMN "preventa_hasta" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "funciones" ADD COLUMN "max_por_compra" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "funciones" ADD COLUMN "plano" text;--> statement-breakpoint
ALTER TABLE "bonos" ADD CONSTRAINT "bonos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "butacas" ADD CONSTRAINT "butacas_funcion_id_funciones_id_fk" FOREIGN KEY ("funcion_id") REFERENCES "public"."funciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "butacas" ADD CONSTRAINT "butacas_zona_id_zonas_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "butacas" ADD CONSTRAINT "butacas_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elenco" ADD CONSTRAINT "elenco_funcion_id_funciones_id_fk" FOREIGN KEY ("funcion_id") REFERENCES "public"."funciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_funcion_id_funciones_id_fk" FOREIGN KEY ("funcion_id") REFERENCES "public"."funciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_validada_por_usuarios_id_fk" FOREIGN KEY ("validada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_funcion_id_funciones_id_fk" FOREIGN KEY ("funcion_id") REFERENCES "public"."funciones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_vendedor_id_usuarios_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_bono_id_bonos_id_fk" FOREIGN KEY ("bono_id") REFERENCES "public"."bonos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_funcion_id_funciones_id_fk" FOREIGN KEY ("funcion_id") REFERENCES "public"."funciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ordenes_estado_idx" ON "ordenes" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "ordenes_funcion_idx" ON "ordenes" USING btree ("funcion_id");
--> statement-breakpoint
UPDATE "funciones" SET "estado" = 'a_la_venta' WHERE "estado" IN ('preventa', 'agotada');
