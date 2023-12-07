create policy "Allow self insert"
on "public"."api_tokens"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Allow self select"
on "public"."api_tokens"
as permissive
for select
to public
using ((auth.uid() = user_id));
