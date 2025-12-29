-- SUPER ADMIN
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES (
  gen_random_uuid(),
  NULL,
  'superadmin@system.com',
  '$2b$10$1BY.eing/c9BjQW/tbX9quu.xRumZYwAlAfe/eLj4ArzmzVtHYUfu',
  'Super Admin',
  'super_admin'
);

-- TENANT
INSERT INTO tenants (id, name, subdomain, subscription_plan, max_users, max_projects)
VALUES (
  gen_random_uuid(),
  'Demo Company',
  'demo',
  'pro',
  25,
  15
);

-- TENANT ADMIN
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
SELECT
  gen_random_uuid(),
  t.id,
  'admin@demo.com',
  '$2b$10$jDlVjOlylJLgOSaX9dOsg.sDpHZAUMKwFg6z/1BrtPhR7eyYO4TDS',
  'Demo Admin',
  'tenant_admin'
FROM tenants t WHERE subdomain = 'demo';

-- REGULAR USERS
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
SELECT
  gen_random_uuid(),
  t.id,
  'user1@demo.com',
  '$2b$10$INo7FUolTOCASsHo8xxmw.muLpJL8X7jpIbMYxyly2eglpDn34t9u',
  'Demo User One',
  'user'
FROM tenants t WHERE subdomain = 'demo';

INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
SELECT
  gen_random_uuid(),
  t.id,
  'user2@demo.com',
  '$2b$10$INo7FUolTOCASsHo8xxmw.muLpJL8X7jpIbMYxyly2eglpDn34t9u',
  'Demo User Two',
  'user'
FROM tenants t WHERE subdomain = 'demo';

-- PROJECTS
INSERT INTO projects (id, tenant_id, name, description, created_by)
SELECT
  gen_random_uuid(),
  t.id,
  'Project Alpha',
  'First demo project',
  u.id
FROM tenants t, users u
WHERE t.subdomain = 'demo' AND u.email = 'admin@demo.com';

INSERT INTO projects (id, tenant_id, name, description, created_by)
SELECT
  gen_random_uuid(),
  t.id,
  'Project Beta',
  'Second demo project',
  u.id
FROM tenants t, users u
WHERE t.subdomain = 'demo' AND u.email = 'admin@demo.com';

-- TASKS
INSERT INTO tasks (id, project_id, tenant_id, title, priority)
SELECT
  gen_random_uuid(),
  p.id,
  p.tenant_id,
  'Initial Task',
  'high'
FROM projects p;
