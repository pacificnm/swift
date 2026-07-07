-- Working-time calendars (Change Working Time mockup)
CREATE TABLE calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    week_starts_on SMALLINT NOT NULL DEFAULT 1 CHECK (week_starts_on IN (0, 1)),
    is_24h BOOLEAN NOT NULL DEFAULT FALSE,
    hours_per_day INTEGER NOT NULL DEFAULT 480,
    weekdays_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX calendars_name_idx ON calendars (name);

-- Standard Mon–Fri 8h calendar (matches WorkingTimeView mock)
INSERT INTO calendars (id, name, week_starts_on, is_24h, hours_per_day, weekdays_json)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Standard',
    1,
    FALSE,
    480,
    '[
      {"key": "mon", "label": "Monday",    "working": true,  "hours": "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"},
      {"key": "tue", "label": "Tuesday",   "working": true,  "hours": "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"},
      {"key": "wed", "label": "Wednesday", "working": true,  "hours": "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"},
      {"key": "thu", "label": "Thursday",  "working": true,  "hours": "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"},
      {"key": "fri", "label": "Friday",    "working": true,  "hours": "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM"},
      {"key": "sat", "label": "Saturday",  "working": false, "hours": "Nonworking"},
      {"key": "sun", "label": "Sunday",    "working": false, "hours": "Nonworking"}
    ]'::jsonb
);
