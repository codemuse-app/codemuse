create table "public"."usage" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "event" text not null,
    "token_id" uuid not null,
    "user_id" uuid not null
);


alter table "public"."usage" enable row level security;

CREATE UNIQUE INDEX usage_pkey ON public.usage USING btree (id);

alter table "public"."usage" add constraint "usage_pkey" PRIMARY KEY using index "usage_pkey";

alter table "public"."usage" add constraint "usage_token_id_fkey" FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_token_id_fkey";

alter table "public"."usage" add constraint "usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."usage" validate constraint "usage_user_id_fkey";

create policy "Allows users to view their own usage"
on "public"."usage"
as permissive
for select
to anon
using ((auth.uid() = user_id));
