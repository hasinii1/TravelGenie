import Database from 'better-sqlite3';
import path from 'path';
import type {
  AgentStepLog,
  ApprovalRecord,
  BookingRecord,
  ChatMessageRecord,
  TravellerProfile,
  TripRecord,
} from '../src/types/travel.ts';

const DB_PATH = path.resolve(process.cwd(), 'travelgenie.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      home_city TEXT DEFAULT 'Hyderabad',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS traveller_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      profile_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      origin TEXT,
      destination TEXT,
      duration_days INTEGER,
      travellers INTEGER,
      budget_per_person REAL,
      currency TEXT DEFAULT 'INR',
      trip_payload_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      region TEXT,
      lat REAL,
      lng REAL,
      score_total REAL,
      scores_json TEXT,
      source_status TEXT
    );

    CREATE TABLE IF NOT EXISTS itinerary_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      date_label TEXT,
      weather_json TEXT
    );

    CREATE TABLE IF NOT EXISTS itinerary_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      slot TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      is_indoor INTEGER DEFAULT 0,
      lat REAL,
      lng REAL,
      duration_minutes INTEGER,
      estimated_cost_inr REAL,
      source_status TEXT
    );

    CREATE TABLE IF NOT EXISTS travel_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      option_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      source_status TEXT NOT NULL,
      metadata_json TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      booking_reference TEXT UNIQUE NOT NULL,
      idempotency_key TEXT UNIQUE,
      booking_type TEXT NOT NULL,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      booking_status TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      source_status TEXT NOT NULL,
      check_in_or_date TEXT,
      check_out_or_return TEXT,
      guests INTEGER DEFAULT 1,
      cancellation_terms TEXT,
      confirmation_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      passenger_role TEXT DEFAULT 'Adult'
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      voucher_code TEXT UNIQUE NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      fee_impact_inr REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT DEFAULT 'Traveller',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS agent_execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
      session_id TEXT,
      agent_name TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      output_preview TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    db.prepare('INSERT INTO users (name, email, home_city) VALUES (?, ?, ?)').run(
      'Aarav Sharma',
      'aarav@travelgenie.demo',
      'Hyderabad'
    );
  }
}

export function getOrCreateProfile(sessionId: string): TravellerProfile {
  const row = db
    .prepare('SELECT profile_json FROM traveller_preferences WHERE session_id = ?')
    .get(sessionId) as { profile_json: string } | undefined;
  if (row) {
    return JSON.parse(row.profile_json) as TravellerProfile;
  }
  const empty: TravellerProfile = {
    origin: null,
    destination: null,
    duration_days: null,
    budget: null,
    budget_scope: 'per_person',
    currency: 'INR',
    interests: [],
    travellers: null,
    travel_dates: null,
    hotel_preference: null,
    pace: 'balanced',
    avoid_crowds: false,
  };
  db.prepare('INSERT INTO traveller_preferences (session_id, user_id, profile_json) VALUES (?, 1, ?)').run(
    sessionId,
    JSON.stringify(empty)
  );
  return empty;
}

export function saveProfile(sessionId: string, profile: TravellerProfile): void {
  const exists = db
    .prepare('SELECT id FROM traveller_preferences WHERE session_id = ?')
    .get(sessionId);
  if (exists) {
    db.prepare(
      'UPDATE traveller_preferences SET profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?'
    ).run(JSON.stringify(profile), sessionId);
  } else {
    db.prepare('INSERT INTO traveller_preferences (session_id, user_id, profile_json) VALUES (?, 1, ?)').run(
      sessionId,
      JSON.stringify(profile)
    );
  }
}

export function addConversationMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: { missing_fields?: string[]; agent_logs?: AgentStepLog[]; trip_id?: number | null }
): ChatMessageRecord {
  const info = db
    .prepare('INSERT INTO conversation_messages (session_id, role, content, metadata_json) VALUES (?, ?, ?, ?)')
    .run(sessionId, role, content, JSON.stringify(metadata ?? {}));
  const row = db
    .prepare('SELECT * FROM conversation_messages WHERE id = ?')
    .get(info.lastInsertRowid) as {
    id: number;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata_json: string;
    created_at: string;
  };
  const parsed = JSON.parse(row.metadata_json || '{}');
  return {
    id: row.id,
    session_id: row.session_id,
    role: row.role,
    content: row.content,
    missing_fields: parsed.missing_fields,
    agent_logs: parsed.agent_logs,
    trip_id: parsed.trip_id ?? null,
    created_at: row.created_at,
  };
}

export function getConversationMessages(sessionId: string): ChatMessageRecord[] {
  const rows = db
    .prepare('SELECT * FROM conversation_messages WHERE session_id = ? ORDER BY id ASC')
    .all(sessionId) as Array<{
    id: number;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata_json: string;
    created_at: string;
  }>;
  return rows.map((row) => {
    const parsed = JSON.parse(row.metadata_json || '{}');
    return {
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: row.content,
      missing_fields: parsed.missing_fields,
      agent_logs: parsed.agent_logs,
      trip_id: parsed.trip_id ?? null,
      created_at: row.created_at,
    };
  });
}

export function saveTripRecord(
  tripData: Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>,
  sessionId?: string
): TripRecord {
  const insertTrip = db.prepare(`
    INSERT INTO trips (user_id, title, status, origin, destination, duration_days, travellers, budget_per_person, currency, trip_payload_json)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertTrip.run(
    tripData.title,
    tripData.status,
    tripData.profile.origin,
    tripData.selected_destination.name,
    tripData.profile.duration_days,
    tripData.profile.travellers,
    tripData.budget.per_person_estimated,
    tripData.profile.currency,
    JSON.stringify(tripData)
  );
  const tripId = Number(result.lastInsertRowid);

  syncTripRelationalTables(tripId, tripData, sessionId);
  return getTripById(tripId)!;
}

export function updateTripRecord(
  tripId: number,
  tripData: Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>,
  sessionId?: string
): TripRecord {
  db.prepare(`
    UPDATE trips
    SET title = ?, status = ?, origin = ?, destination = ?, duration_days = ?, travellers = ?, budget_per_person = ?, trip_payload_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    tripData.title,
    tripData.status,
    tripData.profile.origin,
    tripData.selected_destination.name,
    tripData.profile.duration_days,
    tripData.profile.travellers,
    tripData.budget.per_person_estimated,
    JSON.stringify(tripData),
    tripId
  );

  syncTripRelationalTables(tripId, tripData, sessionId);
  return getTripById(tripId)!;
}

function syncTripRelationalTables(
  tripId: number,
  tripData: Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>,
  sessionId?: string
): void {
  db.prepare('DELETE FROM destinations WHERE trip_id = ?').run(tripId);
  db.prepare('DELETE FROM itinerary_days WHERE trip_id = ?').run(tripId);
  db.prepare('DELETE FROM itinerary_activities WHERE trip_id = ?').run(tripId);
  db.prepare('DELETE FROM travel_options WHERE trip_id = ?').run(tripId);

  const insertDest = db.prepare(
    'INSERT INTO destinations (trip_id, name, region, lat, lng, score_total, scores_json, source_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const d of tripData.destination_candidates) {
    insertDest.run(
      tripId,
      d.name,
      d.region,
      d.lat,
      d.lng,
      d.scores.total,
      JSON.stringify(d.scores),
      d.source_status
    );
  }

  const insertDay = db.prepare(
    'INSERT INTO itinerary_days (trip_id, day_number, title, date_label, weather_json) VALUES (?, ?, ?, ?, ?)'
  );
  const insertAct = db.prepare(
    'INSERT INTO itinerary_activities (trip_id, day_number, slot, title, category, is_indoor, lat, lng, duration_minutes, estimated_cost_inr, source_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const day of tripData.days) {
    insertDay.run(tripId, day.day_number, day.title, day.date_label, JSON.stringify(day.weather));
    for (const act of day.activities) {
      insertAct.run(
        tripId,
        act.day_number,
        act.slot,
        act.title,
        act.category,
        act.is_indoor ? 1 : 0,
        act.lat,
        act.lng,
        act.duration_minutes,
        act.estimated_cost_inr,
        act.source_status
      );
    }
  }

  const insertOption = db.prepare(
    'INSERT INTO travel_options (trip_id, option_type, provider, title, price, currency, source_status, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const f of tripData.flight_options) {
    insertOption.run(
      tripId,
      'flight',
      f.provider,
      `${f.airline} ${f.flight_number} (${f.route})`,
      f.price_per_person,
      f.currency,
      f.source_status,
      JSON.stringify(f)
    );
  }
  for (const h of tripData.hotel_options) {
    insertOption.run(
      tripId,
      'hotel',
      h.provider,
      h.name,
      h.price_per_night,
      h.currency,
      h.source_status,
      JSON.stringify(h)
    );
  }

  const insertLog = db.prepare(
    'INSERT INTO agent_execution_logs (trip_id, session_id, agent_name, status, summary, duration_ms, output_preview) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const log of tripData.agent_logs) {
    insertLog.run(
      tripId,
      sessionId ?? null,
      log.agent_name,
      log.status,
      log.summary,
      log.duration_ms,
      log.output_preview ?? null
    );
  }
}

export function listTrips(): TripRecord[] {
  const rows = db
    .prepare('SELECT id, status, trip_payload_json, created_at, updated_at FROM trips ORDER BY updated_at DESC, id DESC')
    .all() as Array<{
    id: number;
    status: TripRecord['status'];
    trip_payload_json: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => {
    const parsed = JSON.parse(r.trip_payload_json) as Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>;
    return {
      ...parsed,
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export function getTripById(id: number): TripRecord | null {
  const r = db
    .prepare('SELECT id, status, trip_payload_json, created_at, updated_at FROM trips WHERE id = ?')
    .get(id) as
    | {
        id: number;
        status: TripRecord['status'];
        trip_payload_json: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!r) return null;
  const parsed = JSON.parse(r.trip_payload_json) as Omit<TripRecord, 'id' | 'created_at' | 'updated_at'>;
  return {
    ...parsed,
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function deleteTripRecord(id: number): boolean {
  const info = db.prepare('DELETE FROM trips WHERE id = ?').run(id);
  return info.changes > 0;
}

export function listBookings(): BookingRecord[] {
  const rows = db
    .prepare(`
      SELECT b.*, v.voucher_code
      FROM bookings b
      LEFT JOIN vouchers v ON v.booking_id = b.id
      ORDER BY b.id DESC
    `)
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const passengers = db
      .prepare('SELECT full_name FROM booking_passengers WHERE booking_id = ?')
      .all(row.id) as Array<{ full_name: string }>;
    return {
      id: Number(row.id),
      trip_id: Number(row.trip_id),
      booking_reference: String(row.booking_reference),
      booking_type: row.booking_type as BookingRecord['booking_type'],
      title: String(row.title),
      provider: String(row.provider),
      booking_status: row.booking_status as BookingRecord['booking_status'],
      price: Number(row.price),
      currency: String(row.currency),
      source_status: row.source_status as BookingRecord['source_status'],
      check_in_or_date: String(row.check_in_or_date ?? ''),
      check_out_or_return: String(row.check_out_or_return ?? ''),
      guests: Number(row.guests ?? 1),
      cancellation_terms: String(row.cancellation_terms ?? ''),
      passengers: passengers.map((p) => p.full_name),
      confirmation_data: JSON.parse(String(row.confirmation_data || '{}')),
      voucher_code: String(row.voucher_code ?? ''),
      created_at: String(row.created_at),
    };
  });
}

export function getBookingById(id: number): BookingRecord | null {
  const all = listBookings();
  return all.find((b) => b.id === id) ?? null;
}

export function getBookingByIdempotencyKey(key: string): BookingRecord | null {
  const row = db
    .prepare('SELECT id FROM bookings WHERE idempotency_key = ?')
    .get(key) as { id: number } | undefined;
  if (!row) return null;
  return getBookingById(row.id);
}

export function createConfirmedBooking(params: {
  trip_id: number | null;
  idempotency_key: string;
  booking_type: BookingRecord['booking_type'];
  title: string;
  provider: string;
  price: number;
  currency: string;
  source_status: BookingRecord['source_status'];
  check_in_or_date: string;
  check_out_or_return: string;
  guests: number;
  cancellation_terms: string;
  passengers: string[];
  confirmation_data: Record<string, unknown>;
  approved_by?: string;
}): BookingRecord {
  const existing = getBookingByIdempotencyKey(params.idempotency_key);
  if (existing) {
    return existing;
  }

  const seqRow = db.prepare('SELECT COUNT(*) as c FROM bookings').get() as { c: number };
  const refNum = 1042 + seqRow.c + 1;
  const bookingRef = `TG-2026-${refNum}`;
  const voucherCode = `VCH-${bookingRef}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const info = db
    .prepare(`
      INSERT INTO bookings (
        trip_id, booking_reference, idempotency_key, booking_type, title, provider,
        booking_status, price, currency, source_status, check_in_or_date,
        check_out_or_return, guests, cancellation_terms, confirmation_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      params.trip_id,
      bookingRef,
      params.idempotency_key,
      params.booking_type,
      params.title,
      params.provider,
      'Confirmed (Simulated)',
      params.price,
      params.currency,
      params.source_status,
      params.check_in_or_date,
      params.check_out_or_return,
      params.guests,
      params.cancellation_terms,
      JSON.stringify(params.confirmation_data)
    );

  const bookingId = Number(info.lastInsertRowid);

  const insertPass = db.prepare('INSERT INTO booking_passengers (booking_id, full_name) VALUES (?, ?)');
  for (const p of params.passengers) {
    insertPass.run(bookingId, p);
  }

  db.prepare('INSERT INTO vouchers (booking_id, voucher_code, payload_json) VALUES (?, ?, ?)').run(
    bookingId,
    voucherCode,
    JSON.stringify({
      booking_reference: bookingRef,
      voucher_code: voucherCode,
      title: params.title,
      provider: params.provider,
      guests: params.guests,
      passengers: params.passengers,
      dates: `${params.check_in_or_date} to ${params.check_out_or_return}`,
      total_price: `${params.currency} ${params.price}`,
      source_status: params.source_status,
      note: 'Prototype simulated voucher — not an external live PNR.',
    })
  );

  db.prepare(`
    INSERT INTO approval_requests (trip_id, booking_id, action_type, summary, fee_impact_inr, status, approved_by, resolved_at)
    VALUES (?, ?, 'booking_confirm', ?, 0, 'approved', ?, CURRENT_TIMESTAMP)
  `).run(params.trip_id, bookingId, `Confirmed ${params.booking_type}: ${params.title}`, params.approved_by || 'Traveller');

  if (params.trip_id) {
    db.prepare(`UPDATE trips SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(params.trip_id);
  }

  return getBookingById(bookingId)!;
}

export function updateBookingStatus(params: {
  booking_id: number;
  new_status: BookingRecord['booking_status'];
  action_type: string;
  summary: string;
  fee_impact_inr: number;
  new_price?: number;
  new_title?: string;
  new_check_in?: string;
  new_check_out?: string;
  approved_by?: string;
}): BookingRecord | null {
  const existing = getBookingById(params.booking_id);
  if (!existing) return null;

  db.prepare(`
    UPDATE bookings
    SET booking_status = ?,
        price = COALESCE(?, price),
        title = COALESCE(?, title),
        check_in_or_date = COALESCE(?, check_in_or_date),
        check_out_or_return = COALESCE(?, check_out_or_return)
    WHERE id = ?
  `).run(
    params.new_status,
    params.new_price ?? null,
    params.new_title ?? null,
    params.new_check_in ?? null,
    params.new_check_out ?? null,
    params.booking_id
  );

  db.prepare(`
    INSERT INTO approval_requests (trip_id, booking_id, action_type, summary, fee_impact_inr, status, approved_by, resolved_at)
    VALUES (?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP)
  `).run(
    existing.trip_id,
    params.booking_id,
    params.action_type,
    params.summary,
    params.fee_impact_inr,
    params.approved_by || 'Traveller'
  );

  return getBookingById(params.booking_id);
}

export function listApprovals(): ApprovalRecord[] {
  return db
    .prepare('SELECT * FROM approval_requests ORDER BY id DESC LIMIT 30')
    .all() as ApprovalRecord[];
}

export function listRecentAgentLogs(): AgentStepLog[] {
  return db
    .prepare('SELECT * FROM agent_execution_logs ORDER BY id DESC LIMIT 30')
    .all() as AgentStepLog[];
}

export function getVoucherForBooking(bookingId: number): Record<string, unknown> | null {
  const row = db
    .prepare('SELECT payload_json FROM vouchers WHERE booking_id = ?')
    .get(bookingId) as { payload_json: string } | undefined;
  return row ? JSON.parse(row.payload_json) : null;
}

export default db;
