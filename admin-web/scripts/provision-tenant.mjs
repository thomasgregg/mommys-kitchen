import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "TENANT_NAME",
  "TENANT_SLUG",
  "TENANT_ADMIN_EMAIL",
  "TENANT_ADMIN_PASSWORD",
];

const missing = required.filter((name) => !process.env[name]);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
  missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
}

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const tenantName = process.env.TENANT_NAME;
const tenantSlug = process.env.TENANT_SLUG;
const adminEmail = process.env.TENANT_ADMIN_EMAIL;
const adminPassword = process.env.TENANT_ADMIN_PASSWORD;
const adminFullName = process.env.TENANT_ADMIN_FULL_NAME ?? "Kitchen Admin";
const adminPhone = process.env.TENANT_ADMIN_PHONE ?? null;
const currencyCode = process.env.TENANT_CURRENCY_CODE ?? "EUR";
const languageCode = process.env.TENANT_LANGUAGE_CODE ?? "de";
const localeIdentifier = process.env.TENANT_LOCALE_IDENTIFIER ?? "de-DE";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function ensureTenantAdminUser() {
  let user = await findUserByEmail(adminEmail);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
        phone: adminPhone,
        tenant_slug: tenantSlug,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error("Could not create tenant admin user.");
    }

    user = data.user;
    console.log(`Created auth user for ${adminEmail}.`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        full_name: adminFullName,
        phone: adminPhone,
        tenant_slug: tenantSlug,
      },
    });

    if (error) {
      throw error;
    }

    console.log(`Auth user for ${adminEmail} already exists. Updated metadata.`);
  }

  return user;
}

async function provisionTenant(ownerUserId) {
  const { data, error } = await supabase.rpc("provision_tenant", {
    p_slug: tenantSlug,
    p_name: tenantName,
    p_owner_user_id: ownerUserId,
    p_owner_full_name: adminFullName,
    p_owner_phone: adminPhone,
    p_currency_code: currencyCode,
    p_language_code: languageCode,
    p_locale_identifier: localeIdentifier,
  });

  if (error || !data) {
    throw error ?? new Error("Could not provision tenant.");
  }

  return data;
}

async function main() {
  const user = await ensureTenantAdminUser();
  const tenant = await provisionTenant(user.id);

  console.log(`Provisioned tenant ${tenant.name} (${tenant.slug}).`);
  console.log(`Tenant id: ${tenant.id}`);
  console.log(`Tenant admin: ${adminEmail}`);
}

main().catch((error) => {
  console.error("Tenant provisioning failed.");
  console.error(error);
  process.exit(1);
});
