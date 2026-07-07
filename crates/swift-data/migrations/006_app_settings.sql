-- App settings (settingsDemo.ts — replaces localStorage when wired)
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default rows matching DEFAULT_APP_SETTINGS in settingsDemo.ts
INSERT INTO app_settings (key, value_json) VALUES
    ('file', '{
        "defaultSaveLocation": "app-data",
        "autoSaveInterval": "5",
        "recentProjectsLimit": "10",
        "defaultExportFormat": "swift"
    }'::jsonb),
    ('task', '{
        "newTaskType": "fixed-duration",
        "durationUnit": "days",
        "statusDateRule": "today",
        "respectLinksOnEdit": "ask",
        "priorities": ["Low", "Normal", "High"],
        "constraintTypes": [
            "As Soon As Possible",
            "As Late As Possible",
            "Must Start On",
            "Must Finish On",
            "Start No Earlier Than",
            "Start No Later Than",
            "Finish No Earlier Than",
            "Finish No Later Than"
        ],
        "taskTypes": ["Fixed Duration", "Fixed Units", "Fixed Work"]
    }'::jsonb),
    ('view', '{
        "startupView": "gantt",
        "timelineDefault": "remember",
        "dateFormat": "short",
        "agentPanelDefault": "remember"
    }'::jsonb),
    ('project', '{
        "defaultCalendar": "standard",
        "weekStartsOn": "monday",
        "currency": "USD",
        "effortDrivenDefault": "no"
    }'::jsonb),
    ('knowledge', '{
        "defaultSourceType": "manual",
        "autoIndexOnSave": "always",
        "searchMode": "hybrid",
        "embeddingProvider": "ollama",
        "embeddingModel": "nomic-embed-text"
    }'::jsonb),
    ('database', '{
        "url": "postgresql://swift:CHANGE_ME@server.lan:5432/swift",
        "sslMode": "prefer",
        "poolSize": "10",
        "vectorDimensions": "768"
    }'::jsonb),
    ('agent', '{
        "ollamaBaseUrl": "http://server.lan:11434",
        "chatModel": "qwen2.5-coder:3b",
        "maxSteps": "8",
        "toolTimeoutSecs": "60",
        "allowWrites": "false",
        "mcpEnabled": "false"
    }'::jsonb);
