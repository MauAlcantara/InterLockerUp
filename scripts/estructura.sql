--
-- PostgreSQL database dump
--

\restrict GNo8qxopo8GMds4StS1vE3xcA7BpHQ9dxRPddPcKNdfjC7r3HlozGdIG4zKCm7r

-- Dumped from database version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.4 (Ubuntu 18.4-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: gestion; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA gestion;


ALTER SCHEMA gestion OWNER TO postgres;

--
-- Name: iot; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA iot;


ALTER SCHEMA iot OWNER TO postgres;

--
-- Name: incident_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.incident_category AS ENUM (
    'damage',
    'access',
    'maintenance',
    'other'
);


ALTER TYPE public.incident_category OWNER TO postgres;

--
-- Name: incident_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.incident_status AS ENUM (
    'pendiente',
    'en proceso',
    'resuelta'
);


ALTER TYPE public.incident_status OWNER TO postgres;

--
-- Name: locker_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.locker_status AS ENUM (
    'disponible',
    'ocupado',
    'mantenimiento',
    'bloqueado',
    'proceso'
);


ALTER TYPE public.locker_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'alumno'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assignment_users; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.assignment_users (
    assignment_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE gestion.assignment_users OWNER TO postgres;

--
-- Name: assignments; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.assignments (
    id integer NOT NULL,
    locker_id integer,
    fecha_inicio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento timestamp without time zone NOT NULL,
    es_compartido boolean DEFAULT false,
    status character varying(50) DEFAULT 'activa'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.assignments OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.assignments_id_seq OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.assignments_id_seq OWNED BY gestion.assignments.id;


--
-- Name: buildings; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.buildings (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    career character varying(100) NOT NULL
);


ALTER TABLE gestion.buildings OWNER TO postgres;

--
-- Name: buildings_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.buildings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.buildings_id_seq OWNER TO postgres;

--
-- Name: buildings_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.buildings_id_seq OWNED BY gestion.buildings.id;


--
-- Name: incidents; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.incidents (
    id integer NOT NULL,
    folio character varying(50) NOT NULL,
    user_id integer,
    locker_id integer,
    categoria public.incident_category NOT NULL,
    descripcion text NOT NULL,
    estado public.incident_status DEFAULT 'pendiente'::public.incident_status,
    evidencia_url text,
    observaciones_admin text,
    archivo_hash character varying(64),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.incidents OWNER TO postgres;

--
-- Name: incidents_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.incidents_id_seq OWNER TO postgres;

--
-- Name: incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.incidents_id_seq OWNED BY gestion.incidents.id;


--
-- Name: locker_requests; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.locker_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    locker_id integer,
    shared boolean DEFAULT false,
    companions integer[] DEFAULT '{}'::integer[],
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.locker_requests OWNER TO postgres;

--
-- Name: locker_requests_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.locker_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.locker_requests_id_seq OWNER TO postgres;

--
-- Name: locker_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.locker_requests_id_seq OWNED BY gestion.locker_requests.id;


--
-- Name: lockers; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.lockers (
    id integer NOT NULL,
    identificador character varying(50) NOT NULL,
    ubicacion_detallada text,
    estado public.locker_status DEFAULT 'disponible'::public.locker_status,
    building_id integer,
    floor character varying(20),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.lockers OWNER TO postgres;

--
-- Name: lockers_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.lockers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.lockers_id_seq OWNER TO postgres;

--
-- Name: lockers_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.lockers_id_seq OWNED BY gestion.lockers.id;


--
-- Name: notifications; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.notifications (
    id integer NOT NULL,
    user_id integer,
    mensaje text NOT NULL,
    es_global boolean DEFAULT false,
    leida boolean DEFAULT false,
    tipo character varying(20) DEFAULT 'info'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.notifications_id_seq OWNED BY gestion.notifications.id;


--
-- Name: request_partners; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.request_partners (
    id integer NOT NULL,
    request_id integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.request_partners OWNER TO postgres;

--
-- Name: request_partners_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.request_partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.request_partners_id_seq OWNER TO postgres;

--
-- Name: request_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.request_partners_id_seq OWNED BY gestion.request_partners.id;


--
-- Name: user_devices; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.user_devices (
    id integer NOT NULL,
    user_id integer,
    device_fingerprint text NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE gestion.user_devices OWNER TO postgres;

--
-- Name: user_devices_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.user_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.user_devices_id_seq OWNER TO postgres;

--
-- Name: user_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.user_devices_id_seq OWNED BY gestion.user_devices.id;


--
-- Name: users; Type: TABLE; Schema: gestion; Owner: postgres
--

CREATE TABLE gestion.users (
    id integer NOT NULL,
    matricula character varying(50) NOT NULL,
    nombre_completo character varying(150) NOT NULL,
    email character varying(120) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public.user_role DEFAULT 'alumno'::public.user_role,
    grupo character varying(20),
    carrera character varying(100),
    telefono character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'activo'::character varying,
    temp_otp character varying(6),
    otp_expires timestamp without time zone
);


ALTER TABLE gestion.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: gestion; Owner: postgres
--

CREATE SEQUENCE gestion.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE gestion.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: gestion; Owner: postgres
--

ALTER SEQUENCE gestion.users_id_seq OWNED BY gestion.users.id;


--
-- Name: access_logs; Type: TABLE; Schema: iot; Owner: postgres
--

CREATE TABLE iot.access_logs (
    id integer NOT NULL,
    assignment_id integer,
    user_id integer,
    accion character varying(50) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE iot.access_logs OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE; Schema: iot; Owner: postgres
--

CREATE SEQUENCE iot.access_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE iot.access_logs_id_seq OWNER TO postgres;

--
-- Name: access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: iot; Owner: postgres
--

ALTER SEQUENCE iot.access_logs_id_seq OWNED BY iot.access_logs.id;


--
-- Name: iot_commands; Type: TABLE; Schema: iot; Owner: postgres
--

CREATE TABLE iot.iot_commands (
    id integer NOT NULL,
    locker_id integer NOT NULL,
    ejecutado boolean DEFAULT false,
    creado_en timestamp without time zone DEFAULT now(),
    accion character varying(50) DEFAULT 'abrir'::character varying
);


ALTER TABLE iot.iot_commands OWNER TO postgres;

--
-- Name: iot_commands_id_seq; Type: SEQUENCE; Schema: iot; Owner: postgres
--

CREATE SEQUENCE iot.iot_commands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE iot.iot_commands_id_seq OWNER TO postgres;

--
-- Name: iot_commands_id_seq; Type: SEQUENCE OWNED BY; Schema: iot; Owner: postgres
--

ALTER SEQUENCE iot.iot_commands_id_seq OWNED BY iot.iot_commands.id;


--
-- Name: pin_tokens; Type: TABLE; Schema: iot; Owner: postgres
--

CREATE TABLE iot.pin_tokens (
    id integer NOT NULL,
    assignment_id integer,
    pin_hash character varying(255),
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE iot.pin_tokens OWNER TO postgres;

--
-- Name: pin_tokens_id_seq; Type: SEQUENCE; Schema: iot; Owner: postgres
--

CREATE SEQUENCE iot.pin_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE iot.pin_tokens_id_seq OWNER TO postgres;

--
-- Name: pin_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: iot; Owner: postgres
--

ALTER SEQUENCE iot.pin_tokens_id_seq OWNED BY iot.pin_tokens.id;


--
-- Name: qr_tokens; Type: TABLE; Schema: iot; Owner: postgres
--

CREATE TABLE iot.qr_tokens (
    id integer NOT NULL,
    assignment_id integer,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE iot.qr_tokens OWNER TO postgres;

--
-- Name: qr_tokens_id_seq; Type: SEQUENCE; Schema: iot; Owner: postgres
--

CREATE SEQUENCE iot.qr_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE iot.qr_tokens_id_seq OWNER TO postgres;

--
-- Name: qr_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: iot; Owner: postgres
--

ALTER SEQUENCE iot.qr_tokens_id_seq OWNED BY iot.qr_tokens.id;


--
-- Name: assignments id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignments ALTER COLUMN id SET DEFAULT nextval('gestion.assignments_id_seq'::regclass);


--
-- Name: buildings id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.buildings ALTER COLUMN id SET DEFAULT nextval('gestion.buildings_id_seq'::regclass);


--
-- Name: incidents id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.incidents ALTER COLUMN id SET DEFAULT nextval('gestion.incidents_id_seq'::regclass);


--
-- Name: locker_requests id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.locker_requests ALTER COLUMN id SET DEFAULT nextval('gestion.locker_requests_id_seq'::regclass);


--
-- Name: lockers id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.lockers ALTER COLUMN id SET DEFAULT nextval('gestion.lockers_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.notifications ALTER COLUMN id SET DEFAULT nextval('gestion.notifications_id_seq'::regclass);


--
-- Name: request_partners id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.request_partners ALTER COLUMN id SET DEFAULT nextval('gestion.request_partners_id_seq'::regclass);


--
-- Name: user_devices id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.user_devices ALTER COLUMN id SET DEFAULT nextval('gestion.user_devices_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.users ALTER COLUMN id SET DEFAULT nextval('gestion.users_id_seq'::regclass);


--
-- Name: access_logs id; Type: DEFAULT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.access_logs ALTER COLUMN id SET DEFAULT nextval('iot.access_logs_id_seq'::regclass);


--
-- Name: iot_commands id; Type: DEFAULT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.iot_commands ALTER COLUMN id SET DEFAULT nextval('iot.iot_commands_id_seq'::regclass);


--
-- Name: pin_tokens id; Type: DEFAULT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.pin_tokens ALTER COLUMN id SET DEFAULT nextval('iot.pin_tokens_id_seq'::regclass);


--
-- Name: qr_tokens id; Type: DEFAULT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.qr_tokens ALTER COLUMN id SET DEFAULT nextval('iot.qr_tokens_id_seq'::regclass);


--
-- Name: assignment_users assignment_users_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignment_users
    ADD CONSTRAINT assignment_users_pkey PRIMARY KEY (assignment_id, user_id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_folio_key; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.incidents
    ADD CONSTRAINT incidents_folio_key UNIQUE (folio);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: locker_requests locker_requests_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.locker_requests
    ADD CONSTRAINT locker_requests_pkey PRIMARY KEY (id);


--
-- Name: lockers lockers_identificador_key; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.lockers
    ADD CONSTRAINT lockers_identificador_key UNIQUE (identificador);


--
-- Name: lockers lockers_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.lockers
    ADD CONSTRAINT lockers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: request_partners request_partners_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.request_partners
    ADD CONSTRAINT request_partners_pkey PRIMARY KEY (id);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- Name: user_devices user_devices_user_id_device_fingerprint_key; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.user_devices
    ADD CONSTRAINT user_devices_user_id_device_fingerprint_key UNIQUE (user_id, device_fingerprint);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_matricula_key; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.users
    ADD CONSTRAINT users_matricula_key UNIQUE (matricula);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: iot_commands iot_commands_pkey; Type: CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.iot_commands
    ADD CONSTRAINT iot_commands_pkey PRIMARY KEY (id);


--
-- Name: pin_tokens pin_tokens_pkey; Type: CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.pin_tokens
    ADD CONSTRAINT pin_tokens_pkey PRIMARY KEY (id);


--
-- Name: qr_tokens qr_tokens_pkey; Type: CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.qr_tokens
    ADD CONSTRAINT qr_tokens_pkey PRIMARY KEY (id);


--
-- Name: qr_tokens qr_tokens_token_hash_key; Type: CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.qr_tokens
    ADD CONSTRAINT qr_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: assignment_users assignment_users_assignment_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignment_users
    ADD CONSTRAINT assignment_users_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES gestion.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_users assignment_users_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignment_users
    ADD CONSTRAINT assignment_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_locker_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.assignments
    ADD CONSTRAINT assignments_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES gestion.lockers(id) ON DELETE CASCADE;


--
-- Name: incidents incidents_locker_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.incidents
    ADD CONSTRAINT incidents_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES gestion.lockers(id) ON DELETE SET NULL;


--
-- Name: incidents incidents_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.incidents
    ADD CONSTRAINT incidents_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE SET NULL;


--
-- Name: locker_requests locker_requests_locker_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.locker_requests
    ADD CONSTRAINT locker_requests_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES gestion.lockers(id) ON DELETE SET NULL;


--
-- Name: locker_requests locker_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.locker_requests
    ADD CONSTRAINT locker_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: lockers lockers_building_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.lockers
    ADD CONSTRAINT lockers_building_id_fkey FOREIGN KEY (building_id) REFERENCES gestion.buildings(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: request_partners request_partners_request_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.request_partners
    ADD CONSTRAINT request_partners_request_id_fkey FOREIGN KEY (request_id) REFERENCES gestion.locker_requests(id) ON DELETE CASCADE;


--
-- Name: request_partners request_partners_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.request_partners
    ADD CONSTRAINT request_partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: gestion; Owner: postgres
--

ALTER TABLE ONLY gestion.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: access_logs access_logs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.access_logs
    ADD CONSTRAINT access_logs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES gestion.assignments(id) ON DELETE CASCADE;


--
-- Name: access_logs access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.access_logs
    ADD CONSTRAINT access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES gestion.users(id) ON DELETE CASCADE;


--
-- Name: iot_commands iot_commands_locker_id_fkey; Type: FK CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.iot_commands
    ADD CONSTRAINT iot_commands_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES gestion.lockers(id);


--
-- Name: pin_tokens pin_tokens_assignment_id_fkey; Type: FK CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.pin_tokens
    ADD CONSTRAINT pin_tokens_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES gestion.assignments(id) ON DELETE CASCADE;


--
-- Name: qr_tokens qr_tokens_assignment_id_fkey; Type: FK CONSTRAINT; Schema: iot; Owner: postgres
--

ALTER TABLE ONLY iot.qr_tokens
    ADD CONSTRAINT qr_tokens_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES gestion.assignments(id) ON DELETE CASCADE;


--
-- Name: SCHEMA gestion; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA gestion TO grp_administradores;
GRANT USAGE ON SCHEMA gestion TO grp_alumnos;
GRANT USAGE ON SCHEMA gestion TO grp_dispositivos_iot;


--
-- Name: SCHEMA iot; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA iot TO grp_administradores;
GRANT USAGE ON SCHEMA iot TO grp_dispositivos_iot;


--
-- Name: TABLE assignment_users; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.assignment_users TO admin;
GRANT ALL ON TABLE gestion.assignment_users TO grp_administradores;


--
-- Name: TABLE assignments; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.assignments TO admin;
GRANT ALL ON TABLE gestion.assignments TO grp_administradores;
GRANT SELECT ON TABLE gestion.assignments TO grp_alumnos;


--
-- Name: SEQUENCE assignments_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.assignments_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.assignments_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.assignments_id_seq TO grp_alumnos;


--
-- Name: TABLE buildings; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.buildings TO admin;
GRANT ALL ON TABLE gestion.buildings TO grp_administradores;
GRANT SELECT ON TABLE gestion.buildings TO grp_alumnos;


--
-- Name: SEQUENCE buildings_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.buildings_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.buildings_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.buildings_id_seq TO grp_alumnos;


--
-- Name: TABLE incidents; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.incidents TO admin;
GRANT ALL ON TABLE gestion.incidents TO grp_administradores;
GRANT SELECT,INSERT,UPDATE ON TABLE gestion.incidents TO grp_alumnos;


--
-- Name: SEQUENCE incidents_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.incidents_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.incidents_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.incidents_id_seq TO grp_alumnos;


--
-- Name: TABLE locker_requests; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.locker_requests TO admin;
GRANT ALL ON TABLE gestion.locker_requests TO grp_administradores;
GRANT SELECT,INSERT,UPDATE ON TABLE gestion.locker_requests TO grp_alumnos;


--
-- Name: SEQUENCE locker_requests_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.locker_requests_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.locker_requests_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.locker_requests_id_seq TO grp_alumnos;


--
-- Name: TABLE lockers; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.lockers TO admin;
GRANT ALL ON TABLE gestion.lockers TO grp_administradores;
GRANT SELECT ON TABLE gestion.lockers TO grp_alumnos;
GRANT SELECT ON TABLE gestion.lockers TO grp_dispositivos_iot;


--
-- Name: SEQUENCE lockers_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.lockers_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.lockers_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.lockers_id_seq TO grp_alumnos;


--
-- Name: TABLE notifications; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.notifications TO admin;
GRANT ALL ON TABLE gestion.notifications TO grp_administradores;


--
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.notifications_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.notifications_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.notifications_id_seq TO grp_alumnos;


--
-- Name: TABLE request_partners; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.request_partners TO admin;
GRANT ALL ON TABLE gestion.request_partners TO grp_administradores;


--
-- Name: SEQUENCE request_partners_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.request_partners_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.request_partners_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.request_partners_id_seq TO grp_alumnos;


--
-- Name: TABLE user_devices; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.user_devices TO admin;
GRANT ALL ON TABLE gestion.user_devices TO grp_administradores;


--
-- Name: SEQUENCE user_devices_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.user_devices_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.user_devices_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.user_devices_id_seq TO grp_alumnos;


--
-- Name: TABLE users; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON TABLE gestion.users TO admin;
GRANT ALL ON TABLE gestion.users TO grp_administradores;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: gestion; Owner: postgres
--

GRANT ALL ON SEQUENCE gestion.users_id_seq TO admin;
GRANT ALL ON SEQUENCE gestion.users_id_seq TO grp_administradores;
GRANT SELECT,USAGE ON SEQUENCE gestion.users_id_seq TO grp_alumnos;


--
-- Name: TABLE access_logs; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON TABLE iot.access_logs TO admin;
GRANT SELECT ON TABLE iot.access_logs TO grp_administradores;
GRANT SELECT,INSERT ON TABLE iot.access_logs TO grp_dispositivos_iot;


--
-- Name: SEQUENCE access_logs_id_seq; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON SEQUENCE iot.access_logs_id_seq TO admin;
GRANT SELECT,USAGE ON SEQUENCE iot.access_logs_id_seq TO grp_dispositivos_iot;


--
-- Name: TABLE iot_commands; Type: ACL; Schema: iot; Owner: postgres
--

GRANT SELECT ON TABLE iot.iot_commands TO grp_administradores;


--
-- Name: SEQUENCE iot_commands_id_seq; Type: ACL; Schema: iot; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE iot.iot_commands_id_seq TO grp_dispositivos_iot;


--
-- Name: TABLE pin_tokens; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON TABLE iot.pin_tokens TO admin;
GRANT SELECT ON TABLE iot.pin_tokens TO grp_administradores;
GRANT SELECT,DELETE ON TABLE iot.pin_tokens TO grp_dispositivos_iot;


--
-- Name: SEQUENCE pin_tokens_id_seq; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON SEQUENCE iot.pin_tokens_id_seq TO admin;
GRANT SELECT,USAGE ON SEQUENCE iot.pin_tokens_id_seq TO grp_dispositivos_iot;


--
-- Name: TABLE qr_tokens; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON TABLE iot.qr_tokens TO admin;
GRANT SELECT ON TABLE iot.qr_tokens TO grp_administradores;
GRANT SELECT,DELETE ON TABLE iot.qr_tokens TO grp_dispositivos_iot;


--
-- Name: SEQUENCE qr_tokens_id_seq; Type: ACL; Schema: iot; Owner: postgres
--

GRANT ALL ON SEQUENCE iot.qr_tokens_id_seq TO admin;
GRANT SELECT,USAGE ON SEQUENCE iot.qr_tokens_id_seq TO grp_dispositivos_iot;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: gestion; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA gestion GRANT SELECT,USAGE ON SEQUENCES TO grp_alumnos;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: gestion; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA gestion GRANT SELECT ON TABLES TO grp_alumnos;


--
-- PostgreSQL database dump complete
--

\unrestrict GNo8qxopo8GMds4StS1vE3xcA7BpHQ9dxRPddPcKNdfjC7r3HlozGdIG4zKCm7r

