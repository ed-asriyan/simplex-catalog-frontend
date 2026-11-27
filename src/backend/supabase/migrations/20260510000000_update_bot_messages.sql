ALTER TABLE bot_reply_messages RENAME TO bot_greeting_messages;
ALTER TABLE bot_greeting_messages RENAME CONSTRAINT bot_reply_messages_pkey TO bot_greeting_messages_pkey;
ALTER TABLE bot_greeting_messages RENAME CONSTRAINT bot_reply_messages_bot_uuid_key TO bot_greeting_messages_bot_uuid_key;
ALTER TABLE bot_greeting_messages RENAME CONSTRAINT bot_reply_messages_bot_uuid_fkey TO bot_greeting_messages_bot_uuid_fkey;
ALTER POLICY "[bot_reply_messages] Enable read access for all users" ON bot_greeting_messages RENAME TO "[bot_greeting_messages] Enable read access for all users";

CREATE TABLE bot_command_reply_messages (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_command_uuid UUID NOT NULL UNIQUE REFERENCES bot_commands(uuid) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE bot_command_reply_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "[bot_command_reply_messages] Enable read access for all users"
ON bot_command_reply_messages
AS PERMISSIVE
FOR SELECT
TO public
USING (
  true
);
