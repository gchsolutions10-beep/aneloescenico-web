CREATE TABLE "carrusel" (
	"id" serial PRIMARY KEY NOT NULL,
	"imagen_url" text NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"titulo" text NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"boton_texto" text DEFAULT '' NOT NULL,
	"boton_enlace" text DEFAULT '' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entradas_blog" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"extracto" text DEFAULT '' NOT NULL,
	"contenido" text DEFAULT '' NOT NULL,
	"portada_url" text,
	"categoria" text DEFAULT 'Escuela' NOT NULL,
	"publicada" boolean DEFAULT false NOT NULL,
	"destacada" boolean DEFAULT false NOT NULL,
	"publicada_el" timestamp with time zone,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entradas_blog_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "funciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text DEFAULT '' NOT NULL,
	"sinopsis" text DEFAULT '' NOT NULL,
	"afiche_url" text,
	"fecha_hora" timestamp with time zone,
	"lugar" text DEFAULT '' NOT NULL,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"aforo" integer DEFAULT 0 NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funciones_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mensajes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"correo" text DEFAULT '' NOT NULL,
	"telefono" text DEFAULT '' NOT NULL,
	"mensaje" text NOT NULL,
	"leido" boolean DEFAULT false NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niveles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"edades" text DEFAULT '' NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"horario" text DEFAULT '' NOT NULL,
	"monto_inscripcion" numeric(10, 2),
	"monto_mensualidad" numeric(10, 2),
	"imagen_url" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "niveles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"clave_hash" text NOT NULL,
	"rol" text DEFAULT 'admin' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"creado_el" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo")
);
