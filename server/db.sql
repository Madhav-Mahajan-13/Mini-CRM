-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.campaign_customers (
  id integer NOT NULL DEFAULT nextval('communication_logs_id_seq'::regclass),
  campaign_id integer NOT NULL,
  customer_id integer NOT NULL,
  status character varying DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying::text, 'SENT'::character varying::text, 'FAILED'::character varying::text])),
  sent_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  error_message text,
  CONSTRAINT campaign_customers_pkey PRIMARY KEY (id),
  CONSTRAINT communication_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT communication_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.campaigns (
  id integer NOT NULL DEFAULT nextval('campaigns_id_seq'::regclass),
  name character varying NOT NULL,
  message_template text NOT NULL,
  rules_json json NOT NULL,
  created_by integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  total_recipients integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.customers (
  id integer NOT NULL DEFAULT nextval('customers_id_seq'::regclass),
  name character varying NOT NULL,
  email character varying UNIQUE,
  total_spend numeric DEFAULT 0.00,
  total_visits integer DEFAULT 0,
  last_visit date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  google_id character varying UNIQUE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);