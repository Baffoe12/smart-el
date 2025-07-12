-- Seed data for appliances table with detailed fields for testing
DELETE FROM "Appliances";
INSERT INTO "Appliances" (type, current, voltage, power, amount, "isOn", "createdAt", "updatedAt") VALUES
('Air Conditioner', 5.0, 220, 1100, 150.00, true, NOW(), NOW()),
('Refrigerator', 1.2, 220, 264, 50.00, true, NOW(), NOW()),
('Washing Machine', 3.0, 220, 660, 75.00, false, NOW(), NOW()),
('Microwave', 2.5, 220, 550, 40.00, false, NOW(), NOW()),
('Dishwasher', 2.8, 220, 616, 60.00, true, NOW(), NOW());
