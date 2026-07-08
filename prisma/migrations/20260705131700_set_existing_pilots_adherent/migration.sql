UPDATE "Pilot"
SET "role" = 'adherent'
WHERE "id" <> 1;

UPDATE "Pilot"
SET "role" = 'admin'
WHERE "id" = 1;
