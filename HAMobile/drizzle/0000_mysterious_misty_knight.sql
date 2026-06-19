CREATE TABLE `fincas` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`productor_id` text,
	`provincia` text NOT NULL,
	`canton` text,
	`parroquia` text,
	`barrio_sector` text,
	`area_total_ha` real NOT NULL,
	`area_cultivada_ha` real,
	`tenencia` text,
	`geometria_geojson` text NOT NULL,
	`latitud_centro` real,
	`longitud_centro` real,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vertices_poligono` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`finca_id` text NOT NULL,
	`latitud` real NOT NULL,
	`longitud` real NOT NULL,
	`orden_secuencia` integer NOT NULL,
	`precision_metros` real,
	FOREIGN KEY (`finca_id`) REFERENCES `fincas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cola_sincronizacion` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre_entidad` text NOT NULL,
	`id_entidad` text NOT NULL,
	`operacion` text NOT NULL,
	`datos` text NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`conteo_reintentos` integer DEFAULT 0 NOT NULL,
	`ultimo_error` text,
	`creado_en` integer NOT NULL,
	`procesado_en` integer
);
--> statement-breakpoint
CREATE TABLE `expedientes` (
	`id` text PRIMARY KEY NOT NULL,
	`finca_id` text NOT NULL,
	`productor_id` text NOT NULL,
	`organizacion_inquilino` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `datos_agroambientales` (
	`id` text PRIMARY KEY NOT NULL,
	`expediente_id` text NOT NULL,
	`indice_shannon` real,
	`indice_simpson` real,
	`uso_suelo` text,
	`cobertura_forestal` text,
	`sistema_produccion` text,
	`biomasa_arboles` real,
	`biomasa_cafe` real,
	`hojarasca_mantillo` real,
	`carbono_organico_suelo` real,
	`total_stock_carbono` real,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `variables_dinamicas` (
	`id` text PRIMARY KEY NOT NULL,
	`dato_id` text NOT NULL,
	`nombre` text NOT NULL,
	`valor` text NOT NULL,
	`tipo_dato` text DEFAULT 'STRING' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `productores` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`cedula_id` text NOT NULL,
	`email` text,
	`phone_number` text,
	`edad` integer,
	`genero` text,
	`nivel_educativo` text,
	`organizacion` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`creado_en` integer NOT NULL
);
