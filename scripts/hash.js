import bcrypt from "bcrypt";

const passwords = {
  superAdmin: "Admin@123",
  tenantAdmin: "Demo@123",
  user: "User@123"
};

async function generateHashes() {
  for (const [key, pwd] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`${key}: ${hash}`);
  }
}

generateHashes();
