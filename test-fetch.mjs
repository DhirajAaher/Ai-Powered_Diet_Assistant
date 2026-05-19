const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3ODQ5MDAzMiwiZXhwIjoxNzgxMDgyMDMyfQ.vWyvkxqrQ4v5-FfrSx8HA22J6qgp9eu4m2sZI3V9wQo";

const reqBody = {
  age: 30,
  gender: "male",
  heightCm: 175,
  weightKg: 70,
  activityLevel: "moderately_active",
  dietPreference: "non_vegetarian",
  goal: "maintenance"
};

async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(reqBody)
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error(err);
  }
}

main();
