-- Ejecutar en el proyecto independiente catalogo-poladent.
-- No contiene contraseñas ni claves. El alta de administradores es manual.
create table if not exists public.catalog_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.catalog_admins enable row level security;
revoke all on public.catalog_admins from anon,authenticated;
grant select on public.catalog_admins to authenticated;
create policy admin_reads_self on public.catalog_admins for select to authenticated using (user_id=(select auth.uid()));
create table if not exists public.catalog_products (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 180),
 brand text not null check(length(trim(brand)) between 1 and 80),
 description text not null default '' check(length(description)<=1000),
 image_url text not null check(image_url ~ '^https://'),
 image_path text,
 status text not null default 'available' check(status in ('available','sold_out','hidden')),
 sort_order integer not null default 0 check(sort_order between 0 and 100000),
 source_key text unique,
 created_at timestamptz not null default now()
);
alter table public.catalog_products enable row level security;
grant select on public.catalog_products to anon,authenticated;
grant insert,update,delete on public.catalog_products to authenticated;
create policy public_reads_visible on public.catalog_products for select to anon,authenticated using(status<>'hidden');
create policy admins_read_all on public.catalog_products for select to authenticated using(exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create policy admins_insert on public.catalog_products for insert to authenticated with check(exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create policy admins_update on public.catalog_products for update to authenticated using(exists(select 1 from public.catalog_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create policy admins_delete on public.catalog_products for delete to authenticated using(exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create index catalog_products_brand_order on public.catalog_products(brand,sort_order);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog-images','catalog-images',true,5242880,array['image/webp']) on conflict(id) do nothing;
create policy admin_image_insert on storage.objects for insert to authenticated with check(bucket_id='catalog-images' and exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create policy admin_image_read on storage.objects for select to authenticated using(bucket_id='catalog-images' and exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
create policy admin_image_delete on storage.objects for delete to authenticated using(bucket_id='catalog-images' and exists(select 1 from public.catalog_admins where user_id=(select auth.uid())));
-- Después de crear tu usuario en Authentication > Users, sustituye el correo:
-- insert into public.catalog_admins(user_id) select id from auth.users where email='TU_CORREO';
