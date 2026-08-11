import User from "../models/User.js";

export async function seedUser() {
  const email = "admin@clinic.com";

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    console.log("Seed user already exists");
    return;
  }

  await User.create(
    {
      name: "Admin User",
      email,
      password: "Admin@12345",
      role: "admin",
    },
    {
      name: "Tech User 1",
      email: "tech1@clinic.com",
      password: "Tech@12345",
      role: "technician",
    }
  );

  console.log("✅ Seed user created: admin@clinic.com / Admin@12345");
}
