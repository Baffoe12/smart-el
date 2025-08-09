INSERT INTO "Appliances" 
("id", "name", "deviceId", "current", "voltage", "power", "amount", "isOn", "createdAt", "updatedAt")
VALUES
  (1, 'Air Conditioner', 'SmartBoard_01', 5.0,  220, 1100, 150.00, true,  NOW(), NOW()),
  (2, 'Refrigerator',    'SmartBoard_01', 1.2,  220,  264,  50.00, true,  NOW(), NOW()),
  (3, 'Washing Machine', 'SmartBoard_01', 3.0,  220,  660,  75.00, false, NOW(), NOW()),
  (4, 'Microwave',       'SmartBoard_01', 2.5,  220,  550,  40.00, false, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "deviceId" = EXCLUDED."deviceId",
  "current" = EXCLUDED."current",
  "voltage" = EXCLUDED."voltage",
  "power" = EXCLUDED."power",
  "amount" = EXCLUDED."amount",
  "isOn" = EXCLUDED."isOn",
  "updatedAt" = NOW();