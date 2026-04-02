import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ADMIN_EMAIL",
  "SUPABASE_ADMIN_PASSWORD",
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
const adminEmail = process.env.SUPABASE_ADMIN_EMAIL;
const adminPassword = process.env.SUPABASE_ADMIN_PASSWORD;
const adminFullName = process.env.SUPABASE_ADMIN_FULL_NAME ?? "Kitchen Admin";
const adminPhone = process.env.SUPABASE_ADMIN_PHONE ?? "555-0100";

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

async function ensureAdminUser() {
  let user = await findUserByEmail(adminEmail);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName,
        phone: adminPhone,
      },
    });

    if (error) {
      throw error;
    }

    user = data.user;
    console.log(`Created auth user for ${adminEmail}.`);
  } else {
    console.log(`Auth user for ${adminEmail} already exists.`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: adminFullName,
        phone: adminPhone,
        role: "admin",
      },
      { onConflict: "id" }
    );

  if (profileError) {
    throw profileError;
  }

  console.log(`Ensured admin profile for ${adminEmail}.`);
}

ensureAdminUser()
  .then(() => {
    console.log("Supabase admin bootstrap complete.");
  })
  .catch((error) => {
    console.error("Supabase admin bootstrap failed.");
    console.error(error);
    process.exit(1);
  });
