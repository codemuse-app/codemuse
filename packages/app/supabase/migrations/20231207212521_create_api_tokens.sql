create table "public"."api_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "machine_id" text not null
);


alter table "public"."api_tokens" enable row level security;

CREATE UNIQUE INDEX api_tokens_pkey ON public.api_tokens USING btree (id);

alter table "public"."api_tokens" add constraint "api_tokens_pkey" PRIMARY KEY using index "api_tokens_pkey";

alter table "public"."api_tokens" add constraint "api_tokens_machine_id_check" CHECK ((length(machine_id) > 1)) not valid;

alter table "public"."api_tokens" validate constraint "api_tokens_machine_id_check";

alter table "public"."api_tokens" add constraint "api_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."api_tokens" validate constraint "api_tokens_user_id_fkey";
