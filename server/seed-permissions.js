const db = require('./db');

async function seedPermissions() {
  const permissions = [
    'manage_users',
    'manage_settings',
    'view_reports',
    'manage_stock',
    'manage_billing',
    'manage_clinical',
    'manage_lab'
  ];

  try {
    const adminRoleRes = await db.query("SELECT id FROM roles WHERE name = 'Admin'");
    if (adminRoleRes.rows.length === 0) {
      console.error('Admin role not found.');
      process.exit(1);
    }
    const adminRoleId = adminRoleRes.rows[0].id;

    for (const perm of permissions) {
      await db.query(
        'INSERT INTO role_permissions (role_id, permission_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [adminRoleId, perm]
      );
    }

    // Also give some to Receptionist
    const recepRoleRes = await db.query("SELECT id FROM roles WHERE name = 'Receptionist'");
    if (recepRoleRes.rows.length > 0) {
      const recepId = recepRoleRes.rows[0].id;
      const recepPerms = ['view_reports', 'manage_billing'];
      for (const perm of recepPerms) {
        await db.query(
          'INSERT INTO role_permissions (role_id, permission_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [recepId, perm]
        );
      }
    }

    console.log('Permissions seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding permissions:', err);
    process.exit(1);
  }
}

seedPermissions();
