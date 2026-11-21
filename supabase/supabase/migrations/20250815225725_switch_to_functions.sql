DROP TRIGGER IF EXISTS before_insert_parse_queue ON parse_queue;
DROP FUNCTION IF EXISTS process_parse_queue_insert;

DROP TABLE IF EXISTS parse_queue;
