-- Banco das tarefas. Cada pessoa logada pertence a UMA empresa, que o
-- servidor grava em app.empresa_id antes de cada consulta.
-- A pessoa vê a própria empresa e as empresas abaixo dela na árvore.

create table empresas (
  id     int primary key,
  nome   text not null,
  pai_id int references empresas(id)
);

create table tarefas (
  id         int primary key,
  empresa_id int not null references empresas(id),
  titulo     text not null,
  status     text not null default 'aberta',
  criada_em  date not null
);

-- A árvore de empresas é o que decide quem vê o quê, então quem está logado
-- não pode mexer nela: sem política de insert/update/delete, o Postgres nega
-- a escrita mesmo com o grant da aplicação. A carga de empresas é feita por
-- um papel administrativo (superusuário ou BYPASSRLS).
alter table empresas enable row level security;
alter table empresas force row level security;

create policy empresas_leitura on empresas
  for select
  using (true);

-- A árvore não pode ter ciclo: com 1 → 2 → 4 → 1, a empresa 2 passaria a
-- "estar acima" do Grupo Aurora e enxergaria o grupo inteiro.
-- Vale também para o administrador. security definer para enxergar a árvore
-- toda, independente das políticas de quem está gravando.
create function empresas_impede_ciclo() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  atual     int := new.pai_id;
  visitados int[] := array[new.id];
begin
  -- serializa as mudanças na árvore: duas trocas simultâneas (A sob B e
  -- B sob A) não podem passar cada uma sem ver a outra
  perform pg_advisory_xact_lock(hashtext('empresas_arvore'));

  while atual is not null loop
    if atual = new.id then
      raise exception 'a empresa % não pode ficar abaixo de si mesma', new.id;
    end if;
    if atual = any(visitados) then
      raise exception 'a árvore de empresas já tem um ciclo em %', atual;
    end if;
    visitados := visitados || atual;
    select pai_id into atual from public.empresas where id = atual;
  end loop;
  return new;
end $$;

create trigger empresas_sem_ciclo
  before insert or update of id, pai_id on empresas
  for each row execute function empresas_impede_ciclo();

alter table tarefas enable row level security;

create policy tarefas_leitura on tarefas
  for select
  using (empresa_id = current_setting('app.empresa_id', true)::int);

-- liberado para a importação inicial (chamado #412)
create policy tarefas_importacao on tarefas
  for all
  using (true)
  with check (true);
