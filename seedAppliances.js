// After sequelize.sync()
console.log('🔧 Ensuring appliance IDs match relay numbers...');

const expectedAppliances = [
  { id: 1, name: 'Socket A', relay: 1 },
  { id: 2, name: 'Socket B', relay: 2 },
  { id: 3, name: 'Socket C', relay: 3 },
  { id: 4, name: 'Socket D', relay: 4 }
];

for (const ap of expectedAppliances) {
  const existing = await Appliance.findOne({
    where: { relay: ap.relay },
    paranoid: false
  });

  if (!existing) {
    await Appliance.create(ap);
    console.log(`✅ Created appliance ${ap.id} for relay ${ap.relay}`);
  } else if (existing.id !== ap.id) {
    // Wrong ID — delete and recreate
    await Appliance.destroy({
      where: { id: existing.id },
      force: true
    });
    await Appliance.create(ap);
    console.log(`🔄 Reset appliance ID ${existing.id} → ${ap.id}`);
  } else {
    console.log(`✅ Appliance ${ap.id} OK`);
  }
}