-- Create rooms table
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'lobby',
  round_number int not null default 0,
  crew_card text,
  imposter_card text,
  imposter_player_id uuid,
  eliminated_player_id uuid,
  outcome text,
  phase_ends_at timestamptz,
  match_number int not null default 0,
  last_pair_index int,
  version int not null default 0,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

-- Create players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  token_hash text not null,
  name text not null,
  is_leader boolean not null default false,
  is_spectator boolean not null default false,
  is_eliminated boolean not null default false,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, token_hash)
);

-- Create messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  match_number int not null,
  round_number int not null,
  player_id uuid not null references players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  unique (room_id, match_number, round_number, player_id)
);

-- Create votes table
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  match_number int not null,
  voter_id uuid not null references players(id) on delete cascade,
  target_id uuid references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, match_number, voter_id)
);

-- Create indexes
create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_players_room_id on players(room_id);
create index if not exists idx_messages_room_match_round on messages(room_id, match_number, round_number);
create index if not exists idx_votes_room_match on votes(room_id, match_number);

-- Enable RLS on all tables with NO policies (service role bypasses RLS; anon gets nothing)
alter table rooms enable row level security;
alter table players enable row level security;
alter table messages enable row level security;
alter table votes enable row level security;
